import { describe, expect, it } from 'vitest';
import {
  KALIMANTAN_BBOX,
  sampleWind,
  STREAMLINE_MAX_LENGTH_KM,
  traceStreamlines,
  type StreamlineOptions,
  type WindField,
} from '../src';

const PROV = {
  provider: 'test',
  kind: 'fixture',
  fetchedAt: '2026-09-15T00:00:00Z',
  validAt: '2026-09-15T00:00:00Z',
  isDemo: true,
} as const;

/** Uniform east wind (FROM 90°): flow heads west. */
function eastWindField(): WindField {
  const cols = 5;
  const rows = 5;
  const [minLon, minLat, maxLon, maxLat] = KALIMANTAN_BBOX;
  const points = [];
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      points.push({
        lat: maxLat - ((j + 0.5) / rows) * (maxLat - minLat),
        lon: minLon + ((i + 0.5) / cols) * (maxLon - minLon),
        speedMs: 3,
        fromDeg: 90,
        validAt: '2026-09-15T00:00:00Z',
        provenance: { ...PROV },
      });
    }
  }
  return { cols, rows, bbox: KALIMANTAN_BBOX, validAt: '2026-09-15T00:00:00Z', points };
}

const OPTS: StreamlineOptions = {
  targetCount: 60,
  minSpacingKm: 90,
  stepKm: 6,
  minLengthKm: 150,
  maxLengthKm: STREAMLINE_MAX_LENGTH_KM,
  minSpeedMs: 0.3,
  seed: 7,
};

describe('sampleWind', () => {
  it('interpolates the flow vector (FROM converted to TO)', () => {
    const v = sampleWind(eastWindField(), 0, 114);
    expect(v).not.toBeNull();
    // FROM east (90°) flows west: negative east component, ~zero north.
    expect(v!.east).toBeCloseTo(-3, 6);
    expect(v!.north).toBeCloseTo(0, 6);
  });

  it('returns null outside the field or on null vectors', () => {
    expect(sampleWind(eastWindField(), 0, 200)).toBeNull();
    const f = eastWindField();
    f.points[12] = { ...f.points[12]!, speedMs: null, fromDeg: null };
    expect(sampleWind(f, f.points[12]!.lat, f.points[12]!.lon)).toBeNull();
  });
});

describe('traceStreamlines', () => {
  it('traces lines along the flow with bounded count and length', () => {
    const { lines, arrows } = traceStreamlines(eastWindField(), KALIMANTAN_BBOX, OPTS);
    expect(lines.length).toBeGreaterThan(0);
    expect(lines.length).toBeLessThanOrEqual(OPTS.targetCount);
    expect(arrows.length).toBe(lines.length);
    for (const l of lines) {
      expect(l.points.length).toBeGreaterThanOrEqual(2);
      // Westward flow: longitudes decrease along each line.
      const [first] = [l.points[0]!];
      const last = l.points[l.points.length - 1]!;
      expect(last[0]).toBeLessThan(first[0]);
      for (const [lon, lat] of l.points) {
        expect(Number.isFinite(lon)).toBe(true);
        expect(Number.isFinite(lat)).toBe(true);
      }
    }
    for (const a of arrows) {
      expect(a.rot).toBeGreaterThanOrEqual(0);
      expect(a.rot).toBeLessThan(360);
    }
  });

  it('keeps seed starts apart (min spacing)', () => {
    const { lines } = traceStreamlines(eastWindField(), KALIMANTAN_BBOX, OPTS);
    const starts = lines.map((l) => l.points[0]!);
    for (let i = 0; i < starts.length; i++) {
      for (let k = i + 1; k < starts.length; k++) {
        const dLon = (starts[i]![0] - starts[k]![0]) * 111.19;
        const dLat = (starts[i]![1] - starts[k]![1]) * 111.19;
        expect(Math.hypot(dLon, dLat)).toBeGreaterThanOrEqual(20);
      }
    }
  });

  it('is deterministic', () => {
    const a = traceStreamlines(eastWindField(), KALIMANTAN_BBOX, OPTS);
    const b = traceStreamlines(eastWindField(), KALIMANTAN_BBOX, OPTS);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('stops in calm zones', () => {
    const f = eastWindField();
    for (const p of f.points) p.speedMs = 0;
    const { lines } = traceStreamlines(f, KALIMANTAN_BBOX, OPTS);
    expect(lines).toHaveLength(0);
  });
});
