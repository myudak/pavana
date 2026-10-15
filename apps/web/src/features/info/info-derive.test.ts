import { describe, expect, it } from 'vitest';
import { deriveInfoCards, filterInfoCards, hasDataWarning, type InfoCardDescriptor } from './info-derive';

const base = { trend: 'stable', hotspotCount: null, linkCount: 6, dataState: 'live' } as const;

function byId(cards: readonly InfoCardDescriptor[]) {
  return Object.fromEntries(cards.map((c) => [c.id, c.priority]));
}

describe('deriveInfoCards', () => {
  it('always returns the four dashboard cards in order', () => {
    expect(deriveInfoCards(base).map((c) => c.id)).toEqual(['pm25', 'hotspots', 'official', 'data']);
  });

  it('raises the PM2.5 card only when the forecast worsens', () => {
    expect(byId(deriveInfoCards({ ...base, trend: 'worsening' })).pm25).toBe('attention');
    expect(byId(deriveInfoCards({ ...base, trend: 'improving' })).pm25).toBe('watch');
    expect(byId(deriveInfoCards({ ...base, trend: 'unknown' })).pm25).toBe('watch');
  });

  it('keeps detections at watch and never higher', () => {
    expect(byId(deriveInfoCards({ ...base, hotspotCount: 5 })).hotspots).toBe('watch');
    expect(byId(deriveInfoCards({ ...base, hotspotCount: 0 })).hotspots).toBe('info');
    expect(byId(deriveInfoCards({ ...base, hotspotCount: null })).hotspots).toBe('info');
  });

  it('flags the status card when data is late, missing or failed', () => {
    expect(byId(deriveInfoCards({ ...base, dataState: 'stale' })).data).toBe('attention');
    expect(byId(deriveInfoCards({ ...base, dataState: 'insufficient' })).data).toBe('attention');
    expect(byId(deriveInfoCards({ ...base, dataState: 'error' })).data).toBe('attention');
    expect(byId(deriveInfoCards({ ...base, dataState: 'live' })).data).toBe('info');
    expect(byId(deriveInfoCards({ ...base, dataState: 'demo' })).data).toBe('info');
  });

  it('marks the official card as not-ready while the list is empty', () => {
    expect(byId(deriveInfoCards({ ...base, linkCount: 0 })).official).toBe('watch');
    expect(byId(deriveInfoCards(base)).official).toBe('info');
  });
});

describe('filterInfoCards', () => {
  const cards = deriveInfoCards(base);

  it('returns every card for the all filter', () => {
    expect(filterInfoCards(cards, 'all')).toHaveLength(4);
  });

  it('returns a single card for a category filter', () => {
    expect(filterInfoCards(cards, 'hotspots').map((c) => c.id)).toEqual(['hotspots']);
    expect(filterInfoCards(cards, 'data').map((c) => c.id)).toEqual(['data']);
  });

  it('does not mutate the input list', () => {
    const copy = [...cards];
    filterInfoCards(cards, 'official');
    expect(cards).toEqual(copy);
  });
});

describe('hasDataWarning', () => {
  it('warns for late, missing or failed data only', () => {
    expect(hasDataWarning('stale')).toBe(true);
    expect(hasDataWarning('insufficient')).toBe(true);
    expect(hasDataWarning('error')).toBe(true);
    expect(hasDataWarning('live')).toBe(false);
    expect(hasDataWarning('demo')).toBe(false);
  });
});
