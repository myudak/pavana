import { useMemo } from 'react';
import {
  BORNEO_RENDER_BBOX,
  hotspotWeight,
  tracePlumes,
  traceStreamlines,
  STREAMLINE_TARGET_COUNT,
  STREAMLINE_MIN_SPACING_KM,
  STREAMLINE_STEP_KM,
  STREAMLINE_MIN_LENGTH_KM,
  STREAMLINE_MAX_LENGTH_KM,
  STREAMLINE_MIN_SPEED_MS,
  STREAMLINE_SEED,
} from '@pavana/shared';
import { useWindField } from '../lib/queries';
import { useSettings } from '../lib/settings';
import { t } from '../lib/copy';
import type { HotspotMapProps } from './CoordinateMap';

export type MapLayer = 'hotspots' | 'density' | 'wind' | 'plumes';
export const DEFAULT_LAYERS: MapLayer[] = ['hotspots', 'plumes', 'wind'];
const serialize = (data: unknown) => JSON.stringify(data).replace(/</g, '\\u003c');

/** Only the geographic canvas uses a WebView; navigation and screens remain native. */
export function useMapDocument({ location, hotspots, compact, plumeHours = 6 }: HotspotMapProps) {
  const wind = useWindField();
  const { isDark } = useSettings();
  return useMemo(() => {
    const lines = wind.data
      ? traceStreamlines(wind.data, BORNEO_RENDER_BBOX, {
          targetCount: STREAMLINE_TARGET_COUNT,
          minSpacingKm: STREAMLINE_MIN_SPACING_KM,
          stepKm: STREAMLINE_STEP_KM,
          minLengthKm: STREAMLINE_MIN_LENGTH_KM,
          maxLengthKm: STREAMLINE_MAX_LENGTH_KM,
          minSpeedMs: STREAMLINE_MIN_SPEED_MS,
          seed: STREAMLINE_SEED,
        })
      : null;
    const sources = hotspots
      .map((h) => ({ lat: h.lat, lon: h.lon, weight: hotspotWeight(h.frpMw) }))
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 160);
    const strongest = sources[0]?.weight ?? 1;
    const plumes = wind.data
      ? tracePlumes(
          sources.map((s) => ({ ...s, weight: 0.35 + (0.65 * s.weight) / strongest })),
          wind.data,
          { hours: plumeHours, stepMinutes: 30 },
        )
      : [];
    const points = {
      type: 'FeatureCollection',
      features: hotspots.map((h) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [h.lon, h.lat] },
        properties: { id: h.id, weight: hotspotWeight(h.frpMw) },
      })),
    };
    const flow = {
      type: 'FeatureCollection',
      features: (lines?.lines ?? []).map((l) => ({
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: l.points },
        properties: {},
      })),
    };
    const trails = {
      type: 'FeatureCollection',
      features: plumes
        .filter((p) => p.points.length > 1)
        .map((p) => ({
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: p.points },
          properties: { weight: p.weight },
        })),
    };
    return `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1"><link href="https://cdn.jsdelivr.net/npm/maplibre-gl@5.24.0/dist/maplibre-gl.css" rel="stylesheet"><style>html,body,#map{margin:0;width:100%;height:100%;background:${isDark ? '#0e1120' : '#f5f1eb'};font-family:sans-serif}#status{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;padding:25px;text-align:center;font-size:13px;color:${isDark ? '#eef0f4' : '#1f2937'};pointer-events:none}.maplibregl-ctrl-attrib{font-size:9px!important}.maplibregl-ctrl-bottom-right{bottom:${compact ? 0 : 310}px!important}</style></head><body><div id="map"></div><div id="status"></div><script src="https://cdn.jsdelivr.net/npm/maplibre-gl@5.24.0/dist/maplibre-gl.js"></script><script>
    const status=document.getElementById('status');status.textContent=${serialize(t.mobile.mapLoading)};
    const send=(data)=>{const text=JSON.stringify(data);if(window.ReactNativeWebView)window.ReactNativeWebView.postMessage(text);else parent.postMessage(data,'*');};
    try {
      const map=new maplibregl.Map({container:'map',style:${serialize(isDark ? 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json' : 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json')},center:[${location.lon},${location.lat}],zoom:${compact ? 6 : 6.5},attributionControl:{compact:true}});
      let loaded=false, layers=['hotspots','plumes','wind'];
      const visibility=()=>{if(!loaded)return;['hotspots','density','wind','plumes'].forEach(id=>map.setLayoutProperty(id,'visibility',layers.includes(id)?'visible':'none'));};
      window.pavanaSetLayers=(value)=>{layers=value;visibility();};
      window.pavanaRegion=(region)=>map.fitBounds(region?${serialize(BORNEO_RENDER_BBOX)}:[${location.lon - 1.1},${location.lat - 1.1},${location.lon + 1.1},${location.lat + 1.1}],{padding:60,duration:600});
      window.addEventListener('message',event=>{if(event.data?.type==='layers')window.pavanaSetLayers(event.data.value);if(event.data?.type==='region')window.pavanaRegion(event.data.value);});
      map.on('load',()=>{
        loaded=true;status.style.display='none';send({type:'ready'});
        map.addSource('detections',{type:'geojson',data:${serialize(points)}});
        map.addSource('flow',{type:'geojson',data:${serialize(flow)}});
        map.addSource('trails',{type:'geojson',data:${serialize(trails)}});
        map.addLayer({id:'density',type:'heatmap',source:'detections',paint:{'heatmap-weight':['get','weight'],'heatmap-intensity':0.8,'heatmap-radius':45,'heatmap-opacity':0.6,'heatmap-color':['interpolate',['linear'],['heatmap-density'],0,'rgba(59,130,246,0)',0.25,'#6366f1',0.5,'#c084fc',0.75,'#f472b6',1,'#fb923c']}});
        map.addLayer({id:'wind',type:'line',source:'flow',paint:{'line-color':'#a5b4fc','line-opacity':0.4,'line-width':1.3,'line-dasharray':[2,3]},layout:{'line-cap':'round','line-join':'round'}});
        map.addLayer({id:'plumes',type:'line',source:'trails',paint:{'line-color':'#c084fc','line-opacity':0.6,'line-width':['interpolate',['linear'],['get','weight'],0,2,1,6],'line-blur':2},layout:{'line-cap':'round','line-join':'round'}});
        map.addLayer({id:'hotspots',type:'circle',source:'detections',paint:{'circle-radius':['interpolate',['linear'],['zoom'],4,3,10,7],'circle-color':'#fb7185','circle-stroke-width':1,'circle-stroke-color':'#ffe4e6','circle-opacity':0.85}});
        map.addSource('location',{type:'geojson',data:{type:'Feature',geometry:{type:'Point',coordinates:[${location.lon},${location.lat}]}}});
        map.addLayer({id:'location',type:'circle',source:'location',paint:{'circle-radius':7,'circle-color':'#818cf8','circle-stroke-width':3,'circle-stroke-color':'#fff'}});
        map.on('click','hotspots',event=>{const id=event.features?.[0]?.properties?.id;if(id)send({type:'select',id});});
        visibility();
      });
      map.on('error',()=>{if(!loaded){status.textContent=${serialize(t.mobile.mapUnavailable)};send({type:'error'});}});
    } catch(error) {status.textContent=${serialize(t.mobile.mapUnavailable)};send({type:'error'});}
    </script></body></html>`;
  }, [location.lat, location.lon, hotspots, compact, isDark, wind.data, plumeHours]);
}
