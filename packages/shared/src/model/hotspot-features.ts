/**
 * Live features for the hotspot-risk model. Mirrors ml/src/pavana_ml/features/hotspot_grid.py
 * (same names, windows and NaN rules). Missing → null, never 0.
 */

export const HOTSPOT_FEATURES = [
  'det_cell_1d',
  'det_cell_3d',
  'det_cell_6d',
  'det_nbr_1d',
  'det_nbr_6d',
  'det_wide_6d',
  'days_since_det',
  'precip_1d_mm',
  'precip_7d_mm',
  'precip_30d_mm',
  'precip_60d_mm',
  'dry_days',
  'rh_min_pct',
  'tmax_c',
  'wind_max_ms',
  'vpd_max_kpa',
  'vpd_7d_mean_kpa',
  'doy',
  'cell_hist_rate',
] as const;

export interface HotspotGridMeta {
  bbox: [number, number, number, number];
  cellDeg: number;
  nCols: number;
  nRows: number;
  cells: {
    id: number;
    lat: number;
    lon: number;
    histRate: number;
    weatherLat: number;
    weatherLon: number;
  }[];
}

/** Daily weather for one point, oldest first, the last entry = issue day. Length ≥ 60. */
export interface DailyWeather {
  precipMm: (number | null)[];
  rhMinPct: (number | null)[];
  tmaxC: (number | null)[];
  windMaxMs: (number | null)[];
  vpdMaxKpa: (number | null)[];
}

const DRY_DAY_MM = 1;
const DRY_DAYS_CAP = 60;
/** Detection windows: lags 0..5, all inside the keyless 7×24 h FIRMS file. */
const DET_DAYS = 6;
const DAYS_SINCE_CAP = DET_DAYS;

const isNum = (v: number | null | undefined): v is number =>
  typeof v === 'number' && Number.isFinite(v);

/** Sum of the last k values; null if any is missing or history is short. */
function tailSum(a: readonly (number | null)[], k: number): number | null {
  if (a.length < k) return null;
  let s = 0;
  for (let i = a.length - k; i < a.length; i++) {
    const v = a[i];
    if (!isNum(v)) return null;
    s += v;
  }
  return s;
}

function dryDays(p: readonly (number | null)[]): number | null {
  // Walk forward like the Python run so a missing day resets to unknown.
  let run: number | null = null;
  for (const v of p) {
    if (!isNum(v)) run = null;
    else run = v < DRY_DAY_MM ? Math.min((run ?? 0) + 1, DRY_DAYS_CAP) : 0;
  }
  return run;
}

export function cellIndex(grid: HotspotGridMeta, lat: number, lon: number): number {
  const col = Math.floor((lon - grid.bbox[0]) / grid.cellDeg);
  const row = Math.floor((lat - grid.bbox[1]) / grid.cellDeg);
  if (col < 0 || col >= grid.nCols || row < 0 || row >= grid.nRows) return -1;
  return row * grid.nCols + col;
}

/**
 * Daily detection counts per cell: `counts[lag][cell]`, lag 0 = issue day … 5.
 * `dayOk[lag]` false = the sensor delivered nothing that day, or the day starts before the
 * file's coverage (`coverageStartMs`) and may be cut — unknown, not zero.
 */
export interface DetectionWindow {
  counts: Float32Array[];
  dayOk: boolean[];
}

export function detectionWindow(
  grid: HotspotGridMeta,
  detections: readonly { lat: number; lon: number; acquiredAt: string }[],
  issueDay: string,
  regionDaysSeen: ReadonlySet<string>,
  coverageStartMs?: number,
): DetectionWindow {
  const n = grid.nCols * grid.nRows;
  const base = Date.parse(`${issueDay}T00:00:00Z`);
  const counts = Array.from({ length: DET_DAYS }, () => new Float32Array(n));
  const dayOk: boolean[] = [];
  for (let lag = 0; lag < DET_DAYS; lag++) {
    const start = base - lag * 86_400_000;
    const covered = coverageStartMs === undefined || start >= coverageStartMs;
    dayOk.push(covered && regionDaysSeen.has(new Date(start).toISOString().slice(0, 10)));
  }
  for (const d of detections) {
    const lag = Math.round(
      (base - Date.parse(`${d.acquiredAt.slice(0, 10)}T00:00:00Z`)) / 86_400_000,
    );
    if (lag < 0 || lag >= DET_DAYS) continue;
    const c = cellIndex(grid, d.lat, d.lon);
    if (c >= 0) counts[lag]![c]! += 1;
  }
  return { counts, dayOk };
}

function boxSum(grid: HotspotGridMeta, counts: Float32Array, cell: number, r: number): number {
  const row = Math.floor(cell / grid.nCols);
  const col = cell % grid.nCols;
  let s = 0;
  for (let i = Math.max(0, row - r); i <= Math.min(grid.nRows - 1, row + r); i++)
    for (let j = Math.max(0, col - r); j <= Math.min(grid.nCols - 1, col + r); j++)
      s += counts[i * grid.nCols + j]!;
  return s;
}

function windowSum(w: DetectionWindow, k: number, f: (lag: number) => number): number | null {
  let s = 0;
  for (let lag = 0; lag < k; lag++) {
    if (!w.dayOk[lag]) return null;
    s += f(lag);
  }
  return s;
}

export function hotspotFeatures(
  grid: HotspotGridMeta,
  cell: HotspotGridMeta['cells'][number],
  w: DetectionWindow,
  weather: DailyWeather | null,
  issueDay: string,
): (number | null)[] {
  const c = cell.id;
  const at = (lag: number) => w.counts[lag]![c]!;
  const nbr = (lag: number) => boxSum(grid, w.counts[lag]!, c, 1);
  const wide = (lag: number) => boxSum(grid, w.counts[lag]!, c, 3);
  let daysSince: number | null = DAYS_SINCE_CAP;
  for (let lag = 0; lag < DAYS_SINCE_CAP; lag++) {
    if (!w.dayOk[lag]) {
      daysSince = null;
      break;
    }
    if (at(lag) > 0) {
      daysSince = lag;
      break;
    }
  }
  const last = <T>(a: readonly T[] | undefined) => (a && a.length ? a[a.length - 1]! : null);
  const p = weather?.precipMm ?? [];
  const vpd7 = weather ? tailSum(weather.vpdMaxKpa, 7) : null;
  const d = new Date(`${issueDay}T00:00:00Z`);
  const doy = Math.round((d.getTime() - Date.UTC(d.getUTCFullYear(), 0, 1)) / 86_400_000) + 1;
  const num = (v: number | null | undefined) => (isNum(v) ? v : null);
  return [
    w.dayOk[0] ? at(0) : null,
    windowSum(w, 3, at),
    windowSum(w, DET_DAYS, at),
    w.dayOk[0] ? nbr(0) : null,
    windowSum(w, DET_DAYS, nbr),
    windowSum(w, DET_DAYS, wide),
    daysSince,
    num(last(p)),
    tailSum(p, 7),
    tailSum(p, 30),
    tailSum(p, 60),
    weather ? dryDays(p) : null,
    num(last(weather?.rhMinPct)),
    num(last(weather?.tmaxC)),
    num(last(weather?.windMaxMs)),
    num(last(weather?.vpdMaxKpa)),
    vpd7 === null ? null : vpd7 / 7,
    doy,
    cell.histRate,
  ];
}
