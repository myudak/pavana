import type { Hotspot } from '@pavana/shared';
import { describe, expect, it } from 'vitest';
import { ageClass, hotspotAgeHours, hotspotReferenceMs, withAlpha } from './hotspot-style';

const spot = (acquiredAt: string, fetchedAt: string) =>
  ({ acquiredAt, provenance: { fetchedAt } }) as Hotspot;

describe('hotspot age styling', () => {
  it('bins ages at 6, 24 and 48 hours (upper bounds exclusive)', () => {
    expect([0, 5.99, 6, 23.9, 24, 47.9, 48, 200].map(ageClass)).toEqual([0, 0, 1, 1, 2, 2, 3, 3]);
  });

  it('uses the latest provenance fetch time as "now" (pinned in demo)', () => {
    const ref = hotspotReferenceMs([
      spot('2026-09-14T00:00:00Z', '2026-09-15T00:00:00Z'),
      spot('2026-09-14T05:30:00Z', '2026-09-14T23:00:00Z'),
    ]);
    expect(new Date(ref).toISOString()).toBe('2026-09-15T00:00:00.000Z');
    expect(hotspotAgeHours('2026-09-14T05:30:00Z', ref)).toBeCloseTo(18.5);
  });

  it('falls back to the clock with no data and never returns negative ages', () => {
    expect(hotspotReferenceMs([], 123)).toBe(123);
    expect(hotspotAgeHours('2026-09-15T02:00:00Z', Date.parse('2026-09-15T00:00:00Z'))).toBe(0);
    expect(hotspotAgeHours('not a date', 0)).toBeNull();
  });

  it('adds alpha to hex colors only', () => {
    expect(withAlpha('#ff8000', 0.5)).toBe('rgba(255,128,0,0.5)');
    expect(withAlpha('red', 0.5)).toBe('red');
  });
});
