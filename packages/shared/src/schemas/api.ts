/**
 * HTTP response contracts. The API parses every response through these before sending,
 * and the web client parses again on receipt.
 */
import { z } from 'zod';
import { AirQualityPointSchema } from './air-quality';
import { DataState } from './data-state';
import { HotspotSchema } from './hotspot';
import { StationReadingSchema } from './sources';
import { FactorSchema, ModelStatusSchema } from './insights';
import { BBoxSchema, LatSchema, LocationSchema, LonSchema } from './location';
import { IsoDateTime } from './provenance';
import { WeatherPointSchema } from './weather';

export const TrendSchema = z.enum(['worsening', 'improving', 'stable', 'unknown']);
export type Trend = z.infer<typeof TrendSchema>;

export const HealthResponseSchema = z.object({
  status: z.literal('ok'),
  mode: z.enum(['demo', 'live']),
  version: z.string(),
});
export type HealthResponse = z.infer<typeof HealthResponseSchema>;

export const ConditionsResponseSchema = z.object({
  location: LocationSchema,
  state: DataState,
  airQuality: AirQualityPointSchema,
  weather: WeatherPointSchema.nullable(),
  /** Direction of change over the next ~12h, from forecast data. */
  trend: TrendSchema,
  /** Nearest fresh ground-station reading (observation), when one exists nearby. */
  station: StationReadingSchema.nullable().optional(),
});
export type ConditionsResponse = z.infer<typeof ConditionsResponseSchema>;

export const ForecastHourSchema = z.object({
  validAt: IsoDateTime,
  airQuality: AirQualityPointSchema,
  weather: WeatherPointSchema.nullable(),
});
export type ForecastHour = z.infer<typeof ForecastHourSchema>;

export const ForecastQuerySchema = z.object({
  lat: LatSchema,
  lon: LonSchema,
  hours: z.coerce.number().int().min(1).max(120).default(24),
});

export const ForecastResponseSchema = z.object({
  location: LocationSchema,
  state: DataState,
  hours: z.array(ForecastHourSchema),
});
export type ForecastResponse = z.infer<typeof ForecastResponseSchema>;

export const HotspotsQuerySchema = z.object({
  /** "minLon,minLat,maxLon,maxLat" */
  bbox: z
    .string()
    .transform((s) => s.split(',').map(Number))
    .pipe(BBoxSchema),
  from: IsoDateTime.optional(),
  to: IsoDateTime.optional(),
  limit: z.coerce.number().int().min(1).max(2000).default(500),
});

export const HotspotsResponseSchema = z.object({
  state: DataState,
  bbox: BBoxSchema,
  hotspots: z.array(HotspotSchema),
});
export type HotspotsResponse = z.infer<typeof HotspotsResponseSchema>;

export const InsightsResponseSchema = z.object({
  location: LocationSchema,
  state: DataState,
  model: ModelStatusSchema,
  factors: z.array(FactorSchema),
});
export type InsightsResponse = z.infer<typeof InsightsResponseSchema>;

export const LocationSearchQuerySchema = z.object({ q: z.string().trim().max(100).default('') });

export const LocationSearchResponseSchema = z.object({
  results: z.array(LocationSchema),
});
export type LocationSearchResponse = z.infer<typeof LocationSearchResponseSchema>;

export const OfficialLinkSchema = z.object({
  id: z.string(),
  title: z.string(),
  publisher: z.string(),
  url: z.url(),
  description: z.string(),
});
export type OfficialLink = z.infer<typeof OfficialLinkSchema>;

export const OfficialLinksResponseSchema = z.object({
  links: z.array(OfficialLinkSchema),
});
export type OfficialLinksResponse = z.infer<typeof OfficialLinksResponseSchema>;

export const ApiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
});
export type ApiError = z.infer<typeof ApiErrorSchema>;
