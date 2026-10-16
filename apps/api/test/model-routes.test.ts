import {
  HazeResponseSchema,
  HotspotRiskResponseSchema,
  ModelEvaluationsResponseSchema,
  Pm25ModelResponseSchema,
  WindModelResponseSchema,
} from '@pavana/shared';
import { describe, expect, it } from 'vitest';
import { buildApp } from '../src/app';
import { loadConfig } from '../src/config/env';

describe('model HTTP contracts with real archived replay', () => {
  it('validates all four output types and separate regression evaluations', async () => {
    const app = await buildApp({
      config: loadConfig({ PAVANA_MODE: 'demo', LOG_LEVEL: 'silent' }),
    });
    try {
      for (const [path, schema] of [
        ['pm25', Pm25ModelResponseSchema],
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
      expect((await app.inject('/api/model/wind?lat=100&demo=1')).statusCode).toBe(400);
    } finally {
      await app.close();
    }
  });
});
