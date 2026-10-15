import type { BBox } from '@pavana/shared';
import { KALIMANTAN_BBOX } from '@pavana/shared';
import { useQuery } from '@tanstack/react-query';
import { useSelectedLocation } from '@/features/location/location-context';
import { api } from '@/lib/api';

/** Hotspot search window around the selected location, in degrees. */
const PAD_DEG = 2.5;

/**
 * Dark basemap for the Dusk/Haze look. Free CARTO basemap; attribution comes from
 * the style JSON via the MapLibre control. Final tile provider still pending (B3).
 */
export const DARK_STYLE_URL =
  'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';

/** Shared hotspot query (bbox around the selected location). Used by Map and Home preview. */
export function useHotspots() {
  const { location } = useSelectedLocation();
  const bbox: BBox = [
    location.lon - PAD_DEG,
    location.lat - PAD_DEG,
    location.lon + PAD_DEG,
    location.lat + PAD_DEG,
  ];
  const query = useQuery({
    queryKey: ['hotspots', ...bbox],
    queryFn: ({ signal }) => api.hotspots(bbox, undefined, signal),
  });
  return { location, bbox, query };
}

/** Regional hotspot window, in days (intended for live FIRMS day-range queries). */
export const REGIONAL_WINDOW_DAYS = 5;
/** Regional fetch cap — within the route limit (max 2000), no contract change. */
export const REGIONAL_LIMIT = 1500;

/**
 * Island-wide Kalimantan hotspot field for the density view.
 * Time filters are intentionally omitted in demo mode: the fixture carries a
 * fixed historical window, and a live-relative window would empty it.
 */
export function useRegionalHotspots() {
  const query = useQuery({
    queryKey: ['hotspots-regional', ...KALIMANTAN_BBOX],
    queryFn: ({ signal }) => api.hotspots(KALIMANTAN_BBOX, { limit: REGIONAL_LIMIT }, signal),
  });
  return { bbox: KALIMANTAN_BBOX, query };
}

/** Gridded wind field for regional streamlines (shared cache key). */
export function useWindField() {
  const query = useQuery({
    queryKey: ['wind-field', ...KALIMANTAN_BBOX],
    queryFn: ({ signal }) => api.windField(KALIMANTAN_BBOX, signal),
  });
  return { bbox: KALIMANTAN_BBOX, query };
}
