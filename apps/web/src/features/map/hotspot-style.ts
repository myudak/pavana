import type { Hotspot } from '@pavana/shared';
import type { ExpressionSpecification } from 'maplibre-gl';
import { cssVar } from '@/lib/aq';

/** Detection-age class upper bounds in hours: <6 h, 6–24 h, 24–48 h, then older. */
export const AGE_CLASS_HOURS = [6, 24, 48] as const;
export type AgeClass = 0 | 1 | 2 | 3;

export function ageClass(ageHours: number): AgeClass {
  const i = AGE_CLASS_HOURS.findIndex((h) => ageHours < h);
  return (i === -1 ? 3 : i) as AgeClass;
}

/**
 * Reference "now" for detection age: the latest provenance fetch time. Live data
 * is fetched just now; demo fixtures carry the pinned scenario reference time, so
 * ages stay consistent with the rest of the demo. Falls back to the clock.
 */
export function hotspotReferenceMs(hotspots: Hotspot[], fallback = Date.now()): number {
  let ref = -Infinity;
  for (const h of hotspots) {
    const t = Date.parse(h.provenance.fetchedAt);
    if (Number.isFinite(t) && t > ref) ref = t;
  }
  return Number.isFinite(ref) ? ref : fallback;
}

/** Hours between acquisition and the reference time (never negative). */
export function hotspotAgeHours(acquiredAt: string, refMs: number): number | null {
  const t = Date.parse(acquiredAt);
  if (!Number.isFinite(t)) return null;
  return Math.max(0, (refMs - t) / 3_600_000);
}

/** Theme colors for map overlays, read from brand tokens at style load. */
export interface MapPalette {
  age: [string, string, string, string];
  stroke: string;
  heat: [string, string, string, string];
  location: string;
  windA: string;
  windB: string;
  plumeA: string;
  plumeB: string;
}

export function readMapPalette(dark: boolean): MapPalette {
  const v = (name: string, light: string, darkFallback: string) =>
    cssVar(name) || (dark ? darkFallback : light);
  return {
    age: [
      v('--pv-fire-age-0', '#dc2626', '#ff4b3e'),
      v('--pv-fire-age-1', '#f97316', '#ff8c42'),
      v('--pv-fire-age-2', '#f59e0b', '#ffc857'),
      v('--pv-fire-age-3', '#a1806b', '#b39a8c'),
    ],
    stroke: v('--pv-fire-stroke', '#ffffff', '#140f1c'),
    heat: [
      v('--pv-fire-heat-1', '#fed7aa', '#7c2d12'),
      v('--pv-fire-heat-2', '#fdba74', '#ea580c'),
      v('--pv-fire-heat-3', '#f97316', '#fb923c'),
      v('--pv-fire-heat-4', '#dc2626', '#fde68a'),
    ],
    location: v('--pv-map-location', '#2563eb', '#818cf8'),
    windA: v('--pv-map-wind-a', '#6d28d9', '#b7a6ff'),
    windB: v('--pv-map-wind-b', '#be185d', '#f08cc8'),
    plumeA: v('--pv-map-plume-a', '#db2777', '#f472b6'),
    plumeB: v('--pv-map-plume-b', '#7c3aed', '#a855f7'),
  };
}

/** `#rrggbb` → `rgba(r,g,b,a)`; other color strings pass through unchanged. */
export function withAlpha(color: string, alpha: number): string {
  const m = /^#([0-9a-f]{6})$/i.exec(color.trim());
  if (!m) return color;
  const n = parseInt(m[1]!, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

/** Color by age class (`ageClass` feature property, or a cluster's freshest member). */
export function ageColorExpr(p: MapPalette, prop = 'ageClass'): ExpressionSpecification {
  return ['match', ['get', prop], 0, p.age[0], 1, p.age[1], 2, p.age[2], p.age[3]];
}

/** Base radius (px at zoom 9) from FRP; unknown FRP gets a small neutral size. */
const FRP_RADIUS: ExpressionSpecification = [
  'case',
  ['==', ['get', 'frpMw'], null],
  4,
  ['interpolate', ['linear'], ['get', 'frpMw'], 0, 3.5, 10, 5, 40, 8, 100, 11],
];

export const HOTSPOT_RADIUS: ExpressionSpecification = [
  'interpolate',
  ['linear'],
  ['zoom'],
  4,
  ['*', 0.45, FRP_RADIUS],
  7,
  ['*', 0.7, FRP_RADIUS],
  9,
  FRP_RADIUS,
  13,
  ['*', 1.6, FRP_RADIUS],
];

/** Opacity from detection confidence (unknown sits between low and nominal). */
export const HOTSPOT_OPACITY: ExpressionSpecification = [
  'match',
  ['get', 'confidence'],
  'high',
  1,
  'nominal',
  0.88,
  'low',
  0.6,
  0.72,
];

/** FRP sizes shown in the legend (MW) — matches FRP_RADIUS at zoom 9. */
export const LEGEND_FRP = [
  { mw: 5, px: 4.2 },
  { mw: 40, px: 8 },
  { mw: 100, px: 11 },
] as const;
