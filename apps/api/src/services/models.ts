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
  hourlyReports,
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
for (const [model, names, meta] of [
  [RISK, HOTSPOT_FEATURES, riskMeta],
  [H6, HAZE_FEATURES, hazeMeta],
  [H24, HAZE_FEATURES, hazeMeta],
] as const) {
  const m = meta as {
    targetKind: string;
    evaluated: boolean;
    experimental: boolean;
    operationalReady: boolean;
  };
  if (
    model.objective !== 'binary' ||
    model.featureNames.join('|') !== names.join('|') ||
    !m.evaluated ||
    !m.experimental ||
    m.operationalReady ||
    m.targetKind !== 'observation'
  )
    throw new Error('Invalid observed-target experimental artifact');
}
const TOP_FACTORS = 5;
const DAY = 86_400_000;

type Metrics = ModelInfo['test'];
interface HorizonMeta {
  metrics: { test: Metrics };
  calibration: ModelEvaluation['calibration'];
  globalImportance: ModelEvaluation['importance'];
  windows: Record<string, [string, string]>;
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

async function freshDetections(inputs: ModelInputs, now: Date, missing: string[]) {
  const source = await inputs.recentDetections().catch(() => null);
  if (!source) {
    missing.push('nasa-firms-7d');
    return null;
  }
  const age = now.getTime() - Date.parse(source.fetchedAt);
  if (!Number.isFinite(age) || age < -5 * 60_000 || age > 90 * 60_000) {
    missing.push('firms-input-stale');
    return null;
  }
  return source;
}

function factors(model: GbdtModel, x: (number | null)[]): ModelFactor[] {
  const phi = shapContributions(model, x);
  return rankContributions(model, x, phi)
    .slice(0, TOP_FACTORS)
    .map(({ feature, value, shap }) => ({ feature, value, shap }));
}

/** Probability only when every input the model was trained with a value for is present. */
function probaOrNull(
  model: GbdtModel,
  x: (number | null)[],
  required: readonly number[],
): number | null {
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
  testWindow: HM.horizons[h].windows['test']!,
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
      windows: HM.horizons[h].windows,
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
    const demo = riskDemo as {
      issueDay: string;
      rows: { cell: number; x: (number | null)[]; observedNextDay: boolean }[];
    };
    issueDay = demo.issueDay;
    rows = demo.rows.map((r) => ({ id: r.cell, x: r.x, observed: r.observedNextDay }));
  } else {
    // Issue at the end of the last complete UTC day.
    issueDay = day(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) - DAY);
    const [fires, weather] = await Promise.all([
      freshDetections(inputs, now, missing),
      inputs
        .dailyWeather(
          [
            ...new Map(
              GRID.cells.map((c) => [
                pointKey({ lat: c.weatherLat, lon: c.weatherLon }),
                { lat: c.weatherLat, lon: c.weatherLon },
              ]),
            ).values(),
          ],
          issueDay,
        )
        .catch(() => null),
    ]);
    if (!weather) missing.push('open-meteo');
    if (fires) fetchedAt = fires.fetchedAt;
    const win = fires
      ? detectionWindow(GRID, fires.detections, issueDay, fires.daysSeen, fires.coverageStartMs)
      : null;
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
  if (focus?.cell.probability === null) missing.push('risk-inputs-incomplete');
  return {
    state: cells.every((c) => c.probability === null) ? 'unavailable' : inputs ? 'live' : 'demo',
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
      validAt: `${targetDay}T00:00:00Z`,
      isDemo: !inputs,
      notes: `${RM.version} (eksperimental). Probabilitas deteksi satelit Suomi NPP, bukan kebakaran terkonfirmasi.${inputs ? ' Fitur cuaca Open-Meteo harian; tanggal lama yang kosong dilengkapi dari arsip historis.' : ' Demo: replay input arsip nyata.'}`,
    },
  };
}

const monthRate = new Map(HM.stationMonthRate.map((r) => [`${r.station}:${r.month}`, r.rate]));
// Weather/visibility inputs are required; fire counts can legitimately be 0.
const HAZE_REQUIRED = ['vsby_km', 'haze_now', 'rh_pct', 'tmpc'].map((f) =>
  HAZE_FEATURES.indexOf(f as never),
);

export async function getHaze(
  inputs: ModelInputs | null,
  point: { lat?: number; lon?: number },
  now: Date,
): Promise<HazeResponse> {
  const missing: string[] = [];
  let rows: {
    icao: string;
    issueAt: string | null;
    reportAt: string | null;
    inputProvider: 'iem' | 'noaa-awc' | null;
    x: (number | null)[] | null;
    observed: Record<string, boolean | null>;
    missing: string[];
  }[];
  let fetchedAt = iso(now);

  if (!inputs) {
    const demo = hazeDemo as {
      rows: {
        station: string;
        issueAt: string;
        reportAt: string;
        x: (number | null)[];
        observed: Record<string, boolean | null>;
      }[];
    };
    rows = demo.rows.map((r) => ({
      icao: r.station,
      issueAt: r.issueAt,
      reportAt: r.reportAt,
      inputProvider: 'iem' as const,
      x: r.x,
      observed: r.observed,
      missing: [],
    }));
  } else {
    const covered = HM.stations.filter(
      (s) =>
        point.lat === undefined ||
        point.lon === undefined ||
        haversineKm({ lat: point.lat, lon: point.lon }, s) <= 300,
    );
    const [fires, metar] = await Promise.all([
      covered.length ? freshDetections(inputs, now, missing) : Promise.resolve(null),
      covered.length
        ? inputs
            .metar(
              covered.map((s) => s.icao),
              now,
            )
            .catch(() => null)
        : Promise.resolve(new Map()),
    ]);
    if (!metar) missing.push('iem-metar');
    if (fires) fetchedAt = fires.fetchedAt;
    rows = HM.stations.map((s) => {
      const reports = metar?.get(s.icao) ?? [];
      const origin = hourlyReports(reports, now.getTime()).at(-1)?.hour ?? now.getTime();
      const month = new Date(origin).getUTCMonth() + 1;
      const f = reports.length
        ? hazeFeatures({
            station: s,
            reports,
            detections: fires?.detections ?? [],
            stationMonthRate: monthRate.get(`${s.icao}:${month}`) ?? null,
            asOf: now.getTime(),
          })
        : null;
      // Reports older than 3 h are stale for a nowcast: treat as missing.
      const fresh = f && now.getTime() - Date.parse(f.reportAt) <= 3 * 3_600_000 ? f : null;
      const x = fresh && fires ? fresh.x : null;
      return {
        icao: s.icao,
        issueAt: f?.issueAt ?? null,
        reportAt: f?.reportAt ?? null,
        inputProvider: f?.inputProvider ?? null,
        x,
        observed: {},
        missing: [
          ...missing,
          ...(!f ? ['no-station-report'] : !fresh ? ['station-report-stale'] : []),
        ],
      };
    });
  }

  const vsbyIdx = HAZE_FEATURES.indexOf('vsby_km');
  const stations = rows
    .map((r) => {
      const s = HM.stations.find((m) => m.icao === r.icao)!;
      const km =
        point.lat !== undefined && point.lon !== undefined
          ? Math.round(haversineKm({ lat: point.lat, lon: point.lon }, s) * 10) / 10
          : null;
      const localMissing = [...r.missing];
      if (km !== null && km > 300) localMissing.push('outside-station-coverage');
      const p6 = r.x && !localMissing.length ? probaOrNull(H6, r.x, HAZE_REQUIRED) : null;
      const p24 = r.x && !localMissing.length ? probaOrNull(H24, r.x, HAZE_REQUIRED) : null;
      if (r.x && HAZE_REQUIRED.some((i) => r.x![i] === null))
        localMissing.push('station-input-incomplete');
      return {
        icao: s.icao,
        name: s.name,
        lat: s.lat,
        lon: s.lon,
        distanceKm: km,
        issueAt: r.issueAt,
        reportAt: r.reportAt,
        inputProvider: r.inputProvider,
        target6hAt: r.issueAt ? iso(new Date(Date.parse(r.issueAt) + 6 * 3_600_000)) : null,
        target24hAt: r.issueAt ? iso(new Date(Date.parse(r.issueAt) + 24 * 3_600_000)) : null,
        missing: localMissing,
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
    state: stations.every((s) => s.p6h === null && s.p24h === null)
      ? 'unavailable'
      : inputs
        ? 'live'
        : 'demo',
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
