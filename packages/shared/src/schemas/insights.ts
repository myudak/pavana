import { z } from 'zod';
import { ProvenanceSchema } from './provenance';

/**
 * A single explainable factor. Text is rendered by the client from `id` + `metrics`
 * (i18n), so the API stays language-agnostic and never invents prose.
 */
export const FactorId = z.enum(['pm25_trend', 'wind', 'upwind_hotspots']);
export type FactorId = z.infer<typeof FactorId>;

export const FactorSignal = z.enum(['worsening', 'improving', 'neutral', 'unknown']);
export type FactorSignal = z.infer<typeof FactorSignal>;

export const FactorSchema = z.object({
  id: FactorId,
  signal: FactorSignal,
  metrics: z.record(z.string(), z.union([z.number(), z.string(), z.null()])),
  provenance: z.array(ProvenanceSchema),
});
export type Factor = z.infer<typeof FactorSchema>;

export const ModelStatusSchema = z.object({
  /** `deterministic_indicators` until a real, evaluated model exists. */
  method: z.enum(['deterministic_indicators', 'ml_model']),
  modelVersion: z.string().nullable(),
  /** True only when a trained + evaluated artifact is loaded. Gates SHAP/intervals in the UI. */
  evaluated: z.boolean(),
});
export type ModelStatus = z.infer<typeof ModelStatusSchema>;
