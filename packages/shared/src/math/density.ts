import { EARTH_RADIUS_KM } from './geo';
import type { BBox } from '../schemas/location';
import { degToRad } from './units';

export interface DensityPoint {
  lat: number;
  lon: number;
  /** Detection weight (e.g. FRP in MW). Must be finite and >= 0. */
  weight: number;
}

export interface DensityOptions {
  /** Grid columns (Web-Mercator x). Rows derive from the bbox aspect. */
  cols: number;
  /** Gaussian sigmas in kilometers: wide (spread), mid, fine (detail). */
  sigmaWideKm: number;
  sigmaMidKm: number;
  sigmaFineKm: number;
  /** Kernel mixture weights (must sum to 1). */
  wideWeight: number;
  midWeight: number;
  fineWeight: number;
}

export interface DensityField {
  cols: number;
  rows: number;
  bbox: BBox;
  /** Row-major RAW accumulated weights (not normalized). */
  values: Float32Array;
}

export interface NormalizeOptions {
  /** Percentile (0-100) of nonzero cells used as the stable reference. */
  percentile: number;
  /** Gamma applied after clipping (< 1 lifts mid-tones). */
  gamma: number;
}

/** Default regional density parameters (tunable, single place). */
export const DENSITY_COLS = 512;
export const DENSITY_SIGMA_WIDE_KM = 80;
export const DENSITY_SIGMA_MID_KM = 25;
export const DENSITY_SIGMA_FINE_KM = 8;
export const DENSITY_WIDE_WEIGHT = 0.45;
export const DENSITY_MID_WEIGHT = 0.35;
export const DENSITY_FINE_WEIGHT = 0.2;
export const DENSITY_PERCENTILE = 98;
export const DENSITY_GAMMA = 1.0;

/** Neutral weight for detections with missing FRP: counted, never 0, never dropped. */
export const DENSITY_NEUTRAL_WEIGHT = 1;

/** Map an optional FRP value to a kernel weight (null/NaN → neutral constant). */
export function hotspotWeight(frpMw: number | null | undefined): number {
  if (frpMw == null || !Number.isFinite(frpMw) || frpMw < 0) return DENSITY_NEUTRAL_WEIGHT;
  return frpMw;
}

const KM_PER_DEG = (Math.PI / 180) * EARTH_RADIUS_KM;

/** Web-Mercator normalized y in [0, 1] (0 = north). */
export function mercY(lat: number): number {
  const p = Math.min(85, Math.max(-85, lat));
  return 0.5 - Math.log(Math.tan(Math.PI / 4 + degToRad(p) / 2)) / (4 * Math.PI);
}

/** Inverse of mercY: normalized y in [0, 1] → latitude degrees. */
export function invMercY(y: number): number {
  const yFull = (0.5 - y) * 4 * Math.PI;
  return ((2 * Math.atan(Math.exp(yFull)) - Math.PI / 2) * 180) / Math.PI;
}

/**
 * Gaussian density field over a bbox, sampled on a Web-Mercator grid.
 * Dual kernel (wide + fine, cos(lat) corrected) evaluated in KILOMETERS.
 * Stamped per-point within 3σ of the wide kernel; grid capped at 400 rows.
 * Returns RAW accumulated weights — normalize with normalizeField().
 */
export function buildDensityField(
  points: readonly DensityPoint[],
  bbox: BBox,
  opts: DensityOptions,
): DensityField {
  const [minLon, minLat, maxLon, maxLat] = bbox;
  const { cols, sigmaWideKm, sigmaMidKm, sigmaFineKm, wideWeight, midWeight, fineWeight } = opts;
  const mercTop = mercY(maxLat);
  const mercBottom = mercY(minLat);
  const rows = Math.max(
    1,
    Math.min(400, Math.round((cols * (mercBottom - mercTop)) / ((maxLon - minLon) / 360))),
  );
  const values = new Float32Array(cols * rows);
  if (sigmaWideKm <= 0 || sigmaMidKm <= 0 || sigmaFineKm <= 0 || points.length === 0) {
    return { cols, rows, bbox, values };
  }

  const range = 3 * sigmaWideKm;
  const twoWide2 = 2 * sigmaWideKm * sigmaWideKm;
  const twoMid2 = 2 * sigmaMidKm * sigmaMidKm;
  const twoFine2 = 2 * sigmaFineKm * sigmaFineKm;
  for (const p of points) {
    if (!Number.isFinite(p.lat) || !Number.isFinite(p.lon)) continue;
    const ww = Number.isFinite(p.weight) && p.weight > 0 ? p.weight : 0;
    if (ww <= 0) continue;
    const cosLat = Math.cos(degToRad(p.lat));
    const dLonDeg = range / KM_PER_DEG / Math.max(0.2, cosLat);
    const i0 = Math.max(0, Math.floor(((p.lon - dLonDeg - minLon) / (maxLon - minLon)) * cols));
    const i1 = Math.min(
      cols - 1,
      Math.ceil(((p.lon + dLonDeg - minLon) / (maxLon - minLon)) * cols),
    );
    const my = mercY(p.lat);
    const mercPerDeg = (mercY(p.lat - 1) - mercY(p.lat + 1)) / 2;
    const dyMerc = (range / KM_PER_DEG) * mercPerDeg;
    const j0 = Math.max(0, Math.floor(((my - dyMerc - mercTop) / (mercBottom - mercTop)) * rows));
    const j1 = Math.min(
      rows - 1,
      Math.ceil(((my + dyMerc - mercTop) / (mercBottom - mercTop)) * rows),
    );
    for (let j = j0; j <= j1; j++) {
      const cellLat = invMercY(mercTop + ((j + 0.5) / rows) * (mercBottom - mercTop));
      const dyKm = (cellLat - p.lat) * KM_PER_DEG;
      const cosC = Math.cos(degToRad(cellLat));
      for (let i = i0; i <= i1; i++) {
        const cellLon = minLon + ((i + 0.5) / cols) * (maxLon - minLon);
        const dxKm = (cellLon - p.lon) * KM_PER_DEG * cosC;
        const d2 = dxKm * dxKm + dyKm * dyKm;
        if (d2 > range * range) continue;
        values[j * cols + i]! +=
          ww *
          (wideWeight * Math.exp(-d2 / twoWide2) +
            midWeight * Math.exp(-d2 / twoMid2) +
            fineWeight * Math.exp(-d2 / twoFine2));
      }
    }
  }
  return { cols, rows, bbox, values };
}

/**
 * Normalize a raw field to [0, 1]: clip at the percentile of nonzero cells,
 * then apply gamma. Pure, deterministic, never NaN.
 */
export function normalizeField(values: Float32Array, opts: NormalizeOptions): Float32Array {
  const { percentile, gamma } = opts;
  const out = new Float32Array(values.length);
  const nz: number[] = [];
  for (const v of values) {
    if (Number.isFinite(v) && v > 0) nz.push(v);
  }
  if (nz.length === 0 || !(gamma > 0)) return out;
  nz.sort((a, b) => a - b);
  const p = Math.min(100, Math.max(0, percentile));
  const ref = nz[Math.min(nz.length - 1, Math.ceil((p / 100) * nz.length) - 1)]!;
  if (!(ref > 0)) return out;
  for (let k = 0; k < values.length; k++) {
    const v = values[k]!;
    out[k] = v <= 0 || !Number.isFinite(v) ? 0 : Math.min(1, v / ref) ** gamma;
  }
  return out;
}

/** Legacy fixed-reference normalization kept for simple single-scale use. */
export function normalizeDensity(value: number, refMax: number): number {
  if (!Number.isFinite(value) || value <= 0 || !(refMax > 0)) return 0;
  return Math.min(1, Math.sqrt(value / refMax));
}
