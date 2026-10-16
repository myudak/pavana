import type { BBox } from '@pavana/shared';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { factorNumber } from '@/features/insights/insight-derive';
import { useSelectedLocation } from '@/features/location/location-context';
import { api } from '@/lib/api';
import { useInsights } from '@/lib/queries';
import {
  bucketHotspots,
  nearestHotspots,
  summarizeTrend,
  trendWindowEnd,
} from './fire-points';

/** Search radius around the selected location — same window as the insights factor. */
const RADIUS_KM = 300;
const PAD_DEG = RADIUS_KM / 111;

/**
 * Detections around the selected location from the same fixture/API source as
 * the insights factor (`/api/hotspots`, never hardcoded): the 5 nearest for
 * the list widget plus 6-hour buckets over the last 48h for the trend widget.
 * Refetches automatically when the location pill changes (keyed by lat/lon).
 */
export function useFirePoints() {
  const { location } = useSelectedLocation();
  const bbox: BBox = [
    location.lon - PAD_DEG,
    location.lat - PAD_DEG,
    location.lon + PAD_DEG,
    location.lat + PAD_DEG,
  ];
  const query = useQuery({
    queryKey: ['fire-points', location.lat, location.lon],
    queryFn: ({ signal }) => api.hotspots(bbox, { limit: 2000 }, signal),
  });
  const insights = useInsights();

  const factor = insights.data?.factors.find((f) => f.id === 'upwind_hotspots');
  const timeZone = insights.data?.location.timezone ?? 'Asia/Jakarta';

  return useMemo(() => {
    const list = query.data?.hotspots ?? [];
    const end = trendWindowEnd(list);
    const buckets = end === null ? [] : bucketHotspots(list, end);
    return {
      location,
      timeZone,
      query,
      hotspots: list,
      nearest: nearestHotspots(list, location, 5),
      buckets,
      summary: summarizeTrend(buckets),
      windowEnd: end,
      /** Server-side 300 km / 48h totals for the widget header. */
      total: factorNumber(factor, 'consideredCount'),
      radiusKm: factorNumber(factor, 'radiusKm') ?? RADIUS_KM,
      windowHours: factorNumber(factor, 'windowHours') ?? 48,
      isDemo: query.data?.state === 'demo',
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.data, factor, location.lat, location.lon, timeZone]);
}
