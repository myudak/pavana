/// <reference types="vitest/config" />
import { defineConfig } from 'vitest/config';

/**
 * Live-mode tests boot a Fastify app and replay recorded upstream payloads, which
 * takes seconds when turbo runs every package's suite in parallel. Vitest's 5s
 * default turned that into intermittent timeouts, so the package gets a ceiling
 * with room; fast unit tests still finish in milliseconds.
 */
export default defineConfig({
  test: {
    testTimeout: 30_000,
  },
});
