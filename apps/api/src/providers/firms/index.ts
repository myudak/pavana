/**
 * NASA FIRMS hotspots (VIIRS NRT) — https://firms.modaps.eosdis.nasa.gov/api/area/
 *   GET /api/area/csv/{MAP_KEY}/{SOURCE}/{west,south,east,north}/{DAY_RANGE}
 *
 * One Indonesia-wide request per satellite, cached, then filtered in memory — one
 * upstream fetch serves local, regional, exposure and insights queries and stays far
 * below FIRMS transaction limits.
 *
 * - MAP_KEY is server-side only and never appears in errors or logs (UpstreamError
 *   messages carry the source label, not the URL).
 * - `acq_date` + `acq_time` (HHMM, UTC) → `acquiredAt`; `frp` → `frpMw`;
 *   VIIRS confidence l/n/h → low/nominal/high.
 * - A detection is a thermal anomaly, not a confirmed fire or perimeter. An empty
 *   result means "no detections", not "no fire".
 */
import type { Hotspot } from '@pavana/shared';
import { UpstreamError } from '../../domain/errors';
import { MINUTE, TtlCache } from '../../lib/cache';
import { fetchText, type FetchLike } from '../../lib/http';
import type { HotspotProvider, SourceDescriptor } from '../types';

const BASE = 'https://firms.modaps.eosdis.nasa.gov/api/area/csv';
/** Indonesia (+ margin) — west,south,east,north. */
const INDONESIA = '94,-11.5,141.5,6.5';
const DAY_RANGE = 2;

export const FIRMS_SOURCES = {
  VIIRS_NOAA20_NRT: 'NOAA-20',
  VIIRS_NOAA21_NRT: 'NOAA-21',
  VIIRS_SNPP_NRT: 'Suomi NPP',
} as const;
type FirmsSource = keyof typeof FIRMS_SOURCES;

const CONFIDENCE: Record<string, Hotspot['confidence']> = {
  l: 'low',
  n: 'nominal',
  h: 'high',
  low: 'low',
  nominal: 'nominal',
  high: 'high',
};

/** Number('') is 0 — treat empty/blank fields as missing (NaN) instead. */
const toNum = (v: string | undefined) => {
  const s = (v ?? '').trim();
  return s === '' ? Number.NaN : Number(s);
};

/** Minimal CSV parser for FIRMS output (no quoted fields in these files). */
export function parseFirmsCsv(
  csv: string,
  source: FirmsSource,
  fetchedAt: string,
): Hotspot[] {
  const lines = csv.trim().split(/\r?\n/);
  const header = lines[0]?.split(',').map((h) => h.trim());
  if (!header || !header.includes('latitude') || !header.includes('acq_date')) {
    // FIRMS answers some errors (e.g. an invalid key) with a plain-text 200.
    throw new UpstreamError('nasa-firms', 'unexpected response');
  }
  const col = (name: string) => header.indexOf(name);
  const iLat = col('latitude');
  const iLon = col('longitude');
  const iDate = col('acq_date');
  const iTime = col('acq_time');
  const iFrp = col('frp');
  const iConf = col('confidence');
  const satellite = FIRMS_SOURCES[source];

  const out: Hotspot[] = [];
  for (const line of lines.slice(1)) {
    if (!line.trim()) continue;
    const f = line.split(',');
    const lat = toNum(f[iLat]);
    const lon = toNum(f[iLon]);
    const date = f[iDate]?.trim();
    const time = (f[iTime] ?? '').trim().padStart(4, '0');
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || !date || !/^\d{4}$/.test(time)) continue;
    const acquiredAt = `${date}T${time.slice(0, 2)}:${time.slice(2)}:00Z`;
    if (Number.isNaN(Date.parse(acquiredAt))) continue;
    // An empty FRP field must stay missing (null), never 0.
    const frp = iFrp >= 0 ? toNum(f[iFrp]) : Number.NaN;
    out.push({
      id: `firms:${source}:${lat.toFixed(4)}:${lon.toFixed(4)}:${date}${time}`,
      lat,
      lon,
      acquiredAt,
      frpMw: Number.isFinite(frp) && frp >= 0 ? frp : null,
      confidence: CONFIDENCE[(f[iConf] ?? '').trim().toLowerCase()] ?? null,
      satellite,
      instrument: 'VIIRS',
      provenance: {
        provider: 'nasa-firms',
        kind: 'observation',
        fetchedAt,
        validAt: acquiredAt,
        isDemo: false,
        spatialResolutionKm: 0.375,
        notes: `FIRMS ${source}. Satellite thermal anomaly; not a confirmed fire.`,
      },
    });
  }
  return out;
}

export interface FirmsDeps {
  fetch?: FetchLike;
  cache?: TtlCache;
  now?: () => Date;
}

export function createFirms(mapKey: string | undefined, deps: FirmsDeps = {}) {
  const cache = deps.cache ?? new TtlCache();
  const now = deps.now ?? (() => new Date());

  /** All recent detections over Indonesia, deduped across satellites. */
  const loadAll = () =>
    cache.get('firms:indonesia', 15 * MINUTE, async () => {
      if (!mapKey) throw new UpstreamError('nasa-firms', 'FIRMS_MAP_KEY not configured');
      const fetchedAt = now().toISOString().replace(/\.\d{3}Z$/, 'Z');
      const sets = await Promise.all(
        (Object.keys(FIRMS_SOURCES) as FirmsSource[]).map(async (s) =>
          parseFirmsCsv(
            await fetchText(`${BASE}/${mapKey}/${s}/${INDONESIA}/${DAY_RANGE}`, {
              fetch: deps.fetch,
              source: 'nasa-firms',
              timeoutMs: 15_000,
            }),
            s,
            fetchedAt,
          ),
        ),
      );
      const byId = new Map<string, Hotspot>();
      for (const h of sets.flat()) byId.set(h.id, h);
      return [...byId.values()].sort((a, b) => b.acquiredAt.localeCompare(a.acquiredAt));
    });

  const hotspots: HotspotProvider = {
    id: 'nasa-firms',
    async getHotspots({ bbox, from, to, limit }) {
      const [minLon, minLat, maxLon, maxLat] = bbox;
      const all = await loadAll();
      const out: Hotspot[] = [];
      for (const h of all) {
        if (h.lon < minLon || h.lon > maxLon || h.lat < minLat || h.lat > maxLat) continue;
        const t = Date.parse(h.acquiredAt);
        if ((from && t < from.getTime()) || (to && t > to.getTime())) continue;
        out.push(h);
        if (out.length >= limit) break;
      }
      return out;
    },
  };

  const source: SourceDescriptor = {
    id: 'nasa-firms',
    name: 'NASA FIRMS (VIIRS)',
    use: 'Titik panas satelit (deteksi anomali panas)',
    attribution:
      'NASA FIRMS — LANCE/EOSDIS. Titik panas adalah deteksi satelit, bukan konfirmasi kebakaran.',
    url: 'https://firms.modaps.eosdis.nasa.gov/',
    configured: Boolean(mapKey),
    check: async () => {
      await loadAll();
    },
  };

  return { hotspots, source };
}
