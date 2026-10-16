import { pm25ToUsAqi } from '../aq/us-aqi';
import type { DailyCategory } from '../schemas/daily';

/** One hourly PM2.5 sample. `null` = no data for that hour (never 0). */
export interface DailyHourInput {
  validAt: string;
  pm25UgM3: number | null;
}

export interface DailyAggregate {
  /** Local calendar date (YYYY-MM-DD) in `tz`. */
  date: string;
  pm25Min: number | null;
  pm25Max: number | null;
  pm25Mean: number | null;
  category: DailyCategory;
  available: boolean;
  rainProbPct: number | null;
}

/** UTC instant → local calendar date (YYYY-MM-DD) in `tz`. */
export function localDateKey(iso: string, tz: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: tz,
  }).format(new Date(iso));
}

/**
 * Group hourly PM2.5 into local calendar days starting at "today".
 *
 * - Today is partial by construction: only the remaining hours are in `hours`.
 * - `null` hours are skipped, never treated as 0.
 * - A date with no usable hours returns `available: false` with null stats.
 * - Always returns exactly `days` entries, even beyond the provider horizon.
 */
export function aggregateDaily(
  hours: DailyHourInput[],
  tz: string,
  opts?: { days?: number; now?: Date },
): DailyAggregate[] {
  const days = opts?.days ?? 10;
  const anchor = opts?.now ?? (hours[0] ? new Date(hours[0].validAt) : new Date());
  const todayKey = localDateKey(anchor.toISOString(), tz);
  // Noon UTC of the local start date — immune to whole-hour offset shifts.
  const startUtc = Date.parse(`${todayKey}T12:00:00Z`);

  const byDate = new Map<string, number[]>();
  for (const h of hours) {
    const v = h.pm25UgM3;
    if (v === null || !Number.isFinite(v)) continue;
    const key = localDateKey(h.validAt, tz);
    const list = byDate.get(key);
    if (list) list.push(v);
    else byDate.set(key, [v]);
  }

  const out: DailyAggregate[] = [];
  for (let i = 0; i < days; i += 1) {
    const date = localDateKey(new Date(startUtc + i * 86_400_000).toISOString(), tz);
    const values = byDate.get(date) ?? [];
    if (values.length === 0) {
      out.push({
        date,
        pm25Min: null,
        pm25Max: null,
        pm25Mean: null,
        category: 'unknown',
        available: false,
        rainProbPct: null,
      });
      continue;
    }
    const min = Math.min(...values);
    const max = Math.max(...values);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    out.push({
      date,
      pm25Min: min,
      pm25Max: max,
      pm25Mean: mean,
      category: (pm25ToUsAqi(max)?.category ?? 'unknown') as DailyCategory,
      available: true,
      // No weather provider currently supplies a daily rain probability.
      rainProbPct: null,
    });
  }
  return out;
}
