import { deriveDataState, type ConditionsResponse, type LatLon } from '@pavana/shared';
import type { ProviderBundle } from '../providers/types';
import { missingAirQuality, withAqi } from './air-quality';
import { pm25Trend } from './trend';

/** Hours ahead used to judge the trend shown on the Today screen. */
const TREND_HORIZON_HOURS = 12;
/** Data older than this is `stale` in live mode. */
export const MAX_AGE_MINUTES = 90;

export async function getConditions(p: ProviderBundle, point: LatLon): Promise<ConditionsResponse> {
  const now = p.now();
  const location = await p.locations.resolve(point);
  const query = {
    point: { lat: location.lat, lon: location.lon },
    from: now,
    hours: TREND_HORIZON_HOURS,
  };
  const [aq, wx] = await Promise.all([p.airQuality.getHourly(query), p.weather.getHourly(query)]);

  const current = aq[0] ? withAqi(aq[0]) : missingAirQuality(p.airQuality.id, now, p.isDemo);
  const trend = pm25Trend(
    current.pm25UgM3,
    aq.slice(1).map((x) => x.pm25UgM3),
  );

  return {
    location,
    state: deriveDataState({
      isDemo: p.isDemo,
      hasValue: current.pm25UgM3 !== null,
      validAt: aq[0]?.provenance.validAt ?? null,
      now,
      maxAgeMinutes: MAX_AGE_MINUTES,
    }),
    airQuality: current,
    weather: wx[0] ?? null,
    trend,
  };
}
