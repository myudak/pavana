import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { z } from 'zod';

const EnvSchema = z.object({
  PAVANA_MODE: z.enum(['demo', 'live']).default('demo'),
  API_PORT: z.coerce.number().int().positive().default(8787),
  API_HOST: z.string().default('127.0.0.1'),
  CORS_ORIGINS: z
    .string()
    .default('http://localhost:5173,http://localhost:4321')
    .transform((s) =>
      s
        .split(',')
        .map((o) => o.trim())
        .filter(Boolean),
    ),
  RATE_LIMIT_PER_MINUTE: z.coerce.number().int().positive().default(120),
  // Trust X-Forwarded-For (set on Vercel) so rate limiting keys on the client IP, not the proxy.
  TRUST_PROXY: z.stringbool().default(false),
  // Provider secrets — server-side only, never sent to the browser.
  FIRMS_MAP_KEY: z.string().optional(),
  OPENAQ_API_KEY: z.string().optional(),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
});

export type AppConfig = z.infer<typeof EnvSchema>;

/** Load `.env` from the package dir or the repo root (whichever exists), without overriding real env vars. */
function loadDotEnv(): void {
  for (const candidate of [resolve(process.cwd(), '.env'), resolve(process.cwd(), '../../.env')]) {
    if (existsSync(candidate)) {
      process.loadEnvFile(candidate);
      return;
    }
  }
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  if (env === process.env) loadDotEnv();
  const parsed = EnvSchema.safeParse(env);
  if (!parsed.success) {
    throw new Error(`Invalid environment:\n${z.prettifyError(parsed.error)}`);
  }
  return parsed.data;
}
