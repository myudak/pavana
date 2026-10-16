import { type BBox, type WindField, type WindFieldPoint } from '@pavana/shared';
import { NotImplementedError } from '../domain/errors';
import { windGridCells } from '../providers/open-meteo/grid';
import type { ProviderBundle } from '../providers/types';

/** Demo wind grid resolution (cols x rows). */
export const WIND_FIELD_COLS = 14;
export const WIND_FIELD_ROWS = 14;

interface Vortex {
  lat: number;
  lon: number;
  radiusKm: number;
  strength: number;
  /** +1 / -1 swirl direction (illustrative, not a hemisphere claim). */
  dir: 1 | -1;
}

/**
 * Demo wind field: base south-easterly flow plus three large smooth swirls.
 * Deterministic synthetic pattern (documented constants) — NOT observed data.
 */
const VORTICES: Vortex[] = [
  { lat: -1.5, lon: 113.5, radiusKm: 250, strength: 1, dir: 1 },
  { lat: 1.5, lon: 116.5, radiusKm: 200, strength: 1, dir: -1 },
  { lat: -3.0, lon: 115.8, radiusKm: 180, strength: 0.8, dir: 1 },
];

const KM_PER_DEG = 111.19;

export function demoWindVector(lat: number, lon: number, validAt: string): WindFieldPoint {
  // Base flow: FROM 135° (south-east trades) → TO 315°.
  const toRad = (315 * Math.PI) / 180;
  let east = Math.sin(toRad) * (2.2 + 0.8 * Math.sin(lon * 0.3) + 0.6 * Math.cos(lat * 0.5));
  let north = Math.cos(toRad) * (2.2 + 0.8 * Math.sin(lon * 0.3) + 0.6 * Math.cos(lat * 0.5));
  for (const v of VORTICES) {
    const dx = (lon - v.lon) * KM_PER_DEG * Math.cos((lat * Math.PI) / 180);
    const dy = (lat - v.lat) * KM_PER_DEG;
    const d = Math.hypot(dx, dy);
    if (d < 1 || d > v.radiusKm * 2) continue;
    const fall = Math.exp(-((d / v.radiusKm) ** 2));
    east += v.dir * (-dy / d) * v.strength * 3 * fall;
    north += v.dir * (dx / d) * v.strength * 3 * fall;
  }
  const speedMs = Math.min(6, Math.max(0.8, Math.hypot(east, north)));
  const toDeg = ((Math.atan2(east, north) * 180) / Math.PI + 360) % 360;
  const fromDeg = (toDeg + 180) % 360;
  return {
    lat,
    lon,
    speedMs: Math.round(speedMs * 10) / 10,
    fromDeg: Math.round(fromDeg * 10) / 10,
    validAt,
    provenance: {
      provider: 'pavana-fixture',
      kind: 'fixture',
      fetchedAt: validAt,
      validAt,
      isDemo: true,
      spatialResolutionKm: 40,
      notes: 'Synthetic demo wind field (smooth pattern). Not an observation or forecast.',
    },
  };
}

export async function getWindField(
  providers: ProviderBundle,
  bbox: BBox,
  cols = WIND_FIELD_COLS,
  rows = WIND_FIELD_ROWS,
): Promise<WindField> {
  if (providers.windField) {
    return providers.windField.getField(bbox, cols, rows, providers.now());
  }
  if (!providers.isDemo) {
    throw new NotImplementedError('wind-field live provider');
  }
  const validAt = providers.now().toISOString().replace('.000Z', 'Z');
  const grid = windGridCells(bbox, cols, rows);
  const points: WindFieldPoint[] = grid.cells.map((c) => demoWindVector(c.lat, c.lon, validAt));
  return { cols, rows, bbox: grid.bbox, validAt, points };
}
