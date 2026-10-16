/**
 * Deterministic, explainable factors — NOT a machine-learning model.
 * When a trained + evaluated model exists (see ml/), add it behind `model.method = 'ml_model'`
 * and only then surface attributions/intervals in the UI.
 */
import {
  bearingToCompass16,
  deriveDataState,
  upwindExposureScore,
  windFromToFlowBearing,
  type Factor,
  type InsightsResponse,
  type LatLon,
} from '@pavana/shared';
import type { ProviderBundle } from '../providers/types';
import { MAX_AGE_MINUTES } from './conditions';
import { pm25Trend } from './trend';

const HORIZON_HOURS = 24;
/** Hotspot look-back window and search radius for the upwind indicator. */
export const HOTSPOT_WINDOW_HOURS = 48;
export const HOTSPOT_RADIUS_KM = 300;
const DEG_PER_KM = 1 / 111;

export async function getInsights(p: ProviderBundle, point: LatLon): Promise<InsightsResponse> {
  const now = p.now();
  const location = await p.locations.resolve(point);
  const target = { lat: location.lat, lon: location.lon };
  const query = { point: target, from: now, hours: HORIZON_HOURS };

  const pad = HOTSPOT_RADIUS_KM * DEG_PER_KM;
  const [aq, wx, fetchedHotspots] = await Promise.all([
    p.airQuality.getHourly(query),
    p.weather.getHourly(query),
    p.hotspots
      .getHotspots({
        bbox: [target.lon - pad, target.lat - pad, target.lon + pad, target.lat + pad],
        from: new Date(now.getTime() - HOTSPOT_WINDOW_HOURS * 3_600_000),
        to: now,
        limit: 2000,
      })
      // Unavailable hotspot data → the upwind factor is `unknown`, not "no fires".
      .catch(() => null),
  ]);
  const hotspots = fetchedHotspots ?? [];

  const factors: Factor[] = [];

  // 1. PM2.5 trend from the (forecast) series.
  const current = aq[0]?.pm25UgM3 ?? null;
  const upcoming = aq.slice(1);
  const peak = upcoming.reduce<(typeof aq)[number] | null>(
    (best, x) =>
      x.pm25UgM3 !== null && (best?.pm25UgM3 == null || x.pm25UgM3 > best.pm25UgM3) ? x : best,
    null,
  );
  const trend = pm25Trend(
    current,
    upcoming.map((x) => x.pm25UgM3),
  );
  factors.push({
    id: 'pm25_trend',
    signal: trend === 'stable' ? 'neutral' : trend,
    metrics: {
      currentUgM3: current,
      peakUgM3: peak?.pm25UgM3 ?? null,
      peakAt: peak?.provenance.validAt ?? null,
      horizonHours: HORIZON_HOURS,
    },
    provenance: aq
      .slice(0, 1)
      .concat(peak ? [peak] : [])
      .map((x) => x.provenance),
  });

  // 2. Wind now (meteorological FROM + derived flow TO).
  const wind = wx[0];
  const windFrom = wind?.windDirectionFromDeg ?? null;
  factors.push({
    id: 'wind',
    signal: windFrom === null ? 'unknown' : 'neutral',
    metrics: {
      speedMs: wind?.windSpeedMs ?? null,
      directionFromDeg: windFrom,
      compassFrom: windFrom === null ? null : bearingToCompass16(windFrom),
      flowToDeg: windFrom === null ? null : windFromToFlowBearing(windFrom),
    },
    provenance: wind ? [wind.provenance] : [],
  });

  // 3. Upwind hotspot indicator. No detections ⇒ `unknown`, never "no fire".
  if (windFrom === null || fetchedHotspots === null) {
    factors.push({
      id: 'upwind_hotspots',
      signal: 'unknown',
      metrics: {
        score: null,
        contributingCount: null,
        consideredCount: fetchedHotspots === null ? null : hotspots.length,
      },
      provenance: [],
    });
  } else {
    const r = upwindExposureScore(
      target,
      windFrom,
      hotspots.map((h) => ({
        lat: h.lat,
        lon: h.lon,
        frpMw: h.frpMw,
        ageHours: (now.getTime() - Date.parse(h.acquiredAt)) / 3_600_000,
      })),
    );
    factors.push({
      id: 'upwind_hotspots',
      signal:
        r.consideredCount === 0 ? 'unknown' : r.contributingCount > 0 ? 'worsening' : 'neutral',
      metrics: {
        score: Math.round(r.score * 100) / 100,
        contributingCount: r.contributingCount,
        consideredCount: r.consideredCount,
        windowHours: HOTSPOT_WINDOW_HOURS,
        radiusKm: HOTSPOT_RADIUS_KM,
      },
      provenance: hotspots
        .slice(0, 1)
        .map((h) => h.provenance)
        .concat(wind ? [wind.provenance] : []),
    });
  }

  return {
    location,
    state: deriveDataState({
      isDemo: p.isDemo,
      hasValue: current !== null,
      validAt: aq[0]?.provenance.validAt ?? null,
      now,
      maxAgeMinutes: MAX_AGE_MINUTES,
    }),
    model: { method: 'deterministic_indicators', modelVersion: null, evaluated: false },
    factors,
  };
}
