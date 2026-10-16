import { describe, expect, it } from 'vitest';
import { parseMapFocus } from './map-focus';

describe('hotspot map deep links', () => {
  it.each(['', 'lat=-0.25&lon=109.4', 'lat=&lon=109.4&zoom=10'])(
    'keeps the national view for absent or incomplete focus: %s',
    (query) => expect(parseMapFocus(new URLSearchParams(query))).toBeNull(),
  );

  it('focuses the actual coordinates linked from the nearby detections card', () => {
    expect(parseMapFocus(new URLSearchParams('lat=-0.25&lon=109.4&zoom=10'))).toEqual({
      center: { lat: -0.25, lon: 109.4 },
      zoom: 10,
    });
  });

  it.each([
    'lat=NaN&lon=109.4&zoom=10',
    'lat=-0.25&lon=Infinity&zoom=10',
    'lat=90&lon=109.4&zoom=10',
    'lat=-0.25&lon=0&zoom=10',
    'lat=-0.25&lon=109.4&zoom=22',
  ])('rejects focus outside supported map bounds: %s', (query) => {
    expect(parseMapFocus(new URLSearchParams(query))).toBeNull();
  });
});
