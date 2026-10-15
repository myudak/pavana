import type { IncomingMessage, ServerResponse } from 'node:http';
import { buildApp } from './app';
import { loadConfig } from './config/env';

/**
 * Vercel serverless entry. Bundled by apps/web/scripts/vercel-build.mjs into the
 * app's Build Output; `/api/*` and `/health` are routed here with the original URL.
 * Built once per warm instance and reused across invocations.
 */
const ready = buildApp({ config: loadConfig() }).then(async (app) => {
  await app.ready();
  return app;
});

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const app = await ready;
  app.server.emit('request', req, res);
}
