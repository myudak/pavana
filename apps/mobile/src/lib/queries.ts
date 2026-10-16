import { useQuery } from '@tanstack/react-query';
import { KALIMANTAN_BBOX, type BBox, type LatLon } from '@pavana/shared';
import { useSettings } from './settings';
import { apiClient } from './api';
import { demoClient } from './demo';

export function boundsAround(point: LatLon): BBox {
  return [
    Math.max(-180, point.lon - 2.7),
    Math.max(-90, point.lat - 2.7),
    Math.min(180, point.lon + 2.7),
    Math.min(90, point.lat + 2.7),
  ];
}
export function useConditions() {
  const { location, mode, ready } = useSettings();
  return useQuery({
    queryKey: ['conditions', mode, location.lat, location.lon],
    enabled: ready,
    queryFn: ({ signal }) =>
      mode === 'demo' ? demoClient.conditions(location) : apiClient.conditions(location, signal),
  });
}
export function useForecast() {
  const { location, mode, ready } = useSettings();
  return useQuery({
    queryKey: ['forecast', mode, location.lat, location.lon],
    enabled: ready,
    queryFn: ({ signal }) =>
      mode === 'demo' ? demoClient.forecast(location) : apiClient.forecast(location, signal),
  });
}
export function useExposure() {
  const { location, mode, ready } = useSettings();
  return useQuery({
    queryKey: ['exposure', mode, location.lat, location.lon],
    enabled: ready,
    queryFn: ({ signal }) =>
      mode === 'demo' ? demoClient.exposure(location) : apiClient.exposure(location, signal),
  });
}
export function useInsights() {
  const { location, mode, ready } = useSettings();
  return useQuery({
    queryKey: ['insights', mode, location.lat, location.lon],
    enabled: ready,
    queryFn: ({ signal }) =>
      mode === 'demo' ? demoClient.insights(location) : apiClient.insights(location, signal),
  });
}
export function useHotspots() {
  const { location, mode, ready } = useSettings();
  const bbox = boundsAround(location);
  return useQuery({
    queryKey: ['hotspots', mode, ...bbox],
    enabled: ready,
    queryFn: ({ signal }) =>
      mode === 'demo' ? demoClient.hotspots(bbox) : apiClient.hotspots(bbox, signal),
  });
}
export function useLocationSearch(query: string) {
  const { mode, ready } = useSettings();
  return useQuery({
    queryKey: ['locations', mode, query],
    enabled: ready,
    queryFn: ({ signal }) =>
      mode === 'demo' ? demoClient.locations(query) : apiClient.locations(query, signal),
  });
}
export function useRegionalHotspots() {
  const { mode, ready } = useSettings();
  return useQuery({
    queryKey: ['hotspots-regional', mode],
    enabled: ready,
    queryFn: ({ signal }) =>
      mode === 'demo'
        ? demoClient.hotspots(KALIMANTAN_BBOX)
        : apiClient.hotspots(KALIMANTAN_BBOX, signal),
  });
}
export function useWindField() {
  const { mode, ready } = useSettings();
  return useQuery({
    queryKey: ['wind-field', mode],
    enabled: ready,
    queryFn: ({ signal }) =>
      mode === 'demo'
        ? demoClient.windField(KALIMANTAN_BBOX)
        : apiClient.windField(KALIMANTAN_BBOX, signal),
  });
}
export function useOfficialLinks() {
  const { mode, ready } = useSettings();
  return useQuery({
    queryKey: ['official-links', mode],
    enabled: ready,
    queryFn: ({ signal }) =>
      mode === 'demo' ? demoClient.officialLinks() : apiClient.officialLinks(signal),
  });
}
export function useSources() {
  const { mode, ready } = useSettings();
  return useQuery({
    queryKey: ['sources', mode],
    enabled: ready,
    queryFn: ({ signal }) => (mode === 'demo' ? demoClient.sources() : apiClient.sources(signal)),
  });
}
export function useWeatherReference() {
  const { location, mode, ready } = useSettings();
  return useQuery({
    queryKey: ['weather-reference', mode, location.lat, location.lon],
    enabled: ready && mode === 'api',
    queryFn: ({ signal }) => apiClient.weatherReference(location, signal),
  });
}
