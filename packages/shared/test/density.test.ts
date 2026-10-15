import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  BORNEO_RENDER_BBOX,
  buildDensityField,
  DENSITY_COLS,
  DENSITY_FINE_WEIGHT,
  DENSITY_GAMMA,
  DENSITY_MID_WEIGHT,
  DENSITY_NEUTRAL_WEIGHT,
  DENSITY_PERCENTILE,
  DENSITY_SIGMA_FINE_KM,
  DENSITY_SIGMA_MID_KM,
  DENSITY_SIGMA_WIDE_KM,
  DENSITY_WIDE_WEIGHT,
  hotspotWeight,
  invMercY,
  isBorneoLand,
  KALIMANTAN_BBOX,
  mercY,
  normalizeDensity,
  normalizeField,
  type DensityPoint,
} from '../src';

const BBOX = KALIMANTAN_BBOX;
const OPTS = {
  cols: 96,
  sigmaWideKm: 45,
  sigmaMidKm: 25,
  sigmaFineKm: 8,
  wideWeight: 0.45,
  midWeight: 0.35,
  fineWeight: 0.2,
};

describe('mercator helpers', () => {
  it('round-trips latitude', () => {
    for (const lat of [-4.5, -0.1, 2.5, 4.5]) {
      expect(invMercY(mercY(lat))).toBeCloseTo(lat, 9);
    }
  });
});

describe('normalizeDensity', () => {
  it('maps 0/negative/NaN to 0 and clips at 1', () => {
    expect(normalizeDensity(0, 900)).toBe(0);
    expect(normalizeDensity(-5, 900)).toBe(0);
    expect(normalizeDensity(NaN, 900)).toBe(0);
    expect(normalizeDensity(900, 900)).toBe(1);
    expect(normalizeDensity(3600, 900)).toBe(1);
  });

  it('applies a sqrt stretch', () => {
    expect(normalizeDensity(225, 900)).toBeCloseTo(0.5, 9);
  });
});

describe('hotspotWeight', () => {
  it('maps null/NaN to the neutral constant (never 0, never dropped)', () => {
    expect(hotspotWeight(null)).toBe(DENSITY_NEUTRAL_WEIGHT);
    expect(hotspotWeight(undefined)).toBe(DENSITY_NEUTRAL_WEIGHT);
    expect(hotspotWeight(NaN)).toBe(DENSITY_NEUTRAL_WEIGHT);
    expect(DENSITY_NEUTRAL_WEIGHT).toBeGreaterThan(0);
  });

  it('passes FRP through', () => {
    expect(hotspotWeight(12.5)).toBe(12.5);
  });
});

describe('buildDensityField', () => {
  it('empty grid is all zeros', () => {
    const f = buildDensityField([], BBOX, OPTS);
    expect(f.cols).toBe(96);
    expect(f.rows).toBeGreaterThan(0);
    expect(f.values.every((v) => v === 0)).toBe(true);
  });

  it('single point peaks at its cell and is symmetric', () => {
    // Point at an exact cell center so east/west mirror cells match.
    const col = 48;
    const lon = BBOX[0] + ((col + 0.5) / OPTS.cols) * (BBOX[2] - BBOX[0]);
    const pt: DensityPoint = { lat: 0.02, lon, weight: 100 };
    const f = buildDensityField([pt], BBOX, OPTS);
    let peak = 0;
    let peakIdx = 0;
    for (let k = 0; k < f.values.length; k++) {
      if (f.values[k]! > peak) {
        peak = f.values[k]!;
        peakIdx = k;
      }
    }
    expect(peak).toBeGreaterThan(0);
    const pi = peakIdx % f.cols;
    const pj = Math.floor(peakIdx / f.cols);
    expect(pi).toBe(col);
    // Mirror symmetry east/west of the peak column (same row).
    for (let d = 1; d <= 3; d++) {
      const a = f.values[pj * f.cols + pi - d] ?? NaN;
      const b = f.values[pj * f.cols + pi + d] ?? NaN;
      expect(Math.abs(a - b)).toBeLessThan(1e-9);
    }
    void pj;
  });

  it('two close points merge into a stronger center', () => {
    const a: DensityPoint = { lat: 0, lon: 113.9, weight: 50 };
    const b: DensityPoint = { lat: 0, lon: 114.1, weight: 50 };
    const single = buildDensityField([a], BBOX, OPTS);
    const merged = buildDensityField([a, b], BBOX, OPTS);
    const max = (f: { values: Float32Array }) => Math.max(...f.values);
    expect(max(merged)).toBeGreaterThan(max(single));
  });

  it('never produces NaN and stays non-negative', () => {
    const pts: DensityPoint[] = [
      { lat: -4.5, lon: 108.5, weight: 200 },
      { lat: 4.5, lon: 119.5, weight: 0.1 },
      { lat: 0, lon: 114, weight: 1e6 },
    ];
    const f = buildDensityField(pts, BBOX, OPTS);
    for (const v of f.values) {
      expect(Number.isFinite(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('normalizeField', () => {
  it('empty input stays zero', () => {
    const out = normalizeField(new Float32Array(10), { percentile: 98, gamma: 0.7 });
    expect(out.every((v) => v === 0)).toBe(true);
  });

  it('clips at the nonzero percentile and applies gamma', () => {
    const raw = new Float32Array([0, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 100]);
    const out = normalizeField(raw, { percentile: 90, gamma: 1 });
    // p90 of 10 nonzero values ≈ 9 → 100 clips to 1, zeros stay 0.
    expect(out[0]).toBe(0);
    expect(out[11]).toBe(1);
    expect(out[5]).toBeCloseTo(4 / 9, 6);
  });

  it('gamma below 1 lifts mid-tones', () => {
    const raw = new Float32Array([0.25, 1]);
    const linear = normalizeField(raw, { percentile: 100, gamma: 1 })[0]!;
    const lifted = normalizeField(raw, { percentile: 100, gamma: 0.7 })[0]!;
    expect(linear).toBeCloseTo(0.25, 6);
    expect(lifted).toBeGreaterThan(linear);
    expect(lifted).toBeLessThanOrEqual(1);
  });

  it('output is always finite within [0, 1]', () => {
    const raw = new Float32Array([NaN, Infinity, -3, 0, 12.5]);
    const out = normalizeField(raw, { percentile: 98, gamma: 0.7 });
    for (const v of out) {
      expect(Number.isFinite(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });
});

describe('regional fixture field metrics', () => {
  const fixture = JSON.parse(
    readFileSync(fileURLToPath(new URL('../../../fixtures/regional-kalimantan-hotspots.json', import.meta.url)), 'utf8'),
  ) as { hotspots: { lat: number; lon: number; frpMw: number | null }[] };

  it('meets the land-coverage criteria', () => {
    const field = buildDensityField(
      fixture.hotspots.map((h) => ({ lat: h.lat, lon: h.lon, weight: hotspotWeight(h.frpMw) })),
      BORNEO_RENDER_BBOX,
      {
        cols: DENSITY_COLS,
        sigmaWideKm: DENSITY_SIGMA_WIDE_KM,
        sigmaMidKm: DENSITY_SIGMA_MID_KM,
        sigmaFineKm: DENSITY_SIGMA_FINE_KM,
        wideWeight: DENSITY_WIDE_WEIGHT,
        midWeight: DENSITY_MID_WEIGHT,
        fineWeight: DENSITY_FINE_WEIGHT,
      },
    );
    const norm = normalizeField(field.values, {
      percentile: DENSITY_PERCENTILE,
      gamma: DENSITY_GAMMA,
    });
    const [minLon, minLat, maxLon, maxLat] = BORNEO_RENDER_BBOX;
    const mt = mercY(maxLat);
    const mb = mercY(minLat);
    let land = 0;
    let mid = 0;
    let core = 0;
    for (let j = 0; j < field.rows; j++) {
      const lat = invMercY(mt + ((j + 0.5) / field.rows) * (mb - mt));
      for (let i = 0; i < field.cols; i++) {
        const lon = minLon + ((i + 0.5) / field.cols) * (maxLon - minLon);
        if (!isBorneoLand(lon, lat)) continue;
        land++;
        const v = norm[j * field.cols + i]!;
        if (v >= 0.5) mid++;
        if (v >= 0.85) core++;
      }
    }
    // Purple-and-up covers a broad share, pink cores stay small.
    expect(mid / land).toBeGreaterThanOrEqual(0.25);
    expect(mid / land).toBeLessThanOrEqual(0.4);
    expect(core / land).toBeLessThanOrEqual(0.08);
  });

  it('bright areas connect into a few masses, not scattered blobs', () => {
    const field = buildDensityField(
      fixture.hotspots.map((h) => ({ lat: h.lat, lon: h.lon, weight: hotspotWeight(h.frpMw) })),
      BORNEO_RENDER_BBOX,
      {
        cols: 192,
        sigmaWideKm: DENSITY_SIGMA_WIDE_KM,
        sigmaMidKm: DENSITY_SIGMA_MID_KM,
        sigmaFineKm: DENSITY_SIGMA_FINE_KM,
        wideWeight: DENSITY_WIDE_WEIGHT,
        midWeight: DENSITY_MID_WEIGHT,
        fineWeight: DENSITY_FINE_WEIGHT,
      },
    );
    const norm = normalizeField(field.values, {
      percentile: DENSITY_PERCENTILE,
      gamma: DENSITY_GAMMA,
    });
    // 4-connected components over cells >= 0.5.
    const seen = new Uint8Array(field.cols * field.rows);
    let components = 0;
    for (let k = 0; k < norm.length; k++) {
      if (norm[k]! < 0.5 || seen[k]) continue;
      components++;
      const stack = [k];
      seen[k] = 1;
      while (stack.length > 0) {
        const c = stack.pop()!;
        const ci = c % field.cols;
        const cj = Math.floor(c / field.cols);
        const nb: [number, number][] = [
          [ci - 1, cj],
          [ci + 1, cj],
          [ci, cj - 1],
          [ci, cj + 1],
        ];
        for (const [ni, nj] of nb) {
          if (ni < 0 || nj < 0 || ni >= field.cols || nj >= field.rows) continue;
          const nk = nj * field.cols + ni;
          if (!seen[nk] && norm[nk]! >= 0.5) {
            seen[nk] = 1;
            stack.push(nk);
          }
        }
      }
    }
    expect(components).toBeLessThanOrEqual(3);
  });
});
