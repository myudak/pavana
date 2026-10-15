import { useEffect, useRef } from 'react';
import { DEFAULT_LAYERS, useMapDocument } from './map-document';
import type { HotspotMapProps } from './CoordinateMap';
export default function HotspotMap(props: HotspotMapProps) {
  const ref = useRef<HTMLIFrameElement>(null);
  const html = useMapDocument(props);
  const layers = props.layers ?? DEFAULT_LAYERS;
  useEffect(() => {
    ref.current?.contentWindow?.postMessage({ type: 'layers', value: layers }, '*');
  }, [layers]);
  useEffect(() => {
    ref.current?.contentWindow?.postMessage({ type: 'region', value: props.region === true }, '*');
  }, [props.region]);
  useEffect(() => {
    const handle = (event: MessageEvent) => {
      if (event.source !== ref.current?.contentWindow) return;
      if (event.data?.type === 'ready') {
        ref.current?.contentWindow?.postMessage({ type: 'layers', value: layers }, '*');
        ref.current?.contentWindow?.postMessage(
          { type: 'region', value: props.region === true },
          '*',
        );
      }
      if (event.data?.type === 'select') {
        const selected = props.hotspots.find((h) => h.id === event.data.id);
        if (selected) props.onSelect(selected);
      }
    };
    window.addEventListener('message', handle);
    return () => window.removeEventListener('message', handle);
  }, [props, layers]);
  return (
    <iframe
      ref={ref}
      title="Pavana MapLibre"
      srcDoc={html}
      sandbox="allow-scripts allow-same-origin"
      style={{ border: 0, width: '100%', height: '100%', position: 'absolute', inset: 0 }}
    />
  );
}
