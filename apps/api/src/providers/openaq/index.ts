/**
 * OpenAQ v3 station observations — https://docs.openaq.org (header `X-API-Key`).
 * Used as an OBSERVATION overlay next to the CAMS forecast, never as a replacement:
 *   1. GET /v3/locations?coordinates={lat},{lon}&radius=25000&parameters_id=2   (PM2.5 stations)
 *   2. GET /v3/locations/{id}/latest                                            (latest values)
 * Only a reading ≤ 25 km away and < 2 h old is returned. Station coverage in Kalimantan
 * is sparse — "no station" is the common case and is reported as null, not as clean air.
 */
import { haversineKm, type LatLon, type StationReading } from '@pavana/shared';
import { MINUTE, TtlCache } from '../../lib/cache';
import { fetchJson, type FetchLike } from '../../lib/http';
import type { SourceDescriptor, StationProvider } from '../types';

const BASE = 'https://api.openaq.org/v3';
const PM25_PARAMETER_ID = 2;
export const STATION_MAX_DISTANCE_KM = 25;
export const STATION_MAX_AGE_MS = 2 * 60 * MINUTE;

interface OaqLocation {
  id: number;
  name: string | null;
  locality?: string | null;
  coordinates: { latitude: number; longitude: number };
  sensors?: { id: number; parameter?: { id?: number; name?: string; units?: string } }[];
}
interface OaqLatest {
  datetime?: { utc?: string };
  value?: number | null;
  sensorsId?: number;
}

export interface OpenAqDeps {
  fetch?: FetchLike;
  cache?: TtlCache;
}

export function createOpenAq(apiKey: string | undefined, deps: OpenAqDeps = {}) {
  const cache = deps.cache ?? new TtlCache();
  const headers: Record<string, string> = apiKey ? { 'x-api-key': apiKey } : {};
  const http = { fetch: deps.fetch, source: 'openaq', headers };

  const stations: StationProvider = {
    id: 'openaq',
    async nearest(point: LatLon, now: Date): Promise<StationReading | null> {
      if (!apiKey) return null;
      const lat = Math.round(point.lat * 100) / 100;
      const lon = Math.round(point.lon * 100) / 100;
      const locs = await cache.get(`oaq:loc:${lat},${lon}`, 6 * 60 * MINUTE, () =>
        fetchJson<{ results?: OaqLocation[] }>(
          `${BASE}/locations?coordinates=${lat},${lon}&radius=${STATION_MAX_DISTANCE_KM * 1000}` +
            `&parameters_id=${PM25_PARAMETER_ID}&limit=20`,
          http,
        ),
      );
      const candidates = (locs.results ?? [])
        .map((l) => ({
          loc: l,
          sensor: l.sensors?.find((s) => s.parameter?.id === PM25_PARAMETER_ID),
          distanceKm: haversineKm(point, { lat: l.coordinates.latitude, lon: l.coordinates.longitude }),
        }))
        .filter((c) => c.sensor && c.distanceKm <= STATION_MAX_DISTANCE_KM)
        .sort((a, b) => a.distanceKm - b.distanceKm);

      // Nearest station with a fresh PM2.5 value wins; stale stations are skipped.
      for (const c of candidates.slice(0, 3)) {
        const latest = await cache.get(`oaq:latest:${c.loc.id}`, 15 * MINUTE, () =>
          fetchJson<{ results?: OaqLatest[] }>(`${BASE}/locations/${c.loc.id}/latest`, http),
        );
        const r = latest.results?.find((x) => x.sensorsId === c.sensor!.id);
        const at = r?.datetime?.utc;
        const value = r?.value;
        if (!at || typeof value !== 'number' || !Number.isFinite(value) || value < 0) continue;
        const age = now.getTime() - Date.parse(at);
        if (Number.isNaN(age) || age < -5 * MINUTE || age > STATION_MAX_AGE_MS) continue;
        const validAt = new Date(at).toISOString().replace('.000Z', 'Z');
        const name = c.loc.name ?? c.loc.locality ?? `Stasiun ${c.loc.id}`;
        return {
          stationId: `openaq:${c.loc.id}`,
          name,
          distanceKm: Math.round(c.distanceKm * 10) / 10,
          airQuality: {
            pm25UgM3: value,
            provenance: {
              provider: 'openaq',
              kind: 'observation',
              fetchedAt: now.toISOString().replace(/\.\d{3}Z$/, 'Z'),
              validAt,
              isDemo: false,
              notes: `OpenAQ station ${c.loc.id} (${name}).`,
            },
          },
        };
      }
      return null;
    },
  };

  const source: SourceDescriptor = {
    id: 'openaq',
    name: 'OpenAQ',
    use: 'Pengukuran PM2.5 stasiun terdekat (jika ada)',
    attribution: 'OpenAQ — data stasiun dari penyedia aslinya',
    url: 'https://openaq.org/',
    configured: Boolean(apiKey),
    check: async () => {
      await stations.nearest({ lat: -0.03, lon: 109.33 }, new Date());
    },
  };

  return { stations, source };
}
