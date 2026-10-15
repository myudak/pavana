import type { BBox } from '@pavana/shared';

/** Margin (degrees) added around the requested bbox so streamlines reach the edges. */
export const WIND_FIELD_MARGIN_DEG = 1;

/**
 * Cell centres of a cols×rows grid over `bbox` + margin, row-major, north row first.
 * Shared by the demo field and the live Open-Meteo field so both have the same geometry.
 */
export function windGridCells(bbox: BBox, cols: number, rows: number) {
  const [minLon, minLat, maxLon, maxLat] = bbox;
  const m = WIND_FIELD_MARGIN_DEG;
  const cells: { lat: number; lon: number }[] = [];
  for (let j = 0; j < rows; j++) {
    const lat = maxLat + m - ((j + 0.5) / rows) * (maxLat - minLat + 2 * m);
    for (let i = 0; i < cols; i++) {
      const lon = minLon - m + ((i + 0.5) / cols) * (maxLon - minLon + 2 * m);
      cells.push({ lat, lon });
    }
  }
  const outer: BBox = [minLon - m, minLat - m, maxLon + m, maxLat + m];
  return { cells, bbox: outer };
}
