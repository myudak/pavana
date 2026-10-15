import type { BBox } from '@pavana/shared';
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
    queryFn: ({ signal }) => api.hotspots(bbox, signal),
  });
  return { location, bbox, query };
}
