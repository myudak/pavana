import { pm25ToUsAqi, type AirQualityPoint, type Provenance } from '@pavana/shared';

/** Attach an indicative US AQI (always labelled with its standard). */
export function withAqi(point: AirQualityPoint): AirQualityPoint {
  const aqi = pm25ToUsAqi(point.pm25UgM3);
  return {
    ...point,
    aqi: aqi ? { value: aqi.value, standard: 'US_EPA', category: aqi.category } : null,
  };
}

/** Explicit "no data" point — `pm25UgM3: null`, never 0. */
export function missingAirQuality(providerId: string, now: Date, isDemo: boolean): AirQualityPoint {
  const ts = now.toISOString();
  const provenance: Provenance = {
    provider: providerId,
    kind: 'forecast',
    fetchedAt: ts,
    validAt: ts,
    isDemo,
    notes: 'No data available for this location/time.',
  };
  return { pm25UgM3: null, aqi: null, provenance };
}
