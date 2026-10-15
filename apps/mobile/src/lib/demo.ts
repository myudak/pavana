/**
 * Reuse the existing platform-neutral fixture providers and deterministic services.
 * No Fastify, filesystem, provider secrets, or network calls enter the mobile bundle.
 * Time and coverage are identical to the API (reference time, 75 km coverage).
 */
import {
  ConditionsResponseSchema,
  ForecastResponseSchema,
  InsightsResponseSchema,
  HotspotsResponseSchema,
  OfficialLinksResponseSchema,
  LocationSearchResponseSchema,
  type LatLon,
  type BBox,
} from '@pavana/shared';
import { createFixtureProviders } from '../../../api/src/providers/fixture';
import type { ProviderBundle } from '../../../api/src/providers/types';
import { getConditions } from '../../../api/src/services/conditions';
import { getForecast } from '../../../api/src/services/forecast';
import { getInsights } from '../../../api/src/services/insights';
import { OFFICIAL_LINKS } from '../../../api/src/data/official-links';

const fixture = createFixtureProviders();
const providers: ProviderBundle = {
  ...fixture,
  mode: 'demo',
  isDemo: true,
  now: () => fixture.referenceTime,
};
export const DEMO_LOCATION = { lat: -0.1, lon: 109.38, label: 'Sungai Raya' };
export const demoClient = {
  conditions: async (point: LatLon) =>
    ConditionsResponseSchema.parse(await getConditions(providers, point)),
  forecast: async (point: LatLon) =>
    ForecastResponseSchema.parse(await getForecast(providers, point, 24)),
  insights: async (point: LatLon) =>
    InsightsResponseSchema.parse(await getInsights(providers, point)),
  hotspots: async (bbox: BBox) =>
    HotspotsResponseSchema.parse({
      state: 'demo',
      bbox,
      hotspots: await providers.hotspots.getHotspots({
        bbox,
        from: new Date(fixture.referenceTime.getTime() - 48 * 3600000),
        to: fixture.referenceTime,
        limit: 500,
      }),
    }),
  locations: async (q: string) =>
    LocationSearchResponseSchema.parse({ results: await providers.locations.search(q) }),
  officialLinks: async () => OfficialLinksResponseSchema.parse({ links: OFFICIAL_LINKS }),
};
