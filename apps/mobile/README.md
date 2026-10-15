# Pavana mobile — Expo

Android/iOS application with Expo SDK 57, React Native and Expo Router. Version
0.2.0 synchronizes the web integration at `a6e00b8`: landscape backgrounds,
Comfortaa wordmark, Plus Jakarta Sans headings, translucent cards, floating tabs,
exposure headline/sparkline, interactive smoke timeline, hourly strip, condition
tiles, forecast tabs, recommendations and the filterable Info dashboard.

## Run

From the repository root:

```powershell
pnpm install
pnpm dev:mobile
pnpm --filter @pavana/mobile web
```

The default is the labelled synthetic Kubu Raya demo, bundled for offline use.
The native client uses the same fixture providers, deterministic exposure/wind
services, schemas, copy and pure derivation helpers as the web app. Missing values
stay missing. No provider credentials or server configuration enter the bundle.

To use the deployed API, set `EXPO_PUBLIC_API_BASE_URL` and choose **Data langsung**
under Info. `EXPO_PUBLIC_DATA_SOURCE=api` changes the initial default; saved user
settings take priority. Provider failures remain visible and never trigger a silent
switch to synthetic data. Live coverage depends on the backend's source status.

## Map

The geographic canvas is MapLibre GL in a WebView on Android/iOS and an iframe in
the development web preview. The rest of the application uses native components.
It uses the same CARTO basemaps as the web, without a Google Maps key. Basemap
tiles and the pinned MapLibre CDN assets require internet access; loading failures
are shown on the map. Attribution stays visible.

Detection markers, a density heatmap, regional wind lines and indicative downwind
trails can be toggled. Wind lines and trails use the shared tracing functions and
API/fixture wind grid. Demo vectors remain labelled synthetic. Density is detection
density, never PM2.5 concentration. Trails are indicators, never fire spread.

## Cloud APK

Linked project: `@myudak/pavana`, id `bf01d9ff-d23c-40bf-b523-e3af661cbea4`.

```powershell
cd apps/mobile
npx --yes eas-cli@latest whoami
npx --yes eas-cli@latest build --profile preview --platform android
```

The preview profile produces a signed standalone APK with a remotely incremented
Android version code. The package id stays `com.myudak.pavana`, and signing remains
managed by EAS so the new build can update the previous APK.

## Validate

```powershell
pnpm check
pnpm --filter @pavana/mobile exec expo install --check
pnpm --filter @pavana/mobile exec expo export --platform android
```

Compare the live web and Expo preview at the same phone width before each release.
Merge the current integration branch first; do not start from the old scaffold.
Native React stays at Expo's supported version, separate from the web's React.
Indonesian copy stays in `apps/web/src/lib/i18n/id.ts`.

Device/emulator QA, iOS signing and store submission remain separate checks.
The in-app notification summary works while open; background monitoring and push
notifications are not implemented and are explicitly marked in Info.
