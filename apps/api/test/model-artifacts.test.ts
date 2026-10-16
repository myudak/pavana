import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ModelEvaluationsResponseSchema } from '@pavana/shared';
import { describe, expect, it } from 'vitest';
import { getModelEvaluations } from '../src/services/models';
import { getRegressionEvaluations } from '../src/services/regression-models';

const dir = resolve(__dirname, '../src/models');
const manifest = JSON.parse(readFileSync(resolve(dir, 'artifact-manifest.json'), 'utf8')) as {
  files: Record<string, string>;
  metricsRecomputedFromPredictions: boolean;
  run: { boosterCount: number; status: string };
};
describe('immutable Kaggle serving artifacts', () => {
  it('has a completed six-booster run and verified prediction metrics', () => {
    expect(manifest.run).toMatchObject({ status: 'completed', boosterCount: 6 });
    expect(manifest.metricsRecomputedFromPredictions).toBe(true);
  });
  it('keeps every serving file byte-identical to the validated Kaggle output', () => {
    for (const [name, hash] of Object.entries(manifest.files)) {
      const actual = createHash('sha256')
        .update(readFileSync(resolve(dir, name)))
        .digest('hex');
      expect(actual, name).toBe(hash);
    }
  });
  it('evaluates baselines and models on the same rows with classification compatibility', () => {
    const d = ModelEvaluationsResponseSchema.parse({
      models: getModelEvaluations(),
      regressionModels: getRegressionEvaluations(),
    });
    expect(d.models).toHaveLength(3);
    expect(d.regressionModels.map((m) => m.id)).toEqual(['pm25', 'wind']);
    for (const m of [...d.models, ...d.regressionModels]) {
      expect(m.test.model.n).toBeGreaterThan(0);
      expect(m.test.model.n).toBe(m.test.persistence.n);
      expect(m.test.model.n).toBe(m.test.climatology.n);
    }
  });
});
