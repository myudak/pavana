# Architecture

```
            ┌──────────────── packages/shared ────────────────┐
            │ zod schemas (Provenance, AirQualityPoint, …)     │
            │ pure math: haversine, wind FROM→TO, upwind score │
            │ US AQI, data-state rules                         │
            └───────────────┬───────────────────┬──────────────┘
                            │                   │
  browser                   ▼                   ▼
 ┌────────────┐   /api/*  ┌──────────────────────────────┐    ┌──────────────────────┐
 │ apps/web   │ ────────▶ │ apps/api (Fastify)           │ ─▶ │ providers/*          │
 │ React SPA  │ ◀──────── │ routes → services → providers│    │ fixture    ✅         │
 └────────────┘  JSON     │ validates query + response   │    │ open-meteo ✅         │
 ┌────────────┐           │ /api/model/* · /api/chat     │    │ firms      ✅ key     │
 │apps/landing│ static    └──────────────────────────────┘    │ openaq     ✅ key     │
 └────────────┘                                                │ bmkg, metar ✅        │
 ┌────────────┐                                                │ openrouter ✅ key     │
 │apps/mobile │ Expo, same API                                 └──────────────────────┘
 └────────────┘

 ml/ (Python, Kaggle) ── trains boosters → exported JSON in apps/api/src/models
                          evaluated in TS by packages/shared/src/model/gbdt.ts
```

## Request flow (`GET /api/conditions?lat&lon`)

1. `routes/index.ts` parses the query with `LatLonQuerySchema` (400 on failure).
2. `services/conditions.ts` resolves the location, asks the `AirQualityProvider` and
   `WeatherProvider` for hourly series from `now()`.
3. It attaches an **indicative US AQI** (`withAqi`), computes a trend (`services/trend.ts`), and
   derives the data state (`deriveDataState`: insufficient → demo → stale → live).
4. The response is parsed with `ConditionsResponseSchema` before sending.
5. `apps/web/src/lib/api.ts` parses it again with the same schema.

## Modes

| `PAVANA_MODE`    | Providers                                       | `now()`                 | State                                                                                                 |
| ---------------- | ----------------------------------------------- | ----------------------- | ----------------------------------------------------------------------------------------------------- |
| `demo` (default) | fixture (`fixtures/scenario-kubu-raya.json`)    | fixture `referenceTime` | `demo`, or `insufficient` outside the 75 km demo coverage                                             |
| `live`           | Open-Meteo (+CAMS) / NASA FIRMS / OpenAQ / BMKG | wall clock              | `live` / `stale` / `insufficient`; upstream failure → 502 `upstream_unavailable`; `?demo=1` → fixture |

## Web app structure

```
apps/web/src/
  app/            router, providers (Query, Theme, Location), AppShell (bottom nav / side nav)
  components/     cross-feature components (DemoBanner, ProvenanceNote, DataStateBadge, …)
  components/ui/  shadcn-style primitives (button, card, badge)
  features/
    today/        Hari Ini — current PM2.5, 24h timeline, factors, actions
    map/          Peta — MapLibre + hotspots (lazy-loaded route)
    insights/     Insight — forecast chart, factors, methodology (lazy-loaded route)
    info/         Info — official links, theme, about (alerts = phase 1.5)
    location/     selected-location context + picker (localStorage, ~1 km rounding)
  lib/            api client, query hooks, i18n, formatting (timezone-aware), AQ styles, theme
```

## Theming

`packages/brand/src/tokens.css` defines semantic CSS variables. `<html data-theme>` selects
**Ember/Mist** (light) or **Dusk/Haze** (dark); `theme.css` maps them to Tailwind v4 utilities.
Both apps import the same files, so landing and app always match.

## Phase 1.5+ (not built)

- Alerts: opt-in, informational, never presented as official warnings.
- PWA install + saved places.
- Cache layer for upstream providers (in-memory → Redis if needed). PostGIS only if it earns its complexity.
