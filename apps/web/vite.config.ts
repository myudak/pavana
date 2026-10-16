/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  // Read VITE_* from the repo-root .env so the whole monorepo shares one env file.
  const envDir = fileURLToPath(new URL('../..', import.meta.url));
  const env = loadEnv(mode, envDir, '');
  const apiTarget = `http://${env.API_HOST ?? '127.0.0.1'}:${env.API_PORT ?? '8787'}`;

  return {
    envDir,
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
    build: {
      // maplibre-gl alone is ~1 MB minified; it lives in the lazy Map route chunk.
      chunkSizeWarningLimit: 1100,
    },
    server: {
      port: 5173,
      // Browser calls /api/* on the same origin; Vite proxies to the Fastify API.
      proxy: { '/api': apiTarget, '/health': apiTarget },
    },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./src/test/setup.ts'],
      css: false,
      // App-level tests mount the router with lazy routes; jsdom plus turbo running
      // every package's suite in parallel can push those past vitest's 5s default.
      testTimeout: 30_000,
    },
  };
});
