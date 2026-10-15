import { useQuery } from '@tanstack/react-query';
import { type BBox, type LatLon } from '@pavana/shared';
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
export function useOfficialLinks() {
  const { mode, ready } = useSettings();
  return useQuery({
    queryKey: ['official-links', mode],
    enabled: ready,
    queryFn: ({ signal }) =>
      mode === 'demo' ? demoClient.officialLinks() : apiClient.officialLinks(signal),
  });
}
