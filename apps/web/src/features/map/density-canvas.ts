import type { BBox } from '@pavana/shared';
import type { DensityField } from '@pavana/shared';

/** Dusk/Haze ramp (dark blue → pale pink), positions in normalized [0, 1]. */
export const DENSITY_RAMP: { t: number; hex: string }[] = [
  { t: 0, hex: '#2f5bff' },
  { t: 0.3, hex: '#5b4dff' },
  { t: 0.5, hex: '#9b4dff' },
  { t: 0.72, hex: '#e24bd8' },
  { t: 0.88, hex: '#ff7aa8' },
  { t: 1, hex: '#ffd7ea' },
];

/** Alpha floor on land (dim blue where nothing was detected) and peak alpha. */
export const DENSITY_ALPHA_FLOOR = 0.3;
export const DENSITY_ALPHA_PEAK = 0.85;

/** Edge feather distance (km) so the raster never shows a hard rectangle. */
export const DENSITY_FEATHER_KM = 50;

/** Bright cores get a soft bloom baked into the canvas. */
export const DENSITY_BLOOM_THRESHOLD = 0.75;
export const DENSITY_BLOOM_ALPHA = 0.45;

function hexRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function ramp(t: number): [number, number, number] {
  const c = Math.min(1, Math.max(0, t));
  for (let i = 1; i < DENSITY_RAMP.length; i++) {
    const prev = DENSITY_RAMP[i - 1]!;
    const cur = DENSITY_RAMP[i]!;
    if (c <= cur.t) {
      const k = (c - prev.t) / (cur.t - prev.t || 1);
      const [r0, g0, b0] = hexRgb(prev.hex);
      const [r1, g1, b1] = hexRgb(cur.hex);
      return [r0 + (r1 - r0) * k, g0 + (g1 - g0) * k, b0 + (b1 - b0) * k];
    }
  }
  const [r, g, b] = hexRgb(DENSITY_RAMP[DENSITY_RAMP.length - 1]!.hex);
  return [r, g, b];
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const k = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return k * k * (3 - 2 * k);
}

/**
 * Render a density field to RGBA canvas (row 0 = north).
 * Deterministic ±4 % value-noise breaks banding (seeded by pixel index,
 * identical on every render). Edges feather to transparent over FEATHER_KM.
 */
export function renderDensityCanvas(field: DensityField): HTMLCanvasElement {
  const { cols, rows, values, bbox } = field;
  const [minLon, minLat, maxLon, maxLat] = bbox;
  const canvas = document.createElement('canvas');
  canvas.width = cols;
  canvas.height = rows;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;
  const img = ctx.createImageData(cols, rows);
  const kmPerCellLon = ((maxLon - minLon) / cols) * 111.19;
  const kmPerCellLat = ((maxLat - minLat) / rows) * 111.19;
  for (let j = 0; j < rows; j++) {
    const lat = maxLat - ((j + 0.5) / rows) * (maxLat - minLat);
    const cosLat = Math.cos((lat * Math.PI) / 180);
    for (let i = 0; i < cols; i++) {
      const k = j * cols + i;
      const t = values[k]!;
      // Deterministic per-pixel noise ±4 %.
      const h = ((k * 2654435761) % 1000) / 1000 - 0.5;
      const tn = Math.min(1, Math.max(0, t * (1 + 0.08 * h)));
      const [r, g, b] = ramp(tn);
      // Feather: fade alpha within FEATHER_KM of the bbox border.
      const edgeKm = Math.min(
        i * kmPerCellLon * cosLat,
        (cols - 1 - i) * kmPerCellLon * cosLat,
        j * kmPerCellLat,
        (rows - 1 - j) * kmPerCellLat,
      );
      const feather = smoothstep(0, DENSITY_FEATHER_KM, edgeKm);
      img.data[k * 4] = Math.round(r);
      img.data[k * 4 + 1] = Math.round(g);
      img.data[k * 4 + 2] = Math.round(b);
      img.data[k * 4 + 3] = Math.round(
        255 * (DENSITY_ALPHA_FLOOR + (DENSITY_ALPHA_PEAK - DENSITY_ALPHA_FLOOR) * tn) * feather,
      );
    }
  }
  ctx.putImageData(img, 0, 0);
  // Bloom pass: blurred copy screened over bright cores only.
  try {
    const bloom = document.createElement('canvas');
    bloom.width = cols;
    bloom.height = rows;
    const bctx = bloom.getContext('2d');
    if (bctx && typeof bctx.filter === 'string') {
      const mask = document.createElement('canvas');
      mask.width = cols;
      mask.height = rows;
      const mctx = mask.getContext('2d');
      if (mctx) {
        const mimg = mctx.createImageData(cols, rows);
        for (let k = 0; k < values.length; k++) {
          const on = values[k]! >= DENSITY_BLOOM_THRESHOLD ? 255 : 0;
          mimg.data[k * 4 + 3] = on;
        }
        mctx.putImageData(mimg, 0, 0);
        bctx.filter = 'blur(3px)';
        bctx.drawImage(canvas, 0, 0);
        bctx.filter = 'none';
        bctx.globalCompositeOperation = 'destination-in';
        bctx.drawImage(mask, 0, 0);
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = DENSITY_BLOOM_ALPHA;
        ctx.drawImage(bloom, 0, 0);
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
      }
    }
  } catch {
    // Canvas filter unsupported — base layer alone is the fallback.
  }
  return canvas;
}

/** Corner coordinates for a MapLibre image source: NW, NE, SE, SW. */
export function densityImageCoords(bbox: BBox): [
  [number, number],
  [number, number],
  [number, number],
  [number, number],
] {
  const [minLon, minLat, maxLon, maxLat] = bbox;
  return [
    [minLon, maxLat],
    [maxLon, maxLat],
    [maxLon, minLat],
    [minLon, minLat],
  ];
}
