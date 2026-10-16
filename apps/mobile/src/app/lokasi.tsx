import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import { nativeFonts } from '@pavana/brand/native';
import { useSettings, type SavedLocation } from '../lib/settings';
import { useLocationSearch } from '../lib/queries';
import { DEMO_LOCATION } from '../lib/demo';
import { t } from '../lib/copy';
import { Action, Card, Copy, QueryBoundary } from '../components/ui';
import { Icon } from '../components/Icon';

export default function LocationScreen() {
  const { colors, setLocation } = useSettings();
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const results = useLocationSearch(debounced);
  const active = useRef(true);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query), 250);
    return () => clearTimeout(timer);
  }, [query]);
  function choose(location: SavedLocation) {
    setLocation(location);
    router.back();
  }
  async function locate() {
    setLocating(true);
    setError(null);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!active.current) return;
      if (!permission.granted) {
        setError(t.location.geoDenied);
        return;
      }
      const current = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      if (!active.current) return;
      choose({
        lat: current.coords.latitude,
        lon: current.coords.longitude,
        label: t.location.myLocation,
      });
    } catch {
      if (active.current) setError(t.mobile.locationError);
    } finally {
      if (active.current) setLocating(false);
    }
  }
  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{
        padding: 24,
        gap: 18,
        maxWidth: 640,
        width: '100%',
        alignSelf: 'center',
      }}
      style={{ backgroundColor: colors.canvas }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          borderRadius: 24,
          borderColor: colors.border,
          borderWidth: 1,
          backgroundColor: colors.surface,
          paddingHorizontal: 18,
        }}
      >
        <Icon name="pin" color={colors.primary} size={18} />
        <TextInput
          accessibilityLabel={t.location.placeholder}
          placeholder={t.location.placeholder}
          placeholderTextColor={colors.muted}
          value={query}
          onChangeText={setQuery}
          autoCapitalize="words"
          returnKeyType="search"
          style={{
            color: colors.ink,
            flex: 1,
            paddingVertical: 16,
            fontFamily: nativeFonts.body,
            fontSize: 14,
          }}
        />
      </View>
      <Card>
        <QueryBoundary query={results}>
          {(data) =>
            data.results.length ? (
              data.results.map((location) => (
                <Pressable
                  key={location.id}
                  accessibilityRole="button"
                  onPress={() => choose({ ...location, label: location.name })}
                  style={{ paddingVertical: 14, gap: 4 }}
                >
                  <Copy heading style={{ fontSize: 20 }}>
                    {location.name}
                  </Copy>
                  <Copy muted style={{ fontSize: 12 }}>
                    {location.admin2 ?? location.admin1} · {location.admin1}
                  </Copy>
                </Pressable>
              ))
            ) : (
              <Copy muted>{t.location.noResults}</Copy>
            )
          }
        </QueryBoundary>
      </Card>
      <Action
        label={t.location.useMyLocation}
        icon="pin"
        onPress={() => {
          void locate();
        }}
        disabled={locating}
      />
      {locating && <ActivityIndicator color={colors.primary} />}
      {error && <Copy style={{ color: colors.error }}>{error}</Copy>}
      <Action
        label={t.mobile.demoLocation}
        icon="sun"
        onPress={() => choose(DEMO_LOCATION)}
        secondary
      />
      <Copy muted style={{ fontSize: 11 }}>
        {t.mobile.locationPrivacy}
      </Copy>
    </ScrollView>
  );
}
