import { normalizeDeg, windFromToFlowBearing } from '@pavana/shared';
import type { Copy } from '@/lib/i18n';

/** 8-point Indonesian compass name for a bearing (degrees clockwise from north). */
export function compassId(bearingDeg: number, t: Copy): string {
  const idx = Math.round(normalizeDeg(bearingDeg) / 45) % 8;
  return t.compass[idx]!;
}

/** m/s → km/jam, the unit people know from weather apps. */
export const msToKmh = (ms: number) => ms * 3.6;

/**
 * Wind from the meteorological FROM direction: where it comes from, and where
 * it blows to (flow bearing, for arrows). Never draw arrows from the FROM angle.
 */
export function windSummary(fromDeg: number, t: Copy) {
  const toDeg = windFromToFlowBearing(fromDeg);
  return { fromName: compassId(fromDeg, t), toName: compassId(toDeg, t), toDeg };
}
