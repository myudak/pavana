import { z } from 'zod';
import { ProvenanceSchema } from './provenance';

export const WeatherPointSchema = z.object({
  /** Wind speed in m/s (normalize km/h at the provider boundary). */
  windSpeedMs: z.number().nonnegative().nullable(),
  /**
   * Meteorological convention: direction the wind is coming FROM, degrees clockwise from north.
   * Use `windFromToFlowVector` before drawing arrows or computing alignment.
   */
  windDirectionFromDeg: z.number().min(0).max(360).nullable(),
  temperatureC: z.number().nullable(),
  relativeHumidityPct: z.number().min(0).max(100).nullable(),
  precipitationMm: z.number().nonnegative().nullable(),
  provenance: ProvenanceSchema,
});
export type WeatherPoint = z.infer<typeof WeatherPointSchema>;
