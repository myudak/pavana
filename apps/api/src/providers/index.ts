import type { AppConfig } from '../config/env';
import { NotImplementedError } from '../domain/errors';
import { createFirmsProvider } from './firms';
import { createFixtureProviders } from './fixture';
import { openMeteoAirQuality, openMeteoWeather } from './open-meteo';
import type { ProviderBundle } from './types';

/** Choose providers once at startup. Demo mode is the default and needs no keys. */
export function createProviders(config: AppConfig): ProviderBundle {
  if (config.PAVANA_MODE === 'demo') {
    const fx = createFixtureProviders();
    return {
      mode: 'demo',
      isDemo: true,
      now: () => fx.referenceTime,
      locations: fx.locations,
      airQuality: fx.airQuality,
      weather: fx.weather,
      hotspots: fx.hotspots,
    };
  }

  // Live mode: adapters are scaffolded and throw NotImplementedError (HTTP 501) until built.
  return {
    mode: 'live',
    isDemo: false,
    now: () => new Date(),
    locations: {
      id: 'live-locations',
      search: async () => {
        throw new NotImplementedError('Live location search');
      },
      resolve: async () => {
        throw new NotImplementedError('Live location resolve');
      },
    },
    airQuality: openMeteoAirQuality,
    weather: openMeteoWeather,
    hotspots: createFirmsProvider(config.FIRMS_MAP_KEY),
  };
}

export type { ProviderBundle } from './types';
