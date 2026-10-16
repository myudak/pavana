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
  Provenance,
  StationReading,
  WeatherPoint,
  WeatherReferenceHour,
  WindField,
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

export interface WindFieldProvider {
  readonly id: string;
  /** Regular grid (row-major, north row first) at the hour containing `at`. */
  getField(bbox: BBox, cols: number, rows: number, at: Date): Promise<WindField>;
}

export interface StationProvider {
  readonly id: string;
  /** Nearest fresh station reading, or null when none is close/fresh enough. */
  nearest(point: LatLon, now: Date): Promise<StationReading | null>;
}

export interface WeatherReferenceProvider {
  readonly id: string;
  /** Independent comparison forecast near the point, or null outside coverage. */
  near(
    point: LatLon,
    now: Date,
  ): Promise<{
    place: string;
    distanceKm: number;
    hours: WeatherReferenceHour[];
    provenance: Provenance;
  } | null>;
}

/** One upstream source as listed by `/api/sources`. `check` must be cheap and cached. */
export interface SourceDescriptor {
  id: string;
  name: string;
  use: string;
  attribution: string;
  url: string;
  configured: boolean;
  check(): Promise<void>;
}

/** Everything a request handler needs. The app holds a primary bundle plus the demo one. */
export interface ProviderBundle {
  mode: 'demo' | 'live';
  isDemo: boolean;
  /** "Now" for this bundle. Demo mode pins it to the fixture reference time. */
  now(): Date;
  locations: LocationProvider;
  airQuality: AirQualityProvider;
  weather: WeatherProvider;
  hotspots: HotspotProvider;
  /** Gridded wind for streamlines/trails. Absent → demo synthetic field (demo mode only). */
  windField?: WindFieldProvider;
  /** Ground stations (OpenAQ). Optional overlay. */
  stations?: StationProvider;
  /** Comparison forecast (BMKG). Optional. */
  weatherReference?: WeatherReferenceProvider;
  /** Upstream sources for `/api/sources`. */
  sources?: SourceDescriptor[];
}
