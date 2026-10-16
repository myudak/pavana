import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { dark, light, type Palette } from '@pavana/brand/native';
import { z } from 'zod';
import { DEMO_LOCATION } from './demo';
import { apiConfigured } from './api';

export const SavedLocationSchema = z.object({
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
  label: z.string().min(1),
});
export type SavedLocation = z.infer<typeof SavedLocationSchema>;
export type ThemePref = 'system' | 'light' | 'dark';
export type DataMode = 'demo' | 'api';
const SettingsSchema = z.object({
  location: SavedLocationSchema,
  theme: z.enum(['system', 'light', 'dark']),
  mode: z.enum(['demo', 'api']),
});
type Settings = z.infer<typeof SettingsSchema>;
const DEFAULTS: Settings = {
  location: DEMO_LOCATION,
  theme: 'system',
  mode: apiConfigured && process.env.EXPO_PUBLIC_DATA_SOURCE === 'api' ? 'api' : 'demo',
};
const KEY = 'pavana:mobile:settings:v1';
interface Context extends Settings {
  colors: Palette;
  isDark: boolean;
  ready: boolean;
  setLocation(location: SavedLocation): void;
  setTheme(theme: ThemePref): void;
  setMode(mode: DataMode): void;
}
const SettingsContext = createContext<Context | null>(null);
export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState(DEFAULTS);
  const [ready, setReady] = useState(false);
  const system = useColorScheme();
  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        const parsed = SettingsSchema.safeParse(raw ? JSON.parse(raw) : null);
        if (active && parsed.success)
          setSettings({
            ...parsed.data,
            mode: apiConfigured ? parsed.data.mode : 'demo',
          });
      })
      .catch(() => {
        /* Invalid/missing storage never prevents opening the demo. */
      })
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (ready) void AsyncStorage.setItem(KEY, JSON.stringify(settings)).catch(() => {});
  }, [settings, ready]);
  const isDark = settings.theme === 'dark' || (settings.theme === 'system' && system === 'dark');
  return (
    <SettingsContext.Provider
      value={{
        ...settings,
        ready,
        isDark,
        colors: isDark ? dark : light,
        setLocation: (location) =>
          setSettings((s) => ({
            ...s,
            location: {
              ...SavedLocationSchema.parse(location),
              lat: Math.round(location.lat * 100) / 100,
              lon: Math.round(location.lon * 100) / 100,
            },
          })),
        setTheme: (theme) => setSettings((s) => ({ ...s, theme })),
        setMode: (mode) =>
          setSettings((s) => ({ ...s, mode: mode === 'api' && !apiConfigured ? 'demo' : mode })),
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}
export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) throw new Error('Missing SettingsProvider');
  return context;
}
