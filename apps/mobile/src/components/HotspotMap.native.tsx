import { useEffect, useRef } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { DEFAULT_LAYERS, useMapDocument } from './map-document';
import type { HotspotMapProps } from './CoordinateMap';
export default function HotspotMap(props: HotspotMapProps) {
  const ref = useRef<WebView>(null);
  const html = useMapDocument(props);
  const layers = JSON.stringify(props.layers ?? DEFAULT_LAYERS);
  const sync = () =>
    ref.current?.injectJavaScript(
      `window.pavanaSetLayers?.(${layers});window.pavanaRegion?.(${props.region === true});true;`,
    );
  useEffect(() => {
    ref.current?.injectJavaScript(`window.pavanaSetLayers?.(${layers});true;`);
  }, [layers]);
  useEffect(() => {
    ref.current?.injectJavaScript(`window.pavanaRegion?.(${props.region === true});true;`);
  }, [props.region]);
  return (
    <View style={StyleSheet.absoluteFill}>
      <WebView
        ref={ref}
        originWhitelist={['*']}
        source={{ html }}
        style={{ flex: 1, backgroundColor: 'transparent' }}
        javaScriptEnabled
        domStorageEnabled
        scrollEnabled={false}
        setSupportMultipleWindows={false}
        allowsInlineMediaPlayback={false}
        onShouldStartLoadWithRequest={(request) => {
          if (request.url === 'about:blank' || request.url.startsWith('about:srcdoc')) return true;
          if (
            request.url.startsWith('https://carto.com/') ||
            request.url.startsWith('https://www.openstreetmap.org/')
          )
            void Linking.openURL(request.url).catch(() => {});
          return false;
        }}
        onMessage={(event) => {
          try {
            const data = JSON.parse(event.nativeEvent.data) as { type?: string; id?: string };
            if (data.type === 'ready') sync();
            if (data.type === 'select') {
              const selected = props.hotspots.find((h) => h.id === data.id);
              if (selected) props.onSelect(selected);
            }
          } catch {
            /* Ignore messages outside the map bridge contract. */
          }
        }}
      />
    </View>
  );
}
