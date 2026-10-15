import {
  aggregateDaily,
  deriveDataState,
  localDateKey,
  type DailyForecastDay,
  type DailyForecastResponse,
  type LatLon,
} from '@pavana/shared';
import type { ProviderBundle } from '../providers/types';
import { MAX_AGE_MINUTES } from './conditions';

/**
 * Daily PM2.5 min/max/mean for the next `days` local calendar days.
 * Aggregation runs on the server from the longest hourly horizon the provider
 * returns; dates beyond that horizon are `available: false` (never invented).
 */
export async function getDailyForecast(
  p: ProviderBundle,
  point: LatLon,
  days: number,
): Promise<DailyForecastResponse> {
  const now = p.now();
  const location = await p.locations.resolve(point);
  const aq = await p.airQuality.getHourly({
    point: { lat: location.lat, lon: location.lon },
    from: now,
    hours: days * 24,
  });

  const aggregated = aggregateDaily(
    aq.map((a) => ({ validAt: a.provenance.validAt, pm25UgM3: a.pm25UgM3 })),
    location.timezone,
    { days, now },
  );

  // First contributing hour per local date → source provenance for that day.
  const firstByDate = new Map<string, (typeof aq)[number]>();
  for (const a of aq) {
    if (a.pm25UgM3 === null) continue;
    const key = localDateKey(a.provenance.validAt, location.timezone);
    if (!firstByDate.has(key)) firstByDate.set(key, a);
  }

  const fetchedAt = now.toISOString();
  const result: DailyForecastDay[] = aggregated.map((d) => {
    const src = firstByDate.get(d.date);
    return {
      ...d,
      // No weather provider currently supplies a daily rain probability.
      rainProbPct: null,
      provenance: src
        ? {
            provider: src.provenance.provider,
            kind: src.provenance.kind,
            fetchedAt,
            issuedAt: src.provenance.issuedAt,
            validAt: `${d.date}T00:00:00Z`,
            isDemo: src.provenance.isDemo,
            spatialResolutionKm: src.provenance.spatialResolutionKm,
            notes: 'Daily min/max/mean aggregated from the hourly forecast.',
          }
        : {
            provider: p.airQuality.id,
            kind: p.isDemo ? 'fixture' : 'forecast',
            fetchedAt,
            validAt: `${d.date}T00:00:00Z`,
            isDemo: p.isDemo,
            notes: 'Beyond the provider forecast horizon.',
          },
    };
  });

  const firstAvailable = result.find((d) => d.available);
  return {
    location,
    state: deriveDataState({
      isDemo: p.isDemo,
      hasValue: firstAvailable !== undefined,
      validAt: firstAvailable?.provenance.validAt ?? null,
      now,
      maxAgeMinutes: MAX_AGE_MINUTES,
    }),
    days: result,
  };
}
