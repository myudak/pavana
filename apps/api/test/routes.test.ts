import {
  ConditionsResponseSchema,
  ForecastResponseSchema,
  HotspotsResponseSchema,
  InsightsResponseSchema,
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

  it('GET /api/hotspots filters by bbox', async () => {
    const all = HotspotsResponseSchema.parse((await get('/api/hotspots?bbox=108,-2,111,1')).json());
    expect(all.hotspots.length).toBeGreaterThan(0);
    const none = HotspotsResponseSchema.parse(
      (await get('/api/hotspots?bbox=100,-2,101,-1')).json(),
    );
    expect(none.hotspots).toHaveLength(0);
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
