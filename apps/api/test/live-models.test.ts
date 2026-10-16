/** Real exported boosters; synthetic input fixtures exercise serving contracts, not skill. */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  HazeResponseSchema,
  HotspotRiskResponseSchema,
  Pm25ModelResponseSchema,
  WindModelResponseSchema,
  PM25_REFERENCE,
  predictRaw,
  pm25Features,
  type GbdtModel,
  type MetarReport,
} from '@pavana/shared';
import { describe, expect, it, vi } from 'vitest';
import { getHaze, getHotspotRisk } from '../src/services/models';
import { getPm25, getWindModel } from '../src/services/regression-models';
import { createModelInputs, parseAsos, type ModelInputs } from '../src/providers/model-inputs';
const fixture = JSON.parse(
  readFileSync(resolve(__dirname, '../../../fixtures/test-vectors/live-features.json'), 'utf8'),
);
const model = JSON.parse(
  readFileSync(resolve(__dirname, '../src/models/pm25.model.json'), 'utf8'),
) as GbdtModel;
const point = { ...PM25_REFERENCE };
const now = new Date(fixture.asOf);
function inputs(overrides: Partial<ModelInputs> = {}): ModelInputs {
  return {
    recentDetections: vi.fn(async () => ({
      detections: [],
      daysSeen: new Set<string>(),
      fetchedAt: now.toISOString(),
    })),
    dailyWeather: vi.fn(async () => new Map()),
    metar: vi.fn(async () => new Map([['WIOO', fixture.reports as MetarReport[]]])),
    camsHistory: vi.fn(async () => ({
      points: fixture.cams,
      fetchedAt: now.toISOString(),
      gridLat: -0.099998474,
      gridLon: 109.399994,
    })),
    ...overrides,
  };
}
describe('experimental live model contracts', () => {
  it('runs all four real model outputs in archived replay with explicit provenance', async () => {
    const p = Pm25ModelResponseSchema.parse(await getPm25(null, point, now));
    const w = WindModelResponseSchema.parse(await getWindModel(null, point, now));
    const h = HazeResponseSchema.parse(await getHaze(null, point, now));
    const r = HotspotRiskResponseSchema.parse(await getHotspotRisk(null, point, now));
    expect(p.pm25UgM3).toBeTypeOf('number');
    expect(p.model).toMatchObject({
      targetKind: 'model',
      servingPolicy: 'experimental-cams-proxy',
      operationalReady: false,
    });
    expect(w.stations[0]!.speedMs).toBeTypeOf('number');
    expect(h.stations[0]!.p6h).toBeTypeOf('number');
    expect(r.cells.some((c) => c.probability !== null)).toBe(true);
    for (const d of [p, w, h, r]) expect(d.provenance.isDemo).toBe(true);
  });
  it('live CAMS → exact features → identity regression → validated numeric response', async () => {
    const d = Pm25ModelResponseSchema.parse(await getPm25(inputs(), point, now));
    expect(d.state).toBe('live');
    expect(d.pm25UgM3).toBeCloseTo(
      predictRaw(model, pm25Features(fixture.cams, now.getTime())!.x),
      9,
    );
    expect(Date.parse(d.targetAt!) - Date.parse(d.inputAt!)).toBe(6 * 3_600_000);
    expect(d.shapUnit).toBe('µg/m³');
  });
  it('source failures, stale inputs and a mismatched CAMS grid produce null with reasons', async () => {
    const failure = await getPm25(
      inputs({
        camsHistory: vi.fn(async () => {
          throw new Error('offline');
        }),
      }),
      point,
      now,
    );
    expect(failure.pm25UgM3).toBeNull();
    expect(failure.missing).toContain('cams-source-unavailable');
    const stale = await getPm25(inputs(), point, new Date(now.getTime() + 20 * 3_600_000));
    expect(stale.pm25UgM3).toBeNull();
    expect(stale.missing).toContain('cams-input-stale');
    const mismatch = await getPm25(
      inputs({
        camsHistory: vi.fn(async () => ({
          points: fixture.cams,
          fetchedAt: now.toISOString(),
          gridLat: 0,
          gridLon: 110,
        })),
      }),
      point,
      now,
    );
    expect(mismatch.pm25UgM3).toBeNull();
    expect(mismatch.missing).toContain('cams-grid-mismatch');
  });
  it('a missing critical value in the latest whole report is never filled from an older one', async () => {
    const latest = {
      ...(fixture.reports as MetarReport[]).at(-3)!,
      validAt: now.toISOString(),
      tmpc: null,
    };
    const at = new Date(now.getTime() + 3_600_000);
    const d = await getWindModel(
      inputs({ metar: vi.fn(async () => new Map([['WIOO', [...fixture.reports, latest]]])) }),
      point,
      at,
    );
    expect(d.stations[0]!.speedMs).toBeNull();
    expect(d.stations[0]!.missing).toContain('station-input-incomplete');
    const stale = await getWindModel(inputs(), point, new Date(now.getTime() + 10 * 3_600_000));
    expect(stale.stations[0]!.speedMs).toBeNull();
    expect(stale.stations[0]!.missing).toContain('station-report-stale');
  });
  it('outside reference coverage gives unknown values, never zero', async () => {
    const remote = { lat: -6.2, lon: 106.8 };
    const p = await getPm25(null, remote, now);
    const w = await getWindModel(null, remote, now);
    expect(p.pm25UgM3).toBeNull();
    expect(p.missing).toContain('outside-reference-coverage');
    expect(w.stations.every((s) => s.speedMs === null)).toBe(true);
  });
  it('haze requires the fire source, even with valid METAR', async () => {
    const d = await getHaze(
      inputs({
        recentDetections: vi.fn(async () => {
          throw new Error('offline');
        }),
      }),
      point,
      now,
    );
    expect(d.stations[0]!.p6h).toBeNull();
    expect(d.missing).toContain('nasa-firms-7d');
  });
  it('stale detection caches are refused instead of becoming zero hotspot features', async () => {
    const old = inputs({
      recentDetections: vi.fn(async () => ({
        detections: [],
        daysSeen: new Set<string>(),
        fetchedAt: new Date(now.getTime() - 2 * 3_600_000).toISOString(),
      })),
    });
    const d = await getHaze(old, point, now);
    expect(d.stations[0]!.p6h).toBeNull();
    expect(d.missing).toContain('firms-input-stale');
  });
  it('METAR CSV preserves unknown columns in the latest whole report and resolves clear weather from raw text', () => {
    const csv =
      'station,valid,vsby,wxcodes,metar,tmpf,dwpf,drct,sknt\nWIOO,2025-09-05 00:00,6.21,M,WIOO 050000Z 01003KT 9999 SCT012 25/24 Q1010 NOSIG,77,75.2,10,3';
    expect(parseAsos(csv).get('WIOO')![0]!.wxcodes).toBe('');
    const quoted = csv.replace(
      'WIOO 050000Z 01003KT 9999 SCT012 25/24 Q1010 NOSIG',
      '"WIOO 050000Z 01003KT 9999 SCT012 25/24 Q1010 NOSIG RMK TEST,COMMENT"',
    );
    expect(parseAsos(quoted).get('WIOO')![0]!.tmpc).toBe(25);
  });
  it('daily weather restores missing dates as null and separates cache keys by coordinates', async () => {
    const fetcher = vi.fn(async () =>
      Response.json({
        daily: {
          time: ['2025-09-02', '2025-09-04'],
          precipitation_sum: [1, 3],
          relative_humidity_2m_min: [60, 70],
          temperature_2m_max: [30, 31],
          wind_speed_10m_max: [2, 3],
          vapour_pressure_deficit_max: [1, 2],
        },
      }),
    );
    const live = createModelInputs({ fetch: fetcher, now: () => now });
    const a = await live.dailyWeather([{ lat: 0, lon: 110 }], '2025-09-04');
    expect(a.get('0.00,110.00')!.precipMm.slice(-3)).toEqual([1, null, 3]);
    await live.dailyWeather([{ lat: 2, lon: 112 }], '2025-09-04');
    expect(fetcher).toHaveBeenCalledTimes(4); // forecast + old missing-date archive per point
  });
  it('fetches CAMS only at the fixed reference and excludes future METAR rows', async () => {
    const fetcher = vi.fn(async (url: string) => {
      if (url.includes('air-quality'))
        return Response.json({
          latitude: -0.1,
          longitude: 109.4,
          hourly: { time: [now.getTime() / 1000], pm2_5: [12] },
        });
      return new Response(
        'station,valid,vsby,wxcodes,tmpf,dwpf,drct,sknt\nWIOO,2025-09-05 02:00,6,,77,75,10,3',
      );
    });
    const live = createModelInputs({ fetch: fetcher, now: () => now });
    await live.camsHistory();
    expect(fetcher.mock.calls[0]![0]).toContain(String(PM25_REFERENCE.lat));
    expect((await live.metar(['WIOO'], now)).get('WIOO')).toHaveLength(0);
  });
});
