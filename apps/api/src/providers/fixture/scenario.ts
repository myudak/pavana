import {
  AirQualityPointSchema,
  HotspotSchema,
  IsoDateTime,
  LocationSchema,
  WeatherPointSchema,
} from '@pavana/shared';
import { z } from 'zod';
import raw from '../../../../../fixtures/scenario-kubu-raya.json' with { type: 'json' };

export const ScenarioSchema = z.object({
  meta: z.object({
    id: z.string(),
    title: z.string(),
    isDemo: z.literal(true),
    synthetic: z.boolean(),
    description: z.string(),
    referenceTime: IsoDateTime,
    generatedBy: z.string(),
  }),
  location: LocationSchema,
  hours: z.array(
    z.object({
      validAt: IsoDateTime,
      airQuality: AirQualityPointSchema,
      weather: WeatherPointSchema,
    }),
  ),
  hotspots: z.array(HotspotSchema),
});
export type Scenario = z.infer<typeof ScenarioSchema>;

/** Validated at import time — a malformed fixture fails fast at startup and in tests. */
export const kubuRayaScenario: Scenario = ScenarioSchema.parse(raw);
