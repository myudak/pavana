import type { z } from 'zod';
import {
  ApiErrorSchema,
  ConditionsResponseSchema,
  ForecastResponseSchema,
  ExposureResponseSchema,
  WindFieldSchema,
  SourcesResponseSchema,
  WeatherReferenceResponseSchema,
  HotspotsResponseSchema,
  InsightsResponseSchema,
  LocationSearchResponseSchema,
  OfficialLinksResponseSchema,
  type LatLon,
  type BBox,
} from '@pavana/shared';

/** Only Pavana's API is contacted. Upstream provider credentials stay on its server. */
export function createApiClient(base: string) {
  async function get<S extends z.ZodType>(
    path: string,
    params: Record<string, string | number>,
    schema: S,
    signal?: AbortSignal,
  ): Promise<z.output<S>> {
    const url = new URL(path, base);
    for (const [key, value] of Object.entries(params)) url.searchParams.set(key, String(value));
    const controller = new AbortController();
    const abort = () => controller.abort();
    if (signal?.aborted) controller.abort();
    signal?.addEventListener('abort', abort);
    const timer = setTimeout(abort, 15000);
    try {
      const response = await fetch(url.toString(), { signal: controller.signal });
      const body: unknown = await response.json();
      if (!response.ok) {
        const error = ApiErrorSchema.safeParse(body);
        throw new Error(error.success ? error.data.error.code : 'http_error');
      }
      return schema.parse(body);
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener('abort', abort);
    }
  }
  return {
    conditions: (point: LatLon, signal?: AbortSignal) =>
      get('/api/conditions', { ...point }, ConditionsResponseSchema, signal),
    forecast: (point: LatLon, signal?: AbortSignal) =>
      get('/api/forecast', { ...point, hours: 48 }, ForecastResponseSchema, signal),
    exposure: (point: LatLon, signal?: AbortSignal) =>
      get('/api/exposure', { ...point, hours: 24 }, ExposureResponseSchema, signal),
    windField: (bbox: BBox, signal?: AbortSignal) =>
      get('/api/wind-field', { bbox: bbox.join(',') }, WindFieldSchema, signal),
    sources: (signal?: AbortSignal) => get('/api/sources', {}, SourcesResponseSchema, signal),
    weatherReference: (point: LatLon, signal?: AbortSignal) =>
      get('/api/weather-reference', { ...point }, WeatherReferenceResponseSchema, signal),
    insights: (point: LatLon, signal?: AbortSignal) =>
      get('/api/insights', { ...point }, InsightsResponseSchema, signal),
    hotspots: (bbox: BBox, signal?: AbortSignal) =>
      get('/api/hotspots', { bbox: bbox.join(','), limit: 1500 }, HotspotsResponseSchema, signal),
    locations: (q: string, signal?: AbortSignal) =>
      get('/api/locations/search', { q }, LocationSearchResponseSchema, signal),
    officialLinks: (signal?: AbortSignal) =>
      get('/api/official-links', {}, OfficialLinksResponseSchema, signal),
  };
}

const rawBase = process.env.EXPO_PUBLIC_API_BASE_URL?.trim() ?? '';
export const apiConfigured = /^https?:\/\//.test(rawBase);
export const apiClient = createApiClient(apiConfigured ? rawBase : 'http://localhost:8787');
