/** Serving arithmetic mirrored in Python features/pm25.py and features/station_wind.py. */
import { hourlyReports, rhPct, type MetarReport } from './haze-features';

export const PM25_REFERENCE = {
  name: 'Sungai Raya, Kubu Raya',
  lat: -0.0710660252,
  lon: 109.3712469865,
} as const;
export const PM25_FEATURES = [
  'pm25_now',
  'pm25_lag_1h',
  'pm25_lag_3h',
  'pm25_lag_6h',
  'pm25_lag_12h',
  'pm25_lag_24h',
  'pm25_lag_48h',
  'pm25_mean_6h',
  'pm25_mean_24h',
  'pm25_change_3h',
  'hour_sin',
  'hour_cos',
  'doy_sin',
  'doy_cos',
] as const;
export const WIND_FEATURES = [
  'u_now',
  'v_now',
  'u_lag_1h',
  'v_lag_1h',
  'u_lag_3h',
  'v_lag_3h',
  'u_lag_6h',
  'v_lag_6h',
  'u_mean_6h',
  'v_mean_6h',
  'u_mean_24h',
  'v_mean_24h',
  'tmpc',
  'rh_pct',
  'hour_sin',
  'hour_cos',
  'doy_sin',
  'doy_cos',
  'station_lat',
  'station_lon',
] as const;
const HOUR = 3_600_000;
const finite = (v: number | null | undefined): v is number =>
  typeof v === 'number' && Number.isFinite(v);
const iso = (t: number) => new Date(t).toISOString().replace('.000Z', 'Z');
export function cyclicTime(t: number): number[] {
  const d = new Date(t);
  const doy =
    Math.round(
      (Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) -
        Date.UTC(d.getUTCFullYear(), 0, 1)) /
        86_400_000,
    ) + 1;
  return [
    Math.sin((2 * Math.PI * d.getUTCHours()) / 24),
    Math.cos((2 * Math.PI * d.getUTCHours()) / 24),
    Math.sin((2 * Math.PI * doy) / 366),
    Math.cos((2 * Math.PI * doy) / 366),
  ];
}

export interface CamsInputPoint {
  validAt: string;
  pm25: number | null;
}
export function pm25Features(points: readonly CamsInputPoint[], asOf: number) {
  const eligible = points
    .filter((p) => Date.parse(p.validAt) <= Math.floor(asOf / HOUR) * HOUR)
    .sort((a, b) => a.validAt.localeCompare(b.validAt));
  const latest = eligible.at(-1);
  if (!latest) return null;
  const t = Date.parse(latest.validAt);
  if (t % HOUR !== 0) return null;
  const byTime = new Map(eligible.map((p) => [Date.parse(p.validAt), p.pm25]));
  const lag = (h: number) => {
    const v = byTime.get(t - h * HOUR);
    return finite(v) && v >= 0 ? v : null;
  };
  const mean = (h: number) => {
    const a = Array.from({ length: h }, (_, i) => lag(i));
    return a.every(finite) ? a.reduce((s, v) => s + v, 0) / h : null;
  };
  const current = lag(0),
    previous = lag(3);
  return {
    issueAt: iso(t),
    x: [
      current,
      ...[1, 3, 6, 12, 24, 48].map(lag),
      mean(6),
      mean(24),
      current !== null && previous !== null ? current - previous : null,
      ...cyclicTime(t),
    ],
  };
}

export function windComponents(
  speed: number | null,
  from: number | null,
): [number | null, number | null] {
  if (!finite(speed) || speed < 0) return [null, null];
  if (speed === 0) return [0, 0];
  if (!finite(from) || from < 0 || from > 360) return [null, null];
  const r = (from * Math.PI) / 180;
  return [-speed * Math.sin(r), -speed * Math.cos(r)];
}
export function windFromComponents(u: number, v: number) {
  const speedMs = Math.hypot(u, v);
  return {
    u,
    v,
    speedMs,
    directionFromDeg: speedMs < 0.5 ? null : ((Math.atan2(-u, -v) * 180) / Math.PI + 360) % 360,
  };
}
export function windFeatures(
  reports: readonly MetarReport[],
  station: { lat: number; lon: number },
  asOf: number,
) {
  const hours = hourlyReports(reports, asOf);
  const latest = hours.at(-1);
  if (!latest) return null;
  const t = latest.hour;
  const byHour = new Map(
    hours.map((r) => [r.hour, windComponents(r.windSpeedMs, r.windDirFromDeg)]),
  );
  const at = (lag: number) => byHour.get(t - lag * HOUR) ?? [null, null];
  const mean = (h: number) =>
    [0, 1].map((c) => {
      const a = hours
        .filter((r) => r.hour > t - h * HOUR)
        .map((r) => byHour.get(r.hour)![c])
        .filter(finite);
      return a.length ? a.reduce((s, v) => s + v, 0) / a.length : null;
    });
  return {
    issueAt: iso(t),
    reportAt: latest.validAt,
    inputProvider: latest.provider ?? 'iem',
    x: [
      ...at(0),
      ...at(1),
      ...at(3),
      ...at(6),
      ...mean(6),
      ...mean(24),
      latest.tmpc,
      rhPct(latest.tmpc, latest.dwpc),
      ...cyclicTime(t),
      station.lat,
      station.lon,
    ],
  };
}
