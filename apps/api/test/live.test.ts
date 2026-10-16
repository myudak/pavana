/**
 * Live mode with recorded upstream responses (test/upstream/*). No network: every
 * request goes through the injected fetch below, and an unexpected URL fails the test.
 */
import { readFileSync } from 'node:fs';
import {
  ConditionsResponseSchema,
  ExposureResponseSchema,
  ForecastResponseSchema,
  HotspotsResponseSchema,
  InsightsResponseSchema,
  LocationSearchResponseSchema,
  SourcesResponseSchema,
  WeatherReferenceResponseSchema,
  WindFieldSchema,
} from '@pavana/shared';
import type { FastifyInstance } from 'fastify';
import { afterEach, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app';
import { loadConfig } from '../src/config/env';
import { TtlCache } from '../src/lib/cache';
import { parseFirmsCsv } from '../src/providers/firms';
import { parseBmkg } from '../src/providers/bmkg';
import { searchRegions, timezoneForProvince } from '../src/providers/regions';

const up = (f: string) => readFileSync(new URL(`./upstream/${f}`, import.meta.url), 'utf8');
const WX = up('open-meteo-forecast.json');
const AQ = up('open-meteo-air-quality.json');
const GEO = up('open-meteo-geocoding.json');
const BMKG = up('bmkg-prakiraan.json');
const FIRMS = up('firms-viirs-noaa20.csv');
const FIRMS_EMPTY = FIRMS.split('\n')[0] + '\n';

const wxTimes = (JSON.parse(WX) as { hourly: { time: number[] } }).hourly.time;
/** "Now" = 10 minutes into the second hour of the recorded series. */
const NOW = new Date(wxTimes[1]! * 1000 + 10 * 60_000);
const KR = 'lat=-0.1&lon=109.38';

type Handler = (url: string) => Response | Promise<Response>;
const json = (body: string | object, status = 200) =>
  new Response(typeof body === 'string' ? body : JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });

/** Default upstream router; individual tests override entries. */
function routes(overrides: Partial<Record<string, Handler>> = {}): Record<string, Handler> {
  return {
    'api.open-meteo.com/v1/forecast': (url) => {
      if (!url.includes('current=')) return json(WX);
      // Multi-point "current" request: one entry per latitude in the URL.
      const n = new URL(url).searchParams.get('latitude')!.split(',').length;
      return json(
        Array.from({ length: n }, (_, i) => ({
          latitude: 0,
          longitude: 0,
          current: { time: wxTimes[1], wind_speed_10m: 2 + (i % 3), wind_direction_10m: 135 },
        })),
      );
    },
    'air-quality-api.open-meteo.com': () => json(AQ),
    'geocoding-api.open-meteo.com': () => json(GEO),
    'firms.modaps.eosdis.nasa.gov': (url) =>
      new Response(url.includes('VIIRS_NOAA20_NRT') ? FIRMS : FIRMS_EMPTY, { status: 200 }),
    'api.openaq.org/v3/locations?': () =>
      json({
        results: [
          {
            id: 777,
            name: 'Pontianak Kota',
            coordinates: { latitude: -0.03, longitude: 109.33 },
            sensors: [{ id: 9001, parameter: { id: 2, name: 'pm25', units: 'µg/m³' } }],
          },
        ],
      }),
    'api.openaq.org/v3/locations/777/latest': () =>
      json({
        results: [
          {
            datetime: { utc: new Date(NOW.getTime() - 30 * 60_000).toISOString() },
            value: 42.5,
            sensorsId: 9001,
          },
        ],
      }),
    'api.bmkg.go.id': () => json(BMKG),
    ...overrides,
  } as Record<string, Handler>;
}

function mockFetch(table: Record<string, Handler>) {
  const calls: string[] = [];
  const fetch = async (url: string) => {
    calls.push(url);
    const key = Object.keys(table).find((k) => url.includes(k));
    if (!key) throw new Error(`unexpected upstream URL in test: ${url}`);
    return table[key]!(url);
  };
  return { fetch, calls };
}

let app: FastifyInstance | undefined;
afterEach(async () => {
  await app?.close();
  app = undefined;
});

async function liveApp(
  table = routes(),
  env: Record<string, string> = { FIRMS_MAP_KEY: 'test-firms', OPENAQ_API_KEY: 'test-oaq' },
) {
  const m = mockFetch(table);
  app = await buildApp({
    config: loadConfig({ PAVANA_MODE: 'live', LOG_LEVEL: 'silent', ...env }),
    liveDeps: { fetch: m.fetch, now: () => NOW },
  });
  const get = (url: string) => app!.inject({ method: 'GET', url });
  return { get, calls: m.calls };
}

describe('live mode (recorded upstream)', () => {
  // Cold provider/fixture initialization can exceed Vitest's 5 s default on loaded Windows hosts.
  it('accepts five days, requests the upstream buffer, and rejects unsupported query lengths', async () => {
    const { get, calls } = await liveApp();
    const response = await get(`/api/forecast?${KR}&hours=120`);
    expect(response.statusCode).toBe(200);
    const body = ForecastResponseSchema.parse(response.json());
    expect(body.hours.length).toBeLessThanOrEqual(121);
    expect(calls.filter((url) => url.includes('forecast_hours=121'))).toHaveLength(2);
    expect((await get(`/api/forecast?${KR}&hours=121`)).statusCode).toBe(400);
  }, 20_000);
  it('conditions: CAMS forecast + Open-Meteo wind + OpenAQ station, all labelled', async () => {
    const { get } = await liveApp();
    const res = await get(`/api/conditions?${KR}`);
    expect(res.statusCode).toBe(200);
    const body = ConditionsResponseSchema.parse(res.json());
    expect(body.state).toBe('live');
    expect(body.location.timezone).toBe('Asia/Pontianak');
    expect(body.airQuality.provenance).toMatchObject({
      provider: 'open-meteo-cams',
      kind: 'forecast',
      isDemo: false,
    });
    expect(body.weather?.provenance.provider).toBe('open-meteo');
    expect(body.station).toMatchObject({ name: 'Pontianak Kota', stationId: 'openaq:777' });
    expect(body.station?.airQuality.provenance.kind).toBe('observation');
    expect(body.station?.airQuality.aqi?.standard).toBe('US_EPA');
    expect(res.headers['cache-control']).toContain('s-maxage=900');
  });

  it('forecast: hourly series starts at the current hour, UTC timestamps', async () => {
    const { get } = await liveApp();
    const body = ForecastResponseSchema.parse((await get(`/api/forecast?${KR}&hours=24`)).json());
    expect(body.hours).toHaveLength(25);
    expect(body.hours[0]!.validAt).toBe(
      new Date(wxTimes[1]! * 1000).toISOString().replace('.000Z', 'Z'),
    );
    for (const h of body.hours) expect(h.validAt.endsWith('Z')).toBe(true);
  });

  it('hotspots: FIRMS CSV → detections with provenance; bad rows dropped', async () => {
    const { get } = await liveApp();
    const body = HotspotsResponseSchema.parse(
      (await get('/api/hotspots?bbox=108,-4,119,4.5')).json(),
    );
    expect(body.state).toBe('live');
    expect(body.hotspots).toHaveLength(4);
    expect(body.hotspots.every((h) => h.provenance.kind === 'observation')).toBe(true);
  });

  it('exposure + insights use live hotspots and wind', async () => {
    const { get } = await liveApp();
    const ex = ExposureResponseSchema.parse((await get(`/api/exposure?${KR}`)).json());
    expect(ex.state).toBe('live');
    expect(ex.summary.hotspotsAvailable).toBe(true);
    expect(ex.summary.hotspotsConsidered).toBeGreaterThan(0);
    expect(ex.hours[0]!.upwind).not.toBeNull();
    const ins = InsightsResponseSchema.parse((await get(`/api/insights?${KR}`)).json());
    expect(ins.factors.find((f) => f.id === 'upwind_hotspots')?.signal).not.toBe('unknown');
  });

  it('FIRMS failure: hotspots 502, exposure degrades to unknown upwind (never "no fire")', async () => {
    const { get } = await liveApp(
      routes({
        'firms.modaps.eosdis.nasa.gov': () => new Response('Invalid MAP_KEY.', { status: 200 }),
      }),
    );
    const hs = await get('/api/hotspots?bbox=108,-4,119,4.5');
    expect(hs.statusCode).toBe(502);
    expect(hs.json()).toHaveProperty('error.code', 'upstream_unavailable');
    expect(hs.headers['cache-control']).toBe('no-store');
    expect(JSON.stringify(hs.json())).not.toContain('test-firms');

    const ex = ExposureResponseSchema.parse((await get(`/api/exposure?${KR}`)).json());
    expect(ex.summary.hotspotsAvailable).toBe(false);
    expect(ex.hours.every((h) => h.upwind === null)).toBe(true);
    const ins = InsightsResponseSchema.parse((await get(`/api/insights?${KR}`)).json());
    expect(ins.factors.find((f) => f.id === 'upwind_hotspots')?.signal).toBe('unknown');
  });

  it('Open-Meteo down → 502 upstream_unavailable, not fake values', async () => {
    const { get } = await liveApp(
      routes({ 'air-quality-api.open-meteo.com': () => json({ error: true }, 503) }),
    );
    const res = await get(`/api/conditions?${KR}`);
    expect(res.statusCode).toBe(502);
    expect(res.json()).toHaveProperty('error.code', 'upstream_unavailable');
  });

  it('caches upstream calls across requests', async () => {
    const { get, calls } = await liveApp();
    await get(`/api/forecast?${KR}`);
    await get(`/api/forecast?${KR}`);
    expect(calls.filter((u) => u.includes('api.open-meteo.com/v1/forecast'))).toHaveLength(1);
  });

  it('wind field: live grid from chunked multi-point requests', async () => {
    const { get, calls } = await liveApp();
    const body = WindFieldSchema.parse(
      (await get('/api/wind-field?bbox=108.5,-4.5,119.5,4.5')).json(),
    );
    expect(body.points).toHaveLength(14 * 14);
    expect(body.points[0]!.provenance.isDemo).toBe(false);
    expect(calls.filter((u) => u.includes('current='))).toHaveLength(Math.ceil(196 / 50));
  });

  it('weather reference: BMKG near covered cities, insufficient elsewhere', async () => {
    const { get } = await liveApp();
    const near = WeatherReferenceResponseSchema.parse(
      (await get(`/api/weather-reference?${KR}`)).json(),
    );
    expect(near.state).toBe('live');
    expect(near.place).toContain('Sungai Raya');
    expect(near.hours.length).toBeGreaterThan(0);
    const far = WeatherReferenceResponseSchema.parse(
      (await get('/api/weather-reference?lat=-6.2&lon=106.8')).json(),
    );
    expect(far.state).toBe('insufficient');
    expect(far.hours).toHaveLength(0);
  });

  it('location search: offline regions first, then geocoding', async () => {
    const { get } = await liveApp();
    const body = LocationSearchResponseSchema.parse(
      (await get('/api/locations/search?q=kubu%20raya')).json(),
    );
    expect(body.results[0]).toMatchObject({
      name: 'Kabupaten Kubu Raya',
      timezone: 'Asia/Pontianak',
    });
  });

  it('?demo=1 serves the fixture scenario from a live app', async () => {
    const { get, calls } = await liveApp();
    const res = await get(`/api/conditions?${KR}&demo=1`);
    expect(ConditionsResponseSchema.parse(res.json()).state).toBe('demo');
    expect(res.headers['cache-control']).toContain('s-maxage=3600');
    expect(calls).toHaveLength(0);
  });

  it('sources: reports ok / not_configured per upstream', async () => {
    const { get } = await liveApp(routes(), { FIRMS_MAP_KEY: 'test-firms' });
    const body = SourcesResponseSchema.parse((await get('/api/sources')).json());
    const status = Object.fromEntries(body.sources.map((s) => [s.id, s.status]));
    expect(status).toMatchObject({
      'open-meteo': 'ok',
      'open-meteo-cams': 'ok',
      'nasa-firms': 'ok',
      openaq: 'not_configured',
      bmkg: 'ok',
    });
  });
});

describe('parsers and helpers', () => {
  it('parseFirmsCsv maps time, confidence and missing FRP', () => {
    const rows = parseFirmsCsv(FIRMS, 'VIIRS_NOAA20_NRT', '2026-10-15T12:00:00Z');
    expect(rows).toHaveLength(4);
    expect(rows[0]).toMatchObject({
      acquiredAt: '2026-10-15T05:42:00Z',
      confidence: 'nominal',
      frpMw: 3.3,
      satellite: 'NOAA-20',
    });
    expect(rows[1]!.confidence).toBe('high');
    // Unpadded "542" → 05:42; empty FRP → null (never 0).
    expect(rows[2]).toMatchObject({
      acquiredAt: '2026-10-14T05:42:00Z',
      frpMw: null,
      confidence: 'low',
    });
  });

  it('parseFirmsCsv rejects non-CSV answers', () => {
    expect(() =>
      parseFirmsCsv('Invalid MAP_KEY.', 'VIIRS_SNPP_NRT', '2026-10-15T12:00:00Z'),
    ).toThrow();
  });

  it('parseBmkg converts km/h to m/s and keeps FROM degrees', () => {
    const { hours, issuedAt } = parseBmkg(JSON.parse(BMKG));
    expect(hours.length).toBeGreaterThan(0);
    expect(issuedAt).toMatch(/Z$/);
    const raw = (
      JSON.parse(BMKG) as { data: { cuaca: { ws: number; wd_deg: number }[][] }[] }
    ).data[0]!.cuaca.flat()[0]!;
    expect(hours[0]!.windSpeedMs).toBeCloseTo(raw.ws / 3.6, 5);
    expect(hours[0]!.windDirectionFromDeg).toBe(raw.wd_deg);
  });

  it('regions: search ignores Kota/Kabupaten; provinces map to WIB/WITA/WIT', () => {
    expect(searchRegions('pontianak')[0]?.name).toBe('Kota Pontianak');
    expect(timezoneForProvince('Kalimantan Barat')).toBe('Asia/Pontianak');
    expect(timezoneForProvince('Kalimantan Timur')).toBe('Asia/Makassar');
    expect(timezoneForProvince('Papua Selatan')).toBe('Asia/Jayapura');
    expect(timezoneForProvince('Jawa Barat')).toBe('Asia/Jakarta');
  });

  it('TtlCache serves the last good value when a refresh fails (stale-on-error)', async () => {
    let t = 0;
    const cache = new TtlCache(10, () => t, 60_000);
    expect(await cache.get('k', 1000, async () => 'fresh')).toBe('fresh');
    t = 5_000; // expired, upstream down
    expect(await cache.get('k', 1000, async () => Promise.reject(new Error('down')))).toBe('fresh');
    t = 120_000; // beyond max staleness → the error surfaces
    await expect(
      cache.get('k', 1000, async () => Promise.reject(new Error('down'))),
    ).rejects.toThrow();
  });

  it('TtlCache shares one in-flight load and does not cache failures', async () => {
    const cache = new TtlCache();
    let n = 0;
    const load = async () => ++n;
    const [a, b] = await Promise.all([cache.get('k', 1000, load), cache.get('k', 1000, load)]);
    expect([a, b, n]).toEqual([1, 1, 1]);
    await expect(
      cache.get('bad', 1000, async () => Promise.reject(new Error('x'))),
    ).rejects.toThrow();
    expect(await cache.get('bad', 1000, async () => 'ok')).toBe('ok');
  });
});
