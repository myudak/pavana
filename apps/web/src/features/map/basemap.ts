import type maplibregl from 'maplibre-gl';

/**
 * Free CARTO basemaps (OSM data). Attribution comes from the style JSON via the
 * MapLibre attribution control. Override with VITE_MAP_STYLE_URL (light) and
 * VITE_MAP_STYLE_URL_DARK (dark); see docs/data-sources.md → Map tiles.
 */
export const LIGHT_STYLE_URL = 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json';
export const DARK_STYLE_URL = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';

export function basemapStyleUrl(dark: boolean): string {
  if (dark) return import.meta.env.VITE_MAP_STYLE_URL_DARK || DARK_STYLE_URL;
  return import.meta.env.VITE_MAP_STYLE_URL || LIGHT_STYLE_URL;
}

/** Dusk land/water tones for Dark Matter: land a touch lighter than water so coasts read. */
const DARK_LAND = '#1b2133';
const DARK_WATER = '#0a0f1c';

/** Voyager's admin lines are too pale against light land at the default stroke widths. */
const LIGHT_BOUNDARIES = {
  country: '#c27e87',
  state: '#827c78',
  county: '#a39a91',
} as const;

/**
 * Gentle Dusk/Haze grade over CARTO Dark Matter (no style fork). Lifts land off
 * pure black, keeps water darker than land, and brightens rivers, boundaries and
 * roads slightly. Labels keep the provider styling. Only applied to Dark Matter;
 * custom style overrides render untouched.
 */
export function gradeDarkBasemap(map: maplibregl.Map) {
  const paint = (id: string, prop: string, value: unknown) => {
    if (map.getLayer(id)) map.setPaintProperty(id, prop, value);
  };
  paint('background', 'background-color', DARK_LAND);
  for (const id of ['landcover', 'landuse', 'park_national_park', 'park_nature_reserve']) {
    paint(id, 'fill-color', DARK_LAND);
  }
  paint('water', 'fill-color', DARK_WATER);
  paint('waterway', 'line-color', '#2f4d66');
  paint('boundary_country_inner', 'line-color', '#5a6488');
  paint('boundary_state', 'line-color', '#47506e');
  paint('boundary_county', 'line-color', '#2c3350');
  for (const id of ['road_pri_fill_noramp', 'road_trunk_fill_noramp', 'road_mot_fill_noramp']) {
    paint(id, 'line-color', '#4a5370');
  }
}

/** Strengthens Voyager administrative borders so they stay visible on light land. */
export function gradeLightBasemap(map: maplibregl.Map) {
  const paint = (id: string, prop: string, value: unknown) => {
    if (map.getLayer(id)) map.setPaintProperty(id, prop, value);
  };
  paint('boundary_country_inner', 'line-color', LIGHT_BOUNDARIES.country);
  paint('boundary_state', 'line-color', LIGHT_BOUNDARIES.state);
  paint('boundary_county', 'line-color', LIGHT_BOUNDARIES.county);
}
