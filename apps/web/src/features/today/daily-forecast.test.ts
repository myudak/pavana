import type { ForecastHour } from '@pavana/shared';
import { describe, expect, it } from 'vitest';
import { summarizeDailyForecast } from './daily-forecast';

const hour = (validAt: string, pm25UgM3: number | null) =>
  ({
    validAt,
    airQuality: { pm25UgM3, provenance: { provider: 'test' } },
  }) as ForecastHour;

describe('daily forecast calendar aggregation', () => {
  it('uses local midnight, preserves zero, counts unique hours, and ignores unsupported padding', () => {
    const data = [
      hour('2026-10-15T16:00:00Z', 0),
      hour('2026-10-15T17:00:00Z', 20),
      hour('2026-10-15T18:00:00Z', 50),
      hour('2026-10-15T18:00:00Z', 50),
      hour('2026-10-16T18:00:00Z', null),
    ];
    const days = summarizeDailyForecast(data, 'Asia/Jakarta');
    expect(days.map((day) => day.date)).toEqual(['2026-10-15', '2026-10-16']);
    expect(days[0]).toMatchObject({ minPm25: 0, maxPm25: 0, availableHours: 1 });
    expect(days[1]).toMatchObject({ minPm25: 20, maxPm25: 50, availableHours: 2 });
    expect(summarizeDailyForecast(data, 'Asia/Jayapura')[0]!.date).toBe('2026-10-16');
  });
  it('keeps an internal unknown day, and never produces values for an all-null forecast', () => {
    const data = [
      hour('2026-10-15T00:00:00Z', 10),
      hour('2026-10-16T00:00:00Z', null),
      hour('2026-10-17T00:00:00Z', 30),
    ];
    expect(summarizeDailyForecast(data, 'Asia/Jakarta')[1]).toMatchObject({
      minPm25: null,
      maxPm25: null,
      availableHours: 0,
    });
    expect(summarizeDailyForecast([data[1]!], 'Asia/Jakarta')).toEqual([]);
  });
});
