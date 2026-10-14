/**
 * Wind-aware upwind hotspot exposure — a FEATURE / INDICATOR, not a plume model.
 * See docs/modeling-methodology.md and PAVANA_HANDOFF §6.2.
 *
 *   S(x,t) = Σ_i FRP_i · exp(-d_i / λ) · max(0, ŵ_to · ĥ_i→x) · exp(-age_i / τ)
 *
 * Never present S as a probability ("72% chance smoke reaches you").
 * Mirrored in Python at ml/src/pavana_ml/features/upwind.py — keep both in sync
 * (shared vectors: fixtures/test-vectors/geo-wind.json).
 */
import { bearingToUnitVector, haversineKm, initialBearingDeg, type LatLon } from './geo';
import { windFromToFlowBearing } from './wind';

export interface UpwindHotspotInput extends LatLon {
  /** Fire radiative power (MW). `null` → `frpFallback` is used (documented choice). */
  frpMw: number | null;
  /** Age of the detection relative to the target time, hours (≥ 0). */
  ageHours: number;
}

export interface UpwindParams {
  /** Distance decay λ in km. Tune empirically. */
  lambdaKm: number;
  /** Recency decay τ in hours. */
  tauHours: number;
  /** Hotspots farther than this are ignored. */
  maxDistanceKm: number;
  /** Weight used when FRP is missing. */
  frpFallback: number;
}

export const DEFAULT_UPWIND_PARAMS: UpwindParams = {
  lambdaKm: 50,
  tauHours: 24,
  maxDistanceKm: 300,
  frpFallback: 1,
};

export interface UpwindResult {
  score: number;
  /** Hotspots that contributed > 0. */
  contributingCount: number;
  consideredCount: number;
}

/** max(0, cos angle) between the wind flow and the hotspot→target direction. */
function alignmentToward(
  windTo: { east: number; north: number },
  from: LatLon,
  to: LatLon,
): number {
  const dir = bearingToUnitVector(initialBearingDeg(from, to));
  return Math.max(0, windTo.east * dir.east + windTo.north * dir.north);
}

/** Hotspot exactly at the target has undefined direction; it is treated as fully aligned. */
export function upwindExposureScore(
  target: LatLon,
  windDirectionFromDeg: number,
  hotspots: readonly UpwindHotspotInput[],
  params: UpwindParams = DEFAULT_UPWIND_PARAMS,
): UpwindResult {
  const windTo = bearingToUnitVector(windFromToFlowBearing(windDirectionFromDeg));
  let score = 0;
  let contributingCount = 0;
  let consideredCount = 0;

  for (const h of hotspots) {
    const d = haversineKm(h, target);
    if (d > params.maxDistanceKm || h.ageHours < 0) continue;
    consideredCount++;
    const alignment = d < 1e-6 ? 1 : alignmentToward(windTo, h, target);
    if (alignment === 0) continue;
    const frp = h.frpMw ?? params.frpFallback;
    const contribution =
      frp * Math.exp(-d / params.lambdaKm) * alignment * Math.exp(-h.ageHours / params.tauHours);
    if (contribution > 0) {
      score += contribution;
      contributingCount++;
    }
  }

  return { score, contributingCount, consideredCount };
}
