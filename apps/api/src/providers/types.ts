/**
 * Provider interfaces. Every upstream (fixture, Open-Meteo, NASA FIRMS, OpenAQ, BMKG, …)
 * is an adapter that normalizes into shared schemas at this boundary:
 * UTC ISO timestamps, m/s, meteorological degrees, µg/m³, and full `provenance`.
 *
 * Adding a provider: implement the interface in `providers/<name>/`, register it in
 * `providers/index.ts`, add tests, and document it in docs/data-sources.md.
 */
import type {
  AirQualityPoint,
  BBox,
  Hotspot,
  LatLon,
  Location,
  WeatherPoint,
} from '@pavana/shared';

export interface SeriesQuery {
  point: LatLon;
  /** Start of the series (inclusive). */
  from: Date;
  /** Number of hourly steps after `from` (series has hours + 1 entries max). */
  hours: number;
}

export interface AirQualityProvider {
  readonly id: string;
  /** Hourly PM2.5, sorted by validAt. Missing hours are omitted or null — never 0. */
  getHourly(query: SeriesQuery): Promise<AirQualityPoint[]>;
}

export interface WeatherProvider {
  readonly id: string;
  /** Hourly weather, sorted by validAt. Wind direction in meteorological "from" convention. */
  getHourly(query: SeriesQuery): Promise<WeatherPoint[]>;
}

export interface HotspotQuery {
  bbox: BBox;
  from?: Date;
  to?: Date;
  limit: number;
}

export interface HotspotProvider {
  readonly id: string;
  getHotspots(query: HotspotQuery): Promise<Hotspot[]>;
}

export interface LocationProvider {
  readonly id: string;
  search(q: string): Promise<Location[]>;
  /** Best named location for a coordinate. */
  resolve(point: LatLon): Promise<Location>;
}

/** Everything a request handler needs, chosen once at startup by `PAVANA_MODE`. */
export interface ProviderBundle {
  mode: 'demo' | 'live';
  isDemo: boolean;
  /** "Now" for this bundle. Demo mode pins it to the fixture reference time. */
  now(): Date;
  locations: LocationProvider;
  airQuality: AirQualityProvider;
  weather: WeatherProvider;
  hotspots: HotspotProvider;
}
