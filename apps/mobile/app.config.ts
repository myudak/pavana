import type { ExpoConfig } from 'expo/config';
import { id } from '../web/src/lib/i18n/id.ts';
import { light, dark } from '../../packages/brand/src/native.ts';

const config: ExpoConfig = {
  name: id.mobile.appName,
  owner: 'myudak',
  slug: 'pavana',
  scheme: 'pavana',
  extra: {
    eas: { projectId: 'bf01d9ff-d23c-40bf-b523-e3af661cbea4' },
  },
  version: '0.2.0',
  icon: './assets/icon.png',
  orientation: 'portrait',
  userInterfaceStyle: 'automatic',
  ios: { supportsTablet: true, bundleIdentifier: 'com.myudak.pavana' },
  android: {
    package: 'com.myudak.pavana',
    adaptiveIcon: { foregroundImage: './assets/foreground.png', backgroundColor: light.canvas },
  },
  web: { bundler: 'metro', output: 'single', favicon: './assets/favicon.png' },
  plugins: [
    'expo-router',
    'expo-font',
    [
      'expo-splash-screen',
      {
        image: './assets/foreground.png',
        imageWidth: 160,
        backgroundColor: light.canvas,
        dark: { backgroundColor: dark.canvas },
      },
    ],
    [
      'expo-location',
      {
        locationWhenInUsePermission: id.mobile.locationPermission,
        isIosBackgroundLocationEnabled: false,
        isAndroidBackgroundLocationEnabled: false,
        isAndroidForegroundServiceEnabled: false,
      },
    ],
  ],
};
export default config;
