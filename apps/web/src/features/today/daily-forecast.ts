import type { ForecastHour, Provenance } from '@pavana/shared';

export interface DailyForecastSummary {
  date: string;
  firstAt: string;
  minPm25: number | null;
  maxPm25: number | null;
  availableHours: number;
  provenance: Provenance;
}

/** Calendar days in the selected Indonesian time zone; missing values never become zero. */
export function summarizeDailyForecast(hours: readonly ForecastHour[], timeZone: string) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const groups = new Map<string, DailyForecastSummary>();
  const seen = new Set<number>();
  for (const hour of [...hours].sort((a, b) => Date.parse(a.validAt) - Date.parse(b.validAt))) {
    const ms = Date.parse(hour.validAt);
    if (!Number.isFinite(ms) || seen.has(ms)) continue;
    seen.add(ms);
    const parts = formatter.formatToParts(new Date(ms));
    const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)!.value;
    const date = `${part('year')}-${part('month')}-${part('day')}`;
    const day = groups.get(date) ?? {
      date,
      firstAt: hour.validAt,
      minPm25: null,
      maxPm25: null,
      availableHours: 0,
      provenance: hour.airQuality.provenance,
    };
    const value = hour.airQuality.pm25UgM3;
    if (value !== null && Number.isFinite(value) && value >= 0) {
      day.minPm25 = day.minPm25 === null ? value : Math.min(day.minPm25, value);
      day.maxPm25 = day.maxPm25 === null ? value : Math.max(day.maxPm25, value);
      day.availableHours += 1;
    }
    groups.set(date, day);
  }
  const days = [...groups.values()];
  // Upstream responses can pad the unsupported tail with nulls. Keep internal gaps visible.
  const first = days.findIndex((day) => day.availableHours > 0);
  let last = days.length - 1;
  while (last >= 0 && days[last]!.availableHours === 0) last -= 1;
  return first === -1 ? [] : days.slice(first, last + 1);
}
