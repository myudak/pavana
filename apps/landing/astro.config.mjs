---
// @ts-check
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';

export default defineConfig({
  // Deployed landing URL (used for canonical/OG URLs and the sitemap).
  site: 'https://pavana.myudak.com',
  server: { port: 4321 },
  integrations: [sitemap()],
  vite: {
    // Share the repo-root .env (PUBLIC_APP_URL).
    envDir: '../..',
    // @ts-expect-error -- Astro 5 bundles Vite 6 types; @tailwindcss/vite is typed against Vite 7. Works at runtime.
    plugins: [tailwindcss()],
  },
});
