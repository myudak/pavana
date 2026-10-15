import { View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { useSettings } from '../lib/settings';
import { t } from '../lib/copy';
import type { HotspotMapProps } from './HotspotMap';

export default function HotspotMap({ location, hotspots, onSelect }: HotspotMapProps) {
  const { colors, isDark } = useSettings();
  return (
    <View
      style={{
        height: 360,
        borderRadius: 26,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      <MapView
        key={location.lat + ':' + location.lon}
        style={{ flex: 1 }}
        initialRegion={{
          latitude: location.lat,
          longitude: location.lon,
          latitudeDelta: 5.4,
          longitudeDelta: 5.4,
        }}
        userInterfaceStyle={isDark ? 'dark' : 'light'}
        showsUserLocation={false}
        showsMyLocationButton={false}
        rotateEnabled={false}
      >
        <Marker
          coordinate={{ latitude: location.lat, longitude: location.lon }}
          title={t.mobile.selectedLocation}
          pinColor={colors.primary}
        />
        {hotspots.map((hotspot) => (
          <Marker
            key={hotspot.id}
            coordinate={{ latitude: hotspot.lat, longitude: hotspot.lon }}
            title={t.mobile.hotspotSource}
            description={hotspot.satellite + ' · ' + hotspot.instrument}
            pinColor={colors.unhealthy_sensitive}
            onPress={() => onSelect(hotspot)}
          />
        ))}
      </MapView>
    </View>
  );
}
