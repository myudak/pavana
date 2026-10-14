import { bearingToUnitVector } from './geo';
import { normalizeDeg } from './units';

/**
 * Meteorological wind direction is where the wind comes FROM.
 * A "270°" (westerly) wind blows TOWARD 90° (east).
 */
export function windFromToFlowBearing(windDirectionFromDeg: number): number {
  return normalizeDeg(windDirectionFromDeg + 180);
}

/**
 * Flow vector (east, north components, m/s) for a wind given in meteorological convention.
 * Use this for drawing arrows and for alignment math — never the raw "from" angle.
 */
export function windFromToFlowVector(
  windDirectionFromDeg: number,
  speedMs: number,
): { east: number; north: number } {
  const unit = bearingToUnitVector(windFromToFlowBearing(windDirectionFromDeg));
  return { east: unit.east * speedMs, north: unit.north * speedMs };
}

const COMPASS_16 = [
  'N',
  'NNE',
  'NE',
  'ENE',
  'E',
  'ESE',
  'SE',
  'SSE',
  'S',
  'SSW',
  'SW',
  'WSW',
  'W',
  'WNW',
  'NW',
  'NNW',
] as const;
export type Compass16 = (typeof COMPASS_16)[number];

/** 16-point compass label for a bearing. */
export function bearingToCompass16(bearingDeg: number): Compass16 {
  const idx = Math.round(normalizeDeg(bearingDeg) / 22.5) % 16;
  return COMPASS_16[idx]!;
}
