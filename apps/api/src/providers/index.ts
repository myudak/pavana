import type { AppConfig } from '../config/env';
import { TtlCache } from '../lib/cache';
import type { FetchLike } from '../lib/http';
import { createBmkg } from './bmkg';
import { createFirms } from './firms';
import { createFixtureProviders } from './fixture';
import { createOpenAq } from './openaq';
import { createOpenMeteo } from './open-meteo';
import { createRegionLocations } from './regions';
import type { ProviderBundle } from './types';

/** Fixture scenario: synthetic Kubu Raya, "now" pinned to its reference time. Needs no keys. */
export function createDemoBundle(): ProviderBundle {
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

export interface LiveDeps {
  /** Injected in tests so no network is used. */
  fetch?: FetchLike;
  now?: () => Date;
}

/** Real upstream data: Open-Meteo (+CAMS), NASA FIRMS, OpenAQ, BMKG. */
export function createLiveBundle(config: AppConfig, deps: LiveDeps = {}): ProviderBundle {
  const cache = new TtlCache(1000);
  const now = deps.now ?? (() => new Date());
  const om = createOpenMeteo({ fetch: deps.fetch, cache, now });
  const firms = createFirms(config.FIRMS_MAP_KEY, { fetch: deps.fetch, cache, now });
  const openaq = createOpenAq(config.OPENAQ_API_KEY, { fetch: deps.fetch, cache });
  const bmkg = createBmkg({ fetch: deps.fetch, cache, now });
  return {
    mode: 'live',
    isDemo: false,
    now,
    locations: createRegionLocations(om.searchPlaces),
    airQuality: om.airQuality,
    weather: om.weather,
    hotspots: firms.hotspots,
    windField: om.windField,
    stations: openaq.stations,
    weatherReference: bmkg.weatherReference,
    sources: [...om.sources, firms.source, openaq.source, bmkg.source],
  };
}

/** The primary bundle for `PAVANA_MODE`. The demo bundle is always available via `?demo=1`. */
export function createProviders(config: AppConfig, deps: LiveDeps = {}): ProviderBundle {
  return config.PAVANA_MODE === 'demo' ? createDemoBundle() : createLiveBundle(config, deps);
}

export type { ProviderBundle } from './types';
