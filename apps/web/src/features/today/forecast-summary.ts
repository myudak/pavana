import type { ForecastHour, UsAqiCategory } from '@pavana/shared';
import { categoryOf } from '@/lib/aq';

export interface DayPeak {
  peakPm25: number | null;
  peakCat: UsAqiCategory | 'unknown';
  peakAt: string | null;
}

/** Peak PM2.5 (and its category) across the next 24h of forecast. Null-safe. */
export function summarizeDayForecast(hours: ForecastHour[]): DayPeak {
  let peakPm25: number | null = null;
  let peakAt: string | null = null;
  for (const h of hours.slice(0, 24)) {
    const v = h.airQuality.pm25UgM3;
    if (v !== null && (peakPm25 === null || v > peakPm25)) {
      peakPm25 = v;
      peakAt = h.validAt;
    }
  }
  return { peakPm25, peakCat: categoryOf(peakPm25), peakAt };
}
