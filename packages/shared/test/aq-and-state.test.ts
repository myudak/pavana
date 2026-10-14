import { describe, expect, it } from 'vitest';
import {
  AirQualityPointSchema,
  deriveDataState,
  pm25ToUsAqi,
  usAqiCategoryFromIndex,
} from '../src';

describe('US AQI (PM2.5)', () => {
  it('maps AQI 158 to "unhealthy", not "unhealthy for sensitive groups"', () => {
    expect(usAqiCategoryFromIndex(158)).toBe('unhealthy');
    expect(usAqiCategoryFromIndex(150)).toBe('unhealthy_sensitive');
  });

  it.each([
    [0, 0, 'good'],
    [9.0, 50, 'good'],
    [9.1, 51, 'moderate'],
    [35.4, 100, 'moderate'],
    [35.5, 101, 'unhealthy_sensitive'],
    [55.5, 151, 'unhealthy'],
    [125.5, 201, 'very_unhealthy'],
    [225.5, 301, 'hazardous'],
    [999, 500, 'hazardous'],
  ] as const)('%s µg/m³ -> %s (%s)', (pm25, aqi, category) => {
    expect(pm25ToUsAqi(pm25)).toEqual({ value: aqi, category });
  });

  it('truncates to 0.1 µg/m³ (9.05 stays Good)', () => {
    expect(pm25ToUsAqi(9.05)?.category).toBe('good');
  });

  it('returns null for missing data — never 0 / Good', () => {
    expect(pm25ToUsAqi(null)).toBeNull();
    expect(pm25ToUsAqi(Number.NaN)).toBeNull();
  });
});

describe('deriveDataState', () => {
  const now = new Date('2026-09-15T12:00:00Z');
  const base = {
    isDemo: false,
    hasValue: true,
    validAt: '2026-09-15T11:30:00Z',
    now,
    maxAgeMinutes: 90,
  };

  it('demo beats live/stale (fixtures are never "live")', () => {
    expect(deriveDataState({ ...base, isDemo: true })).toBe('demo');
    expect(deriveDataState({ ...base, isDemo: true, validAt: '2020-01-01T00:00:00Z' })).toBe(
      'demo',
    );
  });
  it('missing value -> insufficient, even in demo mode', () => {
    expect(deriveDataState({ ...base, hasValue: false })).toBe('insufficient');
    expect(deriveDataState({ ...base, isDemo: true, hasValue: false })).toBe('insufficient');
  });
  it('fresh -> live, old -> stale', () => {
    expect(deriveDataState(base)).toBe('live');
    expect(deriveDataState({ ...base, validAt: '2026-09-15T08:00:00Z' })).toBe('stale');
  });
});

describe('AirQualityPointSchema', () => {
  const provenance = {
    provider: 'test',
    kind: 'observation',
    fetchedAt: '2026-09-15T00:00:00Z',
    validAt: '2026-09-15T00:00:00Z',
    isDemo: false,
  } as const;

  it('accepts null PM2.5 (no data) but rejects negatives', () => {
    expect(AirQualityPointSchema.safeParse({ pm25UgM3: null, provenance }).success).toBe(true);
    expect(AirQualityPointSchema.safeParse({ pm25UgM3: -1, provenance }).success).toBe(false);
  });
});
