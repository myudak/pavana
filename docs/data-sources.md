# Data sources

Status legend: ✅ working · 🧪 fixture only · ⛔ not implemented · 🔗 link only ·
🚫 verified unavailable.
**Do not mark a source ✅ until its adapter has been tested against the real API.**
Rows marked "ML loader ✅" have a tested `ml/src/pavana_ml/data` loader but **no** `apps/api`
provider yet — the app still serves the fixture.

| Source                                                                   | Use                                            | Status | Adapter                                              | Notes                                                                                                                                                                                                                                                                                                                                                                 |
| ------------------------------------------------------------------------ | ---------------------------------------------- | ------ | ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pavana fixture                                                           | Demo scenario (PM2.5, wind, hotspots)          | 🧪     | `apps/api/src/providers/fixture`                     | Synthetic, `isDemo: true`                                                                                                                                                                                                                                                                                                                                             |
| [NASA FIRMS](https://firms.modaps.eosdis.nasa.gov/api/area/)             | Hotspots (VIIRS/MODIS): lat/lon, UTC time, FRP | ⛔     | `providers/firms` · `ml/.../data/firms.py`           | `FIRMS_MAP_KEY` server-side; `DAY_RANGE` ≤ 5; detection ≠ fire. ML loader ✅ 2026-10-15                                                                                                                                                                                                                                                                               |
| [Open-Meteo Weather](https://open-meteo.com/en/docs)                     | Wind speed/direction, RH, precip               | ⛔     | `providers/open-meteo` · `ml/.../data/open_meteo.py` | ERA5 **reanalysis** — model output, not a station reading. `timezone=GMT`, `wind_speed_unit=ms`. ML loader ✅ 2026-10-15                                                                                                                                                                                                                                              |
| [Open-Meteo Air Quality](https://open-meteo.com/en/docs/air-quality-api) | CAMS PM2.5                                     | ⛔     | `providers/open-meteo`                               | CAMS **model field**, never an observation: over Kalimantan it is the global domain, 0.4° (~45 km), 3-hourly, interpolated to hourly. No issue-time archive, so a past model run cannot be reconstructed. It snaps to a grid cell and echoes it — two points 9 km apart landed in adjacent cells differing by 63% in Aug–Oct 2026, so always store the returned cell. |
| [OpenAQ v3](https://api.openaq.org/docs)                                 | Station PM2.5 (ground truth / observation)     | 🚫     | `providers/openaq` · `ml/.../data/openaq.py`         | Verified 2026-10-15: **0 locations in the Kalimantan bbox**; 94 in Indonesia, all Java/Sumatra, mostly low-cost sensors. `radius` caps at 25 km; v1/v2 retired (`410`).                                                                                                                                                                                               |
| [BMKG Data Terbuka](https://data.bmkg.go.id/prakiraan-cuaca/)            | Local forecasts                                | ⛔     | —                                                    | Keyed by admin code (adm4); catalogue carries forecasts and earthquakes only — no PM2.5. Check terms.                                                                                                                                                                                                                                                                 |
| [BMKG PM2.5](https://www.bmkg.go.id/kualitas-udara/pm25)                 | Official air-quality context                   | 🔗     | `apps/api/src/data/official-links.ts`                | Website ≠ programmatic API. Serves the current day only, so it supports a forward archive, never a backfill.                                                                                                                                                                                                                                                          |
| [KLHK ISPU / AQM](https://ispu.kemenlh.go.id/)                           | Station PM2.5 + weather (observation)          | 🔗     | —                                                    | Real hourly observations (e.g. `PONTIANAK`, `PALANGKARAYA`) but a rolling ~24 h window only. `POST /internal/web/site/detail-data` needs the page's CSRF token. Ask permission before automating.                                                                                                                                                                     |
| [BMKG SPARTAN](https://spartan.bmkg.go.id/)                              | Fire danger / smoke context                    | 🔗     | official-links                                       | Download page returned HTTP 500 (2026-10-14). Don't scrape without permission.                                                                                                                                                                                                                                                                                        |
| [SiPongi](https://sipongi.gakkum.kehutanan.go.id/)                       | Official hotspot/fire status                   | 🔗     | official-links                                       | Don't conflate with FIRMS                                                                                                                                                                                                                                                                                                                                             |

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
