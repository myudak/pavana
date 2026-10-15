/**
 * HTTP routes. Every response is parsed through its shared schema before sending,
 * so the contract in `@pavana/shared` is enforced at runtime (a drift = 500 in dev/tests).
 */
import {
  ConditionsResponseSchema,
  ForecastQuerySchema,
  ForecastResponseSchema,
  HealthResponseSchema,
  HotspotsQuerySchema,
  HotspotsResponseSchema,
  InsightsResponseSchema,
  LatLonQuerySchema,
  LocationSearchQuerySchema,
  LocationSearchResponseSchema,
  OfficialLinksResponseSchema,
  WindFieldQuerySchema,
  WindFieldSchema,
} from '@pavana/shared';
import type { FastifyPluginAsync } from 'fastify';
import { OFFICIAL_LINKS } from '../data/official-links';
import type { ProviderBundle } from '../providers/types';
import { getConditions } from '../services/conditions';
import { getForecast } from '../services/forecast';
import { getInsights } from '../services/insights';
import { getWindField } from '../services/wind-field';
import { parseInput } from './validate';

export interface RoutesOptions {
  providers: ProviderBundle;
  version: string;
}

export const routes: FastifyPluginAsync<RoutesOptions> = async (app, { providers, version }) => {
  app.get('/health', async () =>
    HealthResponseSchema.parse({ status: 'ok', mode: providers.mode, version }),
  );

  app.get('/api/locations/search', async (req) => {
    const { q } = parseInput(LocationSearchQuerySchema, req.query);
    return LocationSearchResponseSchema.parse({ results: await providers.locations.search(q) });
  });

  app.get('/api/conditions', async (req) => {
    const point = parseInput(LatLonQuerySchema, req.query);
    return ConditionsResponseSchema.parse(await getConditions(providers, point));
  });

  app.get('/api/forecast', async (req) => {
    const { lat, lon, hours } = parseInput(ForecastQuerySchema, req.query);
    return ForecastResponseSchema.parse(await getForecast(providers, { lat, lon }, hours));
  });

  app.get('/api/hotspots', async (req) => {
    const q = parseInput(HotspotsQuerySchema, req.query);
    const hotspots = await providers.hotspots.getHotspots({
      bbox: q.bbox,
      from: q.from ? new Date(q.from) : undefined,
      to: q.to ? new Date(q.to) : undefined,
      limit: q.limit,
    });
    return HotspotsResponseSchema.parse({
      // Hotspot detections are point events; an empty list means "no detections", not "no fire".
      state: providers.isDemo ? 'demo' : 'live',
      bbox: q.bbox,
      hotspots,
    });
  });

  app.get('/api/insights', async (req) => {
    const point = parseInput(LatLonQuerySchema, req.query);
    return InsightsResponseSchema.parse(await getInsights(providers, point));
  });

  app.get('/api/wind-field', async (req) => {
    const { bbox } = parseInput(WindFieldQuerySchema, req.query);
    return WindFieldSchema.parse(await getWindField(providers, bbox));
  });

  app.get('/api/official-links', async () =>
    OfficialLinksResponseSchema.parse({ links: OFFICIAL_LINKS }),
  );
};
