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

Validation during the redesign: Expo SDK dependency check, mobile lint/typecheck,
11 mobile integration tests, 59 shared tests, 35 API tests and 39 web tests passed. Android and
web Metro exports completed. Browser checks at phone size exercised timeline
selection, forecast/weather tabs, the regional map, Info filtering and both themes.
No Android device/emulator was connected, so these are preview checks, not device QA.
The full `pnpm check` was run; its default parallel run hit a 5-second deadline in
an existing recorded-upstream API test. The API suite subsequently passed alone.
The web suites subsequently passed when run separately (including all three app UI tests).
A final browser chart-selection check found an incomplete web pointer event could
turn the selected hour into NaN. Pointer coordinates now support web/native events
and ignore invalid input; a regression test covers missing coordinates and bounds.
The superseded EAS build `f9b22355-b8b0-4492-b058-afe5633c49a8` was canceled before release.
