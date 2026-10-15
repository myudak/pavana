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

/** Curated official links (BMKG, SiPongi, BPBD…) — location-independent. */
export function useOfficialLinks() {
  return useQuery({
    queryKey: ['official-links'],
    queryFn: ({ signal }) => api.officialLinks(signal),
  });
}
