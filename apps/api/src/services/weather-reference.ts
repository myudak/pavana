import type { LatLon, WeatherReferenceResponse } from '@pavana/shared';
import type { ProviderBundle } from '../providers/types';

/**
 * BMKG comparison forecast near a point. Outside the curated coverage (or in demo
 * mode) the answer is `insufficient` with no hours — never a borrowed forecast.
 */
export async function getWeatherReference(
  p: ProviderBundle,
  point: LatLon,
): Promise<WeatherReferenceResponse> {
  const empty: WeatherReferenceResponse = {
    state: 'insufficient',
    source: 'bmkg',
    place: null,
    distanceKm: null,
    hours: [],
    provenance: null,
  };
  if (!p.weatherReference) return empty;
  const ref = await p.weatherReference.near(point, p.now());
  if (!ref || ref.hours.length === 0) return empty;
  return {
    state: p.isDemo ? 'demo' : 'live',
    source: 'bmkg',
    place: ref.place,
    distanceKm: ref.distanceKm,
    hours: ref.hours,
    provenance: ref.provenance,
  };
}
