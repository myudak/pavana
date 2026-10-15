import { bearingToUnitVector, EARTH_RADIUS_KM } from './geo';
import { windFromToFlowBearing } from './wind';
import { degToRad } from './units';
import type { BBox } from '../schemas/location';
import type { WindField } from '../schemas/wind-field';

export interface StreamlineOptions {
  /** Target number of lines. */
  targetCount: number;
  /** Minimum seed spacing in kilometers (Poisson-disk-ish). */
  minSpacingKm: number;
  /** Integration step in kilometers. */
  stepKm: number;
  /** Per-line target length range in kilometers. */
  minLengthKm: number;
  maxLengthKm: number;
  /** Stop tracing below this speed (m/s). Null vectors also stop. */
  minSpeedMs: number;
  /** Deterministic seed (jitter + shuffle). */
  seed: number;
}

export interface Streamline {
  /** [lon, lat] pairs along the flow direction. */
  points: [number, number][];
}

export interface StreamlineArrow {
  lon: number;
  lat: number;
  /** Map rotation degrees (TO bearing). */
  rot: number;
}

export interface StreamlineField {
  lines: Streamline[];
  arrows: StreamlineArrow[];
}

/** Defaults tuned for an island-scale regional view. */
export const STREAMLINE_TARGET_COUNT = 90;
export const STREAMLINE_MIN_SPACING_KM = 90;
export const STREAMLINE_STEP_KM = 6;
export const STREAMLINE_MIN_LENGTH_KM = 150;
export const STREAMLINE_MAX_LENGTH_KM = 320;
export const STREAMLINE_MIN_SPEED_MS = 0.3;
export const STREAMLINE_SEED = 7;

// Back-compat aliases for existing option plumbing.
export const STREAMLINE_COUNT = STREAMLINE_TARGET_COUNT;
export const STREAMLINE_STEP_KM_ALIAS = STREAMLINE_STEP_KM;
export const STREAMLINE_MAX_KM = STREAMLINE_MAX_LENGTH_KM;
export const STREAMLINE_MIN_SPEED_MS_ALIAS = STREAMLINE_MIN_SPEED_MS;
export const STREAMLINE_SEED_ALIAS = STREAMLINE_SEED;

const KM_PER_DEG = (Math.PI / 180) * EARTH_RADIUS_KM;

function mulberry32(seed: number): () => number {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Vec {
  east: number;
  north: number;
}

/** Bilinear interpolation of the flow (TO-direction) vector. Null when unknown. */
export function sampleWind(
  field: Pick<WindField, 'cols' | 'rows' | 'bbox' | 'points'>,
  lat: number,
  lon: number,
): Vec | null {
  const [minLon, minLat, maxLon, maxLat] = field.bbox;
  if (lon < minLon || lon > maxLon || lat < minLat || lat > maxLat) return null;
  const fx = ((lon - minLon) / (maxLon - minLon)) * (field.cols - 1);
  const fy = ((maxLat - lat) / (maxLat - minLat)) * (field.rows - 1);
  const i0 = Math.floor(fx);
  const j0 = Math.floor(fy);
  const i1 = Math.min(field.cols - 1, i0 + 1);
  const j1 = Math.min(field.rows - 1, j0 + 1);
  const tx = fx - i0;
  const ty = fy - j0;
  const at = (i: number, j: number): Vec | null => {
    const p = field.points[j * field.cols + i];
    if (!p || p.speedMs == null || p.fromDeg == null) return null;
    const u = bearingToUnitVector(windFromToFlowBearing(p.fromDeg));
    return { east: u.east * p.speedMs, north: u.north * p.speedMs };
  };
  const a = at(i0, j0);
  const b = at(i1, j0);
  const c = at(i0, j1);
  const d = at(i1, j1);
  if (!a || !b || !c || !d) return null;
  return {
    east:
      a.east * (1 - tx) * (1 - ty) +
      b.east * tx * (1 - ty) +
      c.east * (1 - tx) * ty +
      d.east * tx * ty,
    north:
      a.north * (1 - tx) * (1 - ty) +
      b.north * tx * (1 - ty) +
      c.north * (1 - tx) * ty +
      d.north * tx * ty,
  };
}

function stepKm(lat: number, lon: number, eastKm: number, northKm: number): [number, number] {
  return [
    lon + eastKm / KM_PER_DEG / Math.max(0.2, Math.cos(degToRad(lat))),
    lat + northKm / KM_PER_DEG,
  ];
}

/**
 * Trace flow-following streamlines (RK2 midpoint) over a wind field.
 * Seeds come from a deterministically shuffled coarse grid (min spacing);
 * lines stop at the bbox edge, in calm/null air, at their target length, or
 * when approaching another line (coarse occupancy grid).
 * Pure and deterministic: same field + options always yield the same lines.
 */
export function traceStreamlines(
  field: Pick<WindField, 'cols' | 'rows' | 'bbox' | 'points'>,
  bbox: BBox,
  opts: StreamlineOptions,
): StreamlineField {
  const [minLon, minLat, maxLon, maxLat] = bbox;
  const rand = mulberry32(opts.seed);
  const lines: Streamline[] = [];
  const arrows: StreamlineArrow[] = [];
  // Coarse occupancy grid (~0.25°) keeps lines from piling up.
  const occupied = new Set<string>();
  const occKey = (lat: number, lon: number) => `${Math.floor(lat * 4)},${Math.floor(lon * 4)}`;

  // Candidate seeds on a min-spacing grid with deterministic jitter + shuffle.
  const stepDeg = opts.minSpacingKm / KM_PER_DEG;
  const seeds: [number, number][] = [];
  for (let lat = minLat + stepDeg / 2; lat < maxLat; lat += stepDeg) {
    for (let lon = minLon + stepDeg / 2; lon < maxLon; lon += stepDeg) {
      seeds.push([lat + (rand() - 0.5) * stepDeg * 0.8, lon + (rand() - 0.5) * stepDeg * 0.8]);
    }
  }
  for (let i = seeds.length - 1; i > 0; i--) {
    const k = Math.floor(rand() * (i + 1));
    [seeds[i], seeds[k]] = [seeds[k]!, seeds[i]!];
  }

  for (const [sLat, sLon] of seeds) {
    if (lines.length >= opts.targetCount) break;
    if (sLat < minLat || sLat > maxLat || sLon < minLon || sLon > maxLon) continue;
    if (occupied.has(occKey(sLat, sLon))) continue;
    const v0 = sampleWind(field, sLat, sLon);
    if (!v0 || Math.hypot(v0.east, v0.north) < opts.minSpeedMs) continue;
    const targetLen = opts.minLengthKm + rand() * (opts.maxLengthKm - opts.minLengthKm);
    const points: [number, number][] = [[sLon, sLat]];
    // Cells already claimed by THIS line (so it never blocks itself).
    const mine = new Set<string>();
    const claim = (lat: number, lon: number) => {
      const key = occKey(lat, lon);
      mine.add(key);
      occupied.add(key);
    };
    let clat = sLat;
    let clon = sLon;
    let traveled = 0;
    claim(clat, clon);
    while (traveled < targetLen) {
      const v = sampleWind(field, clat, clon);
      if (!v) break;
      const speed = Math.hypot(v.east, v.north);
      if (speed < opts.minSpeedMs) break;
      const ux = v.east / speed;
      const uy = v.north / speed;
      const [midLon, midLat] = stepKm(clat, clon, ux * opts.stepKm * 0.5, uy * opts.stepKm * 0.5);
      const vm = sampleWind(field, midLat, midLon);
      if (!vm) break;
      const sm = Math.hypot(vm.east, vm.north);
      if (sm < opts.minSpeedMs) break;
      const [nl, nt] = stepKm(
        clat,
        clon,
        (vm.east / sm) * opts.stepKm,
        (vm.north / sm) * opts.stepKm,
      );
      if (nl < minLon || nl > maxLon || nt < minLat || nt > maxLat) break;
      if (occupied.has(occKey(nt, nl)) && !mine.has(occKey(nt, nl))) break;
      clat = nt;
      clon = nl;
      traveled += opts.stepKm;
      points.push([clon, clat]);
      claim(clat, clon);
    }
    if (traveled < opts.minLengthKm * 0.5 || points.length < 2) continue;
    lines.push({ points });
    // One arrow per line at ~65% of its length (bearing in km space).
    const ai = Math.min(points.length - 1, Math.floor(points.length * 0.65));
    const bi = Math.min(points.length - 1, ai + 1);
    const a = points[ai]!;
    const b = points[bi]!;
    const dxKm = (b[0] - a[0]) * KM_PER_DEG * Math.cos(degToRad(a[1]));
    const dyKm = (b[1] - a[1]) * KM_PER_DEG;
    const rot = ((Math.atan2(dxKm, dyKm) * 180) / Math.PI + 360) % 360;
    arrows.push({ lon: a[0], lat: a[1], rot });
  }
  return { lines, arrows };
}
