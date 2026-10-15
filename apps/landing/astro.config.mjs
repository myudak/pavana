// @ts-check
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';

export default defineConfig({
  // C5: PLACEHOLDER — bukan domain terverifikasi. Ketersediaan merek/domain "pavana" belum
  // difinalisasi (lihat docs/PAVANA_HANDOFF.md §0). Ganti dengan URL deploy final saat tim
  // memutuskan domain; dipakai untuk canonical/OG absolut di layouts/Base.astro.
  site: 'https://pavana.example',
  server: { port: 4321 },
  vite: {
    // Share the repo-root .env (PUBLIC_APP_URL).
    envDir: '../..',
    // @ts-expect-error -- Astro 5 bundles Vite 6 types; @tailwindcss/vite is typed against Vite 7. Works at runtime.
    plugins: [tailwindcss()],
  },
});
