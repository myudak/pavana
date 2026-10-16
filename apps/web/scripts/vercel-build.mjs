// Builds the app for Vercel using the Build Output API (.vercel/output):
//   static/              Vite SPA build
//   functions/api.func/  Fastify API (apps/api) bundled into one ESM file
// Routing keeps the browser on one origin, so VITE_API_BASE_URL stays empty.
import { execSync } from 'node:child_process';
import { cpSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const webDir = fileURLToPath(new URL('..', import.meta.url));
const apiEntry = fileURLToPath(new URL('../../api/src/vercel.ts', import.meta.url));
const out = fileURLToPath(new URL('../.vercel/output', import.meta.url));
const funcDir = `${out}/functions/api.func`;

rmSync(out, { recursive: true, force: true });

execSync('pnpm run build', { cwd: webDir, stdio: 'inherit' });
cpSync(`${webDir}/dist`, `${out}/static`, { recursive: true });

await build({
  entryPoints: [apiEntry],
  outfile: `${funcDir}/index.mjs`,
  bundle: true,
  platform: 'node',
  target: 'node22',
  format: 'esm',
  // Some Fastify deps are CommonJS and call require() at runtime.
  banner: {
    js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);",
  },
  logLevel: 'info',
});
writeFileSync(
  `${funcDir}/.vc-config.json`,
  JSON.stringify(
    {
      runtime: 'nodejs22.x',
      // Tanya Pavi waits on an LLM; the default limit can cut a slow reply.
      maxDuration: 60,
      handler: 'index.mjs',
      launcherType: 'Nodejs',
      shouldAddHelpers: false,
    },
    null,
    2,
  ),
);

const noindex = { 'X-Robots-Tag': 'noindex, nofollow' };
writeFileSync(
  `${out}/config.json`,
  JSON.stringify(
    {
      version: 3,
      routes: [
        {
          src: '/assets/(.*)',
          headers: { 'Cache-Control': 'public, max-age=31536000, immutable' },
          continue: true,
        },
        { src: '/(.*)', headers: noindex, continue: true },
        { src: '/(api/.*|health)', dest: '/api' },
        { handle: 'filesystem' },
        // SPA fallback for client-side routes.
        { src: '/(.*)', dest: '/index.html' },
      ],
    },
    null,
    2,
  ),
);
console.log(`Vercel build output written to ${out}`);
