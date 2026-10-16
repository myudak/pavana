# AGENTS.md — `ml/` (Python research workspace)

Scoped guidance for agents working inside `ml/`. The repo-root [`AGENTS.md`](../AGENTS.md) still
applies in full — especially: never invent data, fires or model metrics; keep provenance; `null`
for missing values; never coerce missing to `0`; a detection is not a confirmed fire.

Read [`README.md`](README.md) for the research question and
[`../docs/modeling-methodology.md`](../docs/modeling-methodology.md) for the ablation design.

## Delegating exploration and shell work

For substantial data exploration or long-running shell analysis in `ml/`, use
[`dsh-delegate`](/home/kemal/.codex/skills/dsh-delegate/SKILL.md) when an independent subtask
can be bounded clearly. The user authorizes this delegation for future ML work within the
requested task's scope. Follow the skill's profile checks and command-execution verification.
Keep exploration read-only by default; give DSH only relevant paths and instructions, excluding
secrets. Codex reviews the output and independently verifies findings that determine the next step.

## What this workspace is

Offline Python research **plus the training code of the models the app serves as experiments**.

Serving policy (user decision, 16 Oct 2026 — replaces the earlier "never serve a model" rule):
a model may be served when it has an **observed** target, was **evaluated on a temporal holdout**
against honest baselines, and is labelled **"eksperimental"** in the UI
(`pavana_ml.models.lgbm.is_servable_experimental`). `is_app_ready` (operational readiness) stays
stricter and nothing meets it. The original CAMS-target Path 2 ablation (`models/experiment.py`)
stays historical research in `/lab-ml`.

Narrow exception authorized by the user on 16 Oct 2026: the NEW CAMS-only t+6h autoregression in
`pipelines/regressions.py` may be served under `servingPolicy: experimental-cams-proxy`.
Its `targetKind` stays `model`, never observation, and `operationalReady` stays false. This does
not qualify it for `is_servable_experimental` or `is_app_ready`; the API checks the separate
explicit proxy contract. See [ML live handoff](../docs/ML_LIVE_HANDOFF.md).

Served models (trained in Kaggle, see `kaggle/`):

| Model | Target | Code |
| --- | --- | --- |
| `hotspot-risk` | ≥1 Suomi NPP VIIRS detection in a 0.25° Kalimantan cell on UTC day d+1 | `pipelines/hotspot_risk.py`, `features/hotspot_grid.py` |
| `haze-6h`, `haze-24h` | airport METAR visibility < 3 km with HZ/FU, no rain/fog, at t+6 h / t+24 h | `pipelines/haze_nowcast.py`, `features/haze_station.py` |
| `pm25` | CAMS model field t+6h (explicit proxy exception) | `pipelines/regressions.py`, `features/pm25.py` |
| `wind-u`, `wind-v` | airport METAR wind-vector components t+6h | `pipelines/regressions.py`, `features/station_wind.py` |

Training runs on Kaggle from a verified snapshot. Stage the paced local weather cache once,
then pin both source hashes/versions as documented in the live handoff:

```bash
uv run --project ml python ml/kaggle/build.py observed-data --push   # fetch keyless sources
uv run --project ml python ml/kaggle/build.py observed-train --push  # train + evaluate + export
kaggle kernels output myudak/pavana-observed-train -p <dir>          # pull models/
```

Use `ml/scripts/install_live_models.py` to verify metrics and install serving JSON into
`apps/api/src/models/`. The TS evaluator
(`packages/shared/src/model/gbdt.ts`) is checked against the `*.parity.json` LightGBM vectors, and the
live feature code (`packages/shared/src/model/*-features.ts`) mirrors the Python features — change both.

## Commands

From the repo root:

```bash
pnpm ml:setup   # uv sync --project ml
pnpm ml:lab     # jupyter lab in ml/notebooks
pnpm ml:test    # uv run --project ml pytest ml/tests
```

From `ml/` — this is exactly what CI runs:

```bash
uv sync
uv run ruff check .
uv run ruff format --check .
uv run pytest
uv run nbstripout --verify notebooks/*.ipynb
```

Run all four before finishing. `uv run ruff format .` rewrites files — see the trap below about
notebooks.

## Hard rules

1. **No leakage.** Temporal splits only. Features at time *t* may use data available at *t*
   (hotspots acquired ≤ t, forecasts issued ≤ t). Never shuffle adjacent hours across train/test.
2. **No fabricated results.** Do not commit metrics, metric plots or SHAP output produced from
   synthetic fixtures. Notebooks are committed with outputs stripped.
3. **Missing ≠ zero.** Keep `NaN`. Never fill missing PM2.5, and never read "no detections" as
   "no fire".
4. **Parity.** Changing geo/wind/upwind math means changing `packages/shared` too and updating
   `fixtures/test-vectors/geo-wind.json`. `tests/test_parity_vectors.py` guards this.
5. **Artifacts** need `metadata.json` with features, data windows, holdout metrics and
   `evaluated: true` before anything may consider them.
6. **Fetch logic belongs in `src/pavana_ml/data/`**, not in a notebook cell — CI has no network,
   so loaders must be tested against small recorded responses.

## Layout

```
src/pavana_ml/
  paths.py      canonical dirs — import these, never hardcode paths
  config.py     reads the REPO-ROOT .env (FIRMS_MAP_KEY, OPENAQ_API_KEY)
  data/         loaders → tidy frames, UTC timestamps, units in column names
  features/     geo, wind, upwind, lags (mirrors packages/shared)
  models/       baselines + LightGBM wrapper with versioned artifacts
  evaluation/   temporal splits, MAE/RMSE, event precision/recall
tests/          pytest, offline only
notebooks/      00..05 scaffolding; stripped before commit
data/           raw/ interim/ processed/  (gitignored)
artifacts/      versioned models + metadata.json  (gitignored)
```

Tidy-frame convention: `valid_at` / `acquired_at` in UTC; `pm25_ug_m3`, `wind_speed_ms`,
`wind_dir_from_deg`, `rh_pct`, `precip_mm`, `frp_mw`, `lat`, `lon`.

Secrets live only in the repo-root `.env` (gitignored; `.env.example` is tracked). Read them via
`pavana_ml.config.get_settings()`. Never print a key, never put one in a notebook cell — a
committed notebook output would leak it permanently.

## Data sources — verified 2026-10-15

Re-verify dates before relying on them; availability moves.

| Source                 | Verified state                                                                                                                                                 |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FIRMS SP (archive)     | `MODIS_SP` ≤ 2026-07-31; `VIIRS_SNPP_SP`, `VIIRS_NOAA20_SP`, `VIIRS_NOAA21_SP` ≤ 2026-06-30                                                                    |
| FIRMS NRT (realtime)   | `MODIS_NRT` from 2026-08-01; `VIIRS_SNPP_NRT` / `VIIRS_NOAA20_NRT` from 2026-07-01; `VIIRS_NOAA21_NRT` from 2024-01-17. `DAY_RANGE` ≤ 5, limit 5000 req/10 min |
| Open-Meteo weather     | ERA5 **reanalysis** via `archive-api`. Complete over Kalimantan for 2024-01-01 → 2026-10-14. Model output, not a station reading                               |
| Open-Meteo air quality | CAMS **model field**, global domain 0.4° (~45 km), 3-hourly, interpolated to hourly. No issue-time archive, so a past model run cannot be reconstructed        |
| OpenAQ v3              | **0 locations in the Kalimantan bbox.** 94 in Indonesia, all Java/Sumatra. `radius` ≤ 25 km, `X-API-Key` required, v1/v2 retired                               |
| BMKG PM2.5             | 9 Kalimantan stations, current day only — forward archive possible, backfill impossible                                                                        |
| BMKG Data Online       | Climate parameters only (no PM2.5), 2-year access limit                                                                                                        |
| BMKG SPARTAN           | Download page returned HTTP 500                                                                                                                                |
| KLHK ISPU / AQM        | Real hourly PM2.5 + weather (`PONTIANAK`, `PALANGKARAYA`), rolling ~24 h only. `POST /internal/web/site/detail-data` needs the page's CSRF token               |

Anchor used by the current pipeline: **Sungai Raya, Kubu Raya** — `-0.0710660252, 109.3712469865`,
taken from `data/prakiraan_cuaca_kalimantan.csv` (adm4 `61.12.01.2001`) so the demo location and
the ML series agree.

Produced datasets (all gitignored, rebuild with the loaders):

```
data/processed/hotspot_kalimantan.parquet   SP + NRT stitched, with a `processing` column
data/raw/firms/*.csv                        raw SP archive + NRT batches (cached; reuse, don't refetch)
data/raw/open_meteo/weather_*.parquet       ERA5 hourly, UTC, + .provenance.json
data/raw/open_meteo/cams_*.parquet          CAMS hourly, UTC, + .provenance.json
```

## Traps that cost real time here

- **Timezone.** Hugging Face `data_kualitas_udara.csv` was pulled with `timezone=Asia/Jakarta`, so
  its `waktu` column is **WIB, not UTC** — shift by −7 h before joining FIRMS or ERA5. Always
  request `timezone=GMT` yourself.
- **CAMS grid snapping.** The API serves a grid cell and echoes it; the requested coordinate does
  not identify what was measured. Two points 9 km apart landed in adjacent cells differing by 63%
  in mean PM2.5 over Aug–Oct 2026 (130.4 vs 79.9 µg/m³). Keep the returned `lat`/`lon`.
- **SP vs NRT.** They carry the same detections but disagree on `acq_time` by ~1 minute, so
  de-duplicate on a time bucket, keep the `processing` column, and prefer SP where both exist. The
  SP archive will eventually catch up to the NRT window and duplicate rows if you drop that column.
- **NRT is live.** Over one identical request the same source returned 265,045 then 270,033 rows
  minutes apart. Recent-window counts are not reproducible; cached raw batches are.
- **FIRMS dtypes and scales.** `confidence` is a percentage for MODIS but a class letter
  (`l`/`n`/`h`) for VIIRS — kept as `confidence_pct` and `confidence_class`, never merged.
  `version` is `"61.03"` (MODIS) vs `"2.0NRT"` (VIIRS). Left to pandas, these mixed columns infer
  numeric and then fail on parquet write; `tidy_hotspots` applies an explicit schema instead.
- **Batches from elsewhere may lack `processing`.** Derive it from `source_sensor` rather than
  leaving it null.
- **ERA5 gaps are real.** `boundary_layer_height_m` is missing for 4,368 of 24,432 hours. Leave it
  `NaN`; do not interpolate silently.
- **`uv run ruff format .` also reformats notebooks** (`extend-include = ["*.ipynb"]`). Check
  `git status` afterwards; it will touch `.ipynb` files you did not mean to edit.
- **Regime shift masquerading as signal.** Daily log1p hotspot count vs CAMS PM2.5 correlates
  +0.27 within the pre-2026-08 period and +0.27 within the Aug–Oct 2026 season, but +0.54 across
  the whole record — the pooled number is mostly the regime shift. Always include a time-aware
  baseline (month, day-of-year, hour) before claiming hotspot or wind features add skill.

## Current blocker

**No observed PM2.5 archive exists for Kalimantan.** Every candidate was checked: OpenAQ has no
stations there, BMKG and KLHK serve rolling ~24 h windows only, and CAMS is model output.

A model field cannot be the supervised target — the ablation compares against CAMS, so using it as
the target is circular, and the methodology doc requires an *observed* target. Until an archive
exists (forward collection, or an official data request), work is limited to an experiment that
predicts CAMS and says so in its title, metadata and slides. Do not describe CAMS values as
observations anywhere.
