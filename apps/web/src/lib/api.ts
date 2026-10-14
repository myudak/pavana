/**
 * Typed API client. Every response is validated against the shared zod schema, so a
 * contract drift fails loudly instead of rendering wrong numbers.
 * The browser never talks to upstream providers or holds provider keys.
 */
import {
  ApiErrorSchema,
  ConditionsResponseSchema,
  ForecastResponseSchema,
  HotspotsResponseSchema,
  InsightsResponseSchema,
  LocationSearchResponseSchema,
  OfficialLinksResponseSchema,
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

async function getJson<S extends z.ZodType>(
  path: string,
  params: Record<string, string | number>,
  schema: S,
  signal?: AbortSignal,
): Promise<z.output<S>> {
  const qs = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)]));
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
  hotspots: (bbox: BBox, signal?: AbortSignal) =>
    getJson('/api/hotspots', { bbox: bbox.join(',') }, HotspotsResponseSchema, signal),
  insights: (p: LatLon, signal?: AbortSignal) =>
    getJson('/api/insights', { lat: p.lat, lon: p.lon }, InsightsResponseSchema, signal),
  searchLocations: (q: string, signal?: AbortSignal) =>
    getJson('/api/locations/search', { q }, LocationSearchResponseSchema, signal),
  officialLinks: (signal?: AbortSignal) =>
    getJson('/api/official-links', {}, OfficialLinksResponseSchema, signal),
};
