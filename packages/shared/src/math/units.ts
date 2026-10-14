/** Unit conversions. Normalize at the provider boundary; internal units are SI-ish (m/s, µg/m³, °C). */

export const kmhToMs = (kmh: number): number => kmh / 3.6;
export const msToKmh = (ms: number): number => ms * 3.6;
export const knotsToMs = (kn: number): number => kn * 0.514444;

export const degToRad = (deg: number): number => (deg * Math.PI) / 180;
export const radToDeg = (rad: number): number => (rad * 180) / Math.PI;

/** Normalize any angle to [0, 360). */
export const normalizeDeg = (deg: number): number => ((deg % 360) + 360) % 360;
