import type { BBox } from './schemas/location';

/**
 * Rough bounding box covering the island of Kalimantan
 * [minLon, minLat, maxLon, maxLat]. Used for the regional density view —
 * approximate island extent, not a surveyed boundary.
 */
export const KALIMANTAN_BBOX: BBox = [108.5, -4.5, 119.5, 4.5];

/**
 * Render bbox for the full island of Borneo (extends north past Kalimantan
 * for the coastline). Data fixtures stay Indonesian-Kalimantan only.
 */
export const BORNEO_RENDER_BBOX: BBox = [108.8, -4.5, 119.4, 7.6];

/**
 * Coarse Borneo coastline polygon ([lon, lat]) for synthetic placement and
 * land-based metrics ONLY. Approximate — not a surveyed boundary, never
 * displayed as authoritative geography.
 */
export const BORNEO_LAND_POLY: [number, number][] = [
  [109.6, 1.8], [110.5, 2.9], [111.8, 3.3], [113.2, 4.2], [114.5, 4.6], [115.8, 4.5],
  [117.2, 5.2], [118.2, 4.0], [118.6, 2.5], [118.0, 1.0], [117.3, -0.5], [117.6, -1.8],
  [117.0, -2.8], [116.2, -3.6], [115.0, -3.9], [114.0, -3.5], [113.0, -3.2], [112.0, -3.4],
  [110.8, -2.9], [110.0, -1.8], [109.3, -1.0], [109.0, 0.0], [109.3, 1.0],
];

/** Ray-cast point-in-polygon for the coarse land mask above. */
export function isBorneoLand(lon: number, lat: number): boolean {
  let inside = false;
  const poly = BORNEO_LAND_POLY;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i]!;
    const [xj, yj] = poly[j]!;
    if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}
