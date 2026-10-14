/**
 * Fixture providers — serve the synthetic Kubu Raya scenario. Fully working, no keys.
 * Data only exists near the scenario location; elsewhere they return nothing, so the
 * API reports `insufficient` instead of pretending the demo data applies everywhere.
 */
import { haversineKm, type LatLon, type Location } from '@pavana/shared';
import type {
  AirQualityProvider,
  HotspotProvider,
  LocationProvider,
  SeriesQuery,
  WeatherProvider,
} from '../types';
import { kubuRayaScenario, type Scenario } from './scenario';

export const FIXTURE_PROVIDER_ID = 'pavana-fixture';

/** Demo coverage radius around the scenario location. */
export const FIXTURE_COVERAGE_KM = 75;

export interface FixtureProviders {
  referenceTime: Date;
  airQuality: AirQualityProvider;
  weather: WeatherProvider;
  hotspots: HotspotProvider;
  locations: LocationProvider;
}

export function createFixtureProviders(scenario: Scenario = kubuRayaScenario): FixtureProviders {
  const id = FIXTURE_PROVIDER_ID;
  const covers = (p: LatLon) => haversineKm(p, scenario.location) <= FIXTURE_COVERAGE_KM;

  const hoursIn = ({ point, from, hours }: SeriesQuery) => {
    if (!covers(point)) return [];
    const start = from.getTime();
    const end = start + hours * 3_600_000;
    return scenario.hours.filter((h) => {
      const t = Date.parse(h.validAt);
      return t >= start && t <= end;
    });
  };

  return {
    referenceTime: new Date(scenario.meta.referenceTime),

    airQuality: {
      id,
      getHourly: async (q) => hoursIn(q).map((h) => h.airQuality),
    },

    weather: {
      id,
      getHourly: async (q) => hoursIn(q).map((h) => h.weather),
    },

    hotspots: {
      id,
      getHotspots: async ({ bbox, from, to, limit }) => {
        const [minLon, minLat, maxLon, maxLat] = bbox;
        return scenario.hotspots
          .filter((h) => h.lon >= minLon && h.lon <= maxLon && h.lat >= minLat && h.lat <= maxLat)
          .filter((h) => !from || Date.parse(h.acquiredAt) >= from.getTime())
          .filter((h) => !to || Date.parse(h.acquiredAt) <= to.getTime())
          .slice(0, limit);
      },
    },

    locations: {
      id,
      search: async (q) => {
        const needle = q.trim().toLowerCase();
        const loc = scenario.location;
        const haystack = [loc.name, loc.admin1, loc.admin2 ?? '', 'kubu raya', 'kalbar']
          .join(' ')
          .toLowerCase();
        return !needle || haystack.includes(needle) ? [loc] : [];
      },
      resolve: async (point): Promise<Location> =>
        covers(point)
          ? scenario.location
          : {
              id: `pt:${point.lat.toFixed(3)},${point.lon.toFixed(3)}`,
              name: 'Lokasi dipilih',
              admin1: '—',
              country: 'ID',
              lat: point.lat,
              lon: point.lon,
              timezone: 'Asia/Jakarta',
            },
    },
  };
}
