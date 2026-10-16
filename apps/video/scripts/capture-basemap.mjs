// Renders the CARTO Dark Matter basemap at fixed views into public/map/ so map scenes can
// animate overlays on top with Web Mercator projection (see src/v2/map/projection.ts).
//   node apps/video/scripts/capture-basemap.mjs
// Basemap © OpenStreetMap contributors © CARTO — credited on screen.
import { mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
import { findChrome } from './chrome.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(join(root, '..', 'web', 'package.json'));
const maplibreJs = require.resolve('maplibre-gl/dist/maplibre-gl.js');
const maplibreCss = require.resolve('maplibre-gl/dist/maplibre-gl.css');
const out = join(root, 'public', 'map');
mkdirSync(out, { recursive: true });

const STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';
const VIEWS = {
  borneo: { center: [114.1, 1.4], zoom: 5.8 },
  kuburaya: { center: [109.78, -0.55], zoom: 8.8 },
};
const W = 1920;
const H = 1080;

const browser = await puppeteer.launch({
  executablePath: findChrome(root),
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--hide-scrollbars'],
});
const page = await browser.newPage();
await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
await page.setContent(
  `<html><body style="margin:0"><div id="m" style="width:${W}px;height:${H}px"></div></body></html>`,
);
await page.addStyleTag({ path: maplibreCss });
await page.addScriptTag({ path: maplibreJs });

for (const [name, view] of Object.entries(VIEWS)) {
  await page.evaluate(
    (style, v) =>
      new Promise((resolve) => {
        document.getElementById('m').innerHTML = '';
        const map = new window.maplibregl.Map({
          container: 'm',
          style,
          center: v.center,
          zoom: v.zoom,
          attributionControl: false,
          interactive: false,
          fadeDuration: 0,
        });
        map.once('idle', () => setTimeout(resolve, 500));
      }),
    STYLE,
    view,
  );
  await page.screenshot({ path: join(out, `${name}.jpg`), type: 'jpeg', quality: 90 });
  console.log('captured', name);
}

writeFileSync(
  join(out, 'views.json'),
  JSON.stringify({ width: W, height: H, tileSize: 512, style: STYLE, views: VIEWS }, null, 2) +
    '\n',
);
await browser.close();
