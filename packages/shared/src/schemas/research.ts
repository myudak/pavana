import { z } from 'zod';
import { IsoDateTime } from './provenance';

const ResearchCaseSchema = z.object({
  originAt: IsoDateTime,
  targetAt: IsoDateTime,
  targetCamsUgM3: z.number().nonnegative(),
  predictionUgM3: z.number(),
  persistenceUgM3: z.number().nonnegative(),
  baseValueUgM3: z.number(),
  featureValues: z.array(z.number().nullable()).min(1).max(100),
  shapValuesUgM3: z.array(z.number()).min(1).max(100),
});
export type ResearchCase = z.infer<typeof ResearchCaseSchema>;

/** Historical research output only. Never accepted as a live forecast/provider response. */
export const ResearchBundleSchema = z
  .object({
    schemaVersion: z.literal(1),
    runVersion: z.string().min(1),
    modelVariant: z.enum(['C', 'D', 'E']),
    modelSha256: z.string().regex(/^[a-f0-9]{64}$/),
    datasetRevision: z.string().regex(/^[a-f0-9]{40}$/),
    codeRevision: z.string().regex(/^[a-f0-9]{40}$/),
    generatedAt: IsoDateTime,
    location: z.object({
      name: z.string(),
      lat: z.number(),
      lon: z.number(),
      timezone: z.literal('Asia/Jakarta'),
    }),
    horizonHours: z.literal(6),
    targetKind: z.literal('model'),
    researchOnly: z.literal(true),
    operationalReady: z.literal(false),
    observationValidated: z.literal(false),
    method: z.literal('tree_path_dependent'),
    shapVersion: z.string(),
    features: z.array(z.string().min(1)).min(1).max(100),
    globalImportance: z.object({
      sampleN: z.number().int().positive().max(1000),
      seed: z.number().int(),
      meanAbsShapUgM3: z.array(z.number().nonnegative()).min(1).max(100),
    }),
    metrics: z
      .array(
        z.object({
          variant: z.enum(['A', 'B', 'C', 'D', 'E']),
          maeUgM3: z.number().nonnegative(),
          rmseUgM3: z.number().nonnegative(),
          n: z.number().int().positive(),
        }),
      )
      .length(5),
    cases: z.array(ResearchCaseSchema).min(1).max(168),
  })
  .superRefine((bundle, context) => {
    const fail = (message: string) => context.addIssue({ code: 'custom', message });
    const count = bundle.features.length;
    if (
      new Set(bundle.features).size !== count ||
      bundle.globalImportance.meanAbsShapUgM3.length !== count
    ) {
      fail('Research feature identities or importance dimensions do not match.');
    }
    if (
      new Set(bundle.metrics.map((m) => m.variant)).size !== 5 ||
      new Set(bundle.metrics.map((m) => m.n)).size !== 1 ||
      bundle.globalImportance.sampleN > bundle.metrics[0]!.n
    ) {
      fail('All five variants must use identical holdout rows.');
    }
    const times = new Set<string>();
    for (const sample of bundle.cases) {
      if (sample.featureValues.length !== count || sample.shapValuesUgM3.length !== count) {
        fail('Research case dimensions do not match the model features.');
      }
      if (
        Date.parse(sample.targetAt) - Date.parse(sample.originAt) !== 6 * 3_600_000 ||
        times.has(sample.originAt)
      ) {
        fail('Research cases require unique origin hours and a six-hour horizon.');
      }
      times.add(sample.originAt);
      const reconstructed =
        sample.baseValueUgM3 + sample.shapValuesUgM3.reduce((sum, value) => sum + value, 0);
      if (Math.abs(reconstructed - sample.predictionUgM3) > 1e-5)
        fail('SHAP values do not reconstruct the prediction.');
    }
  });
export type ResearchBundle = z.infer<typeof ResearchBundleSchema>;
