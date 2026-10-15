import { Platform, View } from 'react-native';
import Constants from 'expo-constants';
import MapView, { Marker } from 'react-native-maps';
import { useSettings } from '../lib/settings';
import { t } from '../lib/copy';
import CoordinateMap, { type HotspotMapProps } from './CoordinateMap';

export default function HotspotMap(props: HotspotMapProps) {
  const { location, hotspots, onSelect } = props;
  const { colors, isDark } = useSettings();
  // Google Maps may crash on Android without API-key metadata. Keep the build usable.
  if (Platform.OS === 'android' && Constants.expoConfig?.extra?.nativeMapsEnabled !== true) {
    return <CoordinateMap {...props} note={t.mobile.mapNotConfigured} />;
  }
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
