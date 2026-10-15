import { describe, expect, it } from 'vitest';
import { bearingToCompassCode, windDirectionLabel } from './wind-label';

describe('bearingToCompassCode', () => {
  const cases: Array<[number, string]> = [
    [0, 'N'],
    [22.4, 'N'],
    [22.6, 'NE'],
    [45, 'NE'],
    [90, 'E'],
    [134, 'SE'],
    [180, 'S'],
    [225, 'SW'],
    [270, 'W'],
    [315, 'NW'],
    [359, 'N'],
    [360, 'N'],
    [-90, 'W'],
  ];
  it.each(cases)('%s° → %s', (deg, code) => {
    expect(bearingToCompassCode(deg)).toBe(code);
  });
});

describe('windDirectionLabel', () => {
  it('returns full Indonesian names, never codes', () => {
    expect(windDirectionLabel(134)).toBe('tenggara');
    expect(windDirectionLabel(0)).toBe('utara');
    expect(windDirectionLabel(315)).toBe('barat laut');
  });

  it('returns null for missing data', () => {
    expect(windDirectionLabel(null)).toBeNull();
    expect(windDirectionLabel(undefined)).toBeNull();
    expect(windDirectionLabel(Number.NaN)).toBeNull();
  });
});
