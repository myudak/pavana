import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import Fastify, { type FastifyInstance } from 'fastify';
import type { AppConfig } from './config/env';
import { AppError, UpstreamError } from './domain/errors';
import { createDemoBundle, createProviders, type LiveDeps } from './providers';
import { createModelInputs } from './providers/model-inputs';
import type { ProviderBundle } from './providers/types';
import { routes } from './routes';

export const API_VERSION = '0.2.0';

export interface BuildAppOptions {
  config: AppConfig;
  /** Primary providers; defaults to `createProviders(config)` (live or demo by PAVANA_MODE). */
  providers?: ProviderBundle;
  /** Bundle served for `?demo=1`; defaults to the fixture scenario. */
  demoProviders?: ProviderBundle;
  /** Test hooks for live providers (fetch, clock). */
  liveDeps?: LiveDeps;
}

/** CDN cache lifetimes (seconds) per route for successful GETs. Vercel's edge honours s-maxage. */
const CDN_TTL: Record<string, number> = {
  '/api/conditions': 900,
  '/api/forecast': 900,
  '/api/exposure': 900,
  '/api/insights': 900,
  '/api/hotspots': 600,
  '/api/wind-field': 1800,
  '/api/weather-reference': 1800,
  '/api/locations/search': 86400,
  '/api/official-links': 86400,
  '/api/sources': 300,
  '/api/model/hotspot-risk': 1800,
  '/api/model/haze': 600,
  '/api/model/evaluation': 86400,
};
const DEMO_TTL = 3600;

export async function buildApp({
  config,
  providers,
  demoProviders,
  liveDeps,
}: BuildAppOptions): Promise<FastifyInstance> {
  const app = Fastify({ logger: { level: config.LOG_LEVEL }, trustProxy: config.TRUST_PROXY });

  await app.register(cors, { origin: config.CORS_ORIGINS, methods: ['GET'] });
  await app.register(rateLimit, { max: config.RATE_LIMIT_PER_MINUTE, timeWindow: '1 minute' });

  app.addHook('onSend', async (req, reply, payload) => {
    const ttl = CDN_TTL[req.routeOptions.url ?? ''];
    if (req.method !== 'GET' || reply.statusCode >= 400 || ttl === undefined) {
      reply.header('cache-control', 'no-store');
    } else {
      const demo = (req.query as Record<string, unknown> | undefined)?.['demo'] === '1';
      const s = demo ? DEMO_TTL : ttl;
      reply.header(
        'cache-control',
        `public, max-age=60, s-maxage=${s}, stale-while-revalidate=${s * 2}`,
      );
    }
    return payload;
  });

  app.setErrorHandler((err, req, reply) => {
    if (err instanceof UpstreamError) req.log.warn({ source: err.source }, err.message);
    if (err instanceof AppError) {
      return reply.status(err.statusCode).send({ error: { code: err.code, message: err.message } });
    }
    const status = (err as { statusCode?: number }).statusCode;
    if (status === 429) {
      return reply
        .status(429)
        .send({ error: { code: 'rate_limited', message: 'Too many requests' } });
    }
    req.log.error(err);
    return reply
      .status(500)
      .send({ error: { code: 'internal', message: 'Internal server error' } });
  });

  app.setNotFoundHandler((_req, reply) =>
    reply.status(404).send({ error: { code: 'not_found', message: 'Route not found' } }),
  );

  await app.register(routes, {
    providers: providers ?? createProviders(config, liveDeps),
    demo: demoProviders ?? createDemoBundle(),
    version: API_VERSION,
    modelInputs: createModelInputs({ fetch: liveDeps?.fetch, now: liveDeps?.now }),
  });
  return app;
}
