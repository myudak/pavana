/**
 * Live features for the airport haze model. Mirrors ml/src/pavana_ml/features/haze_station.py.
 * Reports are bucketed to the UTC hour (last report wins), windows are (t − h, t] in hours.
 */
import { DEFAULT_UPWIND_PARAMS, upwindExposureScore } from '../math/upwind';
import { haversineKm } from '../math/geo';

export const HAZE_FEATURES = [
  'vsby_km',
  'vsby_min_6h_km',
  'vsby_min_24h_km',
  'haze_now',
  'haze_frac_24h',
  'haze_frac_72h',
  'precip_frac_24h',
  'rh_pct',
  'tmpc',
  'wind_speed_ms',
  'hour_local',
  'doy',
  'det_100km_24h',
  'det_300km_72h',
  'upwind_72h',
  'station_month_rate',
] as const;

export interface MetarReport {
  provider?: 'iem' | 'noaa-awc';
  /** UTC ISO time. */
  validAt: string;
  vsbyKm: number | null;
  wxcodes: string | null;
  tmpc: number | null;
  dwpc: number | null;
  windDirFromDeg: number | null;
  windSpeedMs: number | null;
}

const PRECIP = /RA|DZ|SH|TS|GR|GS|SN|PL|UP/;
const HOUR = 3_600_000;

const ok = (v: number | null | undefined): v is number =>
  typeof v === 'number' && Number.isFinite(v);

export function wxFlags(wx: string | null) {
  const s = (wx ?? '').toUpperCase();
  return {
    haze: s.includes('HZ') || s.includes('FU'),
    precip: PRECIP.test(s),
    fog: s.includes('FG'),
  };
}

/** Same conservative IEM missing-weather resolution as data/iem.py. */
export function normaliseMetarWx(code: string | null, metar?: string | null): string | null {
  if (code !== null && code !== 'M' && code !== 'T') return code;
  if (!metar) return null;
  const body = metar.toUpperCase().split(/\b(?:TEMPO|BECMG|NOSIG)\b/)[0]!;
  if (body.includes('NIL') || !/\b\d{6}Z\b/.test(body) || body.includes('////')) return null;
  if (!/(?:\bCAVOK\b|\b\d{4}\b|\b\d+(?:\/\d+)?SM\b)/.test(body)) return null;
  const token =
    /^(?:[-+]|VC)?(?:MI|BC|PR|DR|BL|SH|TS|FZ)?(?:DZ|RA|SN|SG|IC|PL|GR|GS|UP|BR|FG|FU|VA|DU|SA|HZ|PY|PO|SQ|FC|SS|DS)+$/;
  return body
    .split(/\s+/)
    .filter((t) => token.test(t))
    .join(' ');
}

export function rhPct(t: number | null, td: number | null): number | null {
  if (!ok(t) || !ok(td)) return null;
  const a = 17.625;
  const b = 243.04;
  const rh = 100 * Math.exp((a * td) / (b + td) - (a * t) / (b + t));
  return Number.isFinite(rh) && rh >= 0 && rh <= 100 ? rh : null;
}

/** Last report per UTC hour, sorted ascending. */
export function hourlyReports(
  reports: readonly MetarReport[],
  asOf = Infinity,
): (MetarReport & { hour: number })[] {
  const byHour = new Map<number, MetarReport>();
  for (const r of [...reports].sort((a, b) => a.validAt.localeCompare(b.validAt))) {
    const t = Date.parse(r.validAt);
    const hour = Math.ceil(t / HOUR) * HOUR;
    if (Number.isFinite(t) && hour <= asOf) byHour.set(hour, r);
  }
  return [...byHour.entries()].sort((a, b) => a[0] - b[0]).map(([hour, r]) => ({ ...r, hour }));
}

export interface HazeFeatureInput {
  station: { lat: number; lon: number; tzOffsetHours: number };
  reports: readonly MetarReport[];
  detections: readonly { lat: number; lon: number; acquiredAt: string; frpMw: number | null }[];
  /** Training-period HZ/FU report rate for this station and calendar month (null if unknown). */
  stationMonthRate: number | null;
  /** Completed bins only: a 10:30 report belongs to the 11:00 origin. */
  asOf?: number;
}

/** Features at the latest report hour, or null when there is no report at all. */
export function hazeFeatures(input: HazeFeatureInput): {
  issueAt: string;
  reportAt: string;
  inputProvider: 'iem' | 'noaa-awc';
  x: (number | null)[];
} | null {
  const hours = hourlyReports(input.reports, input.asOf);
  const latest = hours[hours.length - 1];
  if (!latest) return null;
  const t = latest.hour;
  const within = (h: number) => hours.filter((r) => r.hour > t - h * HOUR && r.hour <= t);
  const vis = (rs: typeof hours) => rs.map((r) => r.vsbyKm).filter(ok);
  const minOrNull = (a: number[]) => (a.length ? Math.min(...a) : null);
  const frac = (rs: typeof hours, f: (r: MetarReport) => boolean) => {
    const rep = rs.filter((r) => ok(r.vsbyKm) && r.wxcodes !== null);
    return rep.length ? rep.filter(f).length / rep.length : null;
  };
  const calm = latest.windSpeedMs === 0;
  const windDir = calm ? null : latest.windDirFromDeg;
  const now = new Date(t);

  const near72 = input.detections
    .map((d) => ({ ...d, ageHours: (t - Date.parse(d.acquiredAt)) / HOUR }))
    .filter((d) => d.ageHours >= 0 && d.ageHours < 72);
  const det300 = near72.filter(
    (d) => haversineKm(d, input.station) <= DEFAULT_UPWIND_PARAMS.maxDistanceKm,
  ).length;
  const det100 = near72.filter(
    (d) => d.ageHours < 24 && haversineKm(d, input.station) <= 100,
  ).length;
  const upwind = ok(windDir) ? upwindExposureScore(input.station, windDir, near72).score : null;

  const haze =
    latest.vsbyKm === null || latest.wxcodes === null ? null : wxFlags(latest.wxcodes).haze ? 1 : 0;
  const doy =
    Math.round(
      (Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) -
        Date.UTC(now.getUTCFullYear(), 0, 1)) /
        86_400_000,
    ) + 1;
  return {
    issueAt: now.toISOString().replace(/\.\d{3}Z$/, 'Z'),
    reportAt: latest.validAt,
    inputProvider: latest.provider ?? 'iem',
    x: [
      ok(latest.vsbyKm) ? latest.vsbyKm : null,
      minOrNull(vis(within(6))),
      minOrNull(vis(within(24))),
      haze,
      frac(within(24), (r) => wxFlags(r.wxcodes).haze),
      frac(within(72), (r) => wxFlags(r.wxcodes).haze),
      frac(within(24), (r) => wxFlags(r.wxcodes).precip),
      rhPct(latest.tmpc, latest.dwpc),
      ok(latest.tmpc) ? latest.tmpc : null,
      ok(latest.windSpeedMs) ? latest.windSpeedMs : null,
      (now.getUTCHours() + input.station.tzOffsetHours) % 24,
      doy,
      det100,
      det300,
      upwind,
      input.stationMonthRate,
    ],
  };
}
