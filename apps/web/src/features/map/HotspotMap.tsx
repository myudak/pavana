import type { Hotspot, LatLon } from '@pavana/shared';
import type { FeatureCollection, Point } from 'geojson';
import maplibregl, { type GeoJSONSource } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useEffect, useRef } from 'react';
import { cssVar } from '@/lib/aq';
import { formatDateTime } from '@/lib/format';
import { useCopy, type Copy } from '@/lib/i18n';

const STYLE_URL = import.meta.env.VITE_MAP_STYLE_URL || 'https://demotiles.maplibre.org/style.json';

function toGeoJSON(hotspots: Hotspot[]): FeatureCollection<Point> {
  return {
    type: 'FeatureCollection',
    features: hotspots.map((h) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [h.lon, h.lat] },
      properties: {
        id: h.id,
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
  timeZone,
  onError,
}: {
  center: LatLon;
  hotspots: Hotspot[];
  showHotspots: boolean;
  timeZone: string;
  onError: () => void;
}) {
  const t = useCopy();
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const loadedRef = useRef(false);

  // Create the map once per center.
  useEffect(() => {
    if (!ref.current) return;
    let map: maplibregl.Map;
    try {
      map = new maplibregl.Map({
        container: ref.current,
        style: STYLE_URL,
        center: [center.lon, center.lat],
        zoom: 7.5,
        attributionControl: { compact: true },
      });
    } catch {
      onError(); // e.g. WebGL unavailable
      return;
    }
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    map.on('error', (e) => {
      if (!loadedRef.current) {
        console.error('[map]', e.error);
        onError();
      }
    });

    map.on('load', () => {
      loadedRef.current = true;
      map.addSource('hotspots', { type: 'geojson', data: toGeoJSON([]) });
      map.addLayer({
        id: 'hotspots',
        type: 'circle',
        source: 'hotspots',
        paint: {
          'circle-radius': 6,
          'circle-color': cssVar('--pv-aq-unhealthy') || '#dc2626',
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 1.5,
          'circle-opacity': 0.9,
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
        new maplibregl.Popup({ closeButton: true, maxWidth: '260px' })
          .setLngLat(f.geometry.coordinates as [number, number])
          .setDOMContent(popupContent(f.properties ?? {}, t, timeZone))
          .addTo(map);
      });
      map.on('mouseenter', 'hotspots', () => (map.getCanvas().style.cursor = 'pointer'));
      map.on('mouseleave', 'hotspots', () => (map.getCanvas().style.cursor = ''));
      map.fire('pavana:ready');
    });

    return () => {
      loadedRef.current = false;
      mapRef.current = null;
      map.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- recreate only when the center moves
  }, [center.lat, center.lon]);

  // Push data/visibility updates once the style is ready.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const update = () => {
      (map.getSource('hotspots') as GeoJSONSource | undefined)?.setData(toGeoJSON(hotspots));
      if (map.getLayer('hotspots')) {
        map.setLayoutProperty('hotspots', 'visibility', showHotspots ? 'visible' : 'none');
      }
    };
    if (loadedRef.current) update();
    else map.once('pavana:ready', update);
  }, [hotspots, showHotspots]);

  return <div ref={ref} className="h-full w-full" role="region" aria-label={t.map.title} />;
}
