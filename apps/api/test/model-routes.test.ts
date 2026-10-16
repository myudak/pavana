import {
  HazeResponseSchema,
  HotspotRiskResponseSchema,
  ModelEvaluationsResponseSchema,
  WindModelResponseSchema,
} from '@pavana/shared';
import { describe, expect, it } from 'vitest';
import { buildApp } from '../src/app';
import { loadConfig } from '../src/config/env';

describe('model HTTP contracts with real archived replay', () => {
  it('validates the served outputs and separate regression evaluations', async () => {
    const app = await buildApp({
      config: loadConfig({ PAVANA_MODE: 'demo', LOG_LEVEL: 'silent' }),
    });
    try {
      for (const [path, schema] of [
        ['wind', WindModelResponseSchema],
        ['haze', HazeResponseSchema],
        ['hotspot-risk', HotspotRiskResponseSchema],
      ] as const) {
        const res = await app.inject(`/api/model/${path}?lat=-0.1&lon=109.38&demo=1`);
        expect(res.statusCode, res.body).toBe(200);
        const d = schema.parse(res.json());
        expect(d.provenance.isDemo).toBe(true);
        expect(d.provenance.kind).toBe('derived');
        expect(res.body).not.toMatch(/\bNaN\b|\bInfinity\b/);
      }
      const res = await app.inject('/api/model/evaluation');
      expect(res.statusCode).toBe(200);
      const d = ModelEvaluationsResponseSchema.parse(res.json());
      expect(d.models).toHaveLength(3);
      expect(d.regressionModels).toHaveLength(2);
      // The CAMS-proxy PM2.5 model is research-only: evaluated in Lab ML, never served.
      expect((await app.inject('/api/model/pm25?lat=-0.1&lon=109.38&demo=1')).statusCode).toBe(404);
      expect((await app.inject('/api/model/wind?lat=100&demo=1')).statusCode).toBe(400);
    } finally {
      await app.close();
    }
    // Full-grid replay + TreeSHAP for every route; slow on loaded or shared runners.
  }, 30_000);
});
