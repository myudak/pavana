import { describe, expect, it, vi } from 'vitest';
import { createModelInputs } from '../src/providers/model-inputs';

const now = new Date('2026-10-16T12:00:00Z');
const days = Array.from({ length: 61 }, (_, i) =>
  new Date(Date.UTC(2026, 7, 16 + i)).toISOString().slice(0, 10),
);
function forecast() {
  const rain: (number | null)[] = Array(61).fill(2);
  rain[0] = rain[60] = null;
  return {
    daily: {
      time: days,
      precipitation_sum: rain,
      relative_humidity_2m_min: Array(61).fill(70),
      temperature_2m_max: Array(61).fill(30),
      wind_speed_10m_max: Array(61).fill(2),
      vapour_pressure_deficit_max: Array(61).fill(1),
    },
  };
}
describe('hotspot historical weather edge', () => {
  it('fills an old missing day from the archive, preserving valid and recent missing values', async () => {
    const fetch = vi.fn(async (url: string) =>
      Response.json(
        url.includes('archive-api')
          ? { daily: { time: [days[0]], precipitation_sum: [8], relative_humidity_2m_min: [80] } }
          : forecast(),
      ),
    );
    const d = (
      await createModelInputs({ fetch, now: () => now }).dailyWeather(
        [{ lat: 0, lon: 110 }],
        '2026-10-15',
      )
    ).get('0.00,110.00')!;
    expect(d.precipMm[0]).toBe(8);
    expect(d.rhMinPct[0]).toBe(70);
    expect(d.precipMm.at(-1)).toBeNull();
    expect(fetch.mock.calls[1]![0]).toContain('start_date=2026-08-16&end_date=2026-08-16');
  });
  it('keeps an unavailable archived input null rather than inventing zero', async () => {
    const fetch = vi.fn(async (url: string) =>
      url.includes('archive-api') ? new Response('', { status: 503 }) : Response.json(forecast()),
    );
    const d = (
      await createModelInputs({ fetch, now: () => now }).dailyWeather(
        [{ lat: 0, lon: 110 }],
        '2026-10-15',
      )
    ).get('0.00,110.00')!;
    expect(d.precipMm[0]).toBeNull();
    expect(d.precipMm[1]).toBe(2);
  });
  it('rejects invalid physical values while retaining measured zero', async () => {
    const body = forecast();
    body.daily.precipitation_sum[60] = -1;
    body.daily.relative_humidity_2m_min[60] = 101;
    body.daily.wind_speed_10m_max[60] = 0;
    const fetch = vi.fn(async () => Response.json(body));
    const d = (
      await createModelInputs({ fetch, now: () => now }).dailyWeather(
        [{ lat: 0, lon: 110 }],
        '2026-10-15',
      )
    ).get('0.00,110.00')!;
    expect(d.precipMm.at(-1)).toBeNull();
    expect(d.rhMinPct.at(-1)).toBeNull();
    expect(d.windMaxMs.at(-1)).toBe(0);
  });
});
