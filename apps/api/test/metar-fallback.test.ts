import { describe, expect, it, vi } from 'vitest';
import { hourlyReports } from '@pavana/shared';
import { createModelInputs } from '../src/providers/model-inputs';
import { parseNoaaMetar } from '../src/providers/model-inputs/noaa-metar';

const now = new Date('2026-10-16T10:40:00Z');
const report = {
  icaoId: 'WIOO',
  obsTime: Date.parse('2026-10-16T09:30:00Z') / 1000,
  receiptTime: '2026-10-16T09:35:00Z',
  temp: 28,
  dewp: 26,
  wdir: 240,
  wspd: 4,
  visib: 1.12,
  wxString: 'FU',
  rawOb: 'METAR WIOO 160930Z 24004KT 1800 FU BKN011 28/26 Q1009 NOSIG',
};
describe('recent NOAA METAR gap fallback', () => {
  it('converts units and retains provenance of the complete report', () => {
    const r = parseNoaaMetar([report], now).get('WIOO')![0]!;
    expect(r).toMatchObject({
      provider: 'noaa-awc',
      tmpc: 28,
      dwpc: 26,
      wxcodes: 'FU',
      windDirFromDeg: 240,
    });
    expect(r.windSpeedMs).toBeCloseTo(2.057776);
    expect(r.vsbyKm).toBeCloseTo(1.80246528);
    expect(hourlyReports([r], now.getTime())[0]!.hour).toBe(Date.parse('2026-10-16T10:00:00Z'));
  });
  it('rejects future reports and does not invent censored visibility or VRB direction', () => {
    const rows = parseNoaaMetar(
      [
        { ...report, obsTime: now.getTime() / 1000 + 600 },
        { ...report, receiptTime: '2026-10-16T11:00:00Z' },
        { ...report, visib: '6+', wdir: 'VRB' },
      ],
      now,
    ).get('WIOO')!;
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ vsbyKm: null, windDirFromDeg: null });
  });
  it('recovers invalid IEM payload, and keeps missing fields missing', async () => {
    const fetch = vi.fn(async (url: string) =>
      url.includes('aviationweather.gov')
        ? Response.json([{ ...report, temp: null }])
        : new Response('station,valid\nWIOO,2026-10-16 03:30'),
    );
    const result = await createModelInputs({ fetch, now: () => now }).metar(['WIOO'], now);
    expect(result.get('WIOO')![0]).toMatchObject({ provider: 'noaa-awc', tmpc: null });
    expect(fetch).toHaveBeenCalledTimes(2);
  });
  it('preserves usable primary reports when fallback JSON is malformed', async () => {
    const fetch = vi.fn(async (url: string) =>
      url.includes('aviationweather.gov')
        ? Response.json({ error: 'bad upstream schema' })
        : new Response(
            'station,valid,vsby,wxcodes,tmpf,dwpf,drct,sknt,metar\nWIOO,2026-10-16 03:30,1,FU,80,78,240,4,M',
          ),
    );
    const result = await createModelInputs({ fetch, now: () => now }).metar(['WIOO'], now);
    expect(result.get('WIOO')![0]).toMatchObject({
      provider: 'iem',
      validAt: '2026-10-16T03:30:00Z',
    });
  });
});
