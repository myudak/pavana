/**
 * Live locations: offline kabupaten/kota list (Wikidata, CC0 — see
 * fixtures/scripts/build-regions-id.mjs) + Open-Meteo geocoding for smaller places.
 * `resolve` never moves the point: data is fetched for the requested coordinate; the
 * nearest region only supplies a human-readable name and the time zone.
 */
import { haversineKm, type LatLon, type Location } from '@pavana/shared';
import regionsFile from '../../data/regions-id.json' with { type: 'json' };
import type { LocationProvider } from '../types';

interface Region {
  id: string;
  name: string;
  kind: 'kota' | 'kabupaten';
  province: string;
  lat: number;
  lon: number;
}

const REGIONS = regionsFile.regions as Region[];

/** Province → IANA zone (WIB = Jakarta/Pontianak, WITA = Makassar, WIT = Jayapura). */
const PROVINCE_TZ: Record<string, string> = {
  'Kalimantan Barat': 'Asia/Pontianak',
  'Kalimantan Tengah': 'Asia/Pontianak',
  'Kalimantan Selatan': 'Asia/Makassar',
  'Kalimantan Timur': 'Asia/Makassar',
  'Kalimantan Utara': 'Asia/Makassar',
  Bali: 'Asia/Makassar',
  'Nusa Tenggara Barat': 'Asia/Makassar',
  'Nusa Tenggara Timur': 'Asia/Makassar',
  'Sulawesi Utara': 'Asia/Makassar',
  'Sulawesi Tengah': 'Asia/Makassar',
  'Sulawesi Selatan': 'Asia/Makassar',
  'Sulawesi Tenggara': 'Asia/Makassar',
  'Sulawesi Barat': 'Asia/Makassar',
  Gorontalo: 'Asia/Makassar',
  Maluku: 'Asia/Jayapura',
  'Maluku Utara': 'Asia/Jayapura',
  Papua: 'Asia/Jayapura',
  'Papua Barat': 'Asia/Jayapura',
  'Papua Barat Daya': 'Asia/Jayapura',
  'Papua Pegunungan': 'Asia/Jayapura',
  'Papua Selatan': 'Asia/Jayapura',
  'Papua Tengah': 'Asia/Jayapura',
};
export const timezoneForProvince = (province: string) => PROVINCE_TZ[province] ?? 'Asia/Jakarta';

/** A point farther than this from every region centroid gets a generic name. */
const NAME_RADIUS_KM = 75;

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/^(kota|kabupaten|kab\.?)\s+/, '')
    .trim();

function toLocation(r: Region): Location {
  return {
    id: r.id,
    name: r.name,
    admin1: r.province,
    country: 'ID',
    lat: r.lat,
    lon: r.lon,
    timezone: timezoneForProvince(r.province),
  };
}

export function nearestRegion(p: LatLon): { region: Region; distanceKm: number } {
  let best = REGIONS[0]!;
  let bestD = Infinity;
  for (const r of REGIONS) {
    const d = haversineKm(p, r);
    if (d < bestD) {
      best = r;
      bestD = d;
    }
  }
  return { region: best, distanceKm: bestD };
}

/** Prefix matches first, then substring matches; "Kota"/"Kabupaten" ignored. */
export function searchRegions(q: string, limit = 10): Location[] {
  const needle = norm(q);
  if (needle.length < 2) return [];
  const starts: Region[] = [];
  const contains: Region[] = [];
  for (const r of REGIONS) {
    const n = norm(r.name);
    if (n.startsWith(needle)) starts.push(r);
    else if (n.includes(needle) || norm(r.province).startsWith(needle)) contains.push(r);
  }
  return [...starts, ...contains].slice(0, limit).map(toLocation);
}

export function createRegionLocations(
  searchPlaces: (q: string) => Promise<Location[]>,
): LocationProvider {
  return {
    id: 'regions-id+open-meteo-geocoding',
    async search(q) {
      const local = searchRegions(q);
      let remote: Location[] = [];
      try {
        remote = await searchPlaces(q);
      } catch {
        // Geocoding is a nice-to-have; the offline list still answers.
      }
      // Drop remote hits that duplicate a listed region (within 10 km).
      const extra = remote.filter((r) => !local.some((l) => haversineKm(l, r) < 10));
      return [...local, ...extra].slice(0, 10);
    },
    async resolve(point) {
      const { region, distanceKm } = nearestRegion(point);
      // Nearest centroid ≠ administrative membership (no boundary polygons here), so the
      // name says "Sekitar …" and no kabupaten/kota (admin2) is claimed.
      return {
        id: `pt:${point.lat.toFixed(3)},${point.lon.toFixed(3)}`,
        name: distanceKm <= NAME_RADIUS_KM ? `Sekitar ${region.name}` : 'Lokasi dipilih',
        admin1: region.province,
        country: 'ID',
        lat: point.lat,
        lon: point.lon,
        timezone: timezoneForProvince(region.province),
      };
    },
  };
}
