import { deriveDataState, type ForecastResponse, type LatLon } from '@pavana/shared';
import type { ProviderBundle } from '../providers/types';
import { withAqi } from './air-quality';
import { MAX_AGE_MINUTES } from './conditions';

export async function getForecast(
  p: ProviderBundle,
  point: LatLon,
  hours: number,
): Promise<ForecastResponse> {
  const now = p.now();
  const location = await p.locations.resolve(point);
  const query = { point: { lat: location.lat, lon: location.lon }, from: now, hours };
  const [aq, wx] = await Promise.all([p.airQuality.getHourly(query), p.weather.getHourly(query)]);

  // Join on validAt — providers may have different hourly coverage.
  const weatherAt = new Map(wx.map((w) => [w.provenance.validAt, w]));
  const series = aq.map((a) => ({
    validAt: a.provenance.validAt,
    airQuality: withAqi(a),
    weather: weatherAt.get(a.provenance.validAt) ?? null,
  }));

  return {
    location,
    state: deriveDataState({
      isDemo: p.isDemo,
      hasValue: series.some((s) => s.airQuality.pm25UgM3 !== null),
      validAt: aq[0]?.provenance.validAt ?? null,
      now,
      maxAgeMinutes: MAX_AGE_MINUTES,
    }),
    hours: series,
  };
}
