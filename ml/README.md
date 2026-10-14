# Pavana ML (research workspace)

> **Experimental. Not operational.** Nothing here powers the app until a model is trained on
> real, aligned data and evaluated on untouched holdouts. The app currently uses
> deterministic indicators (`apps/api/src/services/insights.ts`).

## Research question

> Does adding **wind-aware wildfire features** improve short-term **PM2.5** prediction relative to
> **persistence** and an existing **air-quality forecast baseline** (CAMS via Open-Meteo)?

- **Target:** observed station PM2.5 at `t + 6h` (later 3/12/24h).
- **Model:** LightGBM tabular regression, trained offline (CPU).
- **Ablations:** A persistence · B CAMS issue-time forecast · C weather+CAMS(+lags) · D C+hotspot counts · E D+**upwind exposure**.
- A negative result is a valid result. See `docs/modeling-methodology.md`.

## Setup

Requires [uv](https://docs.astral.sh/uv/).

```bash
# from repo root
pnpm ml:setup      # = uv sync --project ml
pnpm ml:lab        # Jupyter Lab in ml/notebooks
pnpm ml:test       # pytest

# or from ml/
uv sync
uv run jupyter lab
uv run pytest
uv run ruff check .
```

API keys (FIRMS, OpenAQ) are read from the **repo-root** `.env` via `pavana_ml.config`.
Never paste keys into notebooks.

## Layout

```
notebooks/
  00_setup_and_conventions.ipynb   units, UTC, provenance, wind FROM vs TO
  01_explore_demo_fixture.ipynb    plots the synthetic Kubu Raya scenario
  02_data_sources.ipynb            FIRMS / Open-Meteo / OpenAQ fetch skeletons (TODO)
  03_feature_engineering.ipynb     lags, hotspot counts, upwind exposure (leak-free)
  04_baselines_and_lightgbm.ipynb  baselines, temporal split, LightGBM skeleton, ablation table
  05_explainability_shap.ipynb     gated: only runs with an evaluated artifact
src/pavana_ml/
  data/         loaders (fixtures works; firms/open_meteo/openaq are stubs)
  features/     geo, wind, upwind (mirrors packages/shared), lags
  models/       baselines, lightgbm wrapper + versioned artifacts
  evaluation/   temporal splits, MAE/RMSE/event precision-recall
tests/          pytest (incl. TS↔Python parity on fixtures/test-vectors/geo-wind.json)
data/           raw/ interim/ processed/  (gitignored)
artifacts/      versioned models + metadata.json (gitignored)
```

## Rules

1. **No leakage.** Temporal splits only; features at time *t* use data available at *t*
   (hotspots acquired ≤ t, forecasts *issued* ≤ t). Never train on later re-analyses as if issued earlier.
2. **No fake results.** Don't commit metrics, plots of metrics, or SHAP output from synthetic
   fixtures. Notebooks are committed **with outputs stripped** (CI enforces `nbstripout --verify`).
3. **Missing ≠ zero.** Keep NaN; never fill missing PM2.5 or "no detections" with 0 meaning safe.
4. **Parity.** If you change geo/wind/upwind math, change `packages/shared` too and update
   `fixtures/test-vectors/geo-wind.json`.
5. **Artifacts** must include `metadata.json` with features, data windows, holdout metrics and
   `evaluated: true` before the API may consider them.

Before committing a notebook: `uv run nbstripout notebooks/*.ipynb`.
