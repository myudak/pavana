import { degToRad, normalizeDeg, radToDeg } from './units';

/** Mean Earth radius (IUGG), km. */
export const EARTH_RADIUS_KM = 6371.0088;

export interface LatLon {
  lat: number;
  lon: number;
}

/** Great-circle distance in km (haversine). Good enough for ≤ a few hundred km feature work. */
export function haversineKm(a: LatLon, b: LatLon): number {
  const dLat = degToRad(b.lat - a.lat);
  const dLon = degToRad(b.lon - a.lon);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(degToRad(a.lat)) * Math.cos(degToRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Initial bearing from `a` to `b`, degrees clockwise from north in [0, 360). */
export function initialBearingDeg(a: LatLon, b: LatLon): number {
  const φ1 = degToRad(a.lat);
  const φ2 = degToRad(b.lat);
  const Δλ = degToRad(b.lon - a.lon);
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return normalizeDeg(radToDeg(Math.atan2(y, x)));
}

/** Unit vector (east, north) pointing along a compass bearing. */
export function bearingToUnitVector(bearingDeg: number): { east: number; north: number } {
  const θ = degToRad(bearingDeg);
  return { east: Math.sin(θ), north: Math.cos(θ) };
}
