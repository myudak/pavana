# Data sources

Status legend: ✅ working (checked against the real API) · 🔶 built, awaiting a real-API check (needs a key) · 🧪 fixture only · ⛔ not implemented · 🔗 link only · 🚫 verified unavailable.
**Do not mark a source ✅ until its adapter has been tested against the real API.**
Rows marked "ML loader ✅" have a tested `ml/src/pavana_ml/data` loader but **no** `apps/api`
provider yet — the app still serves the fixture.

| Source                                                                     | Use                                                                           | Status            | Adapter                                                         | License                                                                                                                                                                                           | Attribution                                                  | Notes                                                                                                                                                                               |
| -------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | ----------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pavana fixture                                                             | Demo scenario (PM2.5, wind, hotspots)                                         | 🧪                | `apps/api/src/providers/fixture`                                | Internal (repo ini); sintetis                                                                                                                                                                     | Label UI "Mode Demo · Data ilustratif"                       | Synthetic, `isDemo: true`                                                                                                                                                           |
| Pavana regional fixture                                                    | Demo hotspot field, Kalimantan-wide (density)                                 | 🧪                | `apps/api/src/providers/fixture`                                | Internal (repo ini); sintetis                                                                                                                                                                     | Label UI "Mode Demo · Data ilustratif" + legenda kepadatan   | ~1346 deteksi sintetis (seeded, 4 sabuk + 10 pusat + latar); keep-out 75 km di sekitar Sungai Raya                                                                                  |
| [NASA FIRMS](https://firms.modaps.eosdis.nasa.gov/api/area/)               | Hotspots (VIIRS NOAA-20/21, S-NPP NRT): lat/lon, UTC time, FRP, confidence    | ✅                | `providers/firms` · `ml/.../data/firms.py`                      | Gratis dengan `FIRMS_MAP_KEY`; ikuti syarat layanan FIRMS                                                                                                                                         | "NASA FIRMS" di panel Peta + waktu deteksi per titik         | One Indonesia-wide request per satellite (day range 2), cached 15 min, filtered in memory. Key server-side only, never in errors/logs. Detection ≠ fire; outage → upwind `unknown`. |
| [Open-Meteo Weather](https://open-meteo.com/en/docs)                       | Hourly wind (FROM°, m/s), temp, RH, precip; gridded current wind for the map  | ✅                | `providers/open-meteo` · `ml/.../data/open_meteo.py`            | Data CC BY 4.0; API gratis untuk penggunaan non-komersial                                                                                                                                         | "Weather data by Open-Meteo.com" + provenance per datum      | `timezone=GMT`, `timeformat=unixtime`, `wind_speed_unit=ms`, `past_hours=1&forecast_hours=121`; cached 15 min (wind grid 30 min); stale-on-error ≤ 6 h. Checked 2026-10-16.         |
| [Open-Meteo Air Quality](https://open-meteo.com/en/docs/air-quality-api)   | CAMS global PM2.5 forecast (baseline)                                         | ✅                | `providers/open-meteo`                                          | Data CC BY 4.0 (CAMS/Copernicus); API non-komersial                                                                                                                                               | "Open-Meteo (CAMS)" + `spatialResolutionKm: 45`              | `domains=cams_global`; total PM2.5, not "fire smoke"; ~45 km grid. Endpoint occasionally slow → 12 s timeout, stale-on-error. Checked 2026-10-16.                                   |
| [OpenAQ v3](https://api.openaq.org/docs)                                   | Nearest station PM2.5 (observation overlay)                                   | ✅                | `providers/openaq` · `ml/.../data/openaq.py`                    | Ikuti ketentuan OpenAQ; `OPENAQ_API_KEY`                                                                                                                                                          | "OpenAQ" + nama stasiun di kartu PM2.5                       | Only ≤ 25 km and < 2 h old; else none (common in Kalimantan). Never replaces the CAMS forecast.                                                                                     |
| [BMKG Data Terbuka](https://data.bmkg.go.id/prakiraan-cuaca/)              | 3-hourly weather forecast, comparison only (`/api/weather-reference`)         | ✅                | `providers/bmkg` + `data/bmkg-adm4.ts`                          | Wajib atribusi "BMKG (Badan Meteorologi, Klimatologi, dan Geofisika)"; batas 60 req/menit/IP                                                                                                      | "Pembanding: BMKG" di Prakiraan → Cuaca                      | Curated adm4 list (9 smoke-prone cities, codes verified 2026-10-15); ≤ 30 km else `insufficient`. `ws` km/h → m/s. Official warnings stay link-only.                                |
| [BMKG PM2.5](https://www.bmkg.go.id/kualitas-udara/pm25)                   | Official air-quality context                                                  | 🔗                | `apps/api/src/data/official-links.ts`                           | Situs resmi; bukan API — tautan saja                                                                                                                                                              | Tautan di halaman Info                                       | Website ≠ programmatic API; diperiksa 2026-10-15 (HTTP 200)                                                                                                                         |
| [KLHK ISPU / AQM](https://ispu.kemenlh.go.id/)                             | Station PM2.5 + weather (observation)                                         | 🔗                | —                                                               | Real hourly observations (e.g. `PONTIANAK`, `PALANGKARAYA`) but a rolling ~24 h window only. `POST /internal/web/site/detail-data` needs the page's CSRF token. Ask permission before automating. |
| [BMKG SPARTAN](https://spartan.bmkg.go.id/)                                | Fire danger / smoke context                                                   | 🔗                | official-links                                                  | Situs resmi; bukan API — tautan saja; don't scrape                                                                                                                                                | Tautan di halaman Info                                       | Diperiksa 2026-10-15 (HTTP 200); don't scrape without permission                                                                                                                    |
| [SiPongi](https://sipongi.gakkum.kehutanan.go.id/)                         | Official hotspot/fire status                                                  | 🔗                | official-links                                                  | Situs resmi Kementerian Kehutanan; bukan API — tautan saja                                                                                                                                        | Tautan di halaman Info                                       | Don't conflate with FIRMS; diperiksa 2026-10-15 (HTTP 200)                                                                                                                          |
| [BNPB](https://bnpb.go.id/)                                                | Official disaster info                                                        | 🔗                | official-links                                                  | Situs resmi; bukan API — tautan saja                                                                                                                                                              | Tautan di halaman Info                                       | 2026-10-15: 403 untuk permintaan otomatis (kemungkinan proteksi bot); cek manual                                                                                                    |
| [BPBD Kalbar](https://bpbd.kalbarprov.go.id/)                              | Regional disaster info + daily karhutla reports                               | 🔗                | official-links                                                  | Situs resmi Pemprov Kalbar; bukan API — tautan saja                                                                                                                                               | Tautan di halaman Info                                       | Diperiksa 2026-10-15 (HTTP 200)                                                                                                                                                     |
| [NASA FIRMS Fire Map](https://firms.modaps.eosdis.nasa.gov/map/)           | Satellite anomaly context (interactive map)                                   | 🔗                | official-links                                                  | Situs resmi NASA; bukan API — tautan saja                                                                                                                                                         | Tautan di halaman Info                                       | Detection ≠ fire; diperiksa 2026-10-15 (HTTP 200)                                                                                                                                   |
| [IEM ASOS/METAR](https://mesonet.agron.iastate.edu/request/download.phtml) | Airport visibility + weather codes (HZ/FU), haze model training + live inputs | ✅                | `providers/model-inputs` · `ml/` data kernel                    | Iowa Environmental Mesonet, open archive                                                                                                                                                          | "METAR via IEM" on model cards                               | 12 airports (Borneo, Sumatra) since 2015; Palangka Raya has no archive.                                                                                                             |
| [NOAA AWC METAR](https://aviationweather.gov/data/api/)                    | Recent METAR fallback for haze and wind models                                | ✅                | `providers/model-inputs/noaa-metar.ts`                          | US government data                                                                                                                                                                                | "METAR via NOAA AWC"                                         | Whole reports only (no field merging); ≤ 3 h old or the output is null.                                                                                                             |
| [NASA FIRMS 7-day CSV](https://firms.modaps.eosdis.nasa.gov/active_fire/)  | Recent Suomi NPP VIIRS detections for the hotspot-risk model                  | ✅                | `providers/model-inputs`                                        | Keyless public file; follow FIRMS terms                                                                                                                                                           | "NASA FIRMS"                                                 | South-East Asia 7-day file; stale input → null with a reason.                                                                                                                       |
| [OpenRouter](https://openrouter.ai/)                                       | LLM for Tanya Pavi (`POST /api/chat`)                                         | ✅                | `apps/api/src/services/chat.ts`                                 | Paid API, `OPENROUTER_API_KEY` server-side                                                                                                                                                        | Chat footer: beta, not medical advice or an official warning | Grounded in a JSON snapshot of Pavana data; never sees provider keys.                                                                                                               |
| Wind field (`GET /api/wind-field`)                                         | Gridded wind for streamlines and smoke-direction trails                       | ✅ live · 🧪 demo | `providers/open-meteo` (live) · `services/wind-field.ts` (demo) | Open-Meteo (live) / internal synthetic (demo)                                                                                                                                                     | Panel Peta: "angin Open-Meteo" or "ilustratif"               | 14×14 grid; live via chunked multi-point `current=` requests; missing points stay null.                                                                                             |

## Map tiles (atribusi peta)

- Default basemaps: **CARTO Voyager** (light) and **CARTO Dark Matter** (dark), free CARTO
  vector basemaps built on OpenStreetMap data (`apps/web/src/features/map/basemap.ts`; the
  mobile app uses the same pair). Dark Matter gets a gentle Dusk grade (land/water/rivers/
  boundaries) at runtime; Voyager is untouched.
- Override with `VITE_MAP_STYLE_URL` (light) and `VITE_MAP_STYLE_URL_DARK` (dark); empty =
  the CARTO defaults (see `.env.example`).
- Attribution: "© CARTO, © OpenStreetMap contributors" comes from the style JSON and is shown
  by the MapLibre attribution control (kept above the map's bottom sheet). CARTO's free
  basemaps are for non-commercial/low-volume use; revisit B3 in `docs/PRD.md` before any
  commercial or high-traffic launch.

## Observed PM2.5 is the blocker

Every candidate target source was checked on 2026-10-15, and **none of them publishes an
archive**:

| Source            | Observed? | Archive?                          |
| ----------------- | --------- | --------------------------------- |
| OpenAQ v3         | yes       | none in Kalimantan                |
| BMKG (9 stations) | yes       | current day only                  |
| KLHK/AQM          | yes       | rolling ~24 h only                |
| CAMS (Open-Meteo) | **no**    | 2.8 years, but it is model output |

A model field cannot serve as the supervised target — that is circular when CAMS is also the
baseline being compared against, and `docs/modeling-methodology.md` requires an _observed_
target. Until an observation archive exists (forward collection, or an official data request),
the modelling work is limited to an explicitly labelled CAMS-target experiment.

## Normalization rules (enforced by `packages/shared` schemas)

- Timestamps: UTC ISO-8601 (`…Z`). Display in the location's zone (WIB/WITA/WIT).
- PM2.5: `µg/m³`, `null` if missing. Wind: m/s, meteorological FROM degrees.
- Every datum: `provenance { provider, kind, fetchedAt, issuedAt?, validAt, isDemo, spatialResolutionKm?, notes? }`.
- Forecasts keep `issuedAt` (model run) separate from `validAt` and `fetchedAt`.
- The nearest grid cell is not a doorstep reading — set `spatialResolutionKm`.

## Adding a source

1. Implement the interface from `apps/api/src/providers/types.ts`.
2. Normalize units/timestamps at the boundary; attach provenance.
3. Timeouts, conservative retries, caching; never expose keys to the browser.
4. Tests with recorded responses (no live calls in CI).
5. Update this table and the landing page's source list.

## Locations (live)

- `apps/api/src/data/regions-id.json`: all 514 kabupaten/kota with province and a representative
  coordinate, from **Wikidata (CC0)** via `fixtures/scripts/build-regions-id.mjs`. Used for offline
  search and for naming a point ("Sekitar Kota Pontianak" — nearest centroid, not an administrative
  claim). Province → WIB/WITA/WIT time zone in `providers/regions`.
- Smaller places come from Open-Meteo geocoding (`countryCode=ID`), which also returns the IANA zone.

## Modes and caching

- Production runs `PAVANA_MODE=live`. Any request with `?demo=1` is answered from the fixture
  scenario (the app's "Mode data" switch). Demo answers are always `state: demo`.
- Responses carry `Cache-Control: public, s-maxage=…, stale-while-revalidate=…` per route
  (10–30 min live, 1 h demo, no-store on errors) so Vercel's edge absorbs traffic.
- `GET /api/sources` reports each source as ok / error / not_configured (keys never exposed).
- Manual real-API check: `pnpm --filter @pavana/api smoke:live` (never in CI).

## Daily PM2.5 view and historical ML lab

`GET /api/forecast` accepts up to 120 hours. The Today page groups non-null CAMS PM2.5
by the selected location's calendar day, showing minimum, maximum and available hour count.
The first/last day can be partial; all-null tail days are omitted. The bar is a range across
available hourly values, not an uncertainty interval or a new Pavana ML forecast.

`/lab-ml` reads a frozen research export at `apps/web/public/ml/research.json`.
It contains real held-out model predictions and Tree SHAP, with pinned revisions and model
checksum. It never replaces the live provider response. The CAMS-target model remains
`operational_ready: false` and `observation_validated: false`.
