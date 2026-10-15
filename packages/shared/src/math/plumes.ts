/**
 * Indicative smoke-direction trails: follow the wind field forward from each
 * hotspot for N hours (steady wind, forward Euler on m/s → km). Shows WHERE the
 * wind carries air from a detection — NOT a dispersion model, no concentrations,
 * no plume rise or chemistry. Label it as indicative wherever it is drawn.
 */
import type { WindField } from '../schemas/wind-field';
import { EARTH_RADIUS_KM } from './geo';
import { degToRad } from './units';
import { sampleWind } from './windlines';

export interface PlumeSource {
  lat: number;
  lon: number;
  /** Relative strength (e.g. FRP weight) used for line width/opacity. */
  weight: number;
}

export interface PlumeTrail {
  /** [lon, lat] from the source downwind. Always starts at the source. */
  points: [number, number][];
  weight: number;
}

export interface PlumeOptions {
  hours: number;
  stepMinutes: number;
}

const KM_PER_DEG = (Math.PI / 180) * EARTH_RADIUS_KM;

export function tracePlumes(
  sources: readonly PlumeSource[],
  field: Pick<WindField, 'cols' | 'rows' | 'bbox' | 'points'>,
  opts: PlumeOptions,
): PlumeTrail[] {
  const steps = Math.max(0, Math.round((opts.hours * 60) / opts.stepMinutes));
  const dtS = opts.stepMinutes * 60;
  return sources.map((s) => {
    const points: [number, number][] = [[s.lon, s.lat]];
    let lon = s.lon;
    let lat = s.lat;
    for (let i = 0; i < steps; i++) {
      const v = sampleWind(field, lat, lon);
      if (!v) break; // outside the field or missing data: stop, never assume calm
      const eastKm = (v.east * dtS) / 1000;
      const northKm = (v.north * dtS) / 1000;
      lon += eastKm / KM_PER_DEG / Math.max(0.2, Math.cos(degToRad(lat)));
      lat += northKm / KM_PER_DEG;
      points.push([lon, lat]);
    }
    return { points, weight: s.weight };
  });
}
