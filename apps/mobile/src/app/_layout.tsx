import { useEffect, useState } from 'react';
import { ActivityIndicator, AppState, Platform, View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { Outfit_500Medium } from '@expo-google-fonts/outfit';
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_600SemiBold,
} from '@expo-google-fonts/plus-jakarta-sans';
import { QueryClient, QueryClientProvider, focusManager } from '@tanstack/react-query';
import { SettingsProvider, useSettings } from '../lib/settings';
import { t } from '../lib/copy';

export { ErrorBoundary } from 'expo-router';
void SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60_000,
            retry: 1,
            refetchOnWindowFocus: true,
            refetchInterval: 300_000,
          },
        },
      }),
  );
  const [fontsLoaded, fontError] = useFonts({
    Outfit_500Medium,
    PlusJakartaSans_400Regular,
    PlusJakartaSans_600SemiBold,
  });
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const subscription = AppState.addEventListener('change', (state) =>
      focusManager.setFocused(state === 'active'),
    );
    return () => subscription.remove();
  }, []);
  return (
    <QueryClientProvider client={queryClient}>
      <SettingsProvider>
        <Navigation fontsReady={fontsLoaded || !!fontError} />
      </SettingsProvider>
    </QueryClientProvider>
  );
}
function Navigation({ fontsReady }: { fontsReady: boolean }) {
  const { ready, colors, isDark } = useSettings();
  useEffect(() => {
    if (ready && fontsReady) void SplashScreen.hideAsync();
  }, [ready, fontsReady]);
  if (!ready || !fontsReady)
    return (
      <View style={{ flex: 1, backgroundColor: colors.canvas, justifyContent: 'center' }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: colors.canvas },
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.ink,
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="lokasi"
          options={{ presentation: 'modal', title: t.mobile.locationTitle }}
        />
      </Stack>
    </>
  );
}
