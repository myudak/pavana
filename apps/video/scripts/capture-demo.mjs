// Captures the app (demo mode, dark theme, phone size) into public/demo/ for the demo scene.
// Run the web app first (`pnpm dev:app`), then:
//   node apps/video/scripts/capture-demo.mjs [baseUrl]
// Uses the Chrome Headless Shell that Remotion already downloaded (or CHROME_PATH).
import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
// CAPTURE_THEME=light and CAPTURE_OUT=<dir> give a light set elsewhere (e.g. for print docs).
const theme = process.env.CAPTURE_THEME ?? 'dark';
const out = process.env.CAPTURE_OUT ?? join(root, 'public', 'demo');
const base = process.argv[2] ?? 'http://localhost:5173';

function findChrome() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const dir = join(root, 'node_modules', '.remotion', 'chrome-headless-shell');
  const subdirs = (d) =>
    existsSync(d) ? readdirSync(d, { withFileTypes: true }).filter((e) => e.isDirectory()) : [];
  for (const platform of subdirs(dir)) {
    for (const sub of subdirs(join(dir, platform.name))) {
      for (const exe of ['chrome-headless-shell.exe', 'chrome-headless-shell']) {
        const p = join(dir, platform.name, sub.name, exe);
        if (existsSync(p)) return p;
      }
    }
  }
  throw new Error(
    'No Chrome found: run `pnpm --filter @pavana/video still` once or set CHROME_PATH',
  );
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: findChrome(),
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--hide-scrollbars'],
});
const page = await browser.newPage();
await page.setViewport({
  width: 390,
  height: 844,
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
});
await page.evaluateOnNewDocument((t) => {
  localStorage.setItem('pavana:theme', t);
  localStorage.setItem('pavana:demo', '1');
}, theme);

async function open(path, wait = 1800) {
  await page.goto(base + path, { waitUntil: 'networkidle0' });
  await sleep(wait);
}
async function shot(name) {
  await page.screenshot({ path: join(out, `${name}.jpg`), type: 'jpeg', quality: 90 });
  console.log('captured', name);
}
async function scrollTo(y) {
  await page.evaluate((top) => window.scrollTo({ top, behavior: 'instant' }), y);
  await sleep(500);
}

// Beranda
await open('/');
await shot('today-1');
await scrollTo(620);
await shot('today-2');

// Peta (MapLibre needs time for tiles)
await open('/peta', 6000);
await shot('map');

// Prakiraan
await open('/prakiraan');
await shot('forecast-1');
await scrollTo(560);
await shot('forecast-2');

// Notification sheet
await open('/');
await page.click('header button[aria-label^="Notifikasi"]');
await sleep(900);
await shot('alerts');

// Tanya Pavi: welcome, then the streamed reply as a flipbook. Frame times are saved so the
// video replays it at real speed (public/demo/chat.json).
await open('/tanya');
await shot('chat-welcome');
const [chip] = await page.$$('xpath/.//button[contains(., "Apakah asap akan sampai")]');
if (!chip) throw new Error('Suggestion chip not found');
// Screenshots are too slow (~400 ms each), so record painted frames via CDP screencast.
const cdp = await page.createCDPSession();
const frames = [];
let t0 = Number.POSITIVE_INFINITY;
cdp.on('Page.screencastFrame', ({ data, metadata, sessionId }) => {
  cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
  const ms = Math.round(metadata.timestamp * 1000 - t0);
  // Keep frames from the click on, at most ~30 per second.
  if (ms < 0 || (frames.length && ms - frames.at(-1).ms < 33)) return;
  const file = `demo/chat-${String(frames.length).padStart(3, '0')}.jpg`;
  writeFileSync(join(out, '..', file), Buffer.from(data, 'base64'));
  frames.push({ file, ms });
});
await cdp.send('Page.startScreencast', {
  format: 'jpeg',
  quality: 88,
  maxWidth: 780,
  maxHeight: 1688,
});
await sleep(300);
t0 = Date.now();
await chip.click();
await sleep(5200);
await cdp.send('Page.stopScreencast');
console.log('screencast frames', frames.length);
writeFileSync(join(out, 'chat.json'), JSON.stringify({ frames }, null, 2) + '\n');

await browser.close();
