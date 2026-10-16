/**
 * Experimental Pavana models (observed targets, temporal-holdout evaluated, labelled
 * "eksperimental" in the UI). Artifacts are produced by the Kaggle kernel
 * `myudak/pavana-observed-train` (ml/kaggle/observed-train) and copied into ../models/.
 *
 * Live requests use keyless inputs; `?demo=1` replays real archived inputs stored with the
 * artifacts. Missing inputs → null probability, never a low one.
 */
import {
  HOTSPOT_FEATURES,
  HAZE_FEATURES,
  detectionWindow,
  hazeFeatures,
  haversineKm,
  hotspotFeatures,
  predictProba,
  rankContributions,
  shapContributions,
  cellIndex,
  type GbdtModel,
  type HazeResponse,
  type HotspotGridMeta,
  type HotspotRiskResponse,
  type ModelEvaluation,
  type ModelFactor,
  type ModelInfo,
} from '@pavana/shared';
import hazeDemo from '../models/haze.demo.json' with { type: 'json' };
import hazeMeta from '../models/haze.meta.json' with { type: 'json' };
import haze24 from '../models/haze-24h.model.json' with { type: 'json' };
import haze6 from '../models/haze-6h.model.json' with { type: 'json' };
import riskDemo from '../models/hotspot-risk.demo.json' with { type: 'json' };
import riskGrid from '../models/hotspot-risk.grid.json' with { type: 'json' };
import riskMeta from '../models/hotspot-risk.meta.json' with { type: 'json' };
import riskModel from '../models/hotspot-risk.model.json' with { type: 'json' };
import { pointKey, type ModelInputs } from '../providers/model-inputs';

const RISK = riskModel as unknown as GbdtModel;
const GRID = riskGrid as unknown as HotspotGridMeta;
const H6 = haze6 as unknown as GbdtModel;
const H24 = haze24 as unknown as GbdtModel;
const TOP_FACTORS = 5;
const DAY = 86_400_000;

type Metrics = ModelInfo['test'];
interface HorizonMeta {
  metrics: { test: Metrics };
  calibration: ModelEvaluation['calibration'];
  globalImportance: ModelEvaluation['importance'];
}
const HM = hazeMeta as unknown as {
  version: string;
  target: string;
  windows: Record<string, [string, string]>;
  stations: { icao: string; name: string; lat: number; lon: number; tzOffsetHours: number }[];
  stationMonthRate: { station: string; month: number; rate: number }[];
  horizons: Record<'6h' | '24h', HorizonMeta>;
};
const RM = riskMeta as unknown as {
  version: string;
  target: string;
  windows: Record<string, [string, string]>;
  metrics: { test: Metrics };
  calibration: ModelEvaluation['calibration'];
  globalImportance: ModelEvaluation['importance'];
};

const iso = (d: Date) => d.toISOString().replace(/\.\d{3}Z$/, 'Z');
const day = (t: number) => new Date(t).toISOString().slice(0, 10);

function factors(model: GbdtModel, x: (number | null)[]): ModelFactor[] {
  const phi = shapContributions(model, x);
  return rankContributions(model, x, phi)
    .slice(0, TOP_FACTORS)
    .map(({ feature, value, shap }) => ({ feature, value, shap }));
}

/** Probability only when every input the model was trained with a value for is present. */
function probaOrNull(model: GbdtModel, x: (number | null)[], required: readonly number[]): number | null {
  return required.some((i) => x[i] === null) ? null : predictProba(model, x);
}

const riskInfo: ModelInfo = {
  id: 'hotspot-risk',
  version: RM.version,
  experimental: true,
  targetKind: 'observation',
  target: RM.target,
  testWindow: RM.windows['test']!,
  test: RM.metrics.test,
};
const hazeInfo = (h: '6h' | '24h'): ModelInfo => ({
  id: `haze-${h}`,
  version: HM.version,
  experimental: true,
  targetKind: 'observation',
  target: HM.target,
  testWindow: HM.windows['test']!,
  test: HM.horizons[h].metrics.test,
});

export function getModelEvaluations(): ModelEvaluation[] {
  return [
    {
      id: 'hotspot-risk',
      version: RM.version,
      title: 'Risiko titik panas',
      target: RM.target,
      windows: RM.windows,
      test: RM.metrics.test,
      calibration: RM.calibration,
      importance: RM.globalImportance,
    },
    ...(['6h', '24h'] as const).map((h) => ({
      id: `haze-${h}`,
      version: HM.version,
      title: `Asap / jarak pandang t+${h}`,
      target: HM.target,
      windows: HM.windows,
      test: HM.horizons[h].metrics.test,
      calibration: HM.horizons[h].calibration,
      importance: HM.horizons[h].globalImportance,
    })),
  ];
}

// Every feature except the weather block must be present; weather gaps also null the cell.
const RISK_REQUIRED = HOTSPOT_FEATURES.map((_, i) => i);

export async function getHotspotRisk(
  inputs: ModelInputs | null,
  point: { lat?: number; lon?: number },
  now: Date,
): Promise<HotspotRiskResponse> {
  const missing: string[] = [];
  let issueDay: string;
  let rows: { id: number; x: (number | null)[]; observed: boolean | null }[];
  let fetchedAt = iso(now);

  if (!inputs) {
    const demo = riskDemo as { issueDay: string; rows: { cell: number; x: (number | null)[]; observedNextDay: boolean }[] };
    issueDay = demo.issueDay;
    rows = demo.rows.map((r) => ({ id: r.cell, x: r.x, observed: r.observedNextDay }));
  } else {
    // Issue at the end of the last complete UTC day.
    issueDay = day(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) - DAY);
    const [fires, weather] = await Promise.all([
      inputs.recentDetections().catch(() => null),
      inputs
        .dailyWeather(
          [...new Map(GRID.cells.map((c) => [pointKey({ lat: c.weatherLat, lon: c.weatherLon }), { lat: c.weatherLat, lon: c.weatherLon }])).values()],
          issueDay,
        )
        .catch(() => null),
    ]);
    if (!fires) missing.push('nasa-firms-7d');
    if (!weather) missing.push('open-meteo');
    if (fires) fetchedAt = fires.fetchedAt;
    const win = fires ? detectionWindow(GRID, fires.detections, issueDay, fires.daysSeen) : null;
    rows = GRID.cells.map((c) => {
      const w = weather?.get(pointKey({ lat: c.weatherLat, lon: c.weatherLon })) ?? null;
      const x = win
        ? hotspotFeatures(GRID, c, win, w, issueDay)
        : HOTSPOT_FEATURES.map(() => null as number | null);
      return { id: c.id, x, observed: null };
    });
  }

  const meta = new Map(GRID.cells.map((c) => [c.id, c]));
  const cells = rows.map((r) => {
    const c = meta.get(r.id)!;
    return { id: r.id, lat: c.lat, lon: c.lon, probability: probaOrNull(RISK, r.x, RISK_REQUIRED) };
  });

  let focus: HotspotRiskResponse['focus'] = null;
  if (point.lat !== undefined && point.lon !== undefined) {
    const id = cellIndex(GRID, point.lat, point.lon);
    const i = rows.findIndex((r) => r.id === id);
    if (i >= 0) {
      const x = rows[i]!.x;
      focus = {
        cell: cells[i]!,
        factors: cells[i]!.probability === null ? [] : factors(RISK, x),
        observed: rows[i]!.observed,
      };
    }
  }

  const targetDay = day(Date.parse(`${issueDay}T00:00:00Z`) + DAY);
  return {
    state: inputs ? 'live' : 'demo',
    model: riskInfo,
    issueDay,
    targetDay,
    cellDeg: GRID.cellDeg,
    cells,
    focus,
    missing,
    provenance: {
      provider: 'pavana-model',
      kind: 'derived',
      fetchedAt,
      issuedAt: `${targetDay}T00:00:00Z`,
      validAt: `${targetDay}T00:00:00Z`,
      isDemo: !inputs,
      notes: `${RM.version} (eksperimental). Probabilitas deteksi satelit Suomi NPP, bukan kebakaran terkonfirmasi.${inputs ? '' : ' Demo: replay input arsip nyata.'}`,
    },
  };
}

const monthRate = new Map(HM.stationMonthRate.map((r) => [`${r.station}:${r.month}`, r.rate]));
// Weather/visibility inputs are required; fire counts can legitimately be 0.
const HAZE_REQUIRED = ['vsby_km', 'haze_now', 'rh_pct', 'tmpc'].map((f) => HAZE_FEATURES.indexOf(f as never));

export async function getHaze(
  inputs: ModelInputs | null,
  point: { lat?: number; lon?: number },
  now: Date,
): Promise<HazeResponse> {
  const missing: string[] = [];
  let rows: { icao: string; issueAt: string | null; x: (number | null)[] | null; observed: Record<string, boolean | null> }[];
  let fetchedAt = iso(now);

  if (!inputs) {
    const demo = hazeDemo as { rows: { station: string; issueAt: string; x: (number | null)[]; observed: Record<string, boolean | null> }[] };
    rows = demo.rows.map((r) => ({ icao: r.station, issueAt: r.issueAt, x: r.x, observed: r.observed }));
  } else {
    const [fires, metar] = await Promise.all([
      inputs.recentDetections().catch(() => null),
      inputs.metar(HM.stations.map((s) => s.icao), now).catch(() => null),
    ]);
    if (!fires) missing.push('nasa-firms-7d');
    if (!metar) missing.push('iem-metar');
    if (fires) fetchedAt = fires.fetchedAt;
    rows = HM.stations.map((s) => {
      const reports = metar?.get(s.icao) ?? [];
      const month = new Date(now).getUTCMonth() + 1;
      const f = reports.length
        ? hazeFeatures({
            station: s,
            reports,
            detections: fires?.detections ?? [],
            stationMonthRate: monthRate.get(`${s.icao}:${month}`) ?? null,
          })
        : null;
      // Reports older than 3 h are stale for a nowcast: treat as missing.
      const fresh = f && now.getTime() - Date.parse(f.issueAt) <= 3 * 3_600_000 ? f : null;
      const x = fresh && fires ? fresh.x : null;
      return { icao: s.icao, issueAt: fresh?.issueAt ?? null, x, observed: {} };
    });
  }

  const vsbyIdx = HAZE_FEATURES.indexOf('vsby_km');
  const stations = rows
    .map((r) => {
      const s = HM.stations.find((m) => m.icao === r.icao)!;
      const p6 = r.x ? probaOrNull(H6, r.x, HAZE_REQUIRED) : null;
      const p24 = r.x ? probaOrNull(H24, r.x, HAZE_REQUIRED) : null;
      return {
        icao: s.icao,
        name: s.name,
        lat: s.lat,
        lon: s.lon,
        distanceKm:
          point.lat !== undefined && point.lon !== undefined
            ? Math.round(haversineKm({ lat: point.lat, lon: point.lon }, s) * 10) / 10
            : null,
        issueAt: r.issueAt,
        visibilityKm: r.x?.[vsbyIdx] ?? null,
        p6h: p6,
        p24h: p24,
        factors6h: p6 === null || !r.x ? [] : factors(H6, r.x),
        factors24h: p24 === null || !r.x ? [] : factors(H24, r.x),
        observed6h: r.observed['6h'] ?? null,
        observed24h: r.observed['24h'] ?? null,
      };
    })
    .sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0));

  return {
    state: inputs ? 'live' : 'demo',
    models: { h6: hazeInfo('6h'), h24: hazeInfo('24h') },
    stations,
    missing,
    provenance: {
      provider: 'pavana-model',
      kind: 'derived',
      fetchedAt,
      validAt: iso(now),
      isDemo: !inputs,
      notes: `${HM.version} (eksperimental). Peluang jarak pandang < 3 km dengan kabut asap (HZ/FU) di bandara, dari METAR.${inputs ? '' : ' Demo: replay input arsip nyata.'}`,
    },
  };
}
