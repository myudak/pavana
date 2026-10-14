import type { Trend } from '@pavana/shared';

export interface TrendOptions {
  /** Minimum absolute change (µg/m³) to call a trend. */
  minDeltaUgM3: number;
  /** Minimum relative change (fraction of current) to call a trend. */
  minRelative: number;
}

export const DEFAULT_TREND_OPTIONS: TrendOptions = { minDeltaUgM3: 10, minRelative: 0.2 };

/**
 * Direction of PM2.5 change: compares the current value with the PEAK (or trough) of the
 * upcoming values. Deterministic and explainable; returns `unknown` when data is missing.
 */
export function pm25Trend(
  current: number | null,
  upcoming: readonly (number | null)[],
  opts: TrendOptions = DEFAULT_TREND_OPTIONS,
): Trend {
  const values = upcoming.filter((v): v is number => v !== null);
  if (current === null || values.length === 0) return 'unknown';
  const peak = Math.max(...values);
  const trough = Math.min(...values);
  const rise = peak - current;
  const fall = current - trough;
  const threshold = Math.max(opts.minDeltaUgM3, current * opts.minRelative);
  if (rise >= threshold && rise >= fall) return 'worsening';
  if (fall >= threshold) return 'improving';
  return 'stable';
}
