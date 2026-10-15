# Expo mobile handoff

Branch: `codex/expo-mobile`, isolated in the managed `pavana-expo-mobile` worktree.
The original checkout and Claude's worktrees are untouched.

Version 0.2.0 merges the latest web integration `a6e00b8` (16 October 2026), replacing
the old `d7323c5` scaffold used in the first APK. Visual references are the deployed
`https://app.pavana.myudak.com` at a 390px phone viewport and the integrated web
components, tokens and existing landscape assets.

The native screens now follow Beranda / Peta / Prakiraan / Info. The home has the
same exposure headline, PM2.5/sparkline, interactive timeline, hourly strip, wind
and condition tiles. Forecast includes air/smoke/weather tabs, a selectable chart,
range options only when data exists, deterministic recommendations and the model
limitation. Info has category filters, data summaries, source status, theme and
demo/live controls. Native copy shares the web dictionary.

The map canvas uses MapLibre in a WebView, keeping screens/navigation native. CARTO
tiles and the pinned MapLibre CDN require internet; no Google Maps key is needed.
Wind and indicative trails share the web's pure algorithms. The density layer uses
MapLibre's detection heatmap. It is labelled detection density, never concentration.
Background monitoring / push remain unimplemented and visibly labelled.

The source shares fixture providers and deterministic services without importing
Fastify, filesystem access or server environment configuration. Shared web derivation
helpers use relative imports so both Metro and Vite can consume them. All responses
are parsed through `@pavana/shared`, preserving missing values and provenance.

See [mobile README](../apps/mobile/README.md) for setup, EAS and validation commands.
The project remains `@myudak/pavana`; package id `com.myudak.pavana` and EAS signing
identity are retained. Version code is incremented for installing over v0.1.0.

The first APK (v0.1.0) is historical: build `65aea725-78c3-4e42-83e2-3abd049816ff`.
Its visual design does not represent v0.2.0.

Final validation: `pnpm check` passed (lint, typecheck and 144 tests: 11 mobile,
59 shared, 35 API and 39 web). The Expo SDK dependency check also passed. Android and
web Metro exports completed. Browser checks at phone size exercised timeline
selection, forecast/weather tabs, the regional map, Info filtering and both themes.
No Android device/emulator was connected, so these are preview checks, not device QA.
Earlier parallel runs hit existing 5-second test deadlines on the busy Windows host;
the final full run passed without changing those deadlines or weakening assertions.
The deployed backend's conditions/exposure/forecast/sources responses were also
validated through the native client; it was serving demo data at verification time.
A final browser chart-selection check found an incomplete web pointer event could
turn the selected hour into NaN. Pointer coordinates now support web/native events
and ignore invalid input; a regression test covers missing coordinates and bounds.
The superseded EAS build `f9b22355-b8b0-4492-b058-afe5633c49a8` was canceled before release.

The replacement EAS build finished successfully on 16 October 2026:

- Build: `f31d6f01-6683-4b68-997d-f4b5821f4c3b`
- Source: `57f3095f6204e4e3542139dce7ee187028238569`
- Version: `0.2.0`, Android version code `3`
- [Build details](https://expo.dev/accounts/myudak/projects/pavana/builds/f31d6f01-6683-4b68-997d-f4b5821f4c3b)
- [Signed APK](https://expo.dev/artifacts/eas/2YQyblT1SPMHr2uk6BcFWX_JyOqtkBdNEDbXcmgx8Ho.apk)
- Downloaded as `pavana-0.2.0-f31d6f01.apk` in Downloads; 106,179,912 bytes.
- SHA-256: `F0CB0B15D89867314E518AE71F3EF268C3A357135078CF30B3D4C3D47D6B6F33`

The downloaded archive contains the Android manifest and DEX bytecode. Physical
device testing and store submission remain outstanding.
