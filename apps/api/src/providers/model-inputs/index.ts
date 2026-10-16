/**
 * Live inputs for the experimental Pavana models. All keyless:
 * - NASA FIRMS Suomi NPP VIIRS 7-day South-East Asia CSV (same sensor the models were trained on)
 * - Open-Meteo forecast API daily aggregates with `past_days` (rain history, RH, VPD)
 * - Iowa Environmental Mesonet METAR (airport visibility + present weather)
 * Upstream failures surface as missing inputs (→ null probabilities), never as zeros.
 */
import {
  normaliseMetarWx,
  PM25_REFERENCE,
  type CamsInputPoint,
  type MetarReport,
} from '@pavana/shared';
import { MINUTE, TtlCache } from '../../lib/cache';
import { fetchJson, fetchText, type FetchLike } from '../../lib/http';
import { parseNoaaMetar } from './noaa-metar';

const FIRMS_7D =
  'https://firms.modaps.eosdis.nasa.gov/data/active_fire/suomi-npp-viirs-c2/csv/SUOMI_VIIRS_C2_SouthEast_Asia_7d.csv';
const OM_FORECAST = 'https://api.open-meteo.com/v1/forecast';
const OM_ARCHIVE = 'https://archive-api.open-meteo.com/v1/archive';
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
  recentDetections(): Promise<{
    detections: Detection[];
    daysSeen: Set<string>;
    fetchedAt: string;
  }>;
  /** Daily weather (UTC days) for points, oldest first, the last element = `endDay`. */
  dailyWeather(
    points: readonly { lat: number; lon: number }[],
    endDay: string,
  ): Promise<
    Map<
      string,
      Record<'precipMm' | 'rhMinPct' | 'tmaxC' | 'windMaxMs' | 'vpdMaxKpa', (number | null)[]>
    >
  >;
  /** METAR reports of the last 72 h per station. */
  metar(icaos: readonly string[], now: Date): Promise<Map<string, MetarReport[]>>;
  camsHistory(): Promise<{
    points: CamsInputPoint[];
    fetchedAt: string;
    gridLat: number;
    gridLon: number;
  }>;
}

const num = (s: string | undefined) => {
  const t = (s ?? '').trim();
  if (t === '' || t === 'M' || t === 'T') return null;
  const v = Number(t);
  return Number.isFinite(v) ? v : null;
};

function weatherNumber(field: string, value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  if (field === 'relative_humidity_2m_min' && (value < 0 || value > 100)) return null;
  if (
    ['precipitation_sum', 'wind_speed_10m_max', 'vapour_pressure_deficit_max'].includes(field) &&
    value < 0
  )
    return null;
  return value;
}

/** IEM quotes raw reports containing commas; retain their fields as a whole. */
function csvFields(line: string): string[] {
  const fields: string[] = [];
  let value = '',
    quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i]!;
    if (c === '"') {
      if (quoted && line[i + 1] === '"') {
        value += '"';
        i++;
      } else quoted = !quoted;
    } else if (c === ',' && !quoted) {
      fields.push(value);
      value = '';
    } else value += c;
  }
  fields.push(value);
  return fields;
}

export function parseFirms7d(csv: string): Detection[] {
  const lines = csv.trim().split(/\r?\n/);
  const head = csvFields(lines[0] ?? '');
  const i = (k: string) => head.indexOf(k);
  const [iLat, iLon, iDate, iTime, iFrp] = [
    'latitude',
    'longitude',
    'acq_date',
    'acq_time',
    'frp',
  ].map(i);
  if ([iLat, iLon, iDate, iTime, iFrp].some((v) => v === undefined || v < 0))
    throw new Error('unexpected FIRMS CSV');
  const out: Detection[] = [];
  const seen = new Set<string>();
  for (const line of lines.slice(1)) {
    const f = csvFields(line);
    const lat = num(f[iLat!]);
    const lon = num(f[iLon!]);
    const time = (f[iTime!] ?? '').trim().padStart(4, '0');
    if (lat === null || lon === null || !/^\d{4}$/.test(time)) continue;
    if (lon < REGION[0] || lon > REGION[2] || lat < REGION[1] || lat > REGION[3]) continue;
    const frp = num(f[iFrp!]);
    const acquiredAt = `${f[iDate!]!.trim()}T${time.slice(0, 2)}:${time.slice(2)}:00Z`;
    if (
      !Number.isFinite(Date.parse(acquiredAt)) ||
      new Date(acquiredAt).toISOString().slice(0, 10) !== f[iDate!]!.trim()
    )
      continue;
    const key = `${lat},${lon},${acquiredAt}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      lat,
      lon,
      acquiredAt,
      frpMw: frp !== null && frp >= 0 ? frp : null,
    });
  }
  return out;
}

export function parseAsos(csv: string): Map<string, MetarReport[]> {
  const out = new Map<string, MetarReport[]>();
  const lines = csv.trim().split(/\r?\n/);
  const head = csvFields(lines[0] ?? '');
  if (head[0] !== 'station') return out;
  const i = (k: string) => head.indexOf(k);
  if (['station', 'valid', 'vsby', 'wxcodes', 'tmpf', 'dwpf', 'drct', 'sknt'].some((k) => i(k) < 0))
    throw new Error('unexpected METAR CSV');
  const f2c = (v: number | null) => (v === null ? null : ((v - 32) * 5) / 9);
  for (const line of lines.slice(1)) {
    const f = csvFields(line);
    const station = f[i('station')]!;
    const vsby = num(f[i('vsby')]);
    const sknt = num(f[i('sknt')]);
    const wx = (f[i('wxcodes')] ?? '').trim();
    const report: MetarReport = {
      provider: 'iem',
      validAt: `${f[i('valid')]!.trim().replace(' ', 'T')}:00Z`,
      vsbyKm: vsby === null || vsby < 0 ? null : vsby * 1.609344,
      wxcodes: normaliseMetarWx(wx === 'M' ? null : wx, f[i('metar')]),
      tmpc: f2c(num(f[i('tmpf')])),
      dwpc: f2c(num(f[i('dwpf')])),
      windDirFromDeg: (() => {
        const v = num(f[i('drct')]);
        return v !== null && v >= 0 && v <= 360 ? v : null;
      })(),
      windSpeedMs: sknt === null || sknt < 0 ? null : sknt * 0.514444,
    };
    if (!Number.isFinite(Date.parse(report.validAt))) continue;
    if (!out.has(station)) out.set(station, []);
    out.get(station)!.push(report);
  }
  return out;
}

export const pointKey = (p: { lat: number; lon: number }) =>
  `${p.lat.toFixed(2)},${p.lon.toFixed(2)}`;

export function createModelInputs(
  deps: { fetch?: FetchLike; cache?: TtlCache; now?: () => Date } = {},
): ModelInputs {
  const now = deps.now ?? (() => new Date());
  const cache = deps.cache ?? new TtlCache(500, () => now().getTime(), 0);

  return {
    recentDetections: () =>
      cache.get('model:firms7d', 30 * MINUTE, async () => {
        const csv = await fetchText(FIRMS_7D, {
          fetch: deps.fetch,
          source: 'nasa-firms-7d',
          timeoutMs: 90_000,
        });
        const detections = parseFirms7d(csv);
        return {
          detections,
          daysSeen: new Set(detections.map((d) => d.acquiredAt.slice(0, 10))),
          fetchedAt: now()
            .toISOString()
            .replace(/\.\d{3}Z$/, 'Z'),
        };
      }),

    dailyWeather: (points, endDay) =>
      cache.get(
        `model:weather:${endDay}:${points.map(pointKey).join(';')}`,
        60 * MINUTE,
        async () => {
          const out = new Map<
            string,
            Record<'precipMm' | 'rhMinPct' | 'tmaxC' | 'windMaxMs' | 'vpdMaxKpa', (number | null)[]>
          >();
          for (let k = 0; k < points.length; k += 50) {
            const chunk = points.slice(k, k + 50);
            const url =
              `${OM_FORECAST}?latitude=${chunk.map((p) => p.lat).join(',')}` +
              `&longitude=${chunk.map((p) => p.lon).join(',')}` +
              '&daily=precipitation_sum,relative_humidity_2m_min,temperature_2m_max,wind_speed_10m_max,vapour_pressure_deficit_max' +
              '&past_days=61&forecast_days=1&timezone=GMT&wind_speed_unit=ms';
            const body = await fetchJson<unknown>(url, {
              fetch: deps.fetch,
              source: 'open-meteo',
              timeoutMs: 20_000,
            });
            const blocks = (Array.isArray(body) ? body : [body]) as {
              daily?: Record<string, (number | null)[] | string[]>;
            }[];
            chunk.forEach((p, j) => {
              const d = blocks[j]?.daily;
              if (!d) return;
              const days = d['time'] as string[];
              const end = days.indexOf(endDay);
              if (end < 0) return;
              const index = new Map(days.map((date, i) => [date, i]));
              if (index.size !== days.length) return;
              const lastDay = Date.parse(`${endDay}T00:00:00Z`);
              const take = (k2: string) =>
                Array.from({ length: 61 }, (_, lag) => {
                  const date = new Date(lastDay - (60 - lag) * 86_400_000)
                    .toISOString()
                    .slice(0, 10);
                  const i = index.get(date);
                  const value = i === undefined ? null : d[k2]?.[i];
                  return weatherNumber(k2, value);
                });
              out.set(pointKey(p), {
                precipMm: take('precipitation_sum'),
                rhMinPct: take('relative_humidity_2m_min'),
                tmaxC: take('temperature_2m_max'),
                windMaxMs: take('wind_speed_10m_max'),
                vpdMaxKpa: take('vapour_pressure_deficit_max'),
              });
            });
            // Forecast history has a shorter usable precipitation edge than its date array.
            // Backfill only missing old dates from the same historical archive used in training.
            // This is a few days × the existing points, not a second multi-year fetch.
            const endMs = Date.parse(`${endDay}T00:00:00Z`);
            const requiredDays = Array.from({ length: 61 }, (_, i) =>
              new Date(endMs - (60 - i) * 86_400_000).toISOString().slice(0, 10),
            );
            const gaps = requiredDays.filter(
              (date, i) =>
                Date.parse(date) <= endMs - 5 * 86_400_000 &&
                chunk.some((p) => {
                  const values = out.get(pointKey(p));
                  return values && Object.values(values).some((v) => v[i] === null);
                }),
            );
            if (gaps.length) {
              const archive = await fetchJson<unknown>(
                `${OM_ARCHIVE}?latitude=${chunk.map((p) => p.lat).join(',')}` +
                  `&longitude=${chunk.map((p) => p.lon).join(',')}` +
                  `&start_date=${gaps[0]}&end_date=${gaps.at(-1)}` +
                  '&daily=precipitation_sum,relative_humidity_2m_min,temperature_2m_max,wind_speed_10m_max,vapour_pressure_deficit_max' +
                  '&timezone=GMT&wind_speed_unit=ms',
                { fetch: deps.fetch, source: 'open-meteo-archive', timeoutMs: 20_000 },
              ).catch(() => null);
              const historical = (Array.isArray(archive) ? archive : [archive]) as (
                (typeof blocks)[number] | null
              )[];
              const fields = {
                precipMm: 'precipitation_sum',
                rhMinPct: 'relative_humidity_2m_min',
                tmaxC: 'temperature_2m_max',
                windMaxMs: 'wind_speed_10m_max',
                vpdMaxKpa: 'vapour_pressure_deficit_max',
              } as const;
              chunk.forEach((p, j) => {
                const values = out.get(pointKey(p)),
                  daily = historical[j]?.daily;
                if (!values || !daily || !Array.isArray(daily['time'])) return;
                const dates = daily['time'] as string[];
                if (new Set(dates).size !== dates.length) return;
                for (const [key, field] of Object.entries(fields) as [
                  keyof typeof fields,
                  string,
                ][]) {
                  requiredDays.forEach((date, i) => {
                    if (values[key][i] !== null || !gaps.includes(date)) return;
                    const n = dates.indexOf(date),
                      value = n < 0 ? null : daily[field]?.[n];
                    values[key][i] = weatherNumber(field, value);
                  });
                }
              });
            }
          }
          return out;
        },
      ),

    metar: (icaos, at) =>
      cache.get(
        `model:metar:${icaos.join(',')}:${Math.floor(at.getTime() / (10 * MINUTE))}`,
        10 * MINUTE,
        async () => {
          const from = new Date(at.getTime() - 73 * 3_600_000);
          const to = new Date(at.getTime() + 25 * 3_600_000); // day2 is exclusive
          const q = new URLSearchParams();
          for (const s of icaos) q.append('station', s);
          for (const d of ['vsby', 'wxcodes', 'metar', 'tmpf', 'dwpf', 'drct', 'sknt'])
            q.append('data', d);
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
          const csv = await fetchText(`${IEM_ASOS}?${q}`, {
            fetch: deps.fetch,
            source: 'iem-metar',
            timeoutMs: 20_000,
          }).catch(() => null);
          let responded = false;
          let parsed = new Map<string, MetarReport[]>();
          if (csv !== null) {
            try {
              parsed = parseAsos(csv);
              responded = true;
            } catch {
              // Invalid primary response may still be recovered from NOAA.
            }
          }
          const stale = icaos.filter((station) => {
            const times = (parsed.get(station) ?? [])
              .map((r) => Date.parse(r.validAt))
              .filter((t) => Math.ceil(t / 3_600_000) * 3_600_000 <= at.getTime());
            return at.getTime() - Math.max(-Infinity, ...times) > 2 * 3_600_000;
          });
          // Fill only the recent publication gap; IEM retains the 72-hour history.
          // Two stations × 12 h stays well below NOAA's normal 400-row response limit.
          for (let i = 0; i < stale.length; i += 2) {
            const ids = stale.slice(i, i + 2);
            const payload = await fetchJson<unknown>(
              `https://aviationweather.gov/api/data/metar?ids=${ids.join(',')}&format=json&hours=12`,
              { fetch: deps.fetch, source: 'noaa-awc-metar', timeoutMs: 12_000 },
            ).catch(() => null);
            if (payload === null) continue;
            let fresh: Map<string, MetarReport[]>;
            try {
              fresh = parseNoaaMetar(payload, at);
            } catch {
              continue;
            }
            responded = true;
            for (const id of ids) {
              const byTime = new Map((parsed.get(id) ?? []).map((r) => [Date.parse(r.validAt), r]));
              for (const r of fresh.get(id) ?? []) byTime.set(Date.parse(r.validAt), r);
              parsed.set(
                id,
                [...byTime.values()].sort((a, b) => a.validAt.localeCompare(b.validAt)),
              );
            }
          }
          if (!responded) throw new Error('METAR sources unavailable');
          return new Map(
            [...parsed].map(([st, rows]) => [
              st,
              rows.filter((r) => Date.parse(r.validAt) <= at.getTime()),
            ]),
          );
        },
      ),
    camsHistory: () =>
      cache.get('model:cams:reference', 15 * MINUTE, async () => {
        const body = await fetchJson<{
          latitude: number;
          longitude: number;
          hourly?: { time: number[]; pm2_5: (number | null)[] };
        }>(
          `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${PM25_REFERENCE.lat}&longitude=${PM25_REFERENCE.lon}` +
            '&hourly=pm2_5&domains=cams_global&timezone=GMT&timeformat=unixtime&past_hours=49&forecast_hours=1',
          { fetch: deps.fetch, source: 'open-meteo-air-quality', timeoutMs: 20_000 },
        );
        if (!body.hourly || !Number.isFinite(body.latitude) || !Number.isFinite(body.longitude))
          throw new Error('Invalid CAMS response');
        const points = body.hourly.time.map((t, i) => ({
          validAt: new Date(t * 1000).toISOString(),
          pm25:
            typeof body.hourly!.pm2_5[i] === 'number' &&
            Number.isFinite(body.hourly!.pm2_5[i]) &&
            body.hourly!.pm2_5[i]! >= 0
              ? body.hourly!.pm2_5[i]!
              : null,
        }));
        if (new Set(points.map((p) => p.validAt)).size !== points.length)
          throw new Error('Duplicate CAMS timestamps');
        return {
          points,
          fetchedAt: now().toISOString(),
          gridLat: body.latitude,
          gridLon: body.longitude,
        };
      }),
  };
}
