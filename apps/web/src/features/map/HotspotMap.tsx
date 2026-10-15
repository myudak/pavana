import type { Hotspot, LatLon } from '@pavana/shared';
import {
  bearingToUnitVector,
  EARTH_RADIUS_KM,
  windFromToFlowBearing,
  type BBox,
  type StreamlineField,
} from '@pavana/shared';
import type { FeatureCollection, LineString, Point } from 'geojson';
import maplibregl, { type GeoJSONSource, type ImageSource } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useEffect, useRef } from 'react';
import { cssVar } from '@/lib/aq';
import { formatDateTime } from '@/lib/format';
import { useCopy, type Copy } from '@/lib/i18n';

const STYLE_URL = import.meta.env.VITE_MAP_STYLE_URL || 'https://demotiles.maplibre.org/style.json';

const RASTER_ID = 'density-raster';

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

/** 1px transparent placeholder so the image source exists before data arrives. */
function transparentPixel(): string {
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  return canvas.toDataURL();
}

/** Small up-pointing triangle sprite for streamline direction arrows. */
function windArrowImage(): ImageData {
  const canvas = document.createElement('canvas');
  canvas.width = 24;
  canvas.height = 24;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#f472b6';
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
  const dLon =
    ((eastKm / EARTH_RADIUS_KM) * (180 / Math.PI)) / Math.cos((c.lat * Math.PI) / 180);
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
  return {
    type: 'FeatureCollection',
    features: hotspots.map((h) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [h.lon, h.lat] },
      properties: {
        id: h.id,
        lat: h.lat,
        lon: h.lon,
        acquiredAt: h.acquiredAt,
        frpMw: h.frpMw,
        confidence: h.confidence,
        satellite: `${h.satellite} · ${h.instrument}`,
        isDemo: h.provenance.isDemo,
      },
    })),
  };
}

/** Popup DOM built with textContent (no HTML injection). */
function popupContent(props: Record<string, unknown>, t: Copy, timeZone: string): HTMLElement {
  const el = document.createElement('div');
  el.className = 'space-y-1 text-sm text-neutral-900';
  const rows: [string, string][] = [
    [t.map.acquired, formatDateTime(String(props.acquiredAt), timeZone)],
    [t.map.frp, props.frpMw == null || props.frpMw === 'null' ? '—' : `${props.frpMw} MW`],
    [t.map.confidence, String(props.confidence ?? '—')],
    [t.map.satellite, String(props.satellite)],
  ];
  for (const [k, v] of rows) {
    const p = document.createElement('p');
    const b = document.createElement('strong');
    b.textContent = `${k}: `;
    p.append(b, v);
    el.append(p);
  }
  const note = document.createElement('p');
  note.className = 'pt-1 text-xs text-neutral-600';
  note.textContent = t.map.hotspotDisclaimer + (props.isDemo ? ` (${t.demoBanner})` : '');
  el.append(note);
  return el;
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
  streamlines = null,
  fitNonce = 0,
  timeZone,
  onError,
  styleUrl,
  wind,
  onSelectHotspot,
}: {
  center: LatLon;
  hotspots: Hotspot[];
  showHotspots: boolean;
  /** Regional density raster (canvas). Null/absent hides the layer. */
  showDensity?: boolean;
  showWind?: boolean;
  /** Traveling dot along the wind streamline. Honors reduced-motion. */
  animatedWind?: boolean;
  /** Pre-rendered density canvas + corner coordinates, or null. */
  density?: { canvas: HTMLCanvasElement; coords: [[number, number], [number, number], [number, number], [number, number]] } | null;
  /** Fit the viewport to this bbox instead of the data bounds. */
  fitTo?: BBox | null;
  /** Regional wind streamlines (flow direction). Null hides the layers. */
  streamlines?: StreamlineField | null;
  /** Increment to refit the viewport (fit button). */
  fitNonce?: number;
  timeZone: string;
  onError: () => void;
  /** MapLibre style URL. Dark callers pass a dark basemap; falls back to demotiles. */
  styleUrl?: string;
  /** Current wind at the selected location (FROM degrees + speed). Renders a flow arrow. */
  wind?: { fromDeg: number; speedMs: number } | null;
  /** Called with the clicked detection's properties (for the side panel). */
  onSelectHotspot?: (props: Record<string, unknown>) => void;
}) {
  const t = useCopy();
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const loadedRef = useRef(false);
  const fittedRef = useRef('');
  const style = styleUrl || STYLE_URL;
  const windFlow = wind != null ? windFromToFlowBearing(wind.fromDeg) : null;

  // Create the map once per center / style.
  useEffect(() => {
    if (!ref.current) return;
    let map: maplibregl.Map | undefined;
    try {
      map = new maplibregl.Map({
        container: ref.current,
        style,
        center: [center.lon, center.lat],
        zoom: 9,
        attributionControl: { compact: true },
      });
    } catch {
      onError(); // e.g. WebGL unavailable
      return;
    }
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    map.addControl(new maplibregl.FullscreenControl(), 'top-right');
    // Dusk/Haze navy grade over the CARTO dark-matter style (no style fork):
    // background + water go navy/black, admin boundaries dim indigo.
    // Roads, rivers, labels and other layers keep the provider's styling.
    const gradeBasemap = () => {
      if (map.getLayer('background')) {
        map.setPaintProperty('background', 'background-color', '#070b1f');
      }
      if (map.getLayer('water')) {
        map.setPaintProperty('water', 'fill-color', '#050818');
      }
      if (map.getLayer('boundary_state')) {
        map.setPaintProperty('boundary_state', 'line-color', '#5b6ad0');
        map.setPaintProperty('boundary_state', 'line-opacity', 0.35);
      }
      if (map.getLayer('boundary_county')) {
        map.setPaintProperty('boundary_county', 'line-color', '#3a4670');
        map.setPaintProperty('boundary_county', 'line-opacity', 0.3);
      }
    };
    map.on('error', (e) => {
      if (!loadedRef.current) {
        console.error('[map]', e.error);
        onError();
      }
    });

    map.on('load', () => {
      loadedRef.current = true;
      fittedRef.current = '';
      gradeBasemap();
      ensureSource(map, 'hotspots', {
        type: 'geojson',
        data: toGeoJSON([]),
        cluster: true,
        clusterMaxZoom: 12,
        clusterRadius: 60,
      });
      const hotspotColor = cssVar('--pv-aq-unhealthy') || '#dc2626';
      // Soft halo beneath each detection (decorative luminance; color still semantic).
      // Hidden at regional zoom — the raster carries the luminance there.
      ensureLayer(map, {
        id: 'hotspot-glow',
        type: 'circle',
        source: 'hotspots',
        minzoom: 9,
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-radius': 8,
          'circle-color': hotspotColor,
          'circle-opacity': 0.18,
        },
      });
      ensureLayer(map, {
        id: 'hotspots',
        type: 'circle',
        source: 'hotspots',
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 6, 2, 10, 5],
          'circle-color': hotspotColor,
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 1.5,
          'circle-opacity': ['interpolate', ['linear'], ['zoom'], 6, 0.65, 10, 0.9],
        },
      });
      // Cluster bubbles for overlapping detections (hidden at regional zoom).
      ensureLayer(map, {
        id: 'clusters',
        type: 'circle',
        source: 'hotspots',
        minzoom: 7,
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': cssVar('--pv-primary') || '#6366f1',
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 1.5,
          'circle-radius': ['step', ['get', 'point_count'], 16, 5, 20, 10, 26],
        },
      });
      ensureLayer(map, {
        id: 'cluster-count',
        type: 'symbol',
        source: 'hotspots',
        minzoom: 7,
        filter: ['has', 'point_count'],
        layout: {
          'text-field': ['get', 'point_count_abbreviated'],
          'text-size': 12,
        },
        paint: { 'text-color': '#ffffff' },
      });
      // Separate unclustered source for markers is unchanged ('hotspots').
      // The regional density raster below uses its own image source.
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
      ensureSource(map, 'wind-flow', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });
      ensureLayer(map, {
        id: 'wind-flow-line',
        type: 'line',
        source: 'wind-flow',
        paint: {
          'line-color': cssVar('--pv-accent') || '#f472b6',
          'line-width': 2.5,
          'line-dasharray': [2, 2],
          'line-opacity': 0.8,
        },
      });
      // Regional streamlines (below labels, above the raster).
      ensureSource(map, 'wind-streamlines', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });
      ensureSource(map, 'wind-arrows', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });
      if (!map.hasImage('wind-arrow')) {
        map.addImage('wind-arrow', windArrowImage(), { pixelRatio: 2 });
      }
      // Regional streamlines: below basemap labels, above the raster.
      const firstSymbol = map
        .getStyle()
        ?.layers.find((l) => l.type === 'symbol')?.id;
      ensureLayer(map, 
        {
          id: 'wind-streamlines-line',
          type: 'line',
          source: 'wind-streamlines',
          paint: {
            'line-width': 1,
            'line-opacity': 0.55,
            'line-gradient': [
              'interpolate',
              ['linear'],
              ['line-progress'],
              0,
              'rgba(183,166,255,0)',
              0.3,
              '#b7a6ff',
              1,
              '#f08cc8',
            ],
          },
        },
        firstSymbol,
      );
      ensureLayer(map, 
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
      ensureSource(map, 'location', {
        type: 'geojson',
        data: {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [center.lon, center.lat] },
          properties: {},
        },
      });
      ensureLayer(map, {
        id: 'location',
        type: 'circle',
        source: 'location',
        paint: {
          'circle-radius': 9,
          'circle-color': cssVar('--pv-primary') || '#f97316',
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 3,
        },
      });

      map.on('click', 'hotspots', (e) => {
        const f = e.features?.[0];
        if (!f || f.geometry.type !== 'Point') return;
        onSelectHotspot?.(f.properties ?? {});
        new maplibregl.Popup({ closeButton: true, maxWidth: '260px' })
          .setLngLat(f.geometry.coordinates as [number, number])
          .setDOMContent(popupContent(f.properties ?? {}, t, timeZone))
          .addTo(map);
      });
      map.on('click', 'clusters', (e) => {
        const f = e.features?.[0];
        const clusterId = f?.properties?.['cluster_id'];
        if (!f || f.geometry.type !== 'Point' || typeof clusterId !== 'number') return;
        const coords = f.geometry.coordinates.slice(0, 2) as [number, number];
        const source = map.getSource('hotspots') as
          | (GeoJSONSource & { getClusterExpansionZoom(id: number): Promise<number> })
          | undefined;
        source
          ?.getClusterExpansionZoom(clusterId)
          .then((zoom) => {
            map.easeTo({ center: coords, zoom });
          })
          .catch(() => {
            // zoom expansion unavailable — stay at the current view
          });
      });
      map.on('mouseenter', 'hotspots', () => (map.getCanvas().style.cursor = 'pointer'));
      map.on('mouseleave', 'hotspots', () => (map.getCanvas().style.cursor = ''));
      map.on('mouseenter', 'clusters', () => (map.getCanvas().style.cursor = 'pointer'));
      map.on('mouseleave', 'clusters', () => (map.getCanvas().style.cursor = ''));
      map.fire('pavana:ready');
    });

    return () => {
      loadedRef.current = false;
      mapRef.current = null;
      map?.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- recreate only when the center or style moves
  }, [center.lat, center.lon, style]);

  // Push data/visibility updates once the style is ready.
  // First batch also fits the viewport (explicit fitTo bbox wins over data bounds).
  const lastCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const doFit = (map: maplibregl.Map) => {
    const fitKey = fitTo
      ? `fit:${fitTo.join(',')},${style}`
      : `data:${center.lat},${center.lon},${style},${hotspots.length}`;
    fittedRef.current = fitKey;
    const bounds = new maplibregl.LngLatBounds(
      [center.lon, center.lat],
      [center.lon, center.lat],
    );
    if (fitTo != null) {
      bounds.extend([fitTo[0], fitTo[1]]);
      bounds.extend([fitTo[2], fitTo[3]]);
    } else {
      for (const h of hotspots) bounds.extend([h.lon, h.lat]);
    }
    map.resize();
    map.fitBounds(bounds, {
      padding: fitTo != null ? 32 : 70,
      maxZoom: fitTo != null ? 6 : 11,
      duration: 0,
    });
  };
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const update = () => {
      const geo = toGeoJSON(hotspots);
      (map.getSource('hotspots') as GeoJSONSource | undefined)?.setData(geo);
      for (const id of ['hotspots', 'hotspot-glow', 'clusters', 'cluster-count']) {
        if (map.getLayer(id)) {
          map.setLayoutProperty(id, 'visibility', showHotspots ? 'visible' : 'none');
        }
      }
      // Regional density raster: inserted below the style's water layer so the
      // sea stays uncolored and coastlines/roads/labels stay on top.
      const rasterVisible = showDensity && density != null;
      if (rasterVisible && density) {
        const src = map.getSource('density-src') as ImageSource | undefined;
        if (src && lastCanvasRef.current !== density.canvas) {
          lastCanvasRef.current = density.canvas;
          src.updateImage({ url: density.canvas.toDataURL(), coordinates: density.coords });
        }
        if (!map.getLayer(RASTER_ID)) {
          const layers = map.getStyle()?.layers ?? [];
          const below =
            layers.find((l) => l.id === 'water')?.id ??
            layers.find((l) => l.type === 'symbol')?.id ??
            (map.getLayer('hotspot-glow') ? 'hotspot-glow' : undefined);
          ensureLayer(map, 
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
      const windSource = map.getSource('wind-flow') as GeoJSONSource | undefined;
      // Single local streamline only outside the regional fit (regional view
      // uses the streamline field instead).
      const showLocalLine = showWind && windFlow != null && fitTo == null;
      windSource?.setData({
        type: 'FeatureCollection',
        features: showLocalLine
          ? [{ type: 'Feature', geometry: windLine(center, windFlow!), properties: {} }]
          : [],
      });
      if (map.getLayer('wind-flow-line')) {
        map.setLayoutProperty('wind-flow-line', 'visibility', showLocalLine ? 'visible' : 'none');
      }
      const slSource = map.getSource('wind-streamlines') as GeoJSONSource | undefined;
      slSource?.setData({
        type: 'FeatureCollection',
        features: (streamlines?.lines ?? []).map((l) => ({
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: l.points },
          properties: {},
        })),
      });
      const arrowsSource = map.getSource('wind-arrows') as GeoJSONSource | undefined;
      arrowsSource?.setData({
        type: 'FeatureCollection',
        features: (streamlines?.arrows ?? []).map((a) => ({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [a.lon, a.lat] },
          properties: { rot: a.rot },
        })),
      });
      // Dimmer under the density raster, full strength in the wind tab.
      const slOpacity = showDensity ? 0.3 : 0.7;
      for (const id of ['wind-streamlines-line', 'wind-streamlines-arrow']) {
        if (map.getLayer(id)) {
          map.setLayoutProperty(id, 'visibility', showWind ? 'visible' : 'none');
        }
      }
      if (map.getLayer('wind-streamlines-line')) {
        map.setPaintProperty('wind-streamlines-line', 'line-opacity', slOpacity);
      }
      if (map.getLayer('wind-streamlines-arrow')) {
        map.setPaintProperty('wind-streamlines-arrow', 'icon-opacity', slOpacity + 0.2);
      }
      const fitKey = fitTo
        ? `fit:${fitTo.join(',')},${style}`
        : `data:${center.lat},${center.lon},${style},${hotspots.length}`;
      if (fittedRef.current !== fitKey && (fitTo != null || hotspots.length > 0)) {
        fittedRef.current = fitKey;
        doFit(map);
      }
    };
    if (loadedRef.current) update();
    else map.once('pavana:ready', update);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- center/style keyed via fitKey; map via ref
  }, [hotspots, showHotspots, showDensity, showWind, windFlow, streamlines, fitTo]);

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
  }, []);

  // Wind flow arrow at the selected location (real current wind, null-safe).
  const windMarkerRef = useRef<maplibregl.Marker | null>(null);
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const place = () => {
      windMarkerRef.current?.remove();
      windMarkerRef.current = null;
      if (!showWind || wind == null) return;
      const flow = windFromToFlowBearing(wind.fromDeg);
      const el = document.createElement('div');
      el.setAttribute('aria-hidden', 'true');
      el.style.width = '38px';
      el.style.height = '38px';
      el.style.filter = 'drop-shadow(0 0 8px rgba(244,114,182,0.65))';
      el.innerHTML =
        `<svg width="38" height="38" viewBox="0 0 38 38" fill="none">` +
        `<g transform="rotate(${flow} 19 19)">` +
        `<path d="M19 6 L27 24 L19 19.5 L11 24 Z" fill="#f472b6" stroke="#eef0f4" stroke-width="1.5" stroke-linejoin="round"/>` +
        `</g></svg>`;
      windMarkerRef.current = new maplibregl.Marker({ element: el })
        .setLngLat([center.lon, center.lat])
        .addTo(map);
    };
    if (loadedRef.current) place();
    else map.once('pavana:ready', place);
    return () => {
      windMarkerRef.current?.remove();
      windMarkerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deps are wind primitives + center; the object identity changes every render
  }, [showWind, wind?.fromDeg, wind?.speedMs, center.lat, center.lon]);

  // Traveling dot along the wind streamline (subtle motion cue, reduced-motion aware).
  useEffect(() => {
    const map = mapRef.current;
    const reduced =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!map || !showWind || !animatedWind || reduced || windFlow == null) return;
    const place = () => {
      const el = document.createElement('div');
      el.setAttribute('aria-hidden', 'true');
      el.style.width = '10px';
      el.style.height = '10px';
      el.style.borderRadius = '9999px';
      el.style.background = '#f472b6';
      el.style.boxShadow = '0 0 10px rgba(244,114,182,0.9)';
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
    if (loadedRef.current) cleanup = place();
    else map.once('pavana:ready', () => {
      cleanup = place();
    });
    return () => cleanup?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- primitives + center; see above
  }, [showWind, animatedWind, windFlow, center.lat, center.lon]);

  return (
    <div className="relative h-full w-full">
      <div ref={ref} className="h-full w-full" role="region" aria-label={t.map.title} />
      {/* Decorative depth vignette (styling only — tiles show through). */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 hidden dark:block"
        style={{
          background:
            'radial-gradient(ellipse at center, transparent 52%, rgba(14,17,32,0.55) 100%)',
        }}
      />
    </div>
  );
}
