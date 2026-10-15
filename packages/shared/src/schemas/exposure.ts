import { z } from 'zod';
import { DataState } from './data-state';
import { LocationSchema } from './location';
import { IsoDateTime, ProvenanceSchema } from './provenance';

/**
 * "Will the smoke reach me?" — a per-hour smoke-exposure POTENTIAL for one location.
 * Derived from the PM2.5 forecast plus the wind-aware upwind hotspot indicator.
 * A level, never a probability; never a claim that fire will spread.
 */
export const ExposureLevel = z.enum(['none', 'low', 'moderate', 'high', 'unknown']);
export type ExposureLevel = z.infer<typeof ExposureLevel>;

export const ExposureHourSchema = z.object({
  validAt: IsoDateTime,
  level: ExposureLevel,
  /** Which input set the level (the larger of the two wins). */
  driver: z.enum(['pm25', 'upwind', 'both', 'none']),
  pm25UgM3: z.number().nonnegative().nullable(),
  /** Upwind hotspot indicator at this hour; `null` when wind is missing. */
  upwind: z
    .object({
      score: z.number().nonnegative(),
      contributingCount: z.number().int().nonnegative(),
      consideredCount: z.number().int().nonnegative(),
    })
    .nullable(),
  windFromDeg: z.number().min(0).max(360).nullable(),
  windSpeedMs: z.number().nonnegative().nullable(),
});
export type ExposureHour = z.infer<typeof ExposureHourSchema>;

export const ExposureResponseSchema = z.object({
  location: LocationSchema,
  state: DataState,
  method: z.literal('deterministic_indicators'),
  hours: z.array(ExposureHourSchema),
  summary: z.object({
    /** Highest level over the horizon (`unknown` if every hour is unknown). */
    peakLevel: ExposureLevel,
    peakAt: IsoDateTime.nullable(),
    /** First hour at moderate or above, if any. */
    firstElevatedAt: IsoDateTime.nullable(),
    /** Hotspot detections inside the search radius / look-back window. */
    hotspotsConsidered: z.number().int().nonnegative(),
    /** False when hotspot data could not be loaded: upwind levels are then `unknown`. */
    hotspotsAvailable: z.boolean().optional(),
    radiusKm: z.number().positive(),
    windowHours: z.number().positive(),
  }),
  provenance: z.array(ProvenanceSchema),
});
export type ExposureResponse = z.infer<typeof ExposureResponseSchema>;

export const ExposureQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lon: z.coerce.number().min(-180).max(180),
  hours: z.coerce.number().int().min(1).max(72).default(24),
});
