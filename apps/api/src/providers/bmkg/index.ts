/**
 * BMKG Data Terbuka — 3-hourly weather forecast per village (adm4):
 *   GET https://api.bmkg.go.id/publik/prakiraan-cuaca?adm4={code}
 * Used ONLY as an independent comparison next to Pavana's Open-Meteo numbers — never
 * merged into them. Coverage = the curated list in data/bmkg-adm4.ts.
 * Attribution required: "BMKG (Badan Meteorologi, Klimatologi, dan Geofisika)".
 * BMKG limits requests (60/min/IP), so responses are cached for an hour.
 * Official BMKG warnings are NOT read here (link-only on the Info page).
 */
import { haversineKm, kmhToMs, type LatLon, type WeatherReferenceHour } from '@pavana/shared';
import { BMKG_POINTS } from '../../data/bmkg-adm4';
import { HOUR, TtlCache } from '../../lib/cache';
import { fetchJson, type FetchLike } from '../../lib/http';
import type { SourceDescriptor, WeatherReferenceProvider } from '../types';

const URL_BASE = 'https://api.bmkg.go.id/publik/prakiraan-cuaca';
/** Only compare when the selected point is this close to a covered BMKG point. */
export const BMKG_MAX_DISTANCE_KM = 30;

interface BmkgEntry {
  datetime?: string;
  t?: number | null;
  hu?: number | null;
  /** Wind speed, km/h. */
  ws?: number | null;
  /** Wind direction (from), degrees. */
  wd_deg?: number | null;
  weather_desc?: string | null;
  analysis_date?: string;
}
interface BmkgResponse {
  data?: { cuaca?: BmkgEntry[][] }[];
}

const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);

export function parseBmkg(res: BmkgResponse): { hours: WeatherReferenceHour[]; issuedAt: string | null } {
  const entries = (res.data?.[0]?.cuaca ?? []).flat();
  let issuedAt: string | null = null;
  const hours: WeatherReferenceHour[] = [];
  for (const e of entries) {
    if (!e.datetime || Number.isNaN(Date.parse(e.datetime))) continue;
    if (!issuedAt && e.analysis_date) {
      // BMKG gives the analysis time without a zone; it is UTC.
      const a = `${e.analysis_date.replace(' ', 'T')}Z`;
      if (!Number.isNaN(Date.parse(a))) issuedAt = a;
    }
    const ws = num(e.ws);
    const wd = num(e.wd_deg);
    const hu = num(e.hu);
    hours.push({
      validAt: new Date(e.datetime).toISOString().replace('.000Z', 'Z'),
      temperatureC: num(e.t),
      relativeHumidityPct: hu === null ? null : Math.min(100, Math.max(0, hu)),
      windSpeedMs: ws === null ? null : Math.max(0, kmhToMs(ws)),
      windDirectionFromDeg: wd === null ? null : ((wd % 360) + 360) % 360,
      description: e.weather_desc?.trim() || null,
    });
  }
  hours.sort((a, b) => a.validAt.localeCompare(b.validAt));
  return { hours, issuedAt };
}

export interface BmkgDeps {
  fetch?: FetchLike;
  cache?: TtlCache;
  now?: () => Date;
}

export function createBmkg(deps: BmkgDeps = {}) {
  const cache = deps.cache ?? new TtlCache();
  const now = deps.now ?? (() => new Date());

  const load = (adm4: string) =>
    cache.get(`bmkg:${adm4}`, HOUR, () =>
      fetchJson<BmkgResponse>(`${URL_BASE}?adm4=${encodeURIComponent(adm4)}`, {
        fetch: deps.fetch,
        source: 'bmkg',
      }),
    );

  const weatherReference: WeatherReferenceProvider = {
    id: 'bmkg',
    async near(point: LatLon, at: Date) {
      let best = BMKG_POINTS[0]!;
      let bestD = Infinity;
      for (const p of BMKG_POINTS) {
        const d = haversineKm(point, p);
        if (d < bestD) {
          best = p;
          bestD = d;
        }
      }
      if (bestD > BMKG_MAX_DISTANCE_KM) return null;
      const { hours, issuedAt } = parseBmkg(await load(best.adm4));
      // Keep the 3-hour slot containing `at` and everything after it.
      const from = at.getTime() - 3 * HOUR;
      const upcoming = hours.filter((h) => Date.parse(h.validAt) > from);
      const fetchedAt = now().toISOString().replace(/\.\d{3}Z$/, 'Z');
      return {
        place: `${best.desa}, ${best.city}`,
        distanceKm: Math.round(bestD * 10) / 10,
        hours: upcoming,
        provenance: {
          provider: 'bmkg',
          kind: 'forecast',
          fetchedAt,
          ...(issuedAt ? { issuedAt } : {}),
          validAt: upcoming[0]?.validAt ?? fetchedAt,
          isDemo: false,
          notes: `BMKG Data Terbuka, adm4 ${best.adm4} (${best.desa}). Prakiraan 3-jam.`,
        },
      };
    },
  };

  const source: SourceDescriptor = {
    id: 'bmkg',
    name: 'BMKG Data Terbuka',
    use: 'Prakiraan cuaca pembanding (kota tertentu)',
    attribution: 'BMKG (Badan Meteorologi, Klimatologi, dan Geofisika)',
    url: 'https://data.bmkg.go.id/prakiraan-cuaca/',
    configured: true,
    check: async () => {
      await load(BMKG_POINTS[0]!.adm4);
    },
  };

  return { weatherReference, source };
}
