import { id } from './i18n/id';

const SECTORS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'] as const;
type Sector = (typeof SECTORS)[number];

/** Meteorological degrees → 8-wind compass code (N, NE, …, NW). */
export function bearingToCompassCode(deg: number): Sector {
  const norm = ((deg % 360) + 360) % 360;
  return SECTORS[Math.round(norm / 45) % 8]!;
}

/**
 * Full Indonesian wind direction name ("tenggara"), or null when unknown.
 * Names come from the `insights.compass8` dictionary in id.ts — never
 * abbreviated codes in user-facing text.
 */
export function windDirectionLabel(fromDeg: number | null | undefined): string | null {
  if (typeof fromDeg !== 'number' || !Number.isFinite(fromDeg)) return null;
  return id.insights.compass8[bearingToCompassCode(fromDeg)];
}
