import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  bearingToCompass16,
  bearingToUnitVector,
  haversineKm,
  kmhToMs,
  msToKmh,
  upwindExposureScore,
  windFromToFlowBearing,
  type UpwindHotspotInput,
  type UpwindParams,
} from '../src';

interface Vectors {
  tolerance: number;
  haversineKm: {
    a: { lat: number; lon: number };
    b: { lat: number; lon: number };
    expected: number;
  }[];
  windFlowBearing: {
    fromDeg: number;
    expectedToDeg: number;
    expectedUnit: { east: number; north: number };
  }[];
  upwindScore: {
    params: UpwindParams;
    cases: {
      name: string;
      target: { lat: number; lon: number };
      windFromDeg: number;
      hotspots: UpwindHotspotInput[];
      expectedScore: number;
      expectedContributing: number;
    }[];
  };
}

const vectors: Vectors = JSON.parse(
  readFileSync(
    fileURLToPath(new URL('../../../fixtures/test-vectors/geo-wind.json', import.meta.url)),
    'utf8',
  ),
);
const tol = vectors.tolerance;

describe('units', () => {
  it('round-trips km/h <-> m/s', () => {
    expect(kmhToMs(36)).toBeCloseTo(10);
    expect(msToKmh(kmhToMs(12.3))).toBeCloseTo(12.3);
  });
});

describe('haversineKm (shared vectors)', () => {
  it.each(vectors.haversineKm)('$a -> $b', ({ a, b, expected }) => {
    expect(Math.abs(haversineKm(a, b) - expected)).toBeLessThan(tol);
  });
});

describe('wind direction conversion (shared vectors)', () => {
  it.each(vectors.windFlowBearing)('from $fromDeg° flows to $expectedToDeg°', (v) => {
    const to = windFromToFlowBearing(v.fromDeg);
    expect(to).toBeCloseTo(v.expectedToDeg);
    const unit = bearingToUnitVector(to);
    expect(Math.abs(unit.east - v.expectedUnit.east)).toBeLessThan(tol);
    expect(Math.abs(unit.north - v.expectedUnit.north)).toBeLessThan(tol);
  });

  it('labels compass points', () => {
    expect(bearingToCompass16(0)).toBe('N');
    expect(bearingToCompass16(135)).toBe('SE');
    expect(bearingToCompass16(359)).toBe('N');
  });
});

describe('upwindExposureScore (shared vectors)', () => {
  it.each(vectors.upwindScore.cases)('$name', (c) => {
    const r = upwindExposureScore(c.target, c.windFromDeg, c.hotspots, vectors.upwindScore.params);
    expect(Math.abs(r.score - c.expectedScore)).toBeLessThan(tol);
    expect(r.contributingCount).toBe(c.expectedContributing);
  });
});
