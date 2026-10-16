import { z } from 'zod';
import { BBoxSchema } from './location';
import { IsoDateTime, ProvenanceSchema } from './provenance';

/**
 * One wind vector of a spatial wind field. Missing components stay `null`
 * (never 0) — a null vector means "no data here", not "calm".
 */
export const WindFieldPointSchema = z.object({
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
  /** Wind speed in m/s, if available. */
  speedMs: z.number().nonnegative().nullable(),
  /** Meteorological FROM direction in degrees, if available. */
  fromDeg: z.number().min(0).max(360).nullable(),
  /** Validity time (UTC) of this vector. */
  validAt: IsoDateTime,
  provenance: ProvenanceSchema,
});
export type WindFieldPoint = z.infer<typeof WindFieldPointSchema>;

/** Regular grid of wind vectors over a bbox (row-major, north row first). */
export const WindFieldSchema = z.object({
  cols: z.number().int().min(2),
  rows: z.number().int().min(2),
  bbox: BBoxSchema,
  validAt: IsoDateTime,
  points: z.array(WindFieldPointSchema).min(1),
});
export type WindField = z.infer<typeof WindFieldSchema>;

export const WindFieldQuerySchema = z.object({
  bbox: z
    .string()
    .transform((s, ctx) => {
      const parts = s.split(',').map(Number);
      if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'bbox must be minLon,minLat,maxLon,maxLat',
        });
        return z.NEVER;
      }
      return parts as [number, number, number, number];
    })
    .pipe(BBoxSchema),
});
export type WindFieldQuery = z.infer<typeof WindFieldQuerySchema>;
