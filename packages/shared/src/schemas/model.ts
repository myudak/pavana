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
  reportAt: IsoDateTime.nullable(),
  inputProvider: z.enum(['iem', 'noaa-awc']).nullable().default(null),
  target6hAt: IsoDateTime.nullable(),
  target24hAt: IsoDateTime.nullable(),
  missing: z.array(z.string()),
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
  regressionModels: z.array(z.lazy(() => RegressionEvaluationSchema)).default([]),
});
export type ModelEvaluationsResponse = z.infer<typeof ModelEvaluationsResponseSchema>;

export const ScalarMetricsSchema = z.object({
  n: z.number().int().nonnegative(),
  mae: z.number().nonnegative().nullable(),
  rmse: z.number().nonnegative().nullable(),
});
export const WindMetricsSchema = z.object({
  n: z.number().int().nonnegative(),
  vectorRmse: z.number().nonnegative().nullable(),
  vectorMae: z.number().nonnegative().nullable(),
  speedMae: z.number().nonnegative().nullable(),
  speedRmse: z.number().nonnegative().nullable(),
  directionMaeDeg: z.number().min(0).max(180).nullable(),
  directionN: z.number().int().nonnegative(),
});
export const RegressionEvaluationSchema = z.object({
  id: z.enum(['pm25', 'wind']),
  version: z.string(),
  title: z.string(),
  target: z.string(),
  targetKind: z.enum(['model', 'observation']),
  windows: z.record(z.string(), z.tuple([z.string(), z.string()])),
  unit: z.enum(['µg/m³', 'm/s']),
  shapUnit: z.enum(['µg/m³', 'u/v m/s']),
  test: z.object({
    model: z.union([ScalarMetricsSchema, WindMetricsSchema]),
    persistence: z.union([ScalarMetricsSchema, WindMetricsSchema]),
    climatology: z.union([ScalarMetricsSchema, WindMetricsSchema]),
  }),
  importance: z.array(z.object({ feature: z.string(), meanAbsShap: z.number() })),
  limitations: z.array(z.string()),
});
export type RegressionEvaluation = z.infer<typeof RegressionEvaluationSchema>;

const ReferenceSchema = z.object({
  name: z.string(),
  lat: z.number(),
  lon: z.number(),
  distanceKm: z.number().nullable(),
  gridLat: z.number().optional(),
  gridLon: z.number().optional(),
});
const RegressionInfoSchema = z.object({
  id: z.enum(['pm25', 'wind']),
  version: z.string(),
  experimental: z.literal(true),
  evaluated: z.literal(true),
  operationalReady: z.literal(false),
  target: z.string(),
});
export const Pm25ModelResponseSchema = z.object({
  state: ModelStateSchema,
  model: RegressionInfoSchema.extend({
    id: z.literal('pm25'),
    targetKind: z.literal('model'),
    servingPolicy: z.literal('experimental-cams-proxy'),
  }),
  reference: ReferenceSchema,
  inputAt: IsoDateTime.nullable(),
  targetAt: IsoDateTime.nullable(),
  pm25UgM3: z.number().nonnegative().nullable(),
  currentCamsUgM3: z.number().nonnegative().nullable(),
  factors: z.array(ModelFactorSchema),
  shapUnit: z.literal('µg/m³'),
  replayTargetUgM3: z.number().nullable(),
  missing: z.array(z.string()),
  provenance: ProvenanceSchema,
});
export type Pm25ModelResponse = z.infer<typeof Pm25ModelResponseSchema>;

export const WindModelStationSchema = ReferenceSchema.extend({
  icao: z.string(),
  inputAt: IsoDateTime.nullable(),
  reportAt: IsoDateTime.nullable(),
  inputProvider: z.enum(['iem', 'noaa-awc']).nullable().default(null),
  targetAt: IsoDateTime.nullable(),
  u: z.number().nullable(),
  v: z.number().nullable(),
  speedMs: z.number().nonnegative().nullable(),
  directionFromDeg: z.number().min(0).max(360).nullable(),
  factorsU: z.array(ModelFactorSchema),
  factorsV: z.array(ModelFactorSchema),
  missing: z.array(z.string()),
});
export const WindModelResponseSchema = z.object({
  state: ModelStateSchema,
  model: RegressionInfoSchema.extend({
    id: z.literal('wind'),
    targetKind: z.literal('observation'),
  }),
  stations: z.array(WindModelStationSchema),
  shapUnit: z.literal('u/v m/s'),
  missing: z.array(z.string()),
  provenance: ProvenanceSchema,
});
export type WindModelResponse = z.infer<typeof WindModelResponseSchema>;
