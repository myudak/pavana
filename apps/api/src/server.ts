import { buildApp } from './app';
import { loadConfig } from './config/env';

const config = loadConfig();
const app = await buildApp({ config });

try {
  await app.listen({ port: config.API_PORT, host: config.API_HOST });
  app.log.info(
    `Pavana API (${config.PAVANA_MODE} mode) on http://${config.API_HOST}:${config.API_PORT}`,
  );
} catch (err) {
  app.log.error(err);
  process.exit(1);
}

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    void app.close().then(() => process.exit(0));
  });
}
