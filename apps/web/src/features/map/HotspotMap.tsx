import type { Hotspot, LatLon } from '@pavana/shared';
import {
  bearingToUnitVector,
  EARTH_RADIUS_KM,
  windFromToFlowBearing,
} from '@pavana/shared';
import type { FeatureCollection, LineString, Point } from 'geojson';
import maplibregl, { type GeoJSONSource } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useEffect, useRef } from 'react';
import { cssVar } from '@/lib/aq';
import { formatDateTime } from '@/lib/format';
import { useCopy, type Copy } from '@/lib/i18n';

const STYLE_URL = import.meta.env.VITE_MAP_STYLE_URL || 'https://demotiles.maplibre.org/style.json';

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
  timeZone,
  onError,
  styleUrl,
  wind,
  onSelectHotspot,
}: {
  center: LatLon;
  hotspots: Hotspot[];
  showHotspots: boolean;
  /** Detection-density heatmap (kernel render of real detections, not PM2.5). */
  showDensity?: boolean;
  showWind?: boolean;
  /** Traveling dot along the wind streamline. Honors reduced-motion. */
  animatedWind?: boolean;
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
    map.on('error', (e) => {
      if (!loadedRef.current) {
        console.error('[map]', e.error);
        onError();
      }
    });

    map.on('load', () => {
      loadedRef.current = true;
      fittedRef.current = '';
      map.addSource('hotspots', {
        type: 'geojson',
        data: toGeoJSON([]),
        cluster: true,
        clusterMaxZoom: 12,
        clusterRadius: 60,
      });
      const hotspotColor = cssVar('--pv-aq-unhealthy') || '#dc2626';
      // Soft halo beneath each detection (decorative luminance; color still semantic).
      map.addLayer({
        id: 'hotspot-glow',
        type: 'circle',
        source: 'hotspots',
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-radius': 10,
          'circle-color': hotspotColor,
          'circle-opacity': 0.22,
        },
      });
      map.addLayer({
        id: 'hotspots',
        type: 'circle',
        source: 'hotspots',
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-radius': 6,
          'circle-color': hotspotColor,
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 1.5,
          'circle-opacity': 0.9,
        },
      });
      // Cluster bubbles for overlapping detections (MapLibre built-in clustering).
      map.addLayer({
        id: 'clusters',
        type: 'circle',
        source: 'hotspots',
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': cssVar('--pv-primary') || '#6366f1',
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 1.5,
          'circle-radius': ['step', ['get', 'point_count'], 16, 5, 20, 10, 26],
        },
      });
      map.addLayer({
        id: 'cluster-count',
        type: 'symbol',
        source: 'hotspots',
        filter: ['has', 'point_count'],
        layout: {
          'text-field': ['get', 'point_count_abbreviated'],
          'text-size': 12,
        },
        paint: { 'text-color': '#ffffff' },
      });
      // Separate unclustered source for the heatmap: clustering would otherwise
      // feed cluster pseudo-points (no FRP) into the density kernel.
      map.addSource('heatmap-src', {
        type: 'geojson',
        data: toGeoJSON([]),
      });
      // Detection-density heatmap (kernel render of the real hotspot points,
      // weighted by FRP; NOT PM2.5 concentrations).
      map.addLayer(
        {
          id: 'heatmap-density',
          type: 'heatmap',
          source: 'heatmap-src',
          paint: {
            'heatmap-weight': [
              'max',
              0.3,
              ['interpolate', ['linear'], ['coalesce', ['get', 'frpMw'], 0], 0, 0.3, 30, 1],
            ],
            'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 7, 1, 12, 3],
            'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 7, 30, 12, 70],
            'heatmap-color': [
              'interpolate',
              ['linear'],
              ['heatmap-density'],
              0,
              'rgba(59,130,246,0)',
              0.25,
              '#3b82f6',
              0.45,
              '#6366f1',
              0.65,
              '#a855f7',
              0.85,
              '#f472b6',
              1,
              '#fbcfe8',
            ],
            'heatmap-opacity': 0.8,
          },
        },
        'hotspot-glow',
      );
      map.addSource('wind-flow', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });
      map.addLayer({
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
      map.addSource('location', {
        type: 'geojson',
        data: {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [center.lon, center.lat] },
          properties: {},
        },
      });
      map.addLayer({
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
  // First data batch also fits the viewport to the detections + location.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const update = () => {
      const geo = toGeoJSON(hotspots);
      (map.getSource('hotspots') as GeoJSONSource | undefined)?.setData(geo);
      (map.getSource('heatmap-src') as GeoJSONSource | undefined)?.setData(geo);
      for (const id of ['hotspots', 'hotspot-glow', 'clusters', 'cluster-count']) {
        if (map.getLayer(id)) {
          map.setLayoutProperty(id, 'visibility', showHotspots ? 'visible' : 'none');
        }
      }
      if (map.getLayer('heatmap-density')) {
        map.setLayoutProperty(
          'heatmap-density',
          'visibility',
          showDensity ? 'visible' : 'none',
        );
      }
      const windSource = map.getSource('wind-flow') as GeoJSONSource | undefined;
      windSource?.setData({
        type: 'FeatureCollection',
        features:
          showWind && windFlow != null
            ? [{ type: 'Feature', geometry: windLine(center, windFlow), properties: {} }]
            : [],
      });
      if (map.getLayer('wind-flow-line')) {
        map.setLayoutProperty(
          'wind-flow-line',
          'visibility',
          showWind && windFlow != null ? 'visible' : 'none',
        );
      }
      const fitKey = `${center.lat},${center.lon},${style}`;
      if (hotspots.length > 0 && fittedRef.current !== fitKey) {
        fittedRef.current = fitKey;
        const bounds = new maplibregl.LngLatBounds(
          [center.lon, center.lat],
          [center.lon, center.lat],
        );
        for (const h of hotspots) bounds.extend([h.lon, h.lat]);
        map.fitBounds(bounds, { padding: 70, maxZoom: 11, duration: 0 });
      }
    };
    if (loadedRef.current) update();
    else map.once('pavana:ready', update);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- center/style keyed via fitKey; map via ref
  }, [hotspots, showHotspots, showDensity, showWind, windFlow]);

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
