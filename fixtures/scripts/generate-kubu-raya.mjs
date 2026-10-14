#!/usr/bin/env node
/**
 * Generates fixtures/scenario-kubu-raya.json — a SYNTHETIC, ILLUSTRATIVE scenario.
 * Deterministic (seeded) so screenshots, demos and tests are repeatable.
 *
 *   node fixtures/scripts/generate-kubu-raya.mjs
 *
 * Nothing here is a real observation, forecast or fire detection.
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const OUT = fileURLToPath(new URL('../scenario-kubu-raya.json', import.meta.url));

// --- deterministic PRNG (mulberry32) ---
function mulberry32(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20260915);
const round = (x, d = 1) => Math.round(x * 10 ** d) / 10 ** d;

const REFERENCE_TIME = '2026-09-15T00:00:00Z'; // 07:00 WIB
const ref = new Date(REFERENCE_TIME).getTime();
const iso = (ms) => new Date(ms).toISOString().replace('.000Z', 'Z');
const H = 3_600_000;

const location = {
  id: 'kubu-raya',
  name: 'Sungai Raya',
  admin1: 'Kalimantan Barat',
  admin2: 'Kabupaten Kubu Raya',
  country: 'ID',
  lat: -0.1,
  lon: 109.38,
  timezone: 'Asia/Pontianak',
};

const provenance = (validMs, notes) => ({
  provider: 'pavana-fixture',
  kind: 'fixture',
  fetchedAt: REFERENCE_TIME,
  issuedAt: REFERENCE_TIME,
  validAt: iso(validMs),
  isDemo: true,
  spatialResolutionKm: 10,
  notes,
});

// --- hourly series: t0 = "now", t1..t24 = simulated forecast ---
const hours = [];
for (let h = 0; h <= 24; h++) {
  const t = ref + h * H;
  // Smoke episode peaking around 19:00 WIB (h = 12), then easing.
  const pm25 = 35 + 125 * Math.exp(-(((h - 12) / 4.5) ** 2)) + (rand() - 0.5) * 6;
  const windFrom = 135 + h * 0.8 + (rand() - 0.5) * 10; // SE, veering slightly
  const windSpeed = 3 + 1.5 * Math.sin((h / 24) * Math.PI) + (rand() - 0.5) * 0.6;
  const temp = 27 + 5 * Math.sin(((h - 1) / 24) * 2 * Math.PI) + (rand() - 0.5);
  const rh = 75 - 18 * Math.sin(((h - 1) / 24) * 2 * Math.PI) + (rand() - 0.5) * 4;
  const note =
    h === 0
      ? 'Synthetic demo value — simulates a current estimate.'
      : 'Synthetic demo value — simulates a model forecast.';
  hours.push({
    validAt: iso(t),
    airQuality: { pm25UgM3: round(pm25), provenance: provenance(t, note) },
    weather: {
      windSpeedMs: round(windSpeed),
      windDirectionFromDeg: round(windFrom, 0),
      temperatureC: round(temp),
      relativeHumidityPct: round(Math.min(100, Math.max(0, rh)), 0),
      precipitationMm: 0,
      provenance: provenance(t, note),
    },
  });
}

// --- hotspots: clustered SE (upwind) of the location, at plausible VIIRS overpass times ---
function destination(lat, lon, bearingDeg, distKm) {
  const R = 6371.0088;
  const δ = distKm / R;
  const θ = (bearingDeg * Math.PI) / 180;
  const φ1 = (lat * Math.PI) / 180;
  const λ1 = (lon * Math.PI) / 180;
  const φ2 = Math.asin(Math.sin(φ1) * Math.cos(δ) + Math.cos(φ1) * Math.sin(δ) * Math.cos(θ));
  const λ2 =
    λ1 +
    Math.atan2(Math.sin(θ) * Math.sin(δ) * Math.cos(φ1), Math.cos(δ) - Math.sin(φ1) * Math.sin(φ2));
  return { lat: (φ2 * 180) / Math.PI, lon: (λ2 * 180) / Math.PI };
}

const overpasses = [ref - 18.5 * H, ref - 5.5 * H]; // ~13:30 and ~01:30 WIB
const hotspots = [];
for (let i = 0; i < 14; i++) {
  const bearing = 110 + rand() * 50;
  const dist = 20 + rand() * 100;
  const p = destination(location.lat, location.lon, bearing, dist);
  const acquired = overpasses[i % 2];
  const conf = rand();
  hotspots.push({
    id: `fixture-hs-${String(i + 1).padStart(2, '0')}`,
    lat: round(p.lat, 4),
    lon: round(p.lon, 4),
    acquiredAt: iso(acquired),
    frpMw: i === 5 ? null : round(2 + rand() * 40),
    confidence: conf < 0.2 ? 'low' : conf < 0.8 ? 'nominal' : 'high',
    satellite: i % 2 ? 'NOAA-20' : 'Suomi NPP',
    instrument: 'VIIRS',
    provenance: {
      provider: 'pavana-fixture',
      kind: 'fixture',
      fetchedAt: REFERENCE_TIME,
      validAt: iso(acquired),
      isDemo: true,
      notes: 'Synthetic hotspot shaped like a FIRMS VIIRS detection. Not a real fire.',
    },
  });
}

const scenario = {
  meta: {
    id: 'kubu-raya-synthetic-v1',
    title: 'Kubu Raya — skenario asap ilustratif',
    isDemo: true,
    synthetic: true,
    description:
      'SYNTHETIC illustrative scenario for demos and tests. Values are generated, not observed. ' +
      'Shaped like a dry-season smoke episode with south-easterly winds. Do not cite as data.',
    referenceTime: REFERENCE_TIME,
    generatedBy: 'fixtures/scripts/generate-kubu-raya.mjs',
  },
  location,
  hours,
  hotspots,
};

writeFileSync(OUT, JSON.stringify(scenario, null, 2) + '\n');
console.log(`wrote ${OUT} (${hours.length} hours, ${hotspots.length} hotspots)`);
