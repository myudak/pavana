// Web Mercator projection matching the basemap screenshots in public/map/ (MapLibre,
// 512 px tiles, devicePixelRatio 1). See scripts/capture-basemap.mjs.
import views from '../../../public/map/views.json';

export type ViewName = keyof typeof views.views;

const world = (lon: number, lat: number, zoom: number) => {
  const scale = views.tileSize * 2 ** zoom;
  const s = Math.sin((lat * Math.PI) / 180);
  return [
    ((lon + 180) / 360) * scale,
    (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * scale,
  ] as const;
};

/** Pixel position of a lon/lat on the captured basemap for a view (1920×1080 canvas). */
export function project(view: ViewName, lon: number, lat: number): [number, number] {
  const v = views.views[view];
  const [cx, cy] = world(v.center[0]!, v.center[1]!, v.zoom);
  const [x, y] = world(lon, lat, v.zoom);
  return [x - cx + views.width / 2, y - cy + views.height / 2];
}

/** Pixels per degree of longitude in a view (for sizing grid cells). */
export function pxPerDegLon(view: ViewName) {
  return (views.tileSize * 2 ** views.views[view].zoom) / 360;
}

export const VIEWS = views.views;
