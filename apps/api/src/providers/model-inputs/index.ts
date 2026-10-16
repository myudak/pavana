/**
 * Live inputs for the experimental Pavana models. All keyless:
 * - NASA FIRMS Suomi NPP VIIRS 7-day South-East Asia CSV (same sensor the models were trained on)
 * - Open-Meteo forecast API daily aggregates with `past_days` (rain history, RH, VPD)
 * - Iowa Environmental Mesonet METAR (airport visibility + present weather)
 * Upstream failures surface as missing inputs (→ null probabilities), never as zeros.
 */
import type { MetarReport } from '@pavana/shared';
import { MINUTE, TtlCache } from '../../lib/cache';
import { fetchJson, fetchText, type FetchLike } from '../../lib/http';

const FIRMS_7D =
  'https://firms.modaps.eosdis.nasa.gov/data/active_fire/suomi-npp-viirs-c2/csv/SUOMI_VIIRS_C2_SouthEast_Asia_7d.csv';
const OM_FORECAST = 'https://api.open-meteo.com/v1/forecast';
const IEM_ASOS = 'https://mesonet.agron.iastate.edu/cgi-bin/request/asos.py';
/** (west, south, east, north) — same region as the training archive (sensor-gap test). */
const REGION = [93, -9, 122, 9] as const;

export interface Detection {
  lat: number;
  lon: number;
  acquiredAt: string;
  frpMw: number | null;
}

export interface ModelInputs {
  /** Suomi NPP detections over the region for the last ~7 days, plus the UTC days seen. */
  recentDetections(): Promise<{ detections: Detection[]; daysSeen: Set<string>; fetchedAt: string }>;
  /** Daily weather (UTC days) for points, oldest first, the last element = `endDay`. */
  dailyWeather(
    points: readonly { lat: number; lon: number }[],
    endDay: string,
  ): Promise<Map<string, Record<'precipMm' | 'rhMinPct' | 'tmaxC' | 'windMaxMs' | 'vpdMaxKpa', (number | null)[]>>>;
  /** METAR reports of the last 72 h per station. */
  metar(icaos: readonly string[], now: Date): Promise<Map<string, MetarReport[]>>;
}

const num = (s: string | undefined) => {
  const t = (s ?? '').trim();
  if (t === '' || t === 'M' || t === 'T') return null;
  const v = Number(t);
  return Number.isFinite(v) ? v : null;
};

export function parseFirms7d(csv: string): Detection[] {
  const lines = csv.trim().split(/\r?\n/);
  const head = lines[0]?.split(',') ?? [];
  const i = (k: string) => head.indexOf(k);
  const [iLat, iLon, iDate, iTime, iFrp] = ['latitude', 'longitude', 'acq_date', 'acq_time', 'frp'].map(i);
  if (iLat! < 0 || iDate! < 0) throw new Error('unexpected FIRMS CSV');
  const out: Detection[] = [];
  for (const line of lines.slice(1)) {
    const f = line.split(',');
    const lat = num(f[iLat!]);
    const lon = num(f[iLon!]);
    const time = (f[iTime!] ?? '').trim().padStart(4, '0');
    if (lat === null || lon === null || !/^\d{4}$/.test(time)) continue;
    if (lon < REGION[0] || lon > REGION[2] || lat < REGION[1] || lat > REGION[3]) continue;
    const frp = num(f[iFrp!]);
    out.push({
      lat,
      lon,
      acquiredAt: `${f[iDate!]!.trim()}T${time.slice(0, 2)}:${time.slice(2)}:00Z`,
      frpMw: frp !== null && frp >= 0 ? frp : null,
    });
  }
  return out;
}

export function parseAsos(csv: string): Map<string, MetarReport[]> {
  const out = new Map<string, MetarReport[]>();
  const lines = csv.trim().split(/\r?\n/);
  const head = lines[0]?.split(',') ?? [];
  if (head[0] !== 'station') return out;
  const i = (k: string) => head.indexOf(k);
  const f2c = (v: number | null) => (v === null ? null : ((v - 32) * 5) / 9);
  for (const line of lines.slice(1)) {
    const f = line.split(',');
    const station = f[i('station')]!;
    const vsby = num(f[i('vsby')]);
    const sknt = num(f[i('sknt')]);
    const wx = (f[i('wxcodes')] ?? '').trim();
    const report: MetarReport = {
      validAt: `${f[i('valid')]!.trim().replace(' ', 'T')}:00Z`,
      vsbyKm: vsby === null ? null : vsby * 1.609344,
      wxcodes: wx === '' || wx === 'M' ? null : wx,
      tmpc: f2c(num(f[i('tmpf')])),
      dwpc: f2c(num(f[i('dwpf')])),
      windDirFromDeg: num(f[i('drct')]),
      windSpeedMs: sknt === null ? null : sknt * 0.514444,
    };
    if (!out.has(station)) out.set(station, []);
    out.get(station)!.push(report);
  }
  return out;
}

export const pointKey = (p: { lat: number; lon: number }) => `${p.lat.toFixed(2)},${p.lon.toFixed(2)}`;

export function createModelInputs(deps: { fetch?: FetchLike; cache?: TtlCache; now?: () => Date } = {}): ModelInputs {
  const cache = deps.cache ?? new TtlCache();
  const now = deps.now ?? (() => new Date());

  return {
    recentDetections: () =>
      cache.get('model:firms7d', 30 * MINUTE, async () => {
        const csv = await fetchText(FIRMS_7D, { fetch: deps.fetch, source: 'nasa-firms-7d', timeoutMs: 20_000 });
        const detections = parseFirms7d(csv);
        return {
          detections,
          daysSeen: new Set(detections.map((d) => d.acquiredAt.slice(0, 10))),
          fetchedAt: now().toISOString().replace(/\.\d{3}Z$/, 'Z'),
        };
      }),

    dailyWeather: (points, endDay) =>
      cache.get(`model:weather:${endDay}:${points.length}`, 60 * MINUTE, async () => {
        const out = new Map<string, Record<'precipMm' | 'rhMinPct' | 'tmaxC' | 'windMaxMs' | 'vpdMaxKpa', (number | null)[]>>();
        for (let k = 0; k < points.length; k += 50) {
          const chunk = points.slice(k, k + 50);
          const url =
            `${OM_FORECAST}?latitude=${chunk.map((p) => p.lat).join(',')}` +
            `&longitude=${chunk.map((p) => p.lon).join(',')}` +
            '&daily=precipitation_sum,relative_humidity_2m_min,temperature_2m_max,wind_speed_10m_max,vapour_pressure_deficit_max' +
            '&past_days=61&forecast_days=1&timezone=GMT&wind_speed_unit=ms';
          const body = await fetchJson<unknown>(url, { fetch: deps.fetch, source: 'open-meteo', timeoutMs: 20_000 });
          const blocks = (Array.isArray(body) ? body : [body]) as {
            daily?: Record<string, (number | null)[] | string[]>;
          }[];
          chunk.forEach((p, j) => {
            const d = blocks[j]?.daily;
            if (!d) return;
            const days = d['time'] as string[];
            const end = days.indexOf(endDay);
            if (end < 0) return;
            const take = (k2: string) => ((d[k2] ?? []) as (number | null)[]).slice(0, end + 1);
            out.set(pointKey(p), {
              precipMm: take('precipitation_sum'),
              rhMinPct: take('relative_humidity_2m_min'),
              tmaxC: take('temperature_2m_max'),
              windMaxMs: take('wind_speed_10m_max'),
              vpdMaxKpa: take('vapour_pressure_deficit_max'),
            });
          });
        }
        return out;
      }),

    metar: (icaos, at) =>
      cache.get(`model:metar:${icaos.join(',')}:${Math.floor(at.getTime() / (10 * MINUTE))}`, 10 * MINUTE, async () => {
        const from = new Date(at.getTime() - 73 * 3_600_000);
        const to = new Date(at.getTime() + 25 * 3_600_000); // day2 is exclusive
        const q = new URLSearchParams();
        for (const s of icaos) q.append('station', s);
        for (const d of ['vsby', 'wxcodes', 'tmpf', 'dwpf', 'drct', 'sknt']) q.append('data', d);
        q.set('year1', String(from.getUTCFullYear()));
        q.set('month1', String(from.getUTCMonth() + 1));
        q.set('day1', String(from.getUTCDate()));
        q.set('year2', String(to.getUTCFullYear()));
        q.set('month2', String(to.getUTCMonth() + 1));
        q.set('day2', String(to.getUTCDate()));
        q.set('tz', 'Etc/UTC');
        q.set('format', 'onlycomma');
        q.set('missing', 'M');
        q.set('trace', 'T');
        q.append('report_type', '3');
        q.append('report_type', '4');
        const csv = await fetchText(`${IEM_ASOS}?${q}`, { fetch: deps.fetch, source: 'iem-metar', timeoutMs: 20_000 });
        return parseAsos(csv);
      }),
  };
}
