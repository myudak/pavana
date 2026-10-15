/**
 * Typed API client. Every response is validated against the shared zod schema, so a
 * contract drift fails loudly instead of rendering wrong numbers.
 * The browser never talks to upstream providers or holds provider keys.
 */
import {
  ApiErrorSchema,
  ConditionsResponseSchema,
  ExposureResponseSchema,
  ForecastResponseSchema,
  HotspotsResponseSchema,
  InsightsResponseSchema,
  LocationSearchResponseSchema,
  OfficialLinksResponseSchema,
  SourcesResponseSchema,
  WeatherReferenceResponseSchema,
  WindFieldSchema,
  type BBox,
  type LatLon,
} from '@pavana/shared';
import type { z } from 'zod';

export class ApiRequestError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

const BASE = import.meta.env.VITE_API_BASE_URL ?? '';

/** Set by the demo toggle (lib/demo-mode.tsx): adds `demo=1` to every request. */
let demoMode = false;
export function setApiDemo(on: boolean) {
  demoMode = on;
}

async function getJson<S extends z.ZodType>(
  path: string,
  params: Record<string, string | number>,
  schema: S,
  signal?: AbortSignal,
): Promise<z.output<S>> {
  const qs = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)]));
  if (demoMode) qs.set('demo', '1');
  const res = await fetch(`${BASE}${path}?${qs}`, { signal });
  const body: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const err = ApiErrorSchema.safeParse(body);
    throw new ApiRequestError(
      res.status,
      err.success ? err.data.error.code : 'http_error',
      err.success ? err.data.error.message : `HTTP ${res.status}`,
    );
  }
  return schema.parse(body);
}

export const api = {
  conditions: (p: LatLon, signal?: AbortSignal) =>
    getJson('/api/conditions', { lat: p.lat, lon: p.lon }, ConditionsResponseSchema, signal),
  forecast: (p: LatLon, hours = 24, signal?: AbortSignal) =>
    getJson('/api/forecast', { lat: p.lat, lon: p.lon, hours }, ForecastResponseSchema, signal),
  hotspots: (
    bbox: BBox,
    opts?: { limit?: number; from?: string; to?: string },
    signal?: AbortSignal,
  ) =>
    getJson(
      '/api/hotspots',
      {
        bbox: bbox.join(','),
        ...(opts?.limit !== undefined ? { limit: opts.limit } : {}),
        ...(opts?.from !== undefined ? { from: opts.from } : {}),
        ...(opts?.to !== undefined ? { to: opts.to } : {}),
      },
      HotspotsResponseSchema,
      signal,
    ),
  windField: (bbox: BBox, signal?: AbortSignal) =>
    getJson('/api/wind-field', { bbox: bbox.join(',') }, WindFieldSchema, signal),
  exposure: (p: LatLon, hours = 24, signal?: AbortSignal) =>
    getJson('/api/exposure', { lat: p.lat, lon: p.lon, hours }, ExposureResponseSchema, signal),
  insights: (p: LatLon, signal?: AbortSignal) =>
    getJson('/api/insights', { lat: p.lat, lon: p.lon }, InsightsResponseSchema, signal),
  searchLocations: (q: string, signal?: AbortSignal) =>
    getJson('/api/locations/search', { q }, LocationSearchResponseSchema, signal),
  officialLinks: (signal?: AbortSignal) =>
    getJson('/api/official-links', {}, OfficialLinksResponseSchema, signal),
  sources: (signal?: AbortSignal) => getJson('/api/sources', {}, SourcesResponseSchema, signal),
  weatherReference: (p: LatLon, signal?: AbortSignal) =>
    getJson(
      '/api/weather-reference',
      { lat: p.lat, lon: p.lon },
      WeatherReferenceResponseSchema,
      signal,
    ),
};
