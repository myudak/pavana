import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import Fastify, { type FastifyInstance } from 'fastify';
import type { AppConfig } from './config/env';
import { AppError } from './domain/errors';
import { createProviders } from './providers';
import type { ProviderBundle } from './providers/types';
import { routes } from './routes';

export const API_VERSION = '0.1.0';

export interface BuildAppOptions {
  config: AppConfig;
  /** Inject providers in tests; defaults to `createProviders(config)`. */
  providers?: ProviderBundle;
}

export async function buildApp({ config, providers }: BuildAppOptions): Promise<FastifyInstance> {
  const app = Fastify({ logger: { level: config.LOG_LEVEL }, trustProxy: config.TRUST_PROXY });

  await app.register(cors, { origin: config.CORS_ORIGINS, methods: ['GET'] });
  await app.register(rateLimit, { max: config.RATE_LIMIT_PER_MINUTE, timeWindow: '1 minute' });

  app.setErrorHandler((err, req, reply) => {
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
    providers: providers ?? createProviders(config),
    version: API_VERSION,
  });
  return app;
}
