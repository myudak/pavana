# Pavana Mobile

Native Android/iOS client built with Expo SDK 57, React Native, and Expo Router.
This is a first port, isolated from the ongoing web work. No APK/IPA has been built,
signed, or tested on a physical device yet.

## Run

From the monorepo root:

```powershell
pnpm install
pnpm dev:mobile
```

Scan the Metro QR code with a compatible Expo Go version, or use a development
build. `pnpm --filter @pavana/mobile android` opens an Android emulator.
An iOS simulator requires macOS; a physical iPhone can connect to Metro.

Optional browser preview: `pnpm --filter @pavana/mobile web`. The preview uses a
clearly labelled coordinate plot. Android/iOS use a real native map.

## Included

- Hari Ini: PM2.5, indicative US AQI, hourly timeline, weather and wind, provenance.
- Peta: native map, actual fixture/API detections, selectable details and timestamps.
- Insight: PM2.5 chart with missing-data gaps, shared deterministic factors and limitations.
- Info: official source links, theme and data-source preferences.
- Location search, opt-in foreground geolocation, locally stored coarse location.
- Bundled fonts, safe areas, accessible tabs, tablet width cap, light/dark/system themes.

## Data and integration

Default: **bundled synthetic Kubu Raya fixture**, no API keys or API connection needed.
This reuses the existing API's platform-neutral fixture providers and deterministic
services directly; no Fastify server, Node filesystem module, or provider secrets are bundled.
The reference time and 75 km coverage boundary match the web/API. Outside coverage,
measurements remain null and the state is insufficient.

Native basemap tiles and official external links still require internet.

To connect to a backend, copy `.env.example` to `apps/mobile/.env` and set
`EXPO_PUBLIC_API_BASE_URL`. Then choose **Backend Pavana** in Info, or set
`EXPO_PUBLIC_DATA_SOURCE=api` for the initial default. Restart Metro after env changes.
Existing saved preferences take priority over that initial default.

A phone cannot reach your computer's `localhost`. For local API development, use
the computer's LAN IP (API must listen on `0.0.0.0`) or a development tunnel.
An Android emulator commonly uses `http://10.0.2.2:8787`. For distribution, use HTTPS.
The browser preview additionally needs the preview origin in the API's CORS allowlist.

API errors never silently switch back to fixture data. Responses are validated with
`@pavana/shared`; a backend in demo mode stays labelled demo. Live providers and ML
remain unfinished exactly as documented in the main project.

All Indonesian copy stays in `apps/web/src/lib/i18n/id.ts`. Native semantic tokens
are in `packages/brand/src/native.ts`, matching the web's Ember/Mist and Dusk/Haze.
The mobile app has its own React version pinned to Expo; pnpm keeps it separate
from the web app's React. Do not force the web's React version into the native app.

## Build later

`eas.json` contains development, preview APK, and production profiles. After
configuring an Expo/EAS project and installing the development client if needed:

```powershell
pnpm --filter @pavana/mobile exec expo install expo-dev-client
cd apps/mobile
pnpm dlx eas-cli@latest build --profile preview --platform android
```

Android standalone builds need a restricted Google Maps SDK for Android key in
`GOOGLE_MAPS_ANDROID_API_KEY` (set in the EAS build environment). This platform
key is embedded in the binary and must be restricted by package name and signing
certificate. NASA/OpenAQ and other provider keys stay on the API server.
iOS uses Apple Maps by default.

Bundle IDs are `com.myudak.pavana`; confirm ownership/availability before store
submission. Signing, store accounts, notification setup, release builds, and
device QA are intentionally deferred.

## Checks

```powershell
pnpm check
pnpm --filter @pavana/mobile exec expo install --check
pnpm --filter @pavana/mobile build
```

The last command exports JavaScript/assets for Android, iOS and web. It does not
compile or sign an Android/iOS binary.
