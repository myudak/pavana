/**
 * "Will the smoke reach me?" — per-hour smoke-exposure potential for a point.
 * Deterministic indicators only (PM2.5 forecast + wind-aware upwind hotspot score);
 * see `combineExposure` in @pavana/shared. NOT a dispersion model and NOT a probability.
 *
 * Hotspot persistence: detections from the look-back window are assumed to keep
 * burning and decay with age (τ in DEFAULT_UPWIND_PARAMS). No new detections are
 * invented for future hours.
 */
import {
  combineExposure,
  deriveDataState,
  exposureRank,
  pm25ExposureLevel,
  upwindExposureLevel,
  upwindExposureScore,
  type ExposureHour,
  type ExposureResponse,
  type LatLon,
} from '@pavana/shared';
import type { ProviderBundle } from '../providers/types';
import { MAX_AGE_MINUTES } from './conditions';
import { HOTSPOT_RADIUS_KM, HOTSPOT_WINDOW_HOURS } from './insights';

const DEG_PER_KM = 1 / 111;

export async function getExposure(
  p: ProviderBundle,
  point: LatLon,
  hours: number,
): Promise<ExposureResponse> {
  const now = p.now();
  const location = await p.locations.resolve(point);
  const query = { point: { lat: location.lat, lon: location.lon }, from: now, hours };
  const pad = HOTSPOT_RADIUS_KM * DEG_PER_KM;

  const [aq, wx, hotspots] = await Promise.all([
    p.airQuality.getHourly(query),
    p.weather.getHourly(query),
    p.hotspots.getHotspots({
      bbox: [point.lon - pad, point.lat - pad, point.lon + pad, point.lat + pad],
      from: new Date(now.getTime() - HOTSPOT_WINDOW_HOURS * 3_600_000),
      to: now,
      limit: 2000,
    }),
  ]);

  const wxByTime = new Map(wx.map((w) => [w.provenance.validAt, w]));
  // The exposure target is the requested point, so two places under the same
  // wind can differ by their position relative to the detections.
  const result: ExposureHour[] = aq.map((a) => {
    const validAt = a.provenance.validAt;
    const w = wxByTime.get(validAt);
    const windFrom = w?.windDirectionFromDeg ?? null;
    const t = Date.parse(validAt);
    const upwind =
      windFrom === null
        ? null
        : upwindExposureScore(
            point,
            windFrom,
            hotspots.map((h) => ({
              lat: h.lat,
              lon: h.lon,
              frpMw: h.frpMw,
              ageHours: (t - Date.parse(h.acquiredAt)) / 3_600_000,
            })),
          );
    const combined = combineExposure(
      pm25ExposureLevel(a.pm25UgM3),
      upwindExposureLevel(upwind?.score ?? null),
    );
    return {
      validAt,
      level: combined.level,
      driver: combined.driver,
      pm25UgM3: a.pm25UgM3,
      upwind: upwind && {
        score: Math.round(upwind.score * 100) / 100,
        contributingCount: upwind.contributingCount,
        consideredCount: upwind.consideredCount,
      },
      windFromDeg: windFrom,
      windSpeedMs: w?.windSpeedMs ?? null,
    };
  });

  const peak = result.reduce<ExposureHour | null>(
    (best, h) => (best === null || exposureRank(h.level) > exposureRank(best.level) ? h : best),
    null,
  );
  const firstElevated = result.find((h) => exposureRank(h.level) >= 2) ?? null;

  return {
    location,
    state: deriveDataState({
      isDemo: p.isDemo,
      hasValue: aq.some((a) => a.pm25UgM3 !== null),
      validAt: aq[0]?.provenance.validAt ?? null,
      now,
      maxAgeMinutes: MAX_AGE_MINUTES,
    }),
    method: 'deterministic_indicators',
    hours: result,
    summary: {
      peakLevel: peak?.level ?? 'unknown',
      peakAt: peak && peak.level !== 'unknown' ? peak.validAt : null,
      firstElevatedAt: firstElevated?.validAt ?? null,
      hotspotsConsidered: hotspots.length,
      radiusKm: HOTSPOT_RADIUS_KM,
      windowHours: HOTSPOT_WINDOW_HOURS,
    },
    provenance: [
      ...aq.slice(0, 1).map((a) => a.provenance),
      ...wx.slice(0, 1).map((w) => w.provenance),
      ...hotspots.slice(0, 1).map((h) => h.provenance),
    ],
  };
}
