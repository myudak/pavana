import { haversineKm, initialBearingDeg, type Hotspot } from '@pavana/shared';

/** A hotspot detection ranked against the selected location. */
export interface RankedHotspot {
  hotspot: Hotspot;
  /** Great-circle distance from the selected location, km. */
  distanceKm: number;
  /** Bearing from the selected location to the detection, degrees [0, 360). */
  bearingDeg: number;
}

/**
 * Closest detections first. Distance is computed (haversine), never stored, so
 * the order follows the selected location.
 */
export function nearestHotspots(
  hotspots: readonly Hotspot[],
  center: { lat: number; lon: number },
  limit = 5,
): RankedHotspot[] {
  return hotspots
    .map((hotspot) => ({
      hotspot,
      distanceKm: haversineKm(center, { lat: hotspot.lat, lon: hotspot.lon }),
      bearingDeg: initialBearingDeg(center, { lat: hotspot.lat, lon: hotspot.lon }),
    }))
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, limit);
}

/** Trend buckets: 8 bars of 6 hours covering the 48 hours before `endMs`. */
export const TREND_BUCKETS = 8;
export const BUCKET_HOURS = 6;
export const BUCKET_MS = BUCKET_HOURS * 3_600_000;

/**
 * Anchor for the 48h window: the newest detection time. The fixture carries a
 * fixed historical window, so anchoring on live-relative "now" would empty it;
 * live data is recent, so its newest detection is ~now anyway.
 */
export function trendWindowEnd(hotspots: readonly Hotspot[]): number | null {
  let end: number | null = null;
  for (const h of hotspots) {
    const t = Date.parse(h.acquiredAt);
    if (Number.isFinite(t) && (end === null || t > end)) end = t;
  }
  return end;
}

/** Counts per 6h bucket, oldest first. Detections outside the window are ignored. */
export function bucketHotspots(hotspots: readonly Hotspot[], endMs: number): number[] {
  const buckets = Array<number>(TREND_BUCKETS).fill(0);
  const startMs = endMs - TREND_BUCKETS * BUCKET_MS;
  for (const h of hotspots) {
    const t = Date.parse(h.acquiredAt);
    if (!Number.isFinite(t) || t < startMs || t > endMs) continue;
    const i = Math.min(TREND_BUCKETS - 1, Math.floor((t - startMs) / BUCKET_MS));
    buckets[i]! += 1;
  }
  return buckets;
}

export type TrendDirection = 'up' | 'down' | 'flat';

export interface TrendSummary {
  total: number;
  peakCount: number;
  peakIndex: number;
  last24: number;
  prev24: number;
  /** Percent change of the last 24h vs the previous 24h; null when the base is 0. */
  changePct: number | null;
  direction: TrendDirection;
}

/** Total, peak bucket, and last-24h vs previous-24h change. No values invented. */
export function summarizeTrend(buckets: readonly number[]): TrendSummary {
  const total = buckets.reduce((a, b) => a + b, 0);
  let peakIndex = 0;
  buckets.forEach((c, i) => {
    if (c > buckets[peakIndex]!) peakIndex = i;
  });
  const prev24 = buckets.slice(0, 4).reduce((a, b) => a + b, 0);
  const last24 = buckets.slice(4).reduce((a, b) => a + b, 0);
  if (prev24 === 0) {
    return {
      total,
      peakCount: buckets[peakIndex] ?? 0,
      peakIndex,
      last24,
      prev24,
      changePct: null,
      direction: last24 > 0 ? 'up' : 'flat',
    };
  }
  const changePct = Math.round(((last24 - prev24) / prev24) * 100);
  return {
    total,
    peakCount: buckets[peakIndex] ?? 0,
    peakIndex,
    last24,
    prev24,
    changePct,
    direction: changePct > 0 ? 'up' : changePct < 0 ? 'down' : 'flat',
  };
}
