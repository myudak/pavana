/**
 * Smoke-exposure potential level for one hour. Deterministic and explainable:
 *
 *   level = max(level from PM2.5 forecast, level from upwind hotspot score)
 *
 * PM2.5 bands follow the US EPA PM2.5 breakpoints (2024 revision, µg/m³), same as us-aqi.ts:
 *   ≤ 9.0 none · ≤ 35.4 low · ≤ 55.4 moderate · above → high
 * Upwind score bands are HEURISTIC and not yet calibrated against observations
 * (see docs/modeling-methodology.md). Keep UI copy honest about that.
 */
import type { ExposureLevel } from '../schemas/exposure';

export const EXPOSURE_PM25_BANDS = { none: 9.0, low: 35.4, moderate: 55.4 } as const;
export const EXPOSURE_UPWIND_BANDS = { low: 2, moderate: 20, high: 80 } as const;

const RANK: Record<Exclude<ExposureLevel, 'unknown'>, number> = {
  none: 0,
  low: 1,
  moderate: 2,
  high: 3,
};

export function pm25ExposureLevel(pm25: number | null): ExposureLevel {
  if (pm25 === null || !Number.isFinite(pm25)) return 'unknown';
  if (pm25 <= EXPOSURE_PM25_BANDS.none) return 'none';
  if (pm25 <= EXPOSURE_PM25_BANDS.low) return 'low';
  if (pm25 <= EXPOSURE_PM25_BANDS.moderate) return 'moderate';
  return 'high';
}

export function upwindExposureLevel(score: number | null): ExposureLevel {
  if (score === null || !Number.isFinite(score)) return 'unknown';
  if (score >= EXPOSURE_UPWIND_BANDS.high) return 'high';
  if (score >= EXPOSURE_UPWIND_BANDS.moderate) return 'moderate';
  if (score >= EXPOSURE_UPWIND_BANDS.low) return 'low';
  return 'none';
}

export interface CombinedExposure {
  level: ExposureLevel;
  driver: 'pm25' | 'upwind' | 'both' | 'none';
}

/** Missing inputs never lower the level, and two missing inputs give `unknown` (never "none"). */
export function combineExposure(pm25: ExposureLevel, upwind: ExposureLevel): CombinedExposure {
  if (pm25 === 'unknown' && upwind === 'unknown') return { level: 'unknown', driver: 'none' };
  if (upwind === 'unknown') return { level: pm25, driver: pm25 === 'none' ? 'none' : 'pm25' };
  if (pm25 === 'unknown') return { level: upwind, driver: upwind === 'none' ? 'none' : 'upwind' };
  const a = RANK[pm25];
  const b = RANK[upwind];
  const level = a >= b ? pm25 : upwind;
  if (level === 'none') return { level, driver: 'none' };
  return { level, driver: a === b ? 'both' : a > b ? 'pm25' : 'upwind' };
}

export function exposureRank(level: ExposureLevel): number {
  return level === 'unknown' ? -1 : RANK[level];
}
