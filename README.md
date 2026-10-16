# pavana

**Wildfire smoke & air-quality forecast for Indonesia.** A weather-app-like experience that turns
satellite hotspots, wind, and PM2.5 forecasts into one location-specific answer:

> _"Bagaimana kondisi udara di tempatku, apakah asap mungkin memengaruhi daerahku, dan apa yang perlu diperhatikan?"_

Built for JOINTS 2026 (Sustainability). Demo region: **Kubu Raya, Kalimantan Barat**.
Product brief: [`docs/PAVANA_HANDOFF.md`](docs/PAVANA_HANDOFF.md).

> **Status: early scaffold.** Runs end-to-end on a **synthetic demo fixture**. No live data
> sources are connected yet, and there is no trained ML model. See [What works](#what-works-today).

---

## Monorepo

| Path                                     | What                                                                                       | Stack                                                                                    |
| ---------------------------------------- | ------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| [`apps/web`](apps/web)                   | The app — Hari Ini, Peta, Insight, Info                                                    | React 19, Vite, Tailwind v4, shadcn/ui, TanStack Query, React Router, MapLibre, Recharts |
| [`apps/landing`](apps/landing)           | Marketing / landing page                                                                   | Astro 5, Tailwind v4                                                                     |
| [`apps/api`](apps/api)                   | HTTP API, provider adapters, deterministic insights                                        | Fastify 5, Zod 4                                                                         |
| [`packages/shared`](packages/shared)     | Schemas/types + pure geo, wind, AQI math (single source of truth)                          | TypeScript, Zod                                                                          |
| [`packages/brand`](packages/brand)       | Design tokens (Ember/Mist light, Dusk/Haze dark), fonts, logo mark                         | CSS                                                                                      |
| [`packages/tsconfig`](packages/tsconfig) | Shared TS presets                                                                          | —                                                                                        |
| [`ml`](ml)                               | Research workspace: notebooks, features, baselines, CAMS-targeted ablation (research-only) | Python, uv, Jupyter                                                                      |
| [`fixtures`](fixtures)                   | Synthetic demo scenario + shared math test vectors                                         | JSON                                                                                     |
| [`docs`](docs)                           | Architecture, data sources, modeling methodology                                           | Markdown                                                                                 |
| [`design/references`](design/references) | AI concept boards (not data, not final assets)                                             | —                                                                                        |

## Quick start

The Expo Android/iOS app is in [`apps/mobile`](apps/mobile), with the current web
design and shared demo/API contracts. See [mobile setup and EAS builds](apps/mobile/README.md).

Requirements: **Node ≥ 22**, **pnpm 10** (`corepack enable`), and for ML **[uv](https://docs.astral.sh/uv/)**.

```bash
pnpm install
cp .env.example .env        # optional — demo mode needs no keys
pnpm dev                    # web :5173 · api :8787 · landing :4321
```

| Command                                          | Does                            |
| ------------------------------------------------ | ------------------------------- |
| `pnpm dev`                                       | web + api + landing             |
| `pnpm dev:app`                                   | web + api only                  |
| `pnpm build`                                     | build everything                |
| `pnpm lint` / `pnpm typecheck` / `pnpm test`     | per-package via Turborepo       |
| `pnpm check`                                     | lint + typecheck + test         |
| `pnpm format`                                    | Prettier                        |
| `pnpm ml:setup` / `pnpm ml:lab` / `pnpm ml:test` | Python env, Jupyter Lab, pytest |

Single package: `pnpm --filter @pavana/web dev`, `pnpm --filter @pavana/api test`, …

## What works today

| Area                                                                                                                                 | Status                                                                          |
| ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| Demo mode (`PAVANA_MODE=demo`)                                                                                                       | ✅ Synthetic Kubu Raya scenario, clearly labelled _Mode Demo · Data ilustratif_ |
| API: `/health`, `/api/conditions`, `/api/forecast`, `/api/hotspots`, `/api/insights`, `/api/locations/search`, `/api/official-links` | ✅ fixture-backed, schema-validated                                             |
| Web: Today, Map, Insight, Info                                                                                                       | ✅ basic UI wired to the API                                                    |
| Landing page                                                                                                                         | ✅ static Astro                                                                 |
| Live providers (NASA FIRMS, Open-Meteo, OpenAQ)                                                                                      | ⛔ stubs — `PAVANA_MODE=live` returns HTTP 501                                  |
| ML model                                                                                                                             | ⛔ none trained; Insights use **deterministic indicators**                      |
| ISPU (Indonesian index)                                                                                                              | ⚠️ draft breakpoints, unverified — not shown in UI                              |

## Ground rules (read before contributing)

1. **Every number carries provenance** — provider, kind (observation/forecast/derived/fixture), valid time.
2. **Missing ≠ zero ≠ safe.** Never fill gaps with 0 or show "Baik/aman" when data is missing.
3. **Hotspot ≠ fire.** Satellite detections are not confirmed fires; no detections ≠ no fire.
4. **No fake ML.** No accuracy, SHAP, or intervals unless a real model was trained and evaluated.
5. **No official-sounding warnings or evacuation advice.** Link to BMKG/BPBD/SiPongi instead.
6. **Wind direction** is meteorological FROM; convert with `windFromToFlowBearing` before math or arrows.

More in [`CONTRIBUTING.md`](CONTRIBUTING.md) and [`AGENTS.md`](AGENTS.md).

## Next priorities

1. Open-Meteo weather + air-quality adapter (live baseline) behind the provider interface.
2. NASA FIRMS adapter with server-side key, caching and bbox limits.
3. Find PM2.5 ground truth for Kalbar (OpenAQ / BMKG). The `ml/` table built so far targets the CAMS
   model field instead and is labelled research-only — no observed archive exists yet.
