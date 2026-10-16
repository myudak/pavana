/**
 * Open-Meteo adapters (no key):
 *   Weather:     https://open-meteo.com/en/docs                   (wind, temp, RH, precip)
 *   Air quality: https://open-meteo.com/en/docs/air-quality-api  (CAMS global PM2.5 forecast)
 *   Geocoding:   https://open-meteo.com/en/docs/geocoding-api     (place search, ID only)
 *
 * Rules applied here:
 * - `timeformat=unixtime` + `timezone=GMT` → UTC ISO timestamps.
 * - `wind_speed_unit=ms`; `wind_direction_10m` stays meteorological FROM degrees.
 * - Missing values stay `null` (never 0).
 * - CAMS PM2.5 is total PM2.5 on a ~45 km grid — not "fire smoke", not a doorstep reading.
 * - Provenance kind `forecast`; Open-Meteo does not expose the model run time, so no `issuedAt`.
 */
import type {
  AirQualityPoint,
  BBox,
  Location,
  Provenance,
  WeatherPoint,
  WindField,
  WindFieldPoint,
} from '@pavana/shared';
import { HOUR, MINUTE, TtlCache } from '../../lib/cache';
import { fetchJson, type FetchLike } from '../../lib/http';
import type {
  AirQualityProvider,
  SeriesQuery,
  SourceDescriptor,
  WeatherProvider,
  WindFieldProvider,
} from '../types';
import { windGridCells } from './grid';

const WEATHER_URL = 'https://api.open-meteo.com/v1/forecast';
const AQ_URL = 'https://air-quality-api.open-meteo.com/v1/air-quality';
const GEO_URL = 'https://geocoding-api.open-meteo.com/v1/search';

const WEATHER_RES_KM = 11;
const CAMS_RES_KM = 45;
/** Grid snapping for cache keys; well below either model's resolution. */
const SNAP_DEG = 0.05;
const POINTS_PER_REQUEST = 50;

interface Hourly {
  time: number[];
  [field: string]: (number | null)[] | number[];
}
interface PointResponse {
  latitude: number;
  longitude: number;
  hourly?: Hourly;
  current?: { time: number; wind_speed_10m?: number | null; wind_direction_10m?: number | null };
}
interface GeoResult {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  country_code?: string;
  timezone?: string;
  admin1?: string;
  admin2?: string;
  admin3?: string;
}

const snap = (v: number) => Math.round(v / SNAP_DEG) * SNAP_DEG;
const iso = (unixS: number) => new Date(unixS * 1000).toISOString().replace('.000Z', 'Z');
const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);

/** Hours in [floor(from), floor(from) + hours] — the services expect the series to start "now". */
function window(h: Hourly, q: SeriesQuery): number[] {
  const start = Math.floor(q.from.getTime() / 3_600_000) * 3600;
  const end = start + q.hours * 3600;
  const idx: number[] = [];
  h.time.forEach((t, i) => {
    if (t >= start && t <= end) idx.push(i);
  });
  return idx;
}

export interface OpenMeteoDeps {
  fetch?: FetchLike;
  cache?: TtlCache;
  now?: () => Date;
}

export function createOpenMeteo(deps: OpenMeteoDeps = {}) {
  const cache = deps.cache ?? new TtlCache();
  const now = deps.now ?? (() => new Date());
  // The air-quality endpoint is occasionally slow; give Open-Meteo a little more time.
  const http = (source: string) => ({ fetch: deps.fetch, source, timeoutMs: 12_000 });
  const fetchedAt = () =>
    now()
      .toISOString()
      .replace(/\.\d{3}Z$/, 'Z');

  const loadWeather = (lat: number, lon: number) =>
    cache.get(`om:wx:${lat},${lon}`, 15 * MINUTE, () =>
      fetchJson<PointResponse>(
        `${WEATHER_URL}?latitude=${lat}&longitude=${lon}` +
          '&hourly=wind_speed_10m,wind_direction_10m,temperature_2m,relative_humidity_2m,precipitation' +
          '&wind_speed_unit=ms&timeformat=unixtime&timezone=GMT&past_hours=1&forecast_hours=121',
        http('open-meteo'),
      ),
    );

  const loadAq = (lat: number, lon: number) =>
    cache.get(`om:aq:${lat},${lon}`, 15 * MINUTE, () =>
      fetchJson<PointResponse>(
        `${AQ_URL}?latitude=${lat}&longitude=${lon}&hourly=pm2_5&domains=cams_global` +
          '&timeformat=unixtime&timezone=GMT&past_hours=1&forecast_hours=121',
        http('open-meteo-air-quality'),
      ),
    );

  const weather: WeatherProvider = {
    id: 'open-meteo-weather',
    async getHourly(q) {
      const res = await loadWeather(snap(q.point.lat), snap(q.point.lon));
      const h = res.hourly;
      if (!h) return [];
      const at = fetchedAt();
      return window(h, q).map((i): WeatherPoint => {
        const validAt = iso(h.time[i]!);
        const provenance: Provenance = {
          provider: 'open-meteo',
          kind: 'forecast',
          fetchedAt: at,
          validAt,
          isDemo: false,
          spatialResolutionKm: WEATHER_RES_KM,
        };
        const dir = num(h['wind_direction_10m']?.[i]);
        const rh = num(h['relative_humidity_2m']?.[i]);
        const speed = num(h['wind_speed_10m']?.[i]);
        const precip = num(h['precipitation']?.[i]);
        return {
          windSpeedMs: speed === null ? null : Math.max(0, speed),
          windDirectionFromDeg: dir === null ? null : ((dir % 360) + 360) % 360,
          temperatureC: num(h['temperature_2m']?.[i]),
          relativeHumidityPct: rh === null ? null : Math.min(100, Math.max(0, rh)),
          precipitationMm: precip === null ? null : Math.max(0, precip),
          provenance,
        };
      });
    },
  };

  const airQuality: AirQualityProvider = {
    id: 'open-meteo-air-quality',
    async getHourly(q) {
      const res = await loadAq(snap(q.point.lat), snap(q.point.lon));
      const h = res.hourly;
      if (!h) return [];
      const at = fetchedAt();
      return window(h, q).map((i): AirQualityPoint => {
        const pm = num(h['pm2_5']?.[i]);
        return {
          pm25UgM3: pm === null ? null : Math.max(0, pm),
          provenance: {
            provider: 'open-meteo-cams',
            kind: 'forecast',
            fetchedAt: at,
            validAt: iso(h.time[i]!),
            isDemo: false,
            spatialResolutionKm: CAMS_RES_KM,
            notes: 'CAMS global total PM2.5 (all sources), ~45 km grid. Not fire-specific.',
          },
        };
      });
    },
  };

  const windField: WindFieldProvider = {
    id: 'open-meteo-wind-field',
    async getField(bbox: BBox, cols: number, rows: number, at: Date): Promise<WindField> {
      const grid = windGridCells(bbox, cols, rows);
      const hourKey = Math.floor(at.getTime() / HOUR);
      return cache.get(
        `om:wf:${grid.bbox.join(',')}:${cols}x${rows}:${hourKey}`,
        30 * MINUTE,
        async () => {
          const responses: PointResponse[] = [];
          for (let k = 0; k < grid.cells.length; k += POINTS_PER_REQUEST) {
            const chunk = grid.cells.slice(k, k + POINTS_PER_REQUEST);
            const lats = chunk.map((c) => c.lat.toFixed(3)).join(',');
            const lons = chunk.map((c) => c.lon.toFixed(3)).join(',');
            const res = await fetchJson<PointResponse | PointResponse[]>(
              `${WEATHER_URL}?latitude=${lats}&longitude=${lons}` +
                '&current=wind_speed_10m,wind_direction_10m&wind_speed_unit=ms&timeformat=unixtime&timezone=GMT',
              http('open-meteo'),
            );
            responses.push(...(Array.isArray(res) ? res : [res]));
          }
          const fetched = fetchedAt();
          const validAt = iso(
            responses.find((r) => r.current)?.current?.time ?? Math.floor(at.getTime() / 1000),
          );
          const points = grid.cells.map((c, i): WindFieldPoint => {
            const cur = responses[i]?.current;
            const speed = num(cur?.wind_speed_10m);
            const dir = num(cur?.wind_direction_10m);
            return {
              lat: c.lat,
              lon: c.lon,
              speedMs: speed === null ? null : Math.max(0, speed),
              fromDeg: dir === null ? null : ((dir % 360) + 360) % 360,
              validAt: cur ? iso(cur.time) : validAt,
              provenance: {
                provider: 'open-meteo',
                kind: 'forecast',
                fetchedAt: fetched,
                validAt: cur ? iso(cur.time) : validAt,
                isDemo: false,
                spatialResolutionKm: WEATHER_RES_KM,
              },
            };
          });
          return { cols, rows, bbox: grid.bbox, validAt, points };
        },
      );
    },
  };

  /** Indonesian place search. Timezone comes from Open-Meteo (IANA). */
  async function searchPlaces(q: string): Promise<Location[]> {
    const needle = q.trim();
    if (needle.length < 2) return [];
    const res = await cache.get(`om:geo:${needle.toLowerCase()}`, 24 * HOUR, () =>
      fetchJson<{ results?: GeoResult[] }>(
        `${GEO_URL}?name=${encodeURIComponent(needle)}&count=10&language=id&countryCode=ID&format=json`,
        http('open-meteo-geocoding'),
      ),
    );
    return (res.results ?? [])
      .filter((r) => r.country_code === 'ID')
      .map((r) => ({
        id: `om:${r.id}`,
        name: r.name,
        admin1: r.admin1 ?? '—',
        admin2: r.admin2 ?? r.admin3,
        country: 'ID' as const,
        lat: r.latitude,
        lon: r.longitude,
        timezone: r.timezone ?? 'Asia/Jakarta',
      }));
  }

  const sources: SourceDescriptor[] = [
    {
      id: 'open-meteo',
      name: 'Open-Meteo',
      use: 'Prakiraan angin, suhu, kelembapan, hujan',
      attribution: 'Weather data by Open-Meteo.com (CC BY 4.0)',
      url: 'https://open-meteo.com/',
      configured: true,
      check: async () => {
        await weather.getHourly({ point: { lat: -0.03, lon: 109.33 }, from: now(), hours: 1 });
      },
    },
    {
      id: 'open-meteo-cams',
      name: 'Open-Meteo Air Quality (CAMS)',
      use: 'Prakiraan PM2.5 (dasar)',
      attribution: 'Air quality by Open-Meteo.com, CAMS (Copernicus)',
      url: 'https://open-meteo.com/en/docs/air-quality-api',
      configured: true,
      check: async () => {
        await airQuality.getHourly({ point: { lat: -0.03, lon: 109.33 }, from: now(), hours: 1 });
      },
    },
  ];

  return { weather, airQuality, windField, searchPlaces, sources };
}
