import { z } from 'zod';
import { AirQualityPointSchema } from './air-quality';
import { DataState } from './data-state';
import { IsoDateTime, ProvenanceSchema } from './provenance';

/** Health of one upstream source, as seen by this API instance. */
export const SourceStatus = z.enum(['ok', 'error', 'not_configured', 'fixture']);
export type SourceStatus = z.infer<typeof SourceStatus>;

export const SourceInfoSchema = z.object({
  id: z.string(),
  name: z.string(),
  /** What Pavana uses it for (Indonesian, shown in the UI). */
  use: z.string(),
  status: SourceStatus,
  checkedAt: IsoDateTime,
  /** Short, secret-free reason when status is `error`. */
  detail: z.string().nullable(),
  attribution: z.string(),
  url: z.url(),
});
export type SourceInfo = z.infer<typeof SourceInfoSchema>;

export const SourcesResponseSchema = z.object({
  mode: z.enum(['demo', 'live']),
  sources: z.array(SourceInfoSchema),
});
export type SourcesResponse = z.infer<typeof SourcesResponseSchema>;

/** Nearest ground station reading (OpenAQ). An OBSERVATION, separate from the CAMS forecast. */
export const StationReadingSchema = z.object({
  stationId: z.string(),
  name: z.string(),
  distanceKm: z.number().nonnegative(),
  airQuality: AirQualityPointSchema,
});
export type StationReading = z.infer<typeof StationReadingSchema>;

/** Independent weather forecast for comparison (BMKG). Never merged into Pavana's numbers. */
export const WeatherReferenceHourSchema = z.object({
  validAt: IsoDateTime,
  temperatureC: z.number().nullable(),
  relativeHumidityPct: z.number().min(0).max(100).nullable(),
  windSpeedMs: z.number().nonnegative().nullable(),
  /** Meteorological FROM degrees. */
  windDirectionFromDeg: z.number().min(0).max(360).nullable(),
  description: z.string().nullable(),
});
export type WeatherReferenceHour = z.infer<typeof WeatherReferenceHourSchema>;

export const WeatherReferenceResponseSchema = z.object({
  state: DataState,
  source: z.literal('bmkg'),
  /** BMKG place the forecast is for (may differ from the selected point). */
  place: z.string().nullable(),
  distanceKm: z.number().nonnegative().nullable(),
  hours: z.array(WeatherReferenceHourSchema),
  provenance: ProvenanceSchema.nullable(),
});
export type WeatherReferenceResponse = z.infer<typeof WeatherReferenceResponseSchema>;
