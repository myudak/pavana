# pavanaa

**Wildfire-smoke and air-quality awareness for Indonesia.** A weather-app-like product that turns
satellite hotspots, wind and PM2.5 forecasts into one location-specific answer:

> _"Bagaimana kondisi udara di tempatku, apakah asap mungkin memengaruhi daerahku, dan apa yang perlu diperhatikan?"_

Built for **JOINTS 2026, subtema Sustainability**: helping communities around forests and peatland
monitor _titik api_ early. Demo region: **Sungai Raya, Kubu Raya, Kalimantan Barat**.

|         | URL                                                                      |
| ------- | ------------------------------------------------------------------------ |
| App     | [app.pavana.myudak.com](https://app.pavana.myudak.com)                   |
| Landing | [pavana.myudak.com](https://pavana.myudak.com)                           |
| Android | APK beta on [GitHub Releases](https://github.com/myudak/pavana/releases) |

Product brief: [`docs/PAVANA_HANDOFF.md`](docs/PAVANA_HANDOFF.md).

## What works today

| Area                                          | Status                                                                                                                                                                                            |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Live data** (production `PAVANA_MODE=live`) | ✅ Open-Meteo weather + CAMS PM2.5, NASA FIRMS VIIRS, OpenAQ, BMKG (comparison). `?demo=1` or the in-app switch replays the synthetic Kubu Raya scenario, labelled _Mode Demo_.                   |
| **Beranda**                                   | ✅ Exposure potential ("Apakah asap akan sampai ke sini?"), PM2.5 + indicative US AQI, 24 h smoke timeline, daily ranges                                                                          |
| **Peta**                                      | ✅ CARTO basemaps (light/dark), detections coloured by age and sized by FRP, wind streamlines, indicative smoke trails, ML risk grid                                                              |
| **Prakiraan**                                 | ✅ Hourly PM2.5 chart, weather table, factors, insight notifications, experimental model cards                                                                                                    |
| **Info**                                      | ✅ Summary cards, methodology, official links (BMKG, SiPongi, BNPB, BPBD Kalbar, NASA FIRMS)                                                                                                      |
| **ML models** (`/api/model/*`)                | 🧪 Experimental LightGBM boosters with observed targets: hotspot risk for tomorrow (0.25° grid) and airport haze / visibility at 6 and 24 h, each with TreeSHAP reasons. Evaluation in `/lab-ml`. |
| **Tanya Pavi** (`/tanya`)                     | 🧪 Beta: an LLM (OpenRouter, server-side key) grounded in the selected location's data. Demo mode uses scripted replies.                                                                          |
| **Smart alerts**                              | 🧪 Browser notifications while the app is open; real Web Push is in [`docs/backlog.md`](docs/backlog.md)                                                                                          |
| **Mobile** (`apps/mobile`)                    | 🧪 Expo Android app, APK beta                                                                                                                                                                     |
| **ISPU** (Indonesian index)                   | ⚠️ Draft breakpoints, unverified, not shown in the UI                                                                                                                                             |

ML caveats: the models are experimental and `operationalReady: false`. SHAP explains the model's
output, not causes. The PM2.5 booster targets the CAMS model field and stays research-only. See
[`docs/ML_LIVE_HANDOFF.md`](docs/ML_LIVE_HANDOFF.md).

## Monorepo

| Path                                 | What                                                                          | Stack                                                                                       |
| ------------------------------------ | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| [`apps/web`](apps/web)               | The app: Beranda, Peta, Tanya, Prakiraan, Info, Lab ML                        | React 19, Vite, Tailwind v4, TanStack Query, React Router, MapLibre, Recharts, assistant-ui |
| [`apps/api`](apps/api)               | HTTP API, provider adapters, deterministic insights, model serving, chat      | Fastify 5, Zod 4                                                                            |
| [`apps/landing`](apps/landing)       | Landing page                                                                  | Astro 5, Tailwind v4                                                                        |
| [`apps/mobile`](apps/mobile)         | Android/iOS client                                                            | Expo, React Native                                                                          |
| [`apps/video`](apps/video)           | Competition video (2:00, voice-over, subtitles)                               | Remotion                                                                                    |
| [`packages/shared`](packages/shared) | Schemas + pure math (geo, wind, AQI, upwind score, GBDT evaluator + TreeSHAP) | TypeScript, Zod                                                                             |
| [`packages/brand`](packages/brand)   | Tokens (Ember/Mist light, Dusk/Haze dark), fonts, logo, mascot                | CSS                                                                                         |
| [`ml`](ml)                           | Training: data kernels, features, LightGBM, exports for the API               | Python, uv, Kaggle                                                                          |
| [`fixtures`](fixtures)               | Synthetic demo scenario + shared math test vectors                            | JSON                                                                                        |
| [`docs`](docs)                       | Architecture, data sources, methodology, submission document, video sources   | Markdown                                                                                    |

## Quick start

Requirements: **Node ≥ 22**, **pnpm 10** (`corepack enable`), and for ML
**[uv](https://docs.astral.sh/uv/)**.

```bash
pnpm install
cp .env.example .env        # optional: demo mode needs no keys
pnpm dev                    # web :5173 · api :8787 · landing :4321
```

| Command                                          | Does                                                     |
| ------------------------------------------------ | -------------------------------------------------------- |
| `pnpm dev` / `pnpm dev:app`                      | web + api + landing / web + api only                     |
| `pnpm dev:mobile`                                | Expo dev server ([setup](apps/mobile/README.md))         |
| `pnpm build`                                     | build everything                                         |
| `pnpm check`                                     | lint + typecheck + test (run before pushing)             |
| `pnpm format`                                    | Prettier                                                 |
| `pnpm ml:setup` / `pnpm ml:lab` / `pnpm ml:test` | Python env, Jupyter Lab, pytest                          |
| `pnpm --filter @pavana/video studio` / `render`  | video preview / render ([details](apps/video/README.md)) |

Server-side keys (never `VITE_*`): `FIRMS_MAP_KEY`, `OPENAQ_API_KEY`, `OPENROUTER_API_KEY`.
Without a key, that source reports `not_configured` (or the chat answers that it is unavailable),
and the UI shows missing data, never invented values.

## Ground rules (read before contributing)

1. **Every number carries provenance**: provider, kind (observation/forecast/derived/fixture), valid time.
2. **Missing ≠ zero ≠ safe.** Never fill gaps with 0 or show "Baik/aman" when data is missing.
3. **Hotspot ≠ fire.** Satellite detections are not confirmed fires; no detections ≠ no fire.
4. **Models are labelled experimental** and report their real evaluation, including when a baseline wins.
5. **No official-sounding warnings or evacuation advice.** Link to BMKG/BPBD/SiPongi instead.
6. **Wind direction** is meteorological FROM; convert with `windFromToFlowBearing` before math or arrows.

More in [`CONTRIBUTING.md`](CONTRIBUTING.md) and [`AGENTS.md`](AGENTS.md).

## Competition material

- Solution document (≤ 10 pages): [`docs/submission/`](docs/submission)
- Video: [`apps/video`](apps/video), script and sources in [`docs/video/`](docs/video)
- Open work: [`docs/backlog.md`](docs/backlog.md)
