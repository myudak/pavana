# Data sources

Status legend: ✅ working · 🧪 fixture only · ⛔ not implemented · 🔗 link only.
**Do not mark a source ✅ until its adapter has been tested against the real API.**

| Source                                                                   | Use                                            | Status | Adapter                                              | Notes                                                             |
| ------------------------------------------------------------------------ | ---------------------------------------------- | ------ | ---------------------------------------------------- | ----------------------------------------------------------------- |
| Pavana fixture                                                           | Demo scenario (PM2.5, wind, hotspots)          | 🧪     | `apps/api/src/providers/fixture`                     | Synthetic, `isDemo: true`                                         |
| [NASA FIRMS](https://firms.modaps.eosdis.nasa.gov/api/area/)             | Hotspots (VIIRS/MODIS): lat/lon, UTC time, FRP | ⛔     | `providers/firms` · `ml/.../data/firms.py`           | `FIRMS_MAP_KEY` server-side; transaction limits; detection ≠ fire |
| [Open-Meteo Weather](https://open-meteo.com/en/docs)                     | Wind speed/direction, RH, precip               | ⛔     | `providers/open-meteo` · `ml/.../data/open_meteo.py` | Forecast, not observation; `timezone=GMT`, `wind_speed_unit=ms`   |
| [Open-Meteo Air Quality](https://open-meteo.com/en/docs/air-quality-api) | CAMS PM2.5 baseline                            | ⛔     | `providers/open-meteo`                               | Coarse grid (~40 km); total PM2.5, not "fire smoke"               |
| [OpenAQ v3](https://api.openaq.org/docs)                                 | Station PM2.5 (ground truth / observation)     | ⛔     | `providers/openaq` · `ml/.../data/openaq.py`         | `OPENAQ_API_KEY`; sparse in Kalimantan                            |
| [BMKG Data Terbuka](https://data.bmkg.go.id/prakiraan-cuaca/)            | Local forecasts                                | ⛔     | —                                                    | Keyed by admin code (adm4); check terms                           |
| [BMKG PM2.5](https://www.bmkg.go.id/kualitas-udara/pm25)                 | Official air-quality context                   | 🔗     | `apps/api/src/data/official-links.ts`                | Website ≠ programmatic API                                        |
| [BMKG SPARTAN](https://spartan.bmkg.go.id/)                              | Fire danger / smoke context                    | 🔗     | official-links                                       | Don't scrape without permission                                   |
| [SiPongi](https://sipongi.gakkum.kehutanan.go.id/)                       | Official hotspot/fire status                   | 🔗     | official-links                                       | Don't conflate with FIRMS                                         |

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
