// @ts-check
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';

export default defineConfig({
  // Set to the deployed landing URL (used for canonical/OG URLs).
  site: 'https://pavana.example',
  server: { port: 4321 },
  vite: {
    // Share the repo-root .env (PUBLIC_APP_URL).
    envDir: '../..',
    // @ts-expect-error -- Astro 5 bundles Vite 6 types; @tailwindcss/vite is typed against Vite 7. Works at runtime.
    plugins: [tailwindcss()],
  },
});
