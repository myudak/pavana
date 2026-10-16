import { z } from 'zod';
import { IsoDateTime, ProvenanceSchema } from './provenance';

/**
 * Served experimental models (observed targets, evaluated on a temporal holdout).
 * Outputs are probabilities of an *observed* event, never advice or an official warning.
 * `null` probability = an input was missing; it never means low risk.
 */

export const ModelStateSchema = z.enum(['live', 'demo', 'unavailable']);

export const BinaryMetricsSchema = z.object({
  n: z.number().int(),
  positives: z.number().int(),
  rocAuc: z.number().nullable(),
  prAuc: z.number().nullable(),
  brier: z.number().nullable(),
  brierSkill: z.number().nullable(),
  logLoss: z.number().nullable(),
});
export type BinaryMetrics = z.infer<typeof BinaryMetricsSchema>;

export const ModelInfoSchema = z.object({
  id: z.string(),
  version: z.string(),
  experimental: z.literal(true),
  targetKind: z.literal('observation'),
  target: z.string(),
  testWindow: z.tuple([z.string(), z.string()]),
  /** Holdout metrics for the model and its honest baselines. */
  test: z.object({
    model: BinaryMetricsSchema,
    persistence: BinaryMetricsSchema,
    climatology: BinaryMetricsSchema,
  }),
});
export type ModelInfo = z.infer<typeof ModelInfoSchema>;

export const ModelFactorSchema = z.object({
  feature: z.string(),
  value: z.number().nullable(),
  /** SHAP contribution in log-odds; > 0 raised the model's probability. */
  shap: z.number(),
});
export type ModelFactor = z.infer<typeof ModelFactorSchema>;

export const HotspotRiskCellSchema = z.object({
  id: z.number().int(),
  lat: z.number(),
  lon: z.number(),
  probability: z.number().min(0).max(1).nullable(),
});
export type HotspotRiskCell = z.infer<typeof HotspotRiskCellSchema>;

export const HotspotRiskQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90).optional(),
  lon: z.coerce.number().min(-180).max(180).optional(),
});

export const HotspotRiskResponseSchema = z.object({
  state: ModelStateSchema,
  model: ModelInfoSchema,
  /** UTC day whose inputs were used (end of day d). */
  issueDay: z.string(),
  /** UTC day the probability is about (d+1). */
  targetDay: z.string(),
  cellDeg: z.number(),
  cells: z.array(HotspotRiskCellSchema),
  /** The cell containing the requested point, with its top SHAP factors; null outside the grid. */
  focus: z
    .object({
      cell: HotspotRiskCellSchema,
      factors: z.array(ModelFactorSchema),
      /** Demo replay only: whether a detection was actually observed on the target day. */
      observed: z.boolean().nullable(),
    })
    .nullable(),
  /** Why inputs are missing, when they are. */
  missing: z.array(z.string()),
  provenance: ProvenanceSchema,
});
export type HotspotRiskResponse = z.infer<typeof HotspotRiskResponseSchema>;

export const HazeStationSchema = z.object({
  icao: z.string(),
  name: z.string(),
  lat: z.number(),
  lon: z.number(),
  distanceKm: z.number().nullable(),
  issueAt: IsoDateTime.nullable(),
  visibilityKm: z.number().nullable(),
  p6h: z.number().min(0).max(1).nullable(),
  p24h: z.number().min(0).max(1).nullable(),
  factors6h: z.array(ModelFactorSchema),
  factors24h: z.array(ModelFactorSchema),
  observed6h: z.boolean().nullable(),
  observed24h: z.boolean().nullable(),
});
export type HazeStation = z.infer<typeof HazeStationSchema>;

export const HazeResponseSchema = z.object({
  state: ModelStateSchema,
  models: z.object({ h6: ModelInfoSchema, h24: ModelInfoSchema }),
  stations: z.array(HazeStationSchema),
  missing: z.array(z.string()),
  provenance: ProvenanceSchema,
});
export type HazeResponse = z.infer<typeof HazeResponseSchema>;

export const CalibrationBinSchema = z.object({
  lo: z.number(),
  hi: z.number(),
  meanPredicted: z.number(),
  observedRate: z.number(),
  n: z.number().int(),
});

export const ModelEvaluationSchema = z.object({
  id: z.string(),
  version: z.string(),
  title: z.string(),
  target: z.string(),
  windows: z.record(z.string(), z.tuple([z.string(), z.string()])),
  test: z.object({
    model: BinaryMetricsSchema,
    persistence: BinaryMetricsSchema,
    climatology: BinaryMetricsSchema,
  }),
  calibration: z.array(CalibrationBinSchema),
  importance: z.array(z.object({ feature: z.string(), meanAbsShap: z.number() })),
});
export type ModelEvaluation = z.infer<typeof ModelEvaluationSchema>;

export const ModelEvaluationsResponseSchema = z.object({
  models: z.array(ModelEvaluationSchema),
});
export type ModelEvaluationsResponse = z.infer<typeof ModelEvaluationsResponseSchema>;
