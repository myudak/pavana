import type { Hotspot, LatLon } from '@pavana/shared';
import {
  bearingToUnitVector,
  EARTH_RADIUS_KM,
  windFromToFlowBearing,
  type BBox,
  type PlumeTrail,
  type StreamlineField,
} from '@pavana/shared';
import type { FeatureCollection, LineString, Point } from 'geojson';
import maplibregl, {
  type ExpressionSpecification,
  type GeoJSONSource,
  type ImageSource,
} from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useEffect, useRef } from 'react';
import { cssVar } from '@/lib/aq';
import { useCopy } from '@/lib/i18n';
import { useDarkMode } from '@/lib/theme-context';
import {
  basemapStyleUrl,
  DARK_STYLE_URL,
  gradeDarkBasemap,
  gradeLightBasemap,
  LIGHT_STYLE_URL,
} from './basemap';
import {
  ageClass,
  ageColorExpr,
  hotspotAgeHours,
  hotspotReferenceMs,
  HOTSPOT_OPACITY,
  HOTSPOT_RADIUS,
  readMapPalette,
  withAlpha,
  type MapPalette,
} from './hotspot-style';

const RASTER_ID = 'density-raster';
/** VIIRS pixels are ~375 m; closer zooms only magnify the detection footprint. */
const MIN_ZOOM = 3;

const SE_ASIA_BOUNDS: [[number, number], [number, number]] = [
  [85, -15],
  [155, 15],
];
const MAX_ZOOM = 14;
/** Individual detections from this zoom; clusters (and the density glow) below it. */
const CLUSTER_MAX_ZOOM = 9;
const HOTSPOT_LAYERS = [
  'hotspot-heat',
  'hotspot-glow',
  'hotspots',
  'hotspot-hit',
  'clusters',
  'cluster-count',
];
const LABEL_FONT = ['Montserrat Medium', 'Open Sans Bold', 'Noto Sans Regular'];

/**
 * Generic extra data layer drawn under the detections and basemap labels, e.g. a
 * future gridded model output. The caller owns the legend and provenance copy.
 * - `fill`: polygons (grid cells) colored by `valueProperty` through `stops`.
 * - `heatmap`: points weighted by `valueProperty` (0–1), colored by density stops.
 * Features whose value is missing/null are not drawn (never treated as zero).
 */
export interface MapOverlay {
  id: string;
  type: 'fill' | 'heatmap';
  data: FeatureCollection;
  valueProperty: string;
  stops: [number, string][];
  opacity?: number;
  visible?: boolean;
}

export interface MapInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/** Idempotent source/layer setup (load can re-fire per map instance in dev). */
function ensureSource(map: maplibregl.Map, id: string, def: object) {
  if (!map.getSource(id)) map.addSource(id, def as never);
}
function ensureLayer(
  map: maplibregl.Map,
  def: Parameters<maplibregl.Map['addLayer']>[0],
  before?: string,
) {
  if (!map.getLayer(def.id)) map.addLayer(def, before);
}
function firstSymbolId(map: maplibregl.Map): string | undefined {
  return map.getStyle()?.layers.find((l) => l.type === 'symbol')?.id;
}

/** 1px transparent placeholder so the image source exists before data arrives. */
function transparentPixel(): string {
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  return canvas.toDataURL();
}

/** Small up-pointing triangle sprite for streamline direction arrows. */
function windArrowImage(color: string): ImageData {
  const canvas = document.createElement('canvas');
  canvas.width = 24;
  canvas.height = 24;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(12, 3);
  ctx.lineTo(20, 19);
  ctx.lineTo(12, 15);
  ctx.lineTo(4, 19);
  ctx.closePath();
  ctx.fill();
  return ctx.getImageData(0, 0, 24, 24);
}

/** Wind streamline extent (km behind/ahead of the measurement point). Schematic. */
const WIND_BACK_KM = 15;
const WIND_FWD_KM = 35;

/**
 * Small-offset equirectangular projection. Accurate enough for ≤ tens of km;
 * used only for schematic (non-data) geometries.
 */
function offsetKm(c: LatLon, eastKm: number, northKm: number): [number, number] {
  const dLat = (northKm / EARTH_RADIUS_KM) * (180 / Math.PI);
  const dLon = ((eastKm / EARTH_RADIUS_KM) * (180 / Math.PI)) / Math.cos((c.lat * Math.PI) / 180);
  return [c.lon + dLon, c.lat + dLat];
}

function windLine(c: LatLon, flowBearing: number): LineString {
  const u = bearingToUnitVector(flowBearing);
  return {
    type: 'LineString',
    coordinates: [
      offsetKm(c, -u.east * WIND_BACK_KM, -u.north * WIND_BACK_KM),
      offsetKm(c, u.east * WIND_FWD_KM, u.north * WIND_FWD_KM),
    ],
  };
}

function toGeoJSON(hotspots: Hotspot[]): FeatureCollection<Point> {
  const refMs = hotspotReferenceMs(hotspots);
  return {
    type: 'FeatureCollection',
    features: hotspots.map((h) => {
      const ageH = hotspotAgeHours(h.acquiredAt, refMs);
      return {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [h.lon, h.lat] },
        properties: {
          id: h.id,
          lat: h.lat,
          lon: h.lon,
          acquiredAt: h.acquiredAt,
          ageH: ageH == null ? null : Math.round(ageH * 10) / 10,
          ageClass: ageH == null ? 3 : ageClass(ageH),
          frpMw: h.frpMw,
          confidence: h.confidence,
          satellite: `${h.satellite} · ${h.instrument}`,
          isDemo: h.provenance.isDemo,
        },
      };
    }),
  };
}

function addHotspotLayers(map: maplibregl.Map, p: MapPalette) {
  const unclustered: ExpressionSpecification = ['!', ['has', 'point_count']];
  // Low-zoom detection-density glow; crossfades out as individual dots take over.
  ensureLayer(map, {
    id: 'hotspot-heat',
    type: 'heatmap',
    source: 'hotspots-raw',
    maxzoom: 11,
    paint: {
      'heatmap-weight': [
        'case',
        ['==', ['get', 'frpMw'], null],
        0.5,
        ['interpolate', ['linear'], ['get', 'frpMw'], 0, 0.35, 50, 1],
      ],
      'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 3, 0.3, 6, 0.55, 9, 1.2],
      'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 3, 6, 6, 12, 9, 22],
      'heatmap-color': [
        'interpolate',
        ['linear'],
        ['heatmap-density'],
        0,
        withAlpha(p.heat[0], 0),
        0.1,
        withAlpha(p.heat[0], 0.45),
        0.35,
        withAlpha(p.heat[1], 0.8),
        0.7,
        p.heat[2],
        1,
        p.heat[3],
      ],
      'heatmap-opacity': ['interpolate', ['linear'], ['zoom'], 5, 0.75, 8, 0.45, 10.5, 0],
    },
  });
  ensureLayer(map, {
    id: 'hotspot-glow',
    type: 'circle',
    source: 'hotspots',
    minzoom: 7,
    filter: unclustered,
    paint: {
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 7, 7, 10, 14, 13, 22],
      'circle-color': ageColorExpr(p),
      'circle-blur': 0.8,
      'circle-opacity': ['interpolate', ['linear'], ['zoom'], 7, 0, 9, 0.3],
    },
  });
  ensureLayer(map, {
    id: 'hotspots',
    type: 'circle',
    source: 'hotspots',
    filter: unclustered,
    paint: {
      'circle-radius': HOTSPOT_RADIUS,
      'circle-color': ageColorExpr(p),
      'circle-opacity': HOTSPOT_OPACITY,
      'circle-stroke-color': p.stroke,
      'circle-stroke-width': ['interpolate', ['linear'], ['zoom'], 4, 0.5, 9, 1.2, 12, 1.6],
      'circle-stroke-opacity': ['interpolate', ['linear'], ['zoom'], 4, 0.5, 8, 0.9],
    },
  });
  // Larger invisible target so small dots are tappable on phones.
  ensureLayer(map, {
    id: 'hotspot-hit',
    type: 'circle',
    source: 'hotspots',
    filter: unclustered,
    paint: { 'circle-radius': 14, 'circle-color': '#000000', 'circle-opacity': 0 },
  });
  ensureLayer(map, {
    id: 'hotspot-selected',
    type: 'circle',
    source: 'hotspots-raw',
    filter: ['==', ['get', 'id'], ''],
    paint: {
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 4, 7, 9, 13, 13, 20],
      'circle-color': 'rgba(0,0,0,0)',
      'circle-stroke-color': cssVar('--pv-ink') || '#1f2937',
      'circle-stroke-width': 2.5,
    },
  });
  // Cluster bubbles: colored by the freshest detection inside, sized by count.
  ensureLayer(map, {
    id: 'clusters',
    type: 'circle',
    source: 'hotspots',
    minzoom: 6,
    filter: ['has', 'point_count'],
    paint: {
      'circle-color': ageColorExpr(p, 'fresh'),
      'circle-radius': ['step', ['get', 'point_count'], 11, 10, 14, 50, 18, 150, 23],
      'circle-stroke-color': p.stroke,
      'circle-stroke-width': 2,
      'circle-opacity': ['interpolate', ['linear'], ['zoom'], 6, 0, 7, 0.92],
      'circle-stroke-opacity': ['interpolate', ['linear'], ['zoom'], 6, 0, 7, 0.9],
    },
  });
  ensureLayer(map, {
    id: 'cluster-count',
    type: 'symbol',
    source: 'hotspots',
    minzoom: 6.5,
    filter: ['has', 'point_count'],
    layout: {
      'text-field': ['get', 'point_count_abbreviated'],
      'text-font': LABEL_FONT,
      'text-size': 11.5,
      'text-allow-overlap': true,
    },
    paint: {
      'text-color': '#ffffff',
      'text-halo-color': 'rgba(0,0,0,0.55)',
      'text-halo-width': 1.2,
    },
  });
}

export function HotspotMap({
  center,
  hotspots,
  showHotspots,
  showDensity = false,
  showWind = true,
  animatedWind = true,
  density = null,
  fitTo = null,
  initialCamera = null,
  autoFit = true,
  streamlines = null,
  fitNonce = 0,
  fitMaxZoom = 11,
  onError,
  styleUrl,
  wind,
  onSelectHotspot,
  selectedId = null,
  plumes = null,
  showPlumes = false,
  insets,
  overlays = [],
  onMapReady,
  interactive = true,
  attributionPosition = 'bottom-right',
}: {
  /** Corner for the (license-required) basemap attribution. */
  attributionPosition?: 'bottom-right' | 'bottom-left';
  /** Indicative downwind trails from hotspots (see tracePlumes). */
  plumes?: PlumeTrail[] | null;
  showPlumes?: boolean;
  center: LatLon;
  hotspots: Hotspot[];
  showHotspots: boolean;
  /** Regional density raster (canvas). Null/absent hides the layer. */
  showDensity?: boolean;
  showWind?: boolean;
  /** Traveling dot along the wind streamline. Honors reduced-motion. */
  animatedWind?: boolean;
  /** Pre-rendered density canvas + corner coordinates, or null. */
  density?: {
    canvas: HTMLCanvasElement;
    coords: [[number, number], [number, number], [number, number], [number, number]];
  } | null;
  /** Fit the viewport to this bbox instead of the data bounds. */
  fitTo?: BBox | null;
  /** Validated one-shot focus from a hotspot deep link. */
  initialCamera?: { center: LatLon; zoom: number } | null;
  /** Deep links keep their focus until an explicit view button is used. */
  autoFit?: boolean;
  /** Regional wind streamlines (flow direction). Null hides the layers. */
  streamlines?: StreamlineField | null;
  /** Increment to refit the viewport (view buttons). */
  fitNonce?: number;
  /** Closest zoom a fit may reach (large screens otherwise zoom in very far). */
  fitMaxZoom?: number;
  onError: () => void;
  /** MapLibre style URL override. Default: CARTO Voyager (light) / Dark Matter (dark). */
  styleUrl?: string;
  /** Current wind at the selected location (FROM degrees + speed). Renders a flow arrow. */
  wind?: { fromDeg: number; speedMs: number } | null;
  /** Called with the tapped detection's properties, or null when tapping empty map. */
  onSelectHotspot?: (props: Record<string, unknown> | null) => void;
  /** Highlighted detection id (ring). */
  selectedId?: string | null;
  /** Screen area covered by floating chrome; fits keep the target inside the rest. */
  insets?: MapInsets;
  /** Optional extra data layers (see MapOverlay). */
  overlays?: MapOverlay[];
  /** Receives the MapLibre instance once its style is ready (null on teardown). */
  onMapReady?: (map: maplibregl.Map | null) => void;
  /** Pan/zoom gestures. Off for static previews. */
  interactive?: boolean;
}) {
  const t = useCopy();
  const dark = useDarkMode();
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const loadedRef = useRef(false);
  const fittedRef = useRef('');
  const interactedRef = useRef(false);
  const fittedPaddingRef = useRef('');
  const cameraRef = useRef<{
    locationKey: string;
    center: [number, number];
    zoom: number;
    bearing: number;
    pitch: number;
    fitKey: string;
  } | null>(null);
  const style = styleUrl || basemapStyleUrl(dark);
  const windFlow = wind != null ? windFromToFlowBearing(wind.fromDeg) : null;
  const onSelectRef = useRef(onSelectHotspot);
  onSelectRef.current = onSelectHotspot;
  const onReadyRef = useRef(onMapReady);
  onReadyRef.current = onMapReady;

  // Create the map once per center / style.
  useEffect(() => {
    if (!ref.current) return;
    let map: maplibregl.Map | undefined;
    const locationKey = `${center.lat},${center.lon}`;
    const saved = cameraRef.current?.locationKey === locationKey ? cameraRef.current : null;
    try {
      map = new maplibregl.Map({
        container: ref.current,
        style,
        center: saved?.center ?? [
          initialCamera?.center.lon ?? center.lon,
          initialCamera?.center.lat ?? center.lat,
        ],
        zoom: saved?.zoom ?? initialCamera?.zoom ?? 9,
        bearing: saved?.bearing ?? 0,
        pitch: saved?.pitch ?? 0,
        maxBounds: SE_ASIA_BOUNDS,
        minZoom: MIN_ZOOM,
        maxZoom: MAX_ZOOM,
        interactive,
        attributionControl: false,
      });
      map.addControl(new maplibregl.AttributionControl({ compact: true }), attributionPosition);
    } catch {
      onError(); // e.g. WebGL unavailable
      return;
    }
    mapRef.current = map;
    map.on('dragstart', () => {
      interactedRef.current = true;
    });
    map.on('zoomstart', (e) => {
      if (e.originalEvent) interactedRef.current = true;
    });
    map.on('error', (e) => {
      if (!loadedRef.current) {
        console.error('[map]', e.error);
        onError();
      }
    });

    // style.load (not load): draw overlays without waiting for every basemap tile.
    map.once('style.load', () => {
      loadedRef.current = true;
      fittedRef.current = saved?.fitKey ?? '';
      if (!saved) {
        interactedRef.current = false;
        fittedPaddingRef.current = '';
      }
      if (dark && style === DARK_STYLE_URL) gradeDarkBasemap(map);
      if (!dark && style === LIGHT_STYLE_URL) gradeLightBasemap(map);
      const p = readMapPalette(dark);
      const firstSymbol = firstSymbolId(map);

      ensureSource(map, 'hotspots', {
        type: 'geojson',
        data: toGeoJSON([]),
        cluster: true,
        clusterMaxZoom: CLUSTER_MAX_ZOOM,
        clusterRadius: 34,
        clusterProperties: { fresh: ['min', ['get', 'ageClass']] },
      });
      ensureSource(map, 'hotspots-raw', { type: 'geojson', data: toGeoJSON([]) });
      ensureSource(map, 'plumes', {
        type: 'geojson',
        lineMetrics: true,
        data: { type: 'FeatureCollection', features: [] },
      });
      ensureSource(map, 'density-src', {
        type: 'image',
        url: transparentPixel(),
        coordinates: [
          [108.5, 4.5],
          [119.5, 4.5],
          [119.5, -4.5],
          [108.5, -4.5],
        ],
      });
      for (const id of ['wind-flow', 'wind-streamlines', 'wind-arrows']) {
        ensureSource(map, id, {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] },
        });
      }
      if (!map.hasImage('wind-arrow')) {
        map.addImage('wind-arrow', windArrowImage(p.windB), { pixelRatio: 2 });
      }

      // Regional streamlines: below basemap labels.
      ensureLayer(
        map,
        {
          id: 'wind-streamlines-line',
          type: 'line',
          source: 'wind-streamlines',
          layout: { 'line-cap': 'round' },
          paint: {
            'line-width': dark ? 1 : 1.3,
            'line-opacity': 0.6,
            'line-gradient': [
              'interpolate',
              ['linear'],
              ['line-progress'],
              0,
              withAlpha(p.windA, 0),
              0.3,
              p.windA,
              1,
              p.windB,
            ],
          },
        },
        firstSymbol,
      );
      ensureLayer(
        map,
        {
          id: 'wind-streamlines-arrow',
          type: 'symbol',
          source: 'wind-arrows',
          layout: {
            'icon-image': 'wind-arrow',
            'icon-size': 0.55,
            'icon-rotate': ['get', 'rot'],
            'icon-rotation-alignment': 'map',
            'icon-allow-overlap': true,
            'icon-ignore-placement': true,
          },
          paint: { 'icon-opacity': 0.85 },
        },
        firstSymbol,
      );
      // Indicative smoke-direction trails, under the detections.
      ensureLayer(map, {
        id: 'plumes-line',
        type: 'line',
        source: 'plumes',
        layout: { 'line-cap': 'round', 'line-join': 'round', visibility: 'none' },
        paint: {
          'line-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            4,
            ['*', 3, ['get', 'w']],
            7,
            ['*', 6, ['get', 'w']],
            10,
            ['*', 12, ['get', 'w']],
          ],
          'line-blur': ['interpolate', ['linear'], ['zoom'], 4, 1.5, 10, 6],
          'line-gradient': [
            'interpolate',
            ['linear'],
            ['line-progress'],
            0,
            withAlpha(p.plumeA, dark ? 0.95 : 0.85),
            0.5,
            withAlpha(p.plumeB, dark ? 0.6 : 0.5),
            1,
            withAlpha(p.plumeB, 0),
          ],
        },
      });
      ensureLayer(map, {
        id: 'wind-flow-line',
        type: 'line',
        source: 'wind-flow',
        paint: {
          'line-color': p.windB,
          'line-width': 2.5,
          'line-dasharray': [2, 2],
          'line-opacity': 0.85,
        },
      });
      addHotspotLayers(map, p);
      ensureSource(map, 'location', {
        type: 'geojson',
        data: {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [center.lon, center.lat] },
          properties: {},
        },
      });
      ensureLayer(map, {
        id: 'location-halo',
        type: 'circle',
        source: 'location',
        paint: { 'circle-radius': 20, 'circle-color': p.location, 'circle-opacity': 0.16 },
      });
      ensureLayer(map, {
        id: 'location',
        type: 'circle',
        source: 'location',
        paint: {
          'circle-radius': 8,
          'circle-color': p.location,
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 3,
        },
      });

      map.on('click', (e) => {
        const hit = map.queryRenderedFeatures(e.point, { layers: ['hotspot-hit', 'clusters'] });
        const f = hit[0];
        if (!f || f.geometry.type !== 'Point') {
          onSelectRef.current?.(null);
          return;
        }
        const clusterId = f.properties?.['cluster_id'];
        if (typeof clusterId === 'number') {
          const coords = f.geometry.coordinates.slice(0, 2) as [number, number];
          (map.getSource('hotspots') as GeoJSONSource | undefined)
            ?.getClusterExpansionZoom(clusterId)
            .then((zoom) => map.easeTo({ center: coords, zoom: zoom + 0.2 }))
            .catch(() => {
              // expansion unavailable — stay at the current view
            });
          return;
        }
        onSelectRef.current?.(f.properties ?? {});
      });
      for (const id of ['hotspot-hit', 'clusters']) {
        map.on('mouseenter', id, () => (map.getCanvas().style.cursor = 'pointer'));
        map.on('mouseleave', id, () => (map.getCanvas().style.cursor = ''));
      }
      onReadyRef.current?.(map);
      map.fire('pavana:ready');
    });

    return () => {
      loadedRef.current = false;
      mapRef.current = null;
      onReadyRef.current?.(null);
      if (map) {
        const position = map.getCenter();
        cameraRef.current = {
          locationKey,
          center: [position.lng, position.lat],
          zoom: map.getZoom(),
          bearing: map.getBearing(),
          pitch: map.getPitch(),
          fitKey: fittedRef.current,
        };
        map.remove();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- recreate only when the center or style moves
  }, [center.lat, center.lon, style]);

  // Push data/visibility updates once the style is ready.
  // First batch also fits the viewport (explicit fitTo bbox wins over data bounds).
  const lastDensityRef = useRef<{ source: ImageSource; canvas: HTMLCanvasElement } | null>(null);
  const fitKeyFor = () =>
    fitTo ? `fit:${fitTo.join(',')}` : `data:${center.lat},${center.lon},${hotspots.length}`;
  const paddingKey = JSON.stringify(insets);
  const doFit = (map: maplibregl.Map) => {
    fittedPaddingRef.current = paddingKey;
    fittedRef.current = fitKeyFor();
    const bounds = new maplibregl.LngLatBounds([center.lon, center.lat], [center.lon, center.lat]);
    if (fitTo != null) {
      bounds.extend([fitTo[0], fitTo[1]]);
      bounds.extend([fitTo[2], fitTo[3]]);
    } else {
      for (const h of hotspots) bounds.extend([h.lon, h.lat]);
    }
    map.resize();
    const pad = fitTo != null ? 12 : 40;
    const i = insets ?? { top: 0, right: 0, bottom: 0, left: 0 };
    // Guard against insets larger than the canvas (tiny containers).
    const h = map.getContainer().clientHeight;
    const vertical = i.top + i.bottom + 2 * pad < h - 80;
    map.fitBounds(bounds, {
      padding: {
        top: (vertical ? i.top : 0) + pad,
        bottom: (vertical ? i.bottom : 0) + pad,
        left: i.left + pad,
        right: i.right + pad,
      },
      maxZoom: fitMaxZoom,
      duration: 0,
    });
  };
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const update = () => {
      const geo = toGeoJSON(hotspots);
      (map.getSource('hotspots') as GeoJSONSource | undefined)?.setData(geo);
      (map.getSource('hotspots-raw') as GeoJSONSource | undefined)?.setData(geo);
      for (const id of [...HOTSPOT_LAYERS, 'hotspot-selected']) {
        if (map.getLayer(id)) {
          map.setLayoutProperty(id, 'visibility', showHotspots ? 'visible' : 'none');
        }
      }
      // Regional density raster: inserted below the style's water layer so the
      // sea stays uncolored and coastlines/roads/labels stay on top.
      const rasterVisible = showDensity && density != null;
      if (rasterVisible && density) {
        const src = map.getSource('density-src') as ImageSource | undefined;
        if (
          src &&
          (lastDensityRef.current?.source !== src || lastDensityRef.current.canvas !== density.canvas)
        ) {
          lastDensityRef.current = { source: src, canvas: density.canvas };
          src.updateImage({ url: density.canvas.toDataURL(), coordinates: density.coords });
        }
        if (!map.getLayer(RASTER_ID)) {
          const layers = map.getStyle()?.layers ?? [];
          const below = layers.find((l) => l.id === 'water')?.id ?? firstSymbolId(map);
          ensureLayer(
            map,
            {
              id: RASTER_ID,
              type: 'raster',
              source: 'density-src',
              paint: { 'raster-opacity': 1, 'raster-fade-duration': 0 },
            },
            below,
          );
        }
        map.setLayoutProperty(RASTER_ID, 'visibility', 'visible');
      } else if (map.getLayer(RASTER_ID)) {
        map.setLayoutProperty(RASTER_ID, 'visibility', 'none');
      }
      // The density raster already carries the regional picture; avoid a double glow.
      if (map.getLayer('hotspot-heat') && showHotspots) {
        map.setLayoutProperty('hotspot-heat', 'visibility', rasterVisible ? 'none' : 'visible');
      }
      const windSource = map.getSource('wind-flow') as GeoJSONSource | undefined;
      // Single local streamline only outside the regional fit (regional view
      // uses the streamline field instead).
      const showLocalLine = showWind && windFlow != null && streamlines == null;
      windSource?.setData({
        type: 'FeatureCollection',
        features: showLocalLine
          ? [{ type: 'Feature', geometry: windLine(center, windFlow!), properties: {} }]
          : [],
      });
      if (map.getLayer('wind-flow-line')) {
        map.setLayoutProperty('wind-flow-line', 'visibility', showLocalLine ? 'visible' : 'none');
      }
      (map.getSource('wind-streamlines') as GeoJSONSource | undefined)?.setData({
        type: 'FeatureCollection',
        features: (streamlines?.lines ?? []).map((l) => ({
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: l.points },
          properties: {},
        })),
      });
      (map.getSource('wind-arrows') as GeoJSONSource | undefined)?.setData({
        type: 'FeatureCollection',
        features: (streamlines?.arrows ?? []).map((a) => ({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [a.lon, a.lat] },
          properties: { rot: a.rot },
        })),
      });
      // Dimmer under the density raster or the smoke trails.
      const slOpacity = showDensity ? 0.35 : showPlumes ? 0.45 : 0.75;
      for (const id of ['wind-streamlines-line', 'wind-streamlines-arrow']) {
        if (map.getLayer(id)) {
          map.setLayoutProperty(id, 'visibility', showWind ? 'visible' : 'none');
        }
      }
      if (map.getLayer('wind-streamlines-line')) {
        map.setPaintProperty('wind-streamlines-line', 'line-opacity', slOpacity);
      }
      if (map.getLayer('wind-streamlines-arrow')) {
        map.setPaintProperty('wind-streamlines-arrow', 'icon-opacity', slOpacity + 0.15);
      }
      (map.getSource('plumes') as GeoJSONSource | undefined)?.setData({
        type: 'FeatureCollection',
        features: (plumes ?? [])
          .filter((p) => p.points.length > 1)
          .map((p) => ({
            type: 'Feature',
            geometry: { type: 'LineString', coordinates: p.points },
            properties: { w: p.weight },
          })),
      });
      if (map.getLayer('plumes-line')) {
        map.setLayoutProperty(
          'plumes-line',
          'visibility',
          showPlumes && plumes ? 'visible' : 'none',
        );
      }
      if (
        autoFit &&
        (fittedRef.current !== fitKeyFor() ||
          (!interactedRef.current && fittedPaddingRef.current !== paddingKey)) &&
        (fitTo != null || hotspots.length > 0)
      ) {
        doFit(map);
      }
    };
    if (loadedRef.current) update();
    else map.once('pavana:ready', update);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- center/style keyed via fitKey; map via ref
  }, [
    hotspots,
    showHotspots,
    showDensity,
    showWind,
    windFlow,
    streamlines,
    fitTo,
    plumes,
    showPlumes,
    style,
    autoFit,
    paddingKey,
  ]);

  // Selected-detection ring.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const apply = () => {
      if (map.getLayer('hotspot-selected')) {
        map.setFilter('hotspot-selected', ['==', ['get', 'id'], selectedId ?? '']);
      }
    };
    if (loadedRef.current) apply();
    else map.once('pavana:ready', apply);
  }, [selectedId, style]);

  // Extension point: generic extra data layers, below basemap labels.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const sync = () => {
      const wanted = new Set(overlays.map((o) => `ovl-${o.id}`));
      for (const layer of map.getStyle()?.layers ?? []) {
        if (layer.id.startsWith('ovl-') && !wanted.has(layer.id)) {
          map.removeLayer(layer.id);
          if (map.getSource(layer.id)) map.removeSource(layer.id);
        }
      }
      const before = map.getLayer('wind-streamlines-line') ? 'wind-streamlines-line' : undefined;
      for (const o of overlays) {
        const id = `ovl-${o.id}`;
        const has: ExpressionSpecification = [
          'all',
          ['has', o.valueProperty],
          ['!=', ['get', o.valueProperty], null],
        ];
        const ramp = o.stops.flatMap(([v, c]) => [v, c]);
        if (!map.getSource(id)) map.addSource(id, { type: 'geojson', data: o.data });
        else (map.getSource(id) as GeoJSONSource).setData(o.data);
        if (o.type === 'fill') {
          ensureLayer(
            map,
            {
              id,
              type: 'fill',
              source: id,
              filter: has,
              paint: {
                'fill-color': [
                  'interpolate',
                  ['linear'],
                  ['get', o.valueProperty],
                  ...ramp,
                ] as ExpressionSpecification,
                'fill-opacity': o.opacity ?? 0.55,
              },
            },
            before,
          );
        } else {
          ensureLayer(
            map,
            {
              id,
              type: 'heatmap',
              source: id,
              filter: has,
              paint: {
                'heatmap-weight': ['get', o.valueProperty],
                'heatmap-color': [
                  'interpolate',
                  ['linear'],
                  ['heatmap-density'],
                  ...ramp,
                ] as ExpressionSpecification,
                'heatmap-opacity': o.opacity ?? 0.6,
              },
            },
            before,
          );
        }
        map.setLayoutProperty(id, 'visibility', o.visible === false ? 'none' : 'visible');
      }
    };
    if (loadedRef.current) sync();
    else map.once('pavana:ready', sync);
  }, [overlays, style]);

  // Fit button: refit on demand (e.g. after the user pans away).
  const prevNonceRef = useRef(fitNonce);
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loadedRef.current) return;
    if (prevNonceRef.current === fitNonce) return;
    prevNonceRef.current = fitNonce;
    doFit(map);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- doFit reads latest props by design
  }, [fitNonce]);

  // Keep the map sized to its final container (responsive layouts).
  useEffect(() => {
    const map = mapRef.current;
    const el = ref.current;
    if (!map || !el || typeof ResizeObserver === 'undefined') return;
    const obs = new ResizeObserver(() => {
      if (loadedRef.current) map.resize();
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, [style]);

  // Wind flow arrow at the selected location (real current wind, null-safe).
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    let marker: maplibregl.Marker | null = null;
    const place = () => {
      if (!showWind || wind == null) return;
      const p = readMapPalette(dark);
      const flow = windFromToFlowBearing(wind.fromDeg);
      const el = document.createElement('div');
      el.setAttribute('aria-hidden', 'true');
      el.style.width = '38px';
      el.style.height = '38px';
      el.style.filter = `drop-shadow(0 0 6px ${withAlpha(p.windB, dark ? 0.65 : 0.4)})`;
      el.innerHTML =
        `<svg width="38" height="38" viewBox="0 0 38 38" fill="none">` +
        `<g transform="rotate(${flow} 19 19)">` +
        `<path d="M19 6 L27 24 L19 19.5 L11 24 Z" fill="${p.windB}" stroke="#ffffff" stroke-width="1.5" stroke-linejoin="round"/>` +
        `</g></svg>`;
      marker = new maplibregl.Marker({ element: el })
        .setLngLat([center.lon, center.lat])
        .addTo(map);
    };
    if (loadedRef.current) place();
    else map.once('pavana:ready', place);
    return () => {
      map.off('pavana:ready', place);
      marker?.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deps are wind primitives + center; the object identity changes every render
  }, [showWind, wind?.fromDeg, wind?.speedMs, center.lat, center.lon, style]);

  // Traveling dot along the wind streamline (subtle motion cue, reduced-motion aware).
  useEffect(() => {
    const map = mapRef.current;
    const reduced =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!map || !showWind || !animatedWind || reduced || windFlow == null) return;
    const place = () => {
      const p = readMapPalette(dark);
      const el = document.createElement('div');
      el.setAttribute('aria-hidden', 'true');
      el.style.width = '10px';
      el.style.height = '10px';
      el.style.borderRadius = '9999px';
      el.style.background = p.windB;
      el.style.boxShadow = `0 0 10px ${withAlpha(p.windB, 0.8)}`;
      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([center.lon, center.lat])
        .addTo(map);
      const line = windLine(center, windFlow).coordinates;
      const [x0 = center.lon, y0 = center.lat] = line[0] ?? [];
      const [x1 = center.lon, y1 = center.lat] = line[1] ?? [];
      const start = performance.now();
      const DURATION = 6000;
      let raf = 0;
      const tick = (now: number) => {
        const k = ((now - start) % DURATION) / DURATION;
        marker.setLngLat([x0 + (x1 - x0) * k, y0 + (y1 - y0) * k]);
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
      return () => {
        cancelAnimationFrame(raf);
        marker.remove();
      };
    };
    let cleanup: (() => void) | undefined;
    const onReady = () => {
      cleanup = place();
    };
    if (loadedRef.current) cleanup = place();
    else map.once('pavana:ready', onReady);
    return () => {
      map.off('pavana:ready', onReady);
      cleanup?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- primitives + center; see above
  }, [showWind, animatedWind, windFlow, center.lat, center.lon, style]);

  return <div ref={ref} className="pv-map h-full w-full" role="region" aria-label={t.map.title} />;
}
