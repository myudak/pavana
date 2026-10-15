import {
  ConditionsResponseSchema,
  DailyForecastResponseSchema,
  ForecastResponseSchema,
  HotspotsResponseSchema,
  InsightsResponseSchema,
  isBorneoLand,
  WindFieldSchema,
} from '@pavana/shared';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app';
import { loadConfig } from '../src/config/env';

// Sungai Raya, Kubu Raya — inside the demo fixture coverage.
const KR = 'lat=-0.1&lon=109.38';

let app: FastifyInstance;

beforeAll(async () => {
  app = await buildApp({ config: loadConfig({ PAVANA_MODE: 'demo', LOG_LEVEL: 'silent' }) });
});
afterAll(() => app.close());

const get = (url: string) => app.inject({ method: 'GET', url });

describe('demo mode API', () => {
  it('GET /health', async () => {
    const res = await get('/health');
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ status: 'ok', mode: 'demo' });
  });

  it('GET /api/conditions returns labelled demo data with provenance', async () => {
    const res = await get(`/api/conditions?${KR}`);
    expect(res.statusCode).toBe(200);
    const body = ConditionsResponseSchema.parse(res.json());
    expect(body.state).toBe('demo');
    expect(body.airQuality.provenance.isDemo).toBe(true);
    expect(body.airQuality.provenance.kind).toBe('fixture');
    expect(body.airQuality.aqi?.standard).toBe('US_EPA');
    expect(body.trend).toBe('worsening');
  });

  it('outside demo coverage → insufficient, PM2.5 null (never 0)', async () => {
    const res = await get('/api/conditions?lat=-6.2&lon=106.8');
    const body = ConditionsResponseSchema.parse(res.json());
    expect(body.state).toBe('insufficient');
    expect(body.airQuality.pm25UgM3).toBeNull();
    expect(body.trend).toBe('unknown');
  });

  it('GET /api/forecast returns hours+1 entries', async () => {
    const body = ForecastResponseSchema.parse((await get(`/api/forecast?${KR}&hours=24`)).json());
    expect(body.hours).toHaveLength(25);
    expect(body.hours[0]?.weather?.windDirectionFromDeg).toBeTypeOf('number');
  });

  it('GET /api/forecast accepts the raised 240h cap backing the 10-day view', async () => {
    expect((await get(`/api/forecast?${KR}&hours=168`)).statusCode).toBe(200);
    expect((await get(`/api/forecast?${KR}&hours=240`)).statusCode).toBe(200);
    expect((await get(`/api/forecast?${KR}&hours=241`)).statusCode).toBe(400);
  });

  it('GET /api/forecast/daily returns 10 labelled days, padding beyond the horizon', async () => {
    const res = await get(`/api/forecast/daily?${KR}&days=10`);
    expect(res.statusCode).toBe(200);
    const body = DailyForecastResponseSchema.parse(res.json());
    expect(body.state).toBe('demo');
    expect(body.days).toHaveLength(10);
    // Fixture horizon covers ~2 local days; both aggregate deterministically.
    expect(body.days[0]).toMatchObject({ date: '2026-09-15', available: true });
    expect(body.days[0]!.pm25Min).not.toBeNull();
    expect(body.days[0]!.pm25Max).not.toBeNull();
    expect(body.days[0]!.pm25Mean).not.toBeNull();
    expect(body.days[0]!.category).toBe('very_unhealthy');
    expect(body.days[0]!.provenance.kind).toBe('fixture');
    expect(body.days[0]!.provenance.isDemo).toBe(true);
    expect(body.days[1]).toMatchObject({ date: '2026-09-16', available: true });
    // Days beyond the provider horizon: available:false, nulls, unknown — never invented.
    for (const d of body.days.slice(2)) {
      expect(d.available).toBe(false);
      expect(d.pm25Min).toBeNull();
      expect(d.pm25Max).toBeNull();
      expect(d.pm25Mean).toBeNull();
      expect(d.category).toBe('unknown');
    }
    expect(body.days[9]!.date).toBe('2026-09-24');
  });

  it('GET /api/forecast/daily respects days= and rejects days>10', async () => {
    const three = DailyForecastResponseSchema.parse(
      (await get(`/api/forecast/daily?${KR}&days=3`)).json(),
    );
    expect(three.days).toHaveLength(3);
    expect((await get(`/api/forecast/daily?${KR}&days=11`)).statusCode).toBe(400);
  });

  it('GET /api/forecast/daily outside demo coverage → insufficient, all unavailable', async () => {
    const body = DailyForecastResponseSchema.parse(
      (await get('/api/forecast/daily?lat=-6.2&lon=106.8')).json(),
    );
    expect(body.state).toBe('insufficient');
    expect(body.days).toHaveLength(10);
    for (const d of body.days) {
      expect(d.available).toBe(false);
      expect(d.pm25Max).toBeNull();
    }
  });
  it('GET /api/hotspots filters by bbox', async () => {
    const all = HotspotsResponseSchema.parse((await get('/api/hotspots?bbox=108,-2,111,1')).json());
    expect(all.hotspots.length).toBeGreaterThan(0);
    const none = HotspotsResponseSchema.parse(
      (await get('/api/hotspots?bbox=100,-2,101,-1')).json(),
    );
    expect(none.hotspots).toHaveLength(0);
  });

  it('GET /api/hotspots serves the regional Kalimantan fixture', async () => {
    const body = HotspotsResponseSchema.parse(
      (await get('/api/hotspots?bbox=108.5,-4.5,119.5,4.5&limit=2000')).json(),
    );
    expect(body.state).toBe('demo');
    // Synthetic regional field: hundreds of points, all fixture provenance.
    expect(body.hotspots.length).toBeGreaterThanOrEqual(1200);
    expect(body.hotspots.length).toBeLessThanOrEqual(1800);
    // On-land spread: every quadrant of the island bbox holds detections.
    const quads = [0, 0, 0, 0];
    for (const h of body.hotspots) {
      expect(h.lon).toBeGreaterThanOrEqual(108.5);
      expect(h.lon).toBeLessThanOrEqual(119.5);
      expect(h.lat).toBeGreaterThanOrEqual(-4.5);
      expect(h.lat).toBeLessThanOrEqual(4.5);
      expect(isBorneoLand(h.lon, h.lat)).toBe(true);
      quads[(h.lon < 114 ? 0 : 2) + (h.lat < 0 ? 0 : 1)]! += 1;
    }
    for (const q of quads) expect(q).toBeGreaterThanOrEqual(10);
    for (const h of body.hotspots) {
      expect(h.provenance.provider).toBe('pavana-fixture');
      expect(h.provenance.kind).toBe('fixture');
      expect(h.provenance.isDemo).toBe(true);
    }
    const limited = HotspotsResponseSchema.parse(
      (await get('/api/hotspots?bbox=108.5,-4.5,119.5,4.5&limit=10')).json(),
    );
    expect(limited.hotspots).toHaveLength(10);
  });

  it('GET /api/insights is deterministic, not ML', async () => {
    const body = InsightsResponseSchema.parse((await get(`/api/insights?${KR}`)).json());
    expect(body.model).toEqual({
      method: 'deterministic_indicators',
      modelVersion: null,
      evaluated: false,
    });
    expect(body.factors.map((f) => f.id)).toEqual(['pm25_trend', 'wind', 'upwind_hotspots']);
    // Fixture hotspots sit SE of the location with a SE wind → upwind signal.
    expect(body.factors.find((f) => f.id === 'upwind_hotspots')?.signal).toBe('worsening');
  });

  it('rejects invalid input with 400', async () => {
    expect((await get('/api/conditions?lat=200&lon=0')).statusCode).toBe(400);
    expect((await get('/api/hotspots?bbox=1,2,3')).statusCode).toBe(400);
  });

  it('GET /api/wind-field returns a demo grid with fixture provenance', async () => {
    const body = WindFieldSchema.parse(
      (await get('/api/wind-field?bbox=108.5,-4.5,119.5,4.5')).json(),
    );
    expect(body.cols).toBe(14);
    expect(body.rows).toBe(14);
    expect(body.points).toHaveLength(196);
    for (const p of body.points) {
      expect(p.provenance.provider).toBe('pavana-fixture');
      expect(p.provenance.isDemo).toBe(true);
      // Missing values stay null, never 0.
      if (p.speedMs !== null) {
        expect(p.speedMs).toBeGreaterThanOrEqual(0);
        expect(p.speedMs).toBeLessThanOrEqual(6.5);
      }
      if (p.fromDeg !== null) {
        expect(p.fromDeg).toBeGreaterThanOrEqual(0);
        expect(p.fromDeg).toBeLessThanOrEqual(360);
      }
    }
  });

  it('unknown route → 404 JSON', async () => {
    const res = await get('/nope');
    expect(res.statusCode).toBe(404);
    expect(res.json()).toHaveProperty('error.code', 'not_found');
  });
});

describe('live mode (providers not implemented yet)', () => {
  it('returns 501 instead of fake data', async () => {
    const live = await buildApp({
      config: loadConfig({ PAVANA_MODE: 'live', LOG_LEVEL: 'silent' }),
    });
    const res = await live.inject({ method: 'GET', url: `/api/conditions?${KR}` });
    expect(res.statusCode).toBe(501);
    expect(res.json()).toHaveProperty('error.code', 'not_implemented');
    await live.close();
  });
});
