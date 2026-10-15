import { z } from 'zod';
import { DataState } from './data-state';
import { LatSchema, LocationSchema, LonSchema } from './location';
import { ProvenanceSchema } from './provenance';

/** AQI category of the day (from `pm25Max`), or `unknown` when there is no data. */
export const DailyCategorySchema = z.enum([
  'good',
  'moderate',
  'unhealthy_sensitive',
  'unhealthy',
  'very_unhealthy',
  'hazardous',
  'unknown',
]);
export type DailyCategory = z.infer<typeof DailyCategorySchema>;

export const DailyForecastDaySchema = z.object({
  /** Local calendar date (YYYY-MM-DD) in the location's time zone. */
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  pm25Min: z.number().nonnegative().nullable(),
  pm25Max: z.number().nonnegative().nullable(),
  pm25Mean: z.number().nonnegative().nullable(),
  category: DailyCategorySchema,
  /** False when the provider horizon has no hours for this date — never infer values. */
  available: z.boolean(),
  /** Daily rain probability when the weather provider supplies it, else null. */
  rainProbPct: z.number().min(0).max(100).nullable().optional(),
  provenance: ProvenanceSchema,
});
export type DailyForecastDay = z.infer<typeof DailyForecastDaySchema>;

export const DailyForecastQuerySchema = z.object({
  lat: LatSchema,
  lon: LonSchema,
  days: z.coerce.number().int().min(1).max(10).default(10),
});
export type DailyForecastQuery = z.infer<typeof DailyForecastQuerySchema>;

export const DailyForecastResponseSchema = z.object({
  location: LocationSchema,
  state: DataState,
  days: z.array(DailyForecastDaySchema),
});
export type DailyForecastResponse = z.infer<typeof DailyForecastResponseSchema>;
