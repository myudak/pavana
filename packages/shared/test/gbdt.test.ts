import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { predictProba, predictRaw, shapContributions, type GbdtModel } from '../src/model/gbdt';

// Parity vectors recorded by the Kaggle training kernel from LightGBM itself
// (predict raw_score / pred_contrib) next to each served model.
const DIR = resolve(__dirname, '../../../apps/api/src/models');
const cases = readdirSync(DIR)
  .filter((f) => f.endsWith('.parity.json'))
  .map((f) => ({ name: f.replace('.parity.json', ''), file: f }));

describe('pavana-gbdt-v1 evaluator matches LightGBM', () => {
  it('has the six real served boosters', () =>
    expect(cases.map((c) => c.name).sort()).toEqual([
      'haze-24h',
      'haze-6h',
      'hotspot-risk',
      'pm25',
      'wind-u',
      'wind-v',
    ]));
  for (const c of cases) {
    it(c.name, () => {
      const model = JSON.parse(
        readFileSync(resolve(DIR, `${c.name}.model.json`), 'utf8'),
      ) as GbdtModel;
      const { rows } = JSON.parse(readFileSync(resolve(DIR, c.file), 'utf8')) as {
        rows: { x: (number | null)[]; raw: number; proba?: number; shap: number[] }[];
      };
      for (const r of rows) {
        expect(predictRaw(model, r.x)).toBeCloseTo(r.raw, 9);
        if (model.objective === 'binary')
          expect(predictProba(model, r.x)).toBeCloseTo(r.proba!, 12);
        const phi = shapContributions(model, r.x);
        r.shap.forEach((v, i) => expect(phi[i]).toBeCloseTo(v, 7));
      }
    });
  }
});
