import { describe, expect, it } from 'vitest';
import { tracePlumes, type WindField } from '../src';

const validAt = '2026-09-15T00:00:00Z';
const prov = {
  provider: 'test',
  kind: 'fixture' as const,
  fetchedAt: validAt,
  validAt,
  isDemo: true,
};

/** Uniform field, wind FROM `fromDeg` at `speed` m/s over [0..2]×[0..2]. */
function uniform(fromDeg: number, speed: number | null): WindField {
  const points = [];
  for (let j = 0; j < 3; j++)
    for (let i = 0; i < 3; i++)
      points.push({ lat: 2 - j, lon: i, speedMs: speed, fromDeg, validAt, provenance: prov });
  return { cols: 3, rows: 3, bbox: [0, 0, 2, 2], validAt, points };
}

describe('tracePlumes', () => {
  it('moves downwind (FROM south → trail goes north)', () => {
    const [trail] = tracePlumes([{ lat: 0.5, lon: 1, weight: 1 }], uniform(180, 5), {
      hours: 2,
      stepMinutes: 30,
    });
    const end = trail!.points.at(-1)!;
    expect(trail!.points).toHaveLength(5);
    expect(end[1]).toBeGreaterThan(0.5); // north
    expect(Math.abs(end[0] - 1)).toBeLessThan(1e-9); // no east-west drift
    // 5 m/s × 2 h = 36 km ≈ 0.32°
    expect(end[1] - 0.5).toBeCloseTo(36 / 111.19, 2);
  });

  it('stops on missing wind instead of assuming calm', () => {
    const [trail] = tracePlumes([{ lat: 1, lon: 1, weight: 1 }], uniform(180, null), {
      hours: 3,
      stepMinutes: 30,
    });
    expect(trail!.points).toEqual([[1, 1]]);
  });
});
