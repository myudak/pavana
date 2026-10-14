import { z } from 'zod';
import { ProvenanceSchema } from './provenance';

export const AqiStandard = z.enum(['US_EPA', 'ID_ISPU']);
export type AqiStandard = z.infer<typeof AqiStandard>;

export const AirQualityPointSchema = z.object({
  /** PM2.5 concentration in µg/m³. `null` = no data. Never coerce missing data to 0. */
  pm25UgM3: z.number().nonnegative().nullable(),
  /** Optional index value; always carries the standard it was computed with. */
  aqi: z
    .object({
      value: z.number().int().nonnegative(),
      standard: AqiStandard,
      category: z.string(),
    })
    .nullable()
    .optional(),
  provenance: ProvenanceSchema,
});
export type AirQualityPoint = z.infer<typeof AirQualityPointSchema>;
