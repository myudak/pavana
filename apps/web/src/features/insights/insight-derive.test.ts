import type { ForecastHour, Provenance, ProvenanceKind } from '@pavana/shared';
import { describe, expect, it } from 'vitest';
import {
  availableRanges,
  bannerTone,
  bearingToCompass8,
  dataSpanHours,
  deriveNotifications,
  dominantKind,
  hasPm25Data,
  peakOf,
  seriesRole,
  sliceRange,
  summarizePm25,
} from './insight-derive';

function provenance(kind: ProvenanceKind, validAt = '2026-09-15T00:00:00Z'): Provenance {
  return {
    provider: 'test-provider',
    kind,
    fetchedAt: '2026-09-15T00:00:00Z',
    validAt,
    isDemo: false,
  };
}

function hour(offsetH: number, pm25: number | null, kind: ProvenanceKind = 'forecast'): ForecastHour {
  const validAt = new Date(Date.UTC(2026, 8, 15, 0, 0, 0) + offsetH * 3_600_000).toISOString();
  return {
    validAt,
    airQuality: { pm25UgM3: pm25, aqi: null, provenance: provenance(kind, validAt) },
    weather: null,
  };
}

const series24 = Array.from({ length: 25 }, (_, i) => hour(i, 30 + i));
const series48 = Array.from({ length: 49 }, (_, i) => hour(i, 30 + i));

describe('dataSpanHours / availableRanges', () => {
  it('returns null for an empty series and 0 for a single point', () => {
    expect(dataSpanHours([])).toBeNull();
    expect(dataSpanHours([hour(0, 40)])).toBe(0);
    expect(availableRanges([])).toEqual([]);
    expect(availableRanges([hour(0, 40)])).toEqual([]);
  });

  it('offers 24h only when coverage stops at ~24h', () => {
    expect(dataSpanHours(series24)).toBe(24);
    expect(availableRanges(series24)).toEqual([24]);
  });

  it('offers 24h and 48h when coverage reaches 48h', () => {
    expect(availableRanges(series48)).toEqual([24, 48]);
  });

  it('never offers 7 days without 168h of data', () => {
    expect(availableRanges(series48)).not.toContain(168);
  });
});

describe('sliceRange', () => {
  it('keeps only points within the selected range', () => {
    expect(sliceRange(series48, 24)).toHaveLength(25);
    expect(sliceRange(series48, 48)).toHaveLength(49);
  });

  it('is a no-op for an empty series', () => {
    expect(sliceRange([], 24)).toEqual([]);
  });
});

describe('seriesRole / dominantKind', () => {
  it('maps only observations to measurement', () => {
    expect(seriesRole('observation')).toBe('measurement');
    expect(seriesRole('forecast')).toBe('model');
    expect(seriesRole('derived')).toBe('model');
    expect(seriesRole('fixture')).toBe('model');
  });

  it('reports the majority kind within a role', () => {
    const hours = [hour(0, 10, 'fixture'), hour(1, 11, 'fixture'), hour(2, 12, 'observation')];
    expect(dominantKind(hours, 'model')).toBe('fixture');
    expect(dominantKind(hours, 'measurement')).toBe('observation');
  });

  it('returns null when the role has no points', () => {
    expect(dominantKind([hour(0, 10, 'fixture')], 'measurement')).toBeNull();
  });
});

describe('peakOf / hasPm25Data', () => {
  it('finds the highest non-null value and its time', () => {
    const hours = [hour(0, 30), hour(1, null), hour(2, 90), hour(3, 70)];
    expect(peakOf(hours)).toEqual({
      pm25UgM3: 90,
      validAt: hours[2]?.validAt,
    });
  });

  it('returns null when every value is null', () => {
    expect(peakOf([hour(0, null), hour(1, null)])).toBeNull();
    expect(peakOf([])).toBeNull();
  });

  it('detects whether any PM2.5 value exists', () => {
    expect(hasPm25Data([hour(0, null)])).toBe(false);
    expect(hasPm25Data([hour(0, null), hour(1, 5)])).toBe(true);
    expect(hasPm25Data([])).toBe(false);
  });
});

describe('summarizePm25', () => {
  it('summarizes min, average and peak over non-null values only', () => {
    const hours = [hour(0, 30), hour(1, null), hour(2, 90), hour(3, 60)];
    const summary = summarizePm25(hours);
    expect(summary).not.toBeNull();
    expect(summary?.min).toBe(30);
    expect(summary?.avg).toBe(60);
    expect(summary?.peak).toEqual({ pm25UgM3: 90, validAt: hours[2]?.validAt });
    expect(summary?.count).toBe(3);
  });

  it('returns null when there is nothing to summarize', () => {
    expect(summarizePm25([])).toBeNull();
    expect(summarizePm25([hour(0, null), hour(1, null)])).toBeNull();
  });
});

describe('bannerTone', () => {
  it('is amber for a worsening forecast and for stale/error data', () => {
    expect(bannerTone('worsening', 'live')).toBe('warning');
    expect(bannerTone('stable', 'stale')).toBe('warning');
    expect(bannerTone('stable', 'error')).toBe('warning');
  });

  it('is neutral otherwise — including insufficient data (never "safe")', () => {
    expect(bannerTone('stable', 'live')).toBe('neutral');
    expect(bannerTone('improving', 'live')).toBe('neutral');
    expect(bannerTone('worsening', 'insufficient')).toBe('neutral');
    expect(bannerTone('unknown', 'insufficient')).toBe('neutral');
  });
});

describe('deriveNotifications', () => {
  const base = { trend: 'stable', hotspotCount: 0, windRelevant: false, state: 'live' } as const;

  it('falls back to the official entry when nothing is triggered', () => {
    expect(deriveNotifications(base)).toEqual([{ id: 'official', priority: 'info' }]);
  });

  it('emits a plain PM2.5 item when the forecast worsens without detections', () => {
    expect(deriveNotifications({ ...base, trend: 'worsening' })).toEqual([
      { id: 'pm25-rise', priority: 'attention' },
      { id: 'official', priority: 'info' },
    ]);
  });

  it('emits separate items when the wind is not relevant to the detections', () => {
    expect(deriveNotifications({ ...base, trend: 'worsening', hotspotCount: 4 })).toEqual([
      { id: 'pm25-rise', priority: 'attention' },
      { id: 'hotspots', priority: 'watch' },
      { id: 'official', priority: 'info' },
    ]);
  });

  it('combines PM2.5, detections and wind into one high-priority item', () => {
    expect(
      deriveNotifications({ ...base, trend: 'worsening', hotspotCount: 4, windRelevant: true }),
    ).toEqual([
      { id: 'combined', priority: 'attention' },
      { id: 'hotspots', priority: 'watch' },
      { id: 'official', priority: 'info' },
    ]);
  });

  it('replaces any trend claim when the data is stale or insufficient', () => {
    expect(
      deriveNotifications({ ...base, trend: 'worsening', hotspotCount: 4, state: 'stale' }),
    ).toEqual([
      { id: 'data-stale', priority: 'attention' },
      { id: 'hotspots', priority: 'watch' },
      { id: 'official', priority: 'info' },
    ]);
    expect(
      deriveNotifications({
        ...base,
        trend: 'worsening',
        hotspotCount: 4,
        windRelevant: true,
        state: 'insufficient',
      }),
    ).toEqual([
      { id: 'data-insufficient', priority: 'watch' },
      { id: 'hotspots', priority: 'watch' },
      { id: 'official', priority: 'info' },
    ]);
  });

  it('never emits more than three items', () => {
    const items = deriveNotifications({
      ...base,
      trend: 'worsening',
      hotspotCount: 4,
      windRelevant: true,
    });
    expect(items).toHaveLength(3);
  });
});

describe('bearingToCompass8', () => {
  it('rounds meteorological bearings to 8 points', () => {
    expect(bearingToCompass8(0)).toBe('N');
    expect(bearingToCompass8(45)).toBe('NE');
    expect(bearingToCompass8(135)).toBe('SE');
    expect(bearingToCompass8(180)).toBe('S');
    expect(bearingToCompass8(270)).toBe('W');
    expect(bearingToCompass8(315)).toBe('NW');
  });

  it('normalizes out-of-range bearings', () => {
    expect(bearingToCompass8(360)).toBe('N');
    expect(bearingToCompass8(-90)).toBe('W');
    expect(bearingToCompass8(359)).toBe('N');
  });
});
