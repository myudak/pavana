# Data sources

Status legend: ✅ working · 🧪 fixture only · ⛔ not implemented · 🔗 link only ·
🚫 verified unavailable.
**Do not mark a source ✅ until its adapter has been tested against the real API.**
Rows marked "ML loader ✅" have a tested `ml/src/pavana_ml/data` loader but **no** `apps/api`
provider yet — the app still serves the fixture.

| Source                                                                   | Use                                             | Status | Adapter                                              | License                                                                                       | Attribution                                                | Notes                                                                                              |
| ------------------------------------------------------------------------ | ----------------------------------------------- | ------ | ---------------------------------------------------- | --------------------------------------------------------------------------------------------- | ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Pavana fixture                                                           | Demo scenario (PM2.5, wind, hotspots)           | 🧪     | `apps/api/src/providers/fixture`                     | Internal (repo ini); sintetis                                                                 | Label UI "Mode Demo · Data ilustratif"                     | Synthetic, `isDemo: true`                                                                          |
| Pavana regional fixture                                                  | Demo hotspot field, Kalimantan-wide (density)   | 🧪     | `apps/api/src/providers/fixture`                     | Internal (repo ini); sintetis                                                                 | Label UI "Mode Demo · Data ilustratif" + legenda kepadatan | ~1346 deteksi sintetis (seeded, 4 sabuk + 10 pusat + latar); keep-out 75 km di sekitar Sungai Raya |
| [NASA FIRMS](https://firms.modaps.eosdis.nasa.gov/api/area/)             | Hotspots (VIIRS/MODIS): lat/lon, UTC time, FRP  | ⛔     | `providers/firms` · `ml/.../data/firms.py`           | Gratis dengan `FIRMS_MAP_KEY`; ikuti syarat layanan FIRMS                                     | Kredit "NASA FIRMS" di Peta + waktu deteksi per titik      | `FIRMS_MAP_KEY` server-side; transaction limits; detection ≠ fire                                  |
| [Open-Meteo Weather](https://open-meteo.com/en/docs)                     | Wind speed/direction, RH, precip                | ⛔     | `providers/open-meteo` · `ml/.../data/open_meteo.py` | Ikuti ketentuan penggunaan di situs Open-Meteo (cek halaman lisensi/terms sebelum production) | Kredit "Open-Meteo" + provenance per datum                 | Forecast, not observation; `timezone=GMT`, `wind_speed_unit=ms`                                    |
| [Open-Meteo Air Quality](https://open-meteo.com/en/docs/air-quality-api) | CAMS PM2.5 baseline                             | ⛔     | `providers/open-meteo`                               | Ikuti ketentuan penggunaan di situs Open-Meteo                                                | Kredit "Open-Meteo (CAMS)" + `spatialResolutionKm`         | Coarse grid (~40 km); total PM2.5, not "fire smoke"                                                |
| [OpenAQ v3](https://api.openaq.org/docs)                                 | Station PM2.5 (ground truth / observation)      | ⛔     | `providers/openaq` · `ml/.../data/openaq.py`         | Ikuti ketentuan OpenAQ; `OPENAQ_API_KEY`                                                      | Kredit "OpenAQ" + id stasiun                               | `OPENAQ_API_KEY`; sparse in Kalimantan                                                             |
| [BMKG Data Terbuka](https://data.bmkg.go.id/prakiraan-cuaca/)            | Local forecasts                                 | ⛔     | —                                                    | Ikuti ketentuan BMKG (cek lisensi sebelum dipakai)                                            | Kredit "BMKG"                                              | Keyed by admin code (adm4); check terms                                                            |
| [BMKG PM2.5](https://www.bmkg.go.id/kualitas-udara/pm25)                 | Official air-quality context                    | 🔗     | `apps/api/src/data/official-links.ts`                | Situs resmi; bukan API — tautan saja                                                          | Tautan di halaman Info                                     | Website ≠ programmatic API; diperiksa 2026-10-15 (HTTP 200)                                        |
| [KLHK ISPU / AQM](https://ispu.kemenlh.go.id/)                           | Station PM2.5 + weather (observation)          | 🔗     | —                                                    | Real hourly observations (e.g. `PONTIANAK`, `PALANGKARAYA`) but a rolling ~24 h window only. `POST /internal/web/site/detail-data` needs the page's CSRF token. Ask permission before automating.                                                                                                                                                                     |
| [BMKG SPARTAN](https://spartan.bmkg.go.id/)                              | Fire danger / smoke context                     | 🔗     | official-links                                       | Situs resmi; bukan API — tautan saja; don't scrape                                            | Tautan di halaman Info                                     | Diperiksa 2026-10-15 (HTTP 200); don't scrape without permission                                   |
| [SiPongi](https://sipongi.gakkum.kehutanan.go.id/)                       | Official hotspot/fire status                    | 🔗     | official-links                                       | Situs resmi Kementerian Kehutanan; bukan API — tautan saja                                    | Tautan di halaman Info                                     | Don't conflate with FIRMS; diperiksa 2026-10-15 (HTTP 200)                                         |
| [BNPB](https://bnpb.go.id/)                                              | Official disaster info                          | 🔗     | official-links                                       | Situs resmi; bukan API — tautan saja                                                          | Tautan di halaman Info                                     | 2026-10-15: 403 untuk permintaan otomatis (kemungkinan proteksi bot); cek manual                   |
| [BPBD Kalbar](https://bpbd.kalbarprov.go.id/)                            | Regional disaster info + daily karhutla reports | 🔗     | official-links                                       | Situs resmi Pemprov Kalbar; bukan API — tautan saja                                           | Tautan di halaman Info                                     | Diperiksa 2026-10-15 (HTTP 200)                                                                    |
| [NASA FIRMS Fire Map](https://firms.modaps.eosdis.nasa.gov/map/)         | Satellite anomaly context (interactive map)     | 🔗     | official-links                                       | Situs resmi NASA; bukan API — tautan saja                                                     | Tautan di halaman Info                                     | Detection ≠ fire; diperiksa 2026-10-15 (HTTP 200)                                                  |
| Demo wind field (`GET /api/wind-field`)                                  | Gridded wind for regional streamlines           | 🧪     | `apps/api/src/services/wind-field.ts`                | Internal (repo ini); sintetis                                                                 | Label UI "demo: ilustrasi sintetis" di panel Peta          | Grid 9×9 deterministik; live = 501 (butuh adapter Open-Meteo / Track A)                            |

## Map tiles (atribusi peta)

- Default `VITE_MAP_STYLE_URL` = `https://demotiles.maplibre.org/style.json` (lihat `.env.example`).
  Atribusi tampil otomatis lewat kontrol atribusi MapLibre (`attributionControl: { compact: true }`
  di `apps/web/src/features/map/HotspotMap.tsx`) sesuai isi style JSON.
- Penyedia tile final (MapTiler / Protomaps / OSM) **belum diputuskan** — lihat B3 di `docs/PRD.md`.
  Saat penyedia dipilih: cantumkan lisensinya di tabel ini dan pastikan kreditnya tampil di
  aplikasi (halaman Info dan/atau kontrol peta).

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
