/** Narrow experimental CAMS-proxy policy, separate from observed-target models. */
import {
  PM25_FEATURES,
  PM25_REFERENCE,
  WIND_FEATURES,
  haversineKm,
  pm25Features,
  predictRaw,
  rankContributions,
  shapContributions,
  windFeatures,
  windFromComponents,
  type GbdtModel,
  type ModelFactor,
  type Pm25ModelResponse,
  type WindModelResponse,
  type RegressionEvaluation,
} from '@pavana/shared';
import pmModel from '../models/pm25.model.json' with { type: 'json' };
import pmMeta from '../models/pm25.meta.json' with { type: 'json' };
import pmDemo from '../models/pm25.demo.json' with { type: 'json' };
import uModel from '../models/wind-u.model.json' with { type: 'json' };
import vModel from '../models/wind-v.model.json' with { type: 'json' };
import windMeta from '../models/wind.meta.json' with { type: 'json' };
import windDemo from '../models/wind.demo.json' with { type: 'json' };
import type { ModelInputs } from '../providers/model-inputs';

type Meta = {
  version: string;
  target: string;
  targetKind: 'observation' | 'model';
  evaluated: boolean;
  experimental: boolean;
  operationalReady: boolean;
  servingPolicy?: string;
  windows: RegressionEvaluation['windows'];
  metrics: { test: RegressionEvaluation['test'] };
  limitations: string[];
};
const PM = pmModel as unknown as GbdtModel,
  U = uModel as unknown as GbdtModel,
  V = vModel as unknown as GbdtModel;
const P = pmMeta as unknown as Meta & {
  globalImportance: RegressionEvaluation['importance'];
  camsProvenance: { seriesCoordinates: { lat: number; lon: number } };
};
const W = windMeta as unknown as Meta & {
  stations: { icao: string; name: string; lat: number; lon: number; tzOffsetHours: number }[];
  globalImportance: {
    u: RegressionEvaluation['importance'];
    v: RegressionEvaluation['importance'];
  };
};
function assertModel(model: GbdtModel, names: readonly string[], meta: Meta, kind: string) {
  if (
    model.objective !== 'regression' ||
    model.featureNames.join('|') !== names.join('|') ||
    !model.trees.length ||
    !meta.evaluated ||
    !meta.experimental ||
    meta.operationalReady ||
    meta.targetKind !== kind
  )
    throw new Error('Invalid experimental regression artifact');
}
assertModel(PM, PM25_FEATURES, P, 'model');
assertModel(U, WIND_FEATURES, W, 'observation');
assertModel(V, WIND_FEATURES, W, 'observation');
if (P.servingPolicy !== 'experimental-cams-proxy')
  throw new Error('CAMS proxy requires its explicit serving policy');
const HOUR = 3_600_000;
const iso = (t: number) => new Date(t).toISOString().replace('.000Z', 'Z');
type Point = { lat: number; lon: number };
function distance(reference: Point, point: Partial<Point>) {
  return point.lat === undefined || point.lon === undefined
    ? null
    : Math.round(haversineKm(reference, point as Point) * 10) / 10;
}
const explain = (model: GbdtModel, x: (number | null)[]): ModelFactor[] =>
  rankContributions(model, x, shapContributions(model, x))
    .slice(0, 5)
    .map(({ feature, value, shap }) => ({ feature, value, shap }));

export async function getPm25(
  inputs: ModelInputs | null,
  point: Partial<Point>,
  now: Date,
): Promise<Pm25ModelResponse> {
  const missing: string[] = [];
  let x: (number | null)[] | null = null,
    inputAt: string | null = null;
  let fetchedAt = iso(now.getTime()),
    replayTargetUgM3: number | null = null;
  const km = distance(PM25_REFERENCE, point);
  // The result belongs to the named reference, with no interpolation to a remote location.
  if (km !== null && km > 25) missing.push('outside-reference-coverage');
  if (!inputs) {
    const d = pmDemo as { issueAt: string; x: (number | null)[]; observed: number };
    x = d.x;
    inputAt = d.issueAt;
    replayTargetUgM3 = d.observed;
  } else {
    const source = await inputs.camsHistory().catch(() => null);
    if (!source) missing.push('cams-source-unavailable');
    else {
      fetchedAt = source.fetchedAt;
      if (
        haversineKm(
          { lat: source.gridLat, lon: source.gridLon },
          P.camsProvenance.seriesCoordinates,
        ) > 1
      )
        missing.push('cams-grid-mismatch');
      const f = pm25Features(source.points, now.getTime());
      inputAt = f?.issueAt ?? null;
      x = f?.x ?? null;
      if (!inputAt || now.getTime() - Date.parse(inputAt) > 2 * HOUR)
        missing.push('cams-input-stale');
    }
  }
  if (!x || x.some((v) => v === null || !Number.isFinite(v)))
    missing.push('cams-history-incomplete');
  let prediction = missing.length || !x ? null : predictRaw(PM, x);
  if (prediction !== null && (!Number.isFinite(prediction) || prediction < 0)) {
    prediction = null;
    missing.push('invalid-model-output');
  }
  const targetAt = inputAt ? iso(Date.parse(inputAt) + 6 * HOUR) : null;
  return {
    state: prediction === null ? 'unavailable' : inputs ? 'live' : 'demo',
    model: {
      id: 'pm25',
      version: P.version,
      target: P.target,
      targetKind: 'model',
      servingPolicy: 'experimental-cams-proxy',
      experimental: true,
      evaluated: true,
      operationalReady: false,
    },
    reference: {
      ...PM25_REFERENCE,
      distanceKm: km,
      gridLat: P.camsProvenance.seriesCoordinates.lat,
      gridLon: P.camsProvenance.seriesCoordinates.lon,
    },
    inputAt,
    targetAt,
    pm25UgM3: prediction,
    currentCamsUgM3: x?.[0] ?? null,
    factors: prediction === null || !x ? [] : explain(PM, x),
    shapUnit: 'µg/m³',
    replayTargetUgM3,
    missing,
    provenance: {
      provider: 'pavana-model-cams-proxy',
      kind: 'derived',
      fetchedAt,
      validAt: targetAt ?? iso(now.getTime()),
      isDemo: !inputs,
      notes:
        'Estimasi terhadap keluaran CAMS pada titik referensi Sungai Raya. Bukan observasi stasiun; eksperimen belum siap operasional. Waktu rilis CAMS tidak tersedia.',
    },
  };
}

export async function getWindModel(
  inputs: ModelInputs | null,
  point: Partial<Point>,
  now: Date,
): Promise<WindModelResponse> {
  const missing: string[] = [];
  const covered = W.stations.filter((s) => (distance(s, point) ?? 0) <= 300);
  const metar =
    inputs && covered.length
      ? await inputs
          .metar(
            covered.map((s) => s.icao),
            now,
          )
          .catch(() => null)
      : inputs
        ? new Map()
        : null;
  if (inputs && !metar) missing.push('iem-metar-unavailable');
  const replay = windDemo as {
    rows: { station: string; issueAt: string; reportAt: string; x: (number | null)[] }[];
  };
  const stations = W.stations
    .map((s) => {
      const localMissing: string[] = [...missing];
      const km = distance(s, point);
      if (km !== null && km > 300) localMissing.push('outside-station-coverage');
      const f = inputs
        ? windFeatures(metar?.get(s.icao) ?? [], s, now.getTime())
        : (replay.rows.find((r) => r.station === s.icao) ?? null);
      if (!f) localMissing.push('no-station-report');
      else if (inputs && now.getTime() - Date.parse(f.reportAt) > 3 * HOUR)
        localMissing.push('station-report-stale');
      if (f && [0, 1, 12, 13].some((i) => f.x[i] === null || !Number.isFinite(f.x[i])))
        localMissing.push('station-input-incomplete');
      const uv = localMissing.length || !f ? null : [predictRaw(U, f.x), predictRaw(V, f.x)];
      const valid = uv && uv.every(Number.isFinite);
      if (uv && !valid) localMissing.push('invalid-model-output');
      const vector = valid
        ? windFromComponents(uv[0]!, uv[1]!)
        : { u: null, v: null, speedMs: null, directionFromDeg: null };
      return {
        ...s,
        distanceKm: km,
        inputAt: f?.issueAt ?? null,
        reportAt: f?.reportAt ?? null,
        inputProvider: f ? ('inputProvider' in f ? f.inputProvider : ('iem' as const)) : null,
        targetAt: f ? iso(Date.parse(f.issueAt) + 6 * HOUR) : null,
        ...vector,
        factorsU: valid && f ? explain(U, f.x) : [],
        factorsV: valid && f ? explain(V, f.x) : [],
        missing: localMissing,
      };
    })
    .sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0));
  return {
    state: stations.every((s) => s.speedMs === null) ? 'unavailable' : inputs ? 'live' : 'demo',
    model: {
      id: 'wind',
      version: W.version,
      target: W.target,
      targetKind: 'observation',
      experimental: true,
      evaluated: true,
      operationalReady: false,
    },
    stations,
    shapUnit: 'u/v m/s',
    missing,
    provenance: {
      provider: 'pavana-model-metar',
      kind: 'derived',
      fetchedAt: iso(now.getTime()),
      validAt: stations[0]?.targetAt ?? iso(now.getTime()),
      isDemo: !inputs,
      notes:
        'Prediksi angin bandara dari METAR. Arah meteorologis FROM; arah tidak ditampilkan untuk kecepatan < 0,5 m/s. Bukan angin di rumah pengguna.',
    },
  };
}

export function getRegressionEvaluations(): RegressionEvaluation[] {
  return [
    {
      id: 'pm25',
      version: P.version,
      title: 'Estimasi PM2.5 terhadap CAMS',
      target: P.target,
      targetKind: 'model',
      windows: P.windows,
      test: P.metrics.test,
      unit: 'µg/m³',
      shapUnit: 'µg/m³',
      importance: P.globalImportance,
      limitations: P.limitations,
    },
    {
      id: 'wind',
      version: W.version,
      title: 'Angin stasiun t+6 jam',
      target: W.target,
      targetKind: 'observation',
      windows: W.windows,
      test: W.metrics.test,
      unit: 'm/s',
      shapUnit: 'u/v m/s',
      importance: [
        ...W.globalImportance.u.slice(0, 4).map((r) => ({ ...r, feature: `u:${r.feature}` })),
        ...W.globalImportance.v.slice(0, 4).map((r) => ({ ...r, feature: `v:${r.feature}` })),
      ],
      limitations: W.limitations,
    },
  ];
}
