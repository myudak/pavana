# Pavana — Complete Project Handoff

> **Status:** product concept + visual explorations complete; implementation/scaffold not started in this handoff.  
> **Audience:** Codex, Claude Code, or any coding agent creating the initial repository and hackathon MVP.  
> **Last consolidated:** 2026-10-14.  
> **Primary language for the consumer product:** Bahasa Indonesia. English is fine in developer docs/code.  
> **Project:** JOINTS 2026, Sustainability subtheme.

## 0. Read this first — the actual product decision

**Pavana is a mobile-first, weather-app-like web product for people living near Indonesian wildfire / peatland-fire regions.** It translates complex satellite hotspots, weather, and air-quality forecasts into one location-specific answer: **"Bagaimana kondisi udara di tempatku, apakah asap mungkin memengaruhi daerahku, dan apa yang perlu diperhatikan?"**

**It is NOT:** a professional GIS dashboard, an original meteorological simulation engine, a certainty-guaranteeing wildfire-spread prediction model, an autonomous evacuation decision-maker, or an LLM chatbot wrapped around third-party APIs.

The early name/concept **GambutWatch** (peatland monitoring, NDVI, deforestation change detection, investigation queue) has been **superseded** as the main consumer product direction. The early working name **ASAP** was also **superseded** by **Pavana**. Avoid resurrecting those names in implementation. The user liked the one-word name *Pavana* (from Sanskrit association with wind/air), designed a brand exploration around it, and asked for mascot exploration. Trademark/domain availability **has not been finalized**.

A key product insight: People typically do **not** want to interpret hundreds of hotspot dots or technical indices; they want to know if **smoke may reach their area** and what changing conditions mean. The user's initial question "Will the fire reach my house?" requires high-stakes modelling and reliable verified fire perimeters. The MVP MUST NOT offer an unsupported fire-arrival ETA or claim a specific home is safe. Keep a clear distinction between **fire proximity**, **smoke transport indicators**, and **predicted PM2.5 concentrations**.

## 1. Competition fit and users

JOINTS 2026 sustainability problem statements shown to the team include:
- Communities near forest and peatland affected by fires and deforestation, with difficulty monitoring hotspots and land conversion early.
- Communities in disaster-prone areas facing delayed warnings and limited evacuation access.

Pavana addresses the **forest/peatland fire information and impact** angle, with optional relevance to disaster communication. The pitch must say clearly how smoke/air-quality awareness helps communities prepare; do not pretend the challenge specifically mandates ML. Other sustainability subtopics (fast fashion, non-organic waste, coastal ecosystems, rural energy) were explored but are not part of Pavana.

**Primary user:** Indonesian resident in a fire-prone area who wants simple, actionable, location-based understanding. Secondary user: community volunteers who need context and links to authoritative information.

**Recommended demo geography:** one area in **Kalimantan Barat**, e.g. **Kubu Raya**, using a documented historical smoke/fire episode and/or explicitly labelled mock fixtures. Do not assume there is an active fire at demo time. References to US cities (Boulder, Portland) and their AQI readings in generated mockup boards are **visual placeholders**, not desired product localization or real observations.

Product principle: **the simpler the front end, the more disciplined the underlying data interpretation.** A person with no GIS/ML background should understand the landing screen within ~10 seconds.

## 2. Name, identity, design direction

**Product name:** Pavana (display can use lower-case `pavana`; no permanent choice of capitalization beyond this).  
**Category:** Wildfire & Air Quality Forecast.  
**Proposed English tagline:** "Clearer air. A safer tomorrow." / "Understand what's in the air."  
**Indonesian core proposition:** "Prakiraan kualitas udara dan potensi dampak asap kebakaran, berdasarkan lokasimu."

**Visual philosophy:** Apple Weather-like readability + map-based detail, calm and trustworthy, consumer-friendly, not an emergency control panel. Mobile-first, responsive desktop adaptation. Large current-state typography, uncluttered cards, hourly timeline, map layer toggle, a short explanation behind forecast changes. Avoid decorative microcopy, floating slogans, fake testimonials, arbitrary statistics, excessive badges, scribbles, unnecessary icons, or over-styling.

**Wordmark:** generated visual exploration used a rounded geometric lower-case wordmark. It is **AI-generated**, not a traceable exact font. Use `Outfit` (Medium/500, approx -0.05em tracking) as a practical starting point; `Urbanist` is another candidate. A precise recreation may require customizing glyphs. Don't claim an exact proprietary typeface.

**Primary/default palette direction — Sky / Breeze:**
- Brand blue: `#3B82F6`
- Teal: `#14B8A6`
- Pale mint: `#E0F2F1`
- Canvas: `#F8FAFC`
- Ink: `#1F2937`

**Other explored art directions** (keep as options/themes, not simultaneous noisy gradients):
- Ember / Mist: orange `#F97316`, blush `#FCA5A5`, smoke gray `#6B7280`, warm cream `#F5F1EB`, ink `#1F2937`. Good for status accents, less suitable as full-app default due to alarm-oriented appearance.
- Forest / Air: green `#2E7D5B`, blue `#3B82F6`, sand `#CBBFA0`, canvas `#F6F7EF`, ink `#1F2937`.
- Dusk / Haze: indigo `#6366F1`, pink `#F472B6`, gray `#9CA3AF`, pale `#EEF0F4`, ink `#1F2937` (dark mockups explored).

**Icon explorations** in references: wind flow (layered curved lines), smoke plume, directional flow, layered atmosphere, swirl, safety shield. Provisional implementation direction: **wind-flow symbol**, with a clean monochrome SVG variant. Do not lift an AI-generated PNG icon as if it is a scalable production vector; recreate a legible simple SVG. Treat icon choice as **provisional**.

**Mascot explorations:** none has been explicitly selected as canonical. The generated boards contain:
1. **Air spirit / tiny wind guardian:** rounded floating white/blue/teal spirit wrapped in wind ribbons; smiling and curious poses. Great for notification and onboarding; this is the **default placeholder direction** if an agent must choose one.
2. **Breeze bird:** bird formed from flowing wind ribbons; abstract and optimistic.
3. **Mist fox:** playful protective fox formed from cool air/cloud curves, warm haze accent.
4. **Mountain-wind guardian:** friendly mountain/forest/air spirit with greenery.

Use mascot **sparingly**: empty state, onboarding, calm educational insight, or one notification illustration. Do **not** put a giant mascot between users and high-priority risk information, and do not use cheerful faces to trivialize serious air pollution. Mascot work is exploratory; don't bake final character identity into all UI components.

### Reference art included in `assets/`

| File | Usage |
|---|---|
| `pavana_air_quality_brand_moodboard.png` | full wordmark, 6 icon directions, 4 color palette comparisons |
| `pavana_air_quality_ui_showcase.png` | Sky/Breeze light mobile Today, Map, Insights |
| `pavana_air_quality_app_showcase.png` | Ember/Mist warm mobile Today, Map, Alerts |
| `pavana_dusk_haze_app_showcase.png` | Dusk/Haze dark mobile screens |
| `pavana_air_quality_brand_board.png` | icon sizes, favicon, logo lockups, context |
| `pavana_air_spirit_brand_board.png` | air-spirit mascot concept and poses |
| `pavana_breeze_bird_mascot_brand_board.png` | breeze-bird concept and poses |
| `pavana_the_mist_fox_brand_concept.png` | mist fox concept and poses |
| `pavana_mountain_wind_guardian_concept_board.png` | forest/mountain wind guardian concept |

**Important:** These are **concept images** created with an image model, not valid measurements, source code, exact branding specifications, or permission to claim visualized smoke motion is real. They include US placeholder maps and occasional synthetic labels. Replicate visual hierarchy, not invented measurements or incident facts.

## 3. UX: screens and interaction model

### 3.1 Today — the essential homepage

Top: wordmark, location selector (search + optional opt-in geolocation), last updated time / source. User may save one or more places, but auth is not required.

Hero question answered with plain Indonesian language. Show:
- Present or latest available **PM2.5** observation/estimate with units `µg/m³`, **provider**, **valid timestamp**, and whether it is **observed**, **model estimate**, or **forecast**. If presenting AQI, identify its index convention (e.g., US AQI vs Indonesian ISPU) and implement its thresholds correctly. **Do not label AQI 158 as "Unhealthy for Sensitive Groups" under US AQI**; 151–200 is "Unhealthy".
- Short situation summary: e.g. "Prakiraan kualitas udara berpotensi memburuk sore ini" only when supported by data. Avoid "smoke will reach you at 4pm" unless a validated plume prediction supports that conclusion.
- Hourly/3-hour timeline for next 24h, especially direction and magnitude of change. Keep units & category semantics consistent.
- **Why?** small card with 1–3 factors (wind trend, upwind hotspot signals, forecast PM2.5), including unknown/uncertain state where applicable. Explanations must be derived from structured features, not speculative LLM assertions.
- Simple actions: "Pantau pembaruan resmi", "Kurangi aktivitas luar ruangan jika kondisi memburuk", etc. Cite source for any health guidance, avoid diagnosing or directing evacuation.

Data states: **Live/updated**, **Stale**, **Insufficient data**, **Demo fixture**, and **Error**. No false green "safe" labels when inputs are missing.

### 3.2 Map — where the signals are

Interactive MapLibre map centered on selected region. Layers via tabs/toggles:
- User location / selected area.
- NASA FIRMS hotspots (time-coded; location and timestamps; distinguish satellite anomaly from confirmed incident).
- Wind arrows from authentic forecast grid/location with convention and timeframe clearly labelled. Meteorological wind direction commonly means **direction it comes from**, not where it blows to; convert to flow vector before drawing.
- PM2.5 or smoke overlay **only if a legitimate gridded dataset/validated model supports it**. Otherwise show point/grid predictions and label as such, not a fake seamless moving smoke plume.
- Optional KHG/peatland polygon for context if source available; do not overload default map.

Include forecast-time slider (only where dataset supports time slices), legend and attribution, source freshness, hotspot click details, and selected location. No maps made to appear real-time from offline sample data.

### 3.3 Insights — why conditions may change

- Simple forecast trend chart, concentration with units.
- Plain-language factor breakdown: weather, directional hotspot exposure, background pollution/forecast.
- Show source & freshness for every factor, and confidence limitations.
- If an actual trained model with valid feature attributions is present: SHAP explainability visualization. **If no model is trained, do not fake SHAP bars.** Use a transparent deterministic indicator explanation and label it properly.
- "How is this calculated?" expandable methodology that explains the difference between a hotspot and verified fire, between PM2.5 and fire smoke, and between fire-spread and smoke impacts.

### 3.4 Alerts — phase 1.5 / optional for first demo

- Show relevant **official** incident/warning links with source/time/region (only if a supported feed/verified source exists).
- Local **informational** forecast-change notifications can be demonstrated in demo mode but must not be portrayed as official emergency notices.
- Saved location and subscription preference, later push notifications. No unsolicited alerts without permission, no invented evacuation instructions or orders.

### 3.5 Responsive states

Mobile primary: sticky bottom navigation (`Hari Ini`, `Peta`, `Insight`, `Info`) or 3 core tabs if Alerts not ready. Desktop: side navigation/expanded dashboard without spreading too many charts. Light theme first, dark mode optional. Indonesian default, English optional future. Accessibility: AA text contrast, keyboard focus, descriptive labels, don't encode hazard status by color only, reduced-motion alternative for animated wind.

## 4. User journey: hackathon demo

1. Open Pavana on mobile/desktop; demo defaults to a **clearly labelled historical or sample case in Kubu Raya, Kalimantan Barat**.
2. Today shows estimated/observed air condition and upcoming forecast trend, with source, timestamp, and data type.
3. Tap "Kenapa bisa berubah?" See simple wind, PM2.5, and hotspot directional indicators.
4. Open Map; switch between hotspots and wind at a particular supported time. Tap a hotspot and see when satellite observed it, with provenance.
5. Return to Insights; compare forecast baseline and wind-aware interpretation if backed by real model. Show how uncertainty or missing data is communicated.
6. Explain how residents can follow official information rather than claiming an evacuation decision by Pavana.

Best one-line pitch: **"Pavana is a weather app for wildfire smoke awareness in Indonesia: it turns scattered satellite and atmospheric signals into clear, location-specific air-quality insights."**

## 5. Data sources and evidence constraints

Real integrations should be isolated behind interfaces. **The coding agent may scaffold provider connectors, but must not claim they are working until successfully tested.** API endpoints, authentication, quotas, granularity, historical availability, usage terms, and exact response shape require checking documentation at implementation time.

| Source | Candidate use | Caveats |
|---|---|---|
| NASA FIRMS (`firms.modaps.eosdis.nasa.gov/api/area/`) | active thermal anomalies from VIIRS/MODIS: lat/lon, acquisition UTC, FRP, satellite | requires MAP_KEY/registration; not continuous live fire perimeter; detection gaps/false positives; timestamp matters |
| BMKG Data Terbuka (`data.bmkg.go.id`) | local forecast wind, weather, humidity, rain | weather endpoint may be keyed by Indonesian administrative code; verify usage/licensing/coverage |
| Open-Meteo Weather (`open-meteo.com/en/docs`) | practical wind speed/direction/time series and weather | forecast source, not observed smoke/fire; timezone handling; check attribution/license |
| Open-Meteo Air Quality (`open-meteo.com/en/docs/air-quality-api`) | CAMS-derived forecast PM2.5 baseline | coarse grid in Indonesia; not proof that PM2.5 is wildfire-sourced; confirm current backend models & resolution |
| OpenAQ (`api.openaq.org/docs`) | candidate ground station observations for training/validation | station coverage, historic access, token/limits; not guaranteed in target region |
| BMKG Kualitas Udara (`bmkg.go.id/kualitas-udara/pm25`) | official air monitoring/context | public website != guaranteed programmatic historical API |
| BMKG smoke products and SPARTAN (`spartan.bmkg.go.id`) | external authoritative context and links | clarify actual public feed/access; avoid scraping if prohibited |
| SiPongi (`sipongi.gakkum.kehutanan.go.id`) | Indonesia official fire/hotspot status | external reference; do not conflate with FIRMS and do not pretend live integration without implementation |
| Optional Copernicus Sentinel-2, Sentinel-1, CHIRPS | future forest/peatland context | original GambutWatch remote-sensing scope: NOT a blocker for consumer MVP |

**Data pipeline rules:**
- Persist UTC ISO timestamps; display user-selected region time zone correctly (Indonesia spans WIB/WITA/WIT).
- Normalize units explicitly: m/s vs km/h, degrees (meteorological from direction), PM2.5 `µg/m³`.
- Source every datum (`provider`, `issuedAt`, `validAt`, `fetchedAt`, `isDemo`, `quality`). Distinguish forecast vs observation.
- Never fill null/no coverage as zero; never interpret absence of hotspot detections as no fire.
- Handle asynchronous coverage & spatial resolution mismatch honestly; the nearest weather grid cell is not a reading at the doorstep.
- Do not publish exact residence coordinates without need; location permission opt-in.
- Cache and rate limit upstream requests; implement errors, timeouts, retries conservatively.

## 6. Technical innovation: small but serious ML + GIS

The user explicitly wants **"a little ML" with credible technical depth** while keeping consumer-facing UX extremely simple.

### 6.1 Recommended ML research question

**"Does adding wind-aware wildfire features improve short-term PM2.5 prediction relative to persistence and an existing air-quality forecast baseline?"**

**Recommended supervised target:** observed PM2.5 at a station `t + 6h` (later 3/12/24h). Only train when historical station measurements, historical weather/forecast snapshots and hotspot timestamps are sufficiently complete and aligned. Never train/evaluate using current forecasts as if they were the true ground truth. If observation coverage is inadequate, keep ML as a non-operational experimental module and ship a truthful baseline-forecast MVP.

**Model:** LightGBM (or XGBoost) tabular regression, off-line Python training and a lightweight inference worker/service; no GPU required. For first scaffold: an **ML module interface and training script skeleton**, not a pretend trained model. Do not put fabricated evaluation graphs or model metrics on site.

Candidate features:
- Recent observed PM2.5 and lagged values (when available).
- Corresponding **historical issue-time CAMS forecast** for t+h, not a newer revised forecast (guard against leakage).
- Wind speed/direction, humidity, precipitation, optional atmospheric mixing context.
- Hotspot counts, recency, distance, FRP, and wind-alignment / upwind exposure features for candidate regions.
- Time-of-day, seasonal context, station / grid metadata.

### 6.2 Wind-aware upwind exposure feature

A basic **proxy** for feature engineering, not a plume simulator or causal/physical transport model:

`S(x,t) = Σ_i FRP_i · exp(-distance_i / λ) · max(0, dot(unit_wind_to, unit_hotspot_to_user)) · recency_weight_i`

- `FRP_i`: NASA FIRMS fire radiative power when present, otherwise a clearly documented alternative feature.
- `distance_i`: distance from hotspot to target; use geodesic/haversine.
- `unit_wind_to`: forecast wind vector pointing **toward** travel, converted from meteorological `windDirectionFrom` with +180°.
- `unit_hotspot_to_user`: vector from hotspot towards user.
- `λ`: tunable distance decay; choose empirically; cap range and document assumptions.
- Recency weight: satellite hotspot age, with fixed decay and no invented detections.

This **must not be displayed as "72% chance smoke reaches you"**. It is a model input / supporting indicator only. Different wind layers and heights, plume rise, turbulence, moisture, and transport are not captured by this single-vector proxy.

### 6.3 Explainability

Only compute **SHAP** on a real trained, versioned model. Display attributable features but never phrase them as established causes. If no trained model, display an explanatory list of deterministic facts and clearly labelled heuristic output.

### 6.4 Uncertainty

Later: LightGBM quantile regression / conformal intervals, evaluated for empirical coverage. Do not fabricate a 90% prediction interval. Surface model performance only when evaluated on untouched temporal and, ideally, geographically separated holdouts.

### 6.5 Evaluation and ablation

- Baseline A: persistence of last observed PM2.5.
- Baseline B: raw CAMS/Open-Meteo PM2.5 forecast at target/horizon.
- Model C: weather + CAMS (+ appropriate historical PM2.5).
- Model D: C + hotspot count features.
- Model E: D + **wind-aware exposure** features.
- Temporal splits (never shuffle adjacent times), spatial/station holdouts if feasible; evaluate by smoke season vs other periods.
- Metrics: MAE, RMSE; high-pollution-event precision/recall by an explicitly chosen standard; coverage for uncertainty intervals.
- Don't announce accuracy improvement unless the evaluation shows it. A negative result is valid.

### 6.6 Practical fallback if data insufficient

Ship: Open-Meteo air-quality forecast (baseline) + FIRMS hotspot map + authentic wind forecast + deterministic explainable analysis + source transparency. Label the analysis as **indicators**, not validated ML. Build model training as optional separate task and demonstrate with a clearly labelled offline dataset only when appropriate.

## 7. Recommended architecture

**Prefer a pnpm monorepo, TypeScript-first product, separate optional Python ML directory.** Be pragmatic: one server + one client is enough for hackathon MVP.

Suggested technologies, aligned with user preferences:
- Frontend: **React + Vite + TypeScript**, Tailwind CSS, shadcn/ui for accessible base components, Lucide icons, TanStack Query, Recharts, MapLibre GL JS.
- Backend: **Fastify + TypeScript**, Zod for runtime validation. Start stateless + file fixtures for speed. If persistence really needed, PostgreSQL + **PostGIS** (+ Drizzle for non-spatial metadata); avoid DB until it earns complexity for v0.
- Analysis: small pure TS geospatial utilities for radius/angle/wind features; Python offline `ml/` for pandas/lightgbm/shap/scikit-learn when real training data exists.
- Frontend no API secrets. Browser does not request NASA private MAP_KEY directly; backend fetches/caches.
- Map tiles: MapLibre-compatible public/commercial provider with correctly configured attribution, terms, and token. Mock local map state if token unavailable; no silent blank UI.
- Hosting: static frontend (Vercel or equivalent), backend container on suitable service (or same deployment if compatible), not a necessary microservices cluster.

Suggested layout:

```text
pavana/
  AGENTS.md
  README.md
  .env.example
  pnpm-workspace.yaml
  package.json
  apps/
    web/
      src/
        app/
        components/
        features/today/
        features/map/
        features/insights/
        features/alerts/
        features/location/
        lib/
        styles/
      public/
    api/
      src/
        routes/
        providers/
        services/
        domain/
        config/
  packages/
    shared/
      src/        # schemas, types, unit conversions
  ml/
    README.md
    requirements.txt
    training/      # optional; honest research artifacts only
  fixtures/
    README.md      # provenance and DEMO labels
    scenario-kubu-raya.json
  docs/
    PAVANA_HANDOFF.md
    data-sources.md
    modeling-methodology.md
  design/
    references/     # brand/mascot boards, never presented as actual data
```

**Suggested stable API surface** (actual formats determined by schema):
- `GET /health`
- `GET /api/locations/search?q=...` (or local constrained fixture at first)
- `GET /api/conditions?lat=&lon=` (latest values, provenance)
- `GET /api/forecast?lat=&lon=&hours=24` (baseline PM2.5/weather time slices + provenance)
- `GET /api/hotspots?bbox=&from=&to=` (normalized FIRMS features; controlled limits)
- `GET /api/insights?lat=&lon=` (derived factors, caveats, model status)
- `GET /api/official-links?region=` (curated authoritative entry points; not fake alert feed)

Types should distinguish `observed`, `forecast`, `derivedIndicator`, `officialAlert`, `fixture`, and `unavailable`. Example concept:

```ts
type Provenance = {
  provider: string;
  kind: 'observation' | 'forecast' | 'derived' | 'fixture';
  fetchedAt: string;
  issuedAt?: string;
  validAt: string;
  isDemo: boolean;
  spatialResolutionKm?: number;
  notes?: string;
};

type AirQualityPoint = {
  pm25UgM3: number | null;
  aqi?: { value: number; standard: 'US_EPA' | 'ID_ISPU' } | null;
  provenance: Provenance;
};
```

### Fixture-first strategy

- Demo must work with **no API keys**. Include a clearly labelled simulation/historical fixture consistent with the same type schemas. Show `Mode Demo · Data ilustratif` visibly across Today/Map/Insights.
- A `.env` switch should enable optional live adapters; fail gracefully when keys or upstream data unavailable. Do not hide fixture status under a fake `Live` badge.
- Fixtures must be plausible but explicitly synthetic unless a timestamped source can be verified. No synthetic fake official fire reports.
- Use deterministic fixtures to make recording and judging repeatable.

## 8. Security, privacy, safety, trust

**Red lines:**
- No "fire will arrive in X minutes" based on vector/straight-line wind calculation.
- No "you are safe" based on missing detections or a coarse PM2.5 model.
- No invented live active fires, official warnings, evacuation routes/orders, AQI results, dates, or performance statistics.
- No unlabeled animated smoke plume unless derived from a genuine smoke transport forecast. Animated wind arrows are okay if based on real wind data and clearly labelled.
- No implicit claim that elevated PM2.5 has been **caused** by a particular wildfire (sources can include traffic, industry, etc.).
- Never confuse forecast issuance time, validity time and download time.
- Avoid location precision overcollection: consent for geolocation, optional manual selection, local-only storage at MVP if practical.
- Rate-limit backend and protect provider keys; validate bbox/lat/lon/limits; secure CORS; no secret commits.
- Preserve appropriate map/source attributions and check datasets' licensing.

Product should provide **official information links** where possible and defer emergency decisions to local authorities. For severe or uncertain cases, communicate limitations and encourage checking current official alerts; do not mask stale data with a calming illustration.

## 9. MVP scope vs next steps

### P0 — build first, end-to-end
1. Runable monorepo + one-command development (`pnpm install`, `pnpm dev`) + no-key demo.
2. Responsive mobile-first Pavana shell based on **Sky/Breeze**, with logotype and simple SVG wind mark.
3. Today page with location (demo Kubu Raya), clearly marked demo/real, PM2.5 conditions and 24h timeline, source/valid time.
4. Map with selected location, sample or live hotspots, time indication, wind arrows, click details, legend, attribution. Layer/coverage honesty.
5. Insights with non-ML deterministic factor explanation + trend chart and limitations.
6. Provider interfaces, zod-normalized response contracts, 2+ source adapters stubs or working connectors, appropriate errors.
7. Tests for unit normalization, wind-direction conversion, geo-distance/score, unknown/stale status and demo labeling.
8. README + `.env.example`, startup instructions, limitations and available source status.

### P1 — if time/data permit
- Working NASA FIRMS connector behind server cache and key.
- Live baseline forecast + weather adapter (Open-Meteo), with provider attribution and selected region coverage.
- More robust source sync/history.
- Official contextual feed/verified links; opt-in informational alerts.
- Saved places and PWA install support.

### P2 — genuine model and validation
- Source/obtain matched historical PM2.5 station observations and issue-time weather/forecast archives.
- Train/evaluate LightGBM with temporal/geographic splits.
- Run ablations including upwind fire score and baseline comparisons.
- Surface SHAP and uncertainty only when a real model + evaluation exists.
- Consider proper smoke-transport forecasts (not ad hoc fire-direction animations).

### Explicitly out of scope for scaffold
- Login/accounts, SaaS billing, crowdsourced official incident confirmation, evacuation route recommender, nationwide live smoke CFD, satellite forest-deforestation ML, user-generated wildfire orders, elaborate AI chat interface, hardware/IoT.

## 10. Acceptance criteria

- `pnpm dev` starts web + API locally with documented commands; no external keys required in **demo mode**.
- Home, Map, Insights functional at mobile 375px and desktop 1280px; basic accessible keyboard navigation.
- The site defaults to Indonesian language and a labelled Kubu Raya demo scenario.
- Every measurement carries source, observation/forecast/demo type, and valid timestamp; no unlabeled simulated data.
- UI explicitly distinguishes PM2.5 concentration (`µg/m³`) from AQI category/standard, and fire detection from official confirmation.
- Wind vector math passes tests for meteorological direction conversion and basic west→east alignment case.
- No ML accuracy/SHAP/intervals appear as results unless trained and evaluated with versioned artifacts.
- Map hotspots show acquisition time and never imply continuous tracking of perimeter.
- Missing/outdated upstream inputs produce a degraded state, not a false "Good" result.
- README explains current operational capabilities and known limitations.

## 11. Competitive positioning and framing

There are existing Indonesia-facing fire and smoke information systems, including **BMKG**, **SPARTAN**, **SiPongi**, and NASA FIRMS; there have also been similar consumer product names like Pantau Asap/AsapRadar surfaced during preliminary exploration. Do **not** claim Pavana is the first wildfire app in Indonesia. The contribution to validate is **consumer-centered, explainable, location-specific integration** of authoritative data plus later **wind-aware statistical improvement** of short-term PM2.5 forecasting (if proven).

**Evaluation of product value:** (a) task completion time: can user interpret expected air-quality trend faster than navigating multiple agency sites? (b) comprehension correctness, (c) trust: awareness of data freshness/limitations, (d) empirical forecast error if ML exists. Distinguish **technical demo innovation** from **validated public-health effectiveness**.

## 12. Build instructions to the coding agent

1. **Inspect the current repo first**. If empty, scaffold; if nonempty, preserve working code and adapt structure. Never overwrite unrelated files without cause.
2. Read `/PAVANA_HANDOFF.md`, `/AGENTS.md`, and reference images. Choose **Sky/Breeze** and **air-spirit as provisional mascot direction**, but keep mascot artwork optional/not overused.
3. Write a short implementation plan with P0 milestones, then implement rather than only planning.
4. Start with fixtures, implement Today → Map → Insights, wire all pages to typed API. Introduce source adapter interfaces before writing provider-specific code.
5. Keep front end highly polished but restrained. Real information architecture is more important than ornamental art.
6. Implement testable pure geospatial math and normalization; run tests, typecheck, and build, report results.
7. Mark every unfinished live connector and model step transparently in code/docs/UI. Never fabricate integrations, metrics, or emergency alerts.
8. At the end, report: what runs, how to start, where to change provider keys, what is fixture vs live, what requires real ML training/validation, and the next 3 priorities.

## 13. Pointers / background

Background project inspiration discussed: **ForestShield** (satellite deforestation detection, 2025 AWS Lambda Hackathon winner). Pavana diverged to a location-aware smoke/air-quality experience. Useful official docs to consult during implementation:
- NASA FIRMS: https://firms.modaps.eosdis.nasa.gov/api/area/
- BMKG open forecasts: https://data.bmkg.go.id/prakiraan-cuaca/
- Open-Meteo weather API: https://open-meteo.com/en/docs
- Open-Meteo air quality: https://open-meteo.com/en/docs/air-quality-api
- OpenAQ API: https://api.openaq.org/docs
- BMKG PM2.5: https://www.bmkg.go.id/kualitas-udara/pm25
- BMKG SPARTAN: https://spartan.bmkg.go.id/
- NASA/NOAA HYSPLIT reference (NOT required MVP): https://www.arl.noaa.gov/hysplit/
- MapLibre: https://maplibre.org/maplibre-gl-js/docs/

**Final north star:** *Be as easy to use as a weather app, but more honest about uncertainty than a typical hackathon dashboard.*
