import type { BBox, LatLon } from '@pavana/shared';

/** National opening view, shared by the page and deep-link handling. */
export const INDONESIA_BBOX: BBox = [94.5, -11.5, 141.5, 6.5];

/** A complete, bounded hotspot deep link; absent coordinates keep the national view. */
export function parseMapFocus(params: URLSearchParams): { center: LatLon; zoom: number } | null {
  const values = ['lat', 'lon', 'zoom'].map((key) => params.get(key));
  if (values.some((value) => value === null || value.trim() === '')) return null;
  const [lat, lon, zoom] = values.map(Number) as [number, number, number];
  if (![lat, lon, zoom].every(Number.isFinite)) return null;
  // Match the map's Southeast Asia bounds and supported detection zoom range.
  if (lat < -15 || lat > 15 || lon < 85 || lon > 155 || zoom < 3 || zoom > 14) return null;
  return { center: { lat, lon }, zoom };
}
