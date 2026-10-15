import type { ForecastHour } from '@pavana/shared';
import { describe, expect, it } from 'vitest';
import { summarizeDayForecast } from './forecast-summary';

function hour(validAt: string, pm25: number | null) {
  return { validAt, airQuality: { pm25UgM3: pm25 } } as unknown as ForecastHour;
}

describe('summarizeDayForecast', () => {
  it('picks the peak PM2.5 and its category within 24h', () => {
    const hours = [
      hour('2026-09-15T00:00:00Z', 33.9),
      hour('2026-09-15T01:00:00Z', 88.2),
      hour('2026-09-15T02:00:00Z', 40.1),
    ];
    const peak = summarizeDayForecast(hours);
    expect(peak.peakPm25).toBe(88.2);
    expect(peak.peakAt).toBe('2026-09-15T01:00:00Z');
    // 88.2 µg/m³ is USG-or-worse territory — never "unknown" for real data.
    expect(peak.peakCat).not.toBe('unknown');
  });

  it('stays null/unknown when every value is missing (never 0 or "good")', () => {
    const peak = summarizeDayForecast([
      hour('2026-09-15T00:00:00Z', null),
      hour('2026-09-15T01:00:00Z', null),
    ]);
    expect(peak.peakPm25).toBeNull();
    expect(peak.peakAt).toBeNull();
    expect(peak.peakCat).toBe('unknown');
  });

  it('ignores hours beyond the 24h window', () => {
    const hours = [
      hour('2026-09-15T00:00:00Z', 20),
      ...Array.from(
        { length: 23 },
        (_, i) => hour(`2026-09-15T${String(i + 1).padStart(2, '0')}:00:00Z`, 10),
      ),
      // Index 24 — outside the window, must not win.
      hour('2026-09-16T00:00:00Z', 999),
    ];
    const peak = summarizeDayForecast(hours);
    expect(peak.peakPm25).toBe(20);
  });
});
