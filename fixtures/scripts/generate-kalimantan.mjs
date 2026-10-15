#!/usr/bin/env node
/**
 * Generates fixtures/regional-kalimantan-hotspots.json — SYNTHETIC hotspot
 * detections across Kalimantan for the regional density view.
 * Deterministic (seeded) so demos and tests are repeatable.
 *
 *   node fixtures/scripts/generate-kalimantan.mjs
 *
 * Pattern: 4 elongated belts built from overlapping anisotropic sub-clusters
 * (spacing < 1.5 sigma so ridges connect), 10 small centers, thin background.
 * Names/coordinates below are approximate public-knowledge regencies —
 * NOT copied from any design image. Nothing here is a real observation.
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const OUT = fileURLToPath(new URL('../regional-kalimantan-hotspots.json', import.meta.url));

// --- deterministic PRNG (mulberry32) + gaussian ---
function mulberry32(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20261015);
const randn = () => {
  let u = 0;
  let v = 0;
  while (u === 0) u = rand();
  while (v === 0) v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
};
const round = (x, d = 1) => Math.round(x * 10 ** d) / 10 ** d;

const REFERENCE_TIME = '2026-09-15T00:00:00Z'; // same anchor as the Kubu Raya fixture
const ref = new Date(REFERENCE_TIME).getTime();
const iso = (ms) => new Date(ms).toISOString().replace('.000Z', 'Z');
const DAY = 86_400_000;

// Belts: [name, waypoints [lat, lon][], total count, sigmaKm].
// Sub-clusters are spaced < 1.5 sigma apart so the ridge stays connected.
const BELTS = [
  [
    'sabuk tengah-selatan',
    [
      [-3.2, 114.6],
      [-2.4, 113.2],
      [-1.6, 112.2],
    ],
    300,
    45,
  ],
  [
    'jalur timur',
    [
      [-2.5, 116.8],
      [-0.5, 117.2],
      [1.5, 116.8],
    ],
    280,
    45,
  ],
  [
    'sabuk barat',
    [
      [-1.8, 109.8],
      [-0.8, 110.8],
      [0.5, 111.5],
    ],
    260,
    45,
  ],
  [
    'lengkungan utara-timur',
    [
      [0.5, 114.5],
      [2.0, 115.5],
      [3.2, 117.0],
    ],
    220,
    45,
  ],
];
// Small centers: [name, lat, lon, count].
const SMALL = [
  ['Ketapang', -1.85, 110.35, 22],
  ['Sintang', -0.05, 111.5, 20],
  ['Sampit', -2.55, 112.95, 22],
  ['Kapuas Hulu', -0.9, 112.6, 18],
  ['Pulang Pisau', -2.3, 114.0, 24],
  ['Martapura', -3.4, 114.85, 22],
  ['Muara Kaman', 0.1, 117.0, 20],
  ['Berau', -1.3, 117.5, 18],
  ['Malinau', 2.8, 116.6, 16],
  ['Kubu Raya', -0.35, 109.55, 18],
];
const BACKGROUND_COUNT = 300;

// Approximate Kalimantan coastline (lon/lat) for synthetic placement only.
const LAND_POLY = [
  [109.6, 1.8],
  [110.5, 2.9],
  [111.8, 3.3],
  [113.2, 4.2],
  [114.5, 4.6],
  [115.8, 4.5],
  [117.2, 5.2],
  [118.2, 4.0],
  [118.6, 2.5],
  [118.0, 1.0],
  [117.3, -0.5],
  [117.6, -1.8],
  [117.0, -2.8],
  [116.2, -3.6],
  [115.0, -3.9],
  [114.0, -3.5],
  [113.0, -3.2],
  [112.0, -3.4],
  [110.8, -2.9],
  [110.0, -1.8],
  [109.3, -1.0],
  [109.0, 0.0],
  [109.3, 1.0],
];
const KALIMANTAN = { minLon: 108.5, minLat: -4.5, maxLon: 119.5, maxLat: 4.5 };

// Keep-out zone: the Kubu Raya scenario file owns detections near Sungai Raya,
// so local queries/tests for that area stay unchanged.
const KEEP_OUT = { lat: -0.1, lon: 109.38, km: 75 };

const haversineKm = (aLat, aLon, bLat, bLon) => {
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLon = ((bLon - aLon) * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371.0088 * Math.asin(Math.min(1, Math.sqrt(h)));
};

const inPoly = (lon, lat) => {
  let inside = false;
  for (let i = 0, j = LAND_POLY.length - 1; i < LAND_POLY.length; j = i++) {
    const [xi, yi] = LAND_POLY[i];
    const [xj, yj] = LAND_POLY[j];
    if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
};

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const KM_PER_DEG = 111.19;

const hotspots = [];
let n = 0;
let skipped = 0;
const push = (lat, lon) => {
  if (!inPoly(lon, lat)) {
    skipped += 1;
    return;
  }
  if (haversineKm(lat, lon, KEEP_OUT.lat, KEEP_OUT.lon) < KEEP_OUT.km) {
    skipped += 1;
    return; // keep-out
  }
  n += 1;
  const frp = rand() < 0.05 ? null : round(clamp(Math.exp(2.2 + 0.9 * randn()), 0.5, 150));
  const cr = rand();
  hotspots.push({
    id: `fixture-kal-${String(n).padStart(4, '0')}`,
    lat: round(lat, 4),
    lon: round(lon, 4),
    acquiredAt: iso(ref - Math.floor(rand() * 5 * DAY) - Math.floor(rand() * DAY)),
    frpMw: frp,
    confidence: cr < 0.6 ? 'nominal' : cr < 0.85 ? 'high' : 'low',
    satellite: n % 2 === 0 ? 'Suomi NPP' : 'NOAA-20',
    instrument: 'VIIRS',
    provenance: {
      provider: 'pavana-fixture',
      kind: 'fixture',
      fetchedAt: REFERENCE_TIME,
      validAt: iso(ref - Math.floor(rand() * 5 * DAY)),
      isDemo: true,
      spatialResolutionKm: 0.375,
      notes: 'Synthetic regional hotspot shaped like a FIRMS VIIRS detection. Not a real fire.',
    },
  });
};

const toKm = (dLat, dLon, atLat) => [
  dLon * KM_PER_DEG * Math.cos((atLat * Math.PI) / 180),
  dLat * KM_PER_DEG,
];

// Belt sub-clusters spaced < 1.5 sigma apart along each polyline.
for (const [, waypoints, total, sigmaKm] of BELTS) {
  let lengthKm = 0;
  const segs = [];
  for (let s = 0; s < waypoints.length - 1; s++) {
    const [la0, lo0] = waypoints[s];
    const [la1, lo1] = waypoints[s + 1];
    const [ex, ey] = toKm(la1 - la0, lo1 - lo0, (la0 + la1) / 2);
    const len = Math.hypot(ex, ey);
    segs.push({ la0, lo0, la1, lo1, len, start: lengthKm });
    lengthKm += len;
  }
  const spacing = sigmaKm * 1.2;
  const nSub = Math.max(2, Math.round(lengthKm / spacing));
  const perSub = Math.max(1, Math.round(total / nSub));
  for (let k = 0; k < nSub; k++) {
    const target = ((k + 0.5) / nSub) * lengthKm;
    const seg = segs.find((s) => target <= s.start + s.len) ?? segs[segs.length - 1];
    const t = (target - seg.start) / seg.len;
    const cLat = seg.la0 + (seg.la1 - seg.la0) * t;
    const cLon = seg.lo0 + (seg.lo1 - seg.lo0) * t;
    const rot = (rand() * 60 - 30) * (Math.PI / 180);
    for (let i = 0; i < perSub; i++) {
      const gx = randn() * sigmaKm;
      const gy = randn() * sigmaKm * 0.7;
      const ex = gx * Math.cos(rot) - gy * Math.sin(rot);
      const ey = gx * Math.sin(rot) + gy * Math.cos(rot);
      push(cLat + ey / KM_PER_DEG, cLon + ex / (KM_PER_DEG * Math.cos((cLat * Math.PI) / 180)));
    }
  }
}

for (const [, cLat, cLon, count] of SMALL) {
  for (let i = 0; i < count; i++) {
    push(cLat + randn() * 0.3, cLon + randn() * 0.3);
  }
}

for (let i = 0; i < BACKGROUND_COUNT; i++) {
  push(
    KALIMANTAN.minLat + rand() * (KALIMANTAN.maxLat - KALIMANTAN.minLat),
    KALIMANTAN.minLon + rand() * (KALIMANTAN.maxLon - KALIMANTAN.minLon),
  );
}

const doc = {
  meta: {
    id: 'kalimantan-synthetic-v3',
    title: 'Kalimantan — synthetic regional hotspot belts',
    isDemo: true,
    synthetic: true,
    description:
      'SYNTHETIC regional detections: 4 connected belts of overlapping anisotropic sub-clusters, 10 small centers, thin background. Seeded PRNG. Not observations. Kubu Raya keep-out zone preserves the kubu-raya scenario.',
    referenceTime: REFERENCE_TIME,
    generatedBy: 'fixtures/scripts/generate-kalimantan.mjs',
    seed: 20261015,
    windowDays: 5,
  },
  hotspots,
};

writeFileSync(OUT, JSON.stringify(doc, null, 2) + '\n');
console.log(`wrote ${OUT}: ${hotspots.length} hotspots (${skipped} skipped: sea/keep-out)`);
