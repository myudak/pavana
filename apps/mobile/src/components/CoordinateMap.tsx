/** Coordinate-only fallback, visibly distinct from an interactive geographic basemap. */
import { View } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';
import type { BBox, Hotspot, LatLon } from '@pavana/shared';
import { useSettings } from '../lib/settings';
import { t } from '../lib/copy';
import { Copy } from './ui';

export interface HotspotMapProps {
  location: LatLon;
  bbox: BBox;
  hotspots: Hotspot[];
  onSelect(hotspot: Hotspot): void;
  note?: string;
}
export default function CoordinateMap({
  location,
  bbox,
  hotspots,
  onSelect,
  note,
}: HotspotMapProps) {
  const { colors } = useSettings();
  const x = (lon: number) => 10 + ((lon - bbox[0]) / (bbox[2] - bbox[0])) * 340;
  const y = (lat: number) => 230 - ((lat - bbox[1]) / (bbox[3] - bbox[1])) * 220;
  return (
    <View style={{ backgroundColor: colors.surfaceMuted, padding: 18, borderRadius: 24, gap: 12 }}>
      <Copy heading>{t.mobile.mapPreview}</Copy>
      <Svg width="100%" height={240} viewBox="0 0 360 240">
        {[60, 120, 180].map((line) => (
          <Line key={line} x1={0} x2={360} y1={line} y2={line} stroke={colors.border} />
        ))}
        {[90, 180, 270].map((line) => (
          <Line key={line} x1={line} x2={line} y1={0} y2={240} stroke={colors.border} />
        ))}
        <Circle cx={x(location.lon)} cy={y(location.lat)} r={7} fill={colors.primary} />
        {hotspots.map((hotspot) => (
          <Circle
            key={hotspot.id}
            cx={x(hotspot.lon)}
            cy={y(hotspot.lat)}
            r={5}
            fill={colors.unhealthy_sensitive}
            onPress={() => onSelect(hotspot)}
            accessibilityLabel={t.mobile.hotspotSource}
          />
        ))}
      </Svg>
      <Copy muted style={{ fontSize: 11 }}>
        {note ?? t.mobile.mapPreviewNote}
      </Copy>
    </View>
  );
}
