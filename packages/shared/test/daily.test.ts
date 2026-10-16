import { describe, expect, it } from 'vitest';
import { aggregateDaily, DailyForecastDaySchema } from '../src';

const TZ = 'Asia/Pontianak'; // UTC+7, no DST.

function hour(validAt: string, pm25UgM3: number | null) {
  return { validAt, pm25UgM3 };
}

describe('aggregateDaily', () => {
  it('groups hours into local calendar days with min/max/mean and category from max', () => {
    const hours = [
      hour('2026-09-15T00:00:00Z', 30), // 07:00 local Sep 15
      hour('2026-09-15T06:00:00Z', 60), // 13:00 local Sep 15
      hour('2026-09-15T18:00:00Z', 20), // 01:00 local Sep 16
    ];
    const days = aggregateDaily(hours, TZ, { days: 2, now: new Date('2026-09-15T00:00:00Z') });
    expect(days).toHaveLength(2);
    expect(days[0]).toMatchObject({
      date: '2026-09-15',
      pm25Min: 30,
      pm25Max: 60,
      available: true,
    });
    expect(days[0]!.pm25Mean).toBeCloseTo(45);
    // 60 µg/m³ → unhealthy (151–200), derived from the max.
    expect(days[0]!.category).toBe('unhealthy');
    expect(days[1]).toMatchObject({
      date: '2026-09-16',
      pm25Min: 20,
      pm25Max: 20,
      pm25Mean: 20,
      category: 'moderate',
      available: true,
    });
  });

  it('never turns null into 0', () => {
    const hours = [hour('2026-09-15T00:00:00Z', null), hour('2026-09-15T01:00:00Z', 40)];
    const [day] = aggregateDaily(hours, TZ, { days: 1, now: new Date('2026-09-15T00:00:00Z') });
    expect(day).toMatchObject({ pm25Min: 40, pm25Max: 40, pm25Mean: 40, available: true });
  });

  it('marks days without data as available:false with null stats and unknown category', () => {
    const hours = [hour('2026-09-15T00:00:00Z', 25)];
    const days = aggregateDaily(hours, TZ, { days: 3, now: new Date('2026-09-15T00:00:00Z') });
    expect(days).toHaveLength(3);
    expect(days[0]!.available).toBe(true);
    for (const d of days.slice(1)) {
      expect(d).toEqual({
        date: d.date,
        pm25Min: null,
        pm25Max: null,
        pm25Mean: null,
        category: 'unknown',
        available: false,
        rainProbPct: null,
      });
    }
    expect(days[1]!.date).toBe('2026-09-16');
    expect(days[2]!.date).toBe('2026-09-17');
  });

  it('treats today as partial — only the remaining hours count', () => {
    // Now is 18:00 UTC (01:00 local Sep 16); earlier hours of Sep 15 are gone.
    const hours = [hour('2026-09-15T18:00:00Z', 50), hour('2026-09-15T19:00:00Z', 70)];
    const days = aggregateDaily(hours, TZ, { days: 2, now: new Date('2026-09-15T18:00:00Z') });
    expect(days[0]).toMatchObject({ date: '2026-09-16', pm25Min: 50, pm25Max: 70 });
    expect(days[1]).toMatchObject({ date: '2026-09-17', available: false });
  });

  it('aggregates satisfy the DailyForecastDay schema shape (minus provenance)', () => {
    const hours = [hour('2026-09-15T00:00:00Z', 12)];
    const [day] = aggregateDaily(hours, TZ, { days: 1, now: new Date('2026-09-15T00:00:00Z') });
    const parsed = DailyForecastDaySchema.safeParse({
      ...day,
      provenance: {
        provider: 'test',
        kind: 'forecast',
        fetchedAt: '2026-09-15T00:00:00Z',
        validAt: '2026-09-15T00:00:00Z',
        isDemo: false,
      },
    });
    expect(parsed.success).toBe(true);
  });
});
