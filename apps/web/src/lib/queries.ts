import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useSelectedLocation } from '@/features/location/location-context';

/** Query hooks keyed by selected location. Shared by Today, Map and Insights. */
export function useConditions() {
  const { location } = useSelectedLocation();
  return useQuery({
    queryKey: ['conditions', location.lat, location.lon],
    queryFn: ({ signal }) => api.conditions(location, signal),
  });
}

export function useForecast(hours = 24) {
  const { location } = useSelectedLocation();
  return useQuery({
    queryKey: ['forecast', location.lat, location.lon, hours],
    queryFn: ({ signal }) => api.forecast(location, hours, signal),
  });
}

export function useInsights() {
  const { location } = useSelectedLocation();
  return useQuery({
    queryKey: ['insights', location.lat, location.lon],
    queryFn: ({ signal }) => api.insights(location, signal),
  });
}

export function useExposure(hours = 24) {
  const { location } = useSelectedLocation();
  return useQuery({
    queryKey: ['exposure', location.lat, location.lon, hours],
    queryFn: ({ signal }) => api.exposure(location, hours, signal),
  });
}

/** Curated official links (BMKG, SiPongi, BPBD…) — location-independent. */
export function useOfficialLinks() {
  return useQuery({
    queryKey: ['official-links'],
    queryFn: ({ signal }) => api.officialLinks(signal),
  });
}

/** Experimental Pavana models (observed targets). Cached for 15 min; inputs refresh slowly. */
export function useHotspotRisk(enabled = true) {
  const { location } = useSelectedLocation();
  return useQuery({
    enabled,
    queryKey: ['model', 'hotspot-risk', location.lat, location.lon],
    queryFn: ({ signal }) => api.hotspotRisk(location, signal),
    staleTime: 15 * 60_000,
    refetchInterval: 15 * 60_000,
    refetchOnWindowFocus: true,
  });
}

export function useHaze() {
  const { location } = useSelectedLocation();
  return useQuery({
    queryKey: ['model', 'haze', location.lat, location.lon],
    queryFn: ({ signal }) => api.haze(location, signal),
    staleTime: 10 * 60_000,
    refetchInterval: 10 * 60_000,
    refetchOnWindowFocus: true,
  });
}

export function useModelEvaluation() {
  return useQuery({
    queryKey: ['model', 'evaluation'],
    queryFn: ({ signal }) => api.modelEvaluation(signal),
    staleTime: Infinity,
    refetchOnMount: 'always',
  });
}

export function usePm25Model() {
  const { location } = useSelectedLocation();
  return useQuery({
    queryKey: ['model', 'pm25', location.lat, location.lon],
    queryFn: ({ signal }) => api.pm25Model(location, signal),
    staleTime: 15 * 60_000,
    refetchInterval: 15 * 60_000,
    refetchOnWindowFocus: true,
  });
}
export function useWindModel() {
  const { location } = useSelectedLocation();
  return useQuery({
    queryKey: ['model', 'wind', location.lat, location.lon],
    queryFn: ({ signal }) => api.windModel(location, signal),
    staleTime: 10 * 60_000,
    refetchInterval: 10 * 60_000,
    refetchOnWindowFocus: true,
  });
}
