/**
 * HTTP routes. Every response is parsed through its shared schema before sending,
 * so the contract in `@pavana/shared` is enforced at runtime (a drift = 500 in dev/tests).
 *
 * `?demo=1` on any route serves the fixture scenario instead of the primary bundle,
 * so the pitch demo stays one tap away while production runs on live data.
 */
import {
  ChatRequestSchema,
  ChatResponseSchema,
  ConditionsResponseSchema,
  DailyForecastQuerySchema,
  DailyForecastResponseSchema,
  ExposureQuerySchema,
  ExposureResponseSchema,
  ForecastQuerySchema,
  ForecastResponseSchema,
  HazeResponseSchema,
  HealthResponseSchema,
  HotspotRiskQuerySchema,
  HotspotRiskResponseSchema,
  ModelEvaluationsResponseSchema,
  WindModelResponseSchema,
  HotspotsQuerySchema,
  HotspotsResponseSchema,
  InsightsResponseSchema,
  LatLonQuerySchema,
  LocationSearchQuerySchema,
  LocationSearchResponseSchema,
  OfficialLinksResponseSchema,
  SourcesResponseSchema,
  WeatherReferenceResponseSchema,
  WindFieldQuerySchema,
  WindFieldSchema,
} from '@pavana/shared';
import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { OFFICIAL_LINKS } from '../data/official-links';
import type { ModelInputs } from '../providers/model-inputs';
import type { ProviderBundle } from '../providers/types';
import { getConditions } from '../services/conditions';
import { getDailyForecast } from '../services/daily';
import { getExposure } from '../services/exposure';
import { getForecast } from '../services/forecast';
import { chat } from '../services/chat';
import { getInsights } from '../services/insights';
import { getHaze, getHotspotRisk, getModelEvaluations } from '../services/models';
import { getWindModel, getRegressionEvaluations } from '../services/regression-models';
import { getSources } from '../services/sources';
import { getWeatherReference } from '../services/weather-reference';
import { getWindField } from '../services/wind-field';
import { parseInput } from './validate';

export interface RoutesOptions {
  /** Primary bundle (live in production). */
  providers: ProviderBundle;
  /** Fixture bundle served for `?demo=1`. */
  demo: ProviderBundle;
  version: string;
  /** Keyless inputs for the experimental models; live unless `?demo=1`, whatever PAVANA_MODE is. */
  modelInputs: ModelInputs;
  /** OpenRouter settings for Tanya Pavi; no key → 503 and the web keeps the scripted demo. */
  chat: { apiKey: string | undefined; model: string };
}

export const routes: FastifyPluginAsync<RoutesOptions> = async (
  app,
  { providers, demo, version, modelInputs, chat: chatConfig },
) => {
  const pick = (req: FastifyRequest): ProviderBundle =>
    (req.query as Record<string, unknown> | undefined)?.['demo'] === '1' ? demo : providers;

  app.get('/health', async () =>
    HealthResponseSchema.parse({ status: 'ok', mode: providers.mode, version }),
  );

  app.get('/api/sources', async (req) => SourcesResponseSchema.parse(await getSources(pick(req))));

  app.get('/api/locations/search', async (req) => {
    const { q } = parseInput(LocationSearchQuerySchema, req.query);
    return LocationSearchResponseSchema.parse({ results: await pick(req).locations.search(q) });
  });

  app.get('/api/conditions', async (req) => {
    const point = parseInput(LatLonQuerySchema, req.query);
    return ConditionsResponseSchema.parse(await getConditions(pick(req), point));
  });

  app.get('/api/forecast', async (req) => {
    const { lat, lon, hours } = parseInput(ForecastQuerySchema, req.query);
    return ForecastResponseSchema.parse(await getForecast(pick(req), { lat, lon }, hours));
  });

  app.get('/api/forecast/daily', async (req) => {
    const { lat, lon, days } = parseInput(DailyForecastQuerySchema, req.query);
    return DailyForecastResponseSchema.parse(await getDailyForecast(pick(req), { lat, lon }, days));
  });

  app.get('/api/hotspots', async (req) => {
    const p = pick(req);
    const q = parseInput(HotspotsQuerySchema, req.query);
    const hotspots = await p.hotspots.getHotspots({
      bbox: q.bbox,
      from: q.from ? new Date(q.from) : undefined,
      to: q.to ? new Date(q.to) : undefined,
      limit: q.limit,
    });
    return HotspotsResponseSchema.parse({
      // Hotspot detections are point events; an empty list means "no detections", not "no fire".
      state: p.isDemo ? 'demo' : 'live',
      bbox: q.bbox,
      hotspots,
    });
  });

  app.get('/api/insights', async (req) => {
    const point = parseInput(LatLonQuerySchema, req.query);
    return InsightsResponseSchema.parse(await getInsights(pick(req), point));
  });

  app.get('/api/exposure', async (req) => {
    const { lat, lon, hours } = parseInput(ExposureQuerySchema, req.query);
    return ExposureResponseSchema.parse(await getExposure(pick(req), { lat, lon }, hours));
  });

  app.get('/api/wind-field', async (req) => {
    const { bbox } = parseInput(WindFieldQuerySchema, req.query);
    return WindFieldSchema.parse(await getWindField(pick(req), bbox));
  });

  app.get('/api/weather-reference', async (req) => {
    const point = parseInput(LatLonQuerySchema, req.query);
    return WeatherReferenceResponseSchema.parse(await getWeatherReference(pick(req), point));
  });

  // Experimental models: inputs need no keys, so they run live even when PAVANA_MODE=demo.
  const modelPick = (req: FastifyRequest) =>
    (req.query as Record<string, unknown> | undefined)?.['demo'] === '1' ? null : modelInputs;
  const modelNow = (req: FastifyRequest) =>
    modelPick(req) ? (providers.isDemo ? new Date() : providers.now()) : demo.now();

  app.get('/api/model/hotspot-risk', async (req) => {
    const point = parseInput(HotspotRiskQuerySchema, req.query);
    return HotspotRiskResponseSchema.parse(
      await getHotspotRisk(modelPick(req), point, modelNow(req)),
    );
  });

  app.get('/api/model/haze', async (req) => {
    const point = parseInput(HotspotRiskQuerySchema, req.query);
    return HazeResponseSchema.parse(await getHaze(modelPick(req), point, modelNow(req)));
  });

  app.get('/api/model/evaluation', async () =>
    ModelEvaluationsResponseSchema.parse({
      models: getModelEvaluations(),
      regressionModels: getRegressionEvaluations(),
    }),
  );
  app.get('/api/model/wind', async (req) => {
    const point = parseInput(HotspotRiskQuerySchema, req.query);
    return WindModelResponseSchema.parse(await getWindModel(modelPick(req), point, modelNow(req)));
  });

  app.post(
    '/api/chat',
    { bodyLimit: 64 * 1024, config: { rateLimit: { max: 12, timeWindow: '1 minute' } } },
    async (req) => {
      const body = parseInput(ChatRequestSchema, req.body);
      const out = await chat(
        chatConfig,
        pick(req),
        modelPick(req),
        { lat: body.lat, lon: body.lon },
        body.messages,
        modelNow(req),
      );
      return ChatResponseSchema.parse(out);
    },
  );

  app.get('/api/official-links', async () =>
    OfficialLinksResponseSchema.parse({ links: OFFICIAL_LINKS }),
  );
};
