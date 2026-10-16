# Pavana ML (research workspace)

> **Experimental. Not operational.** The app keeps its provider forecasts and deterministic
> indicators, alongside separately labelled experimental ML outputs. The six-booster Kaggle flow
> and its serving contracts are documented in
> [ML live handoff](../docs/ML_LIVE_HANDOFF.md). Operational readiness (`is_app_ready`) stays strict.
> The older H-1 CAMS ablation below remains historical research in `/lab-ml`.

## Two research paths — never merge them

**Path 1 — the product question (open, blocked by data).** Does adding wind-aware wildfire features
improve short-term prediction of **observed station PM2.5** at `t + 6 h` relative to persistence and
the CAMS forecast? That is the question the product needs and the one
[`docs/modeling-methodology.md`](../docs/modeling-methodology.md) defines. It cannot be trained yet:
no observed PM2.5 archive exists for Kalimantan (OpenAQ has no station in the bbox; BMKG and KLHK
serve rolling ~24 h windows only; CAMS is model output — see [`AGENTS.md`](AGENTS.md), "Current
blocker"). Do not substitute a model field for the observation.

**Path 2 — the experiment that could actually be run (retrospective, CAMS target).** It asks a
narrower question: do weather, hotspot detections and upwind exposure add skill when predicting the
**CAMS model field** at `t + 6 h` on one grid cell? It is an ablation, not station validation and not
evidence of operational forecast skill. Artifacts say so in their own metadata (`target_kind: "model"`,
`observation_validated: false`, `operational_ready: false`).

### What path 2 found

Holdout 2026-01-01 → 2026-10-14 UTC, 6 882 origin hours, identical rows for every variant. Recomputed
from `ml/artifacts/cams-t6h-retro-v1/test_predictions.parquet`:

| Variant | Features | MAE µg/m³ | RMSE µg/m³ |
| --- | --- | ---: | ---: |
| A · persistence `pred(t+6) = CAMS(t)` | 1 | **14.39** | **28.38** |
| B · train-only mean per (month, hour) | 0 | 25.42 | 47.09 |
| C · LightGBM: CAMS history + weather + time | 26 | 21.58 | 43.48 |
| D · C + hotspot counts/FRP | 44 | 20.75 | 42.26 |
| E · D + upwind score | 45 | 20.89 | 42.45 |

Read honestly: **persistence wins**, and the detection/upwind groups add nothing material
(D − C = −0.83 MAE, E − D = +0.14). The test period sits above the training range — target
p50/max is 10.1/66.4 µg/m³ in train and 17.2/430.3 µg/m³ in test — and a boosted tree cannot predict
beyond the range it was trained on, while persistence carries the current level through the high
hours. Variant B here is a train-only seasonal mean, **not** the product's CAMS issue-time baseline:
the snapshot has no `issued_at`, so that baseline cannot be reconstructed and was not run.

Event metric at 55.5 µg/m³ (US AQI 151 "Unhealthy" lower bound of the 24 h PM2.5 breakpoints, 1 358
hours): A precision 0.73 / recall 0.73; B–E never predict at or above the threshold. It is a
model-field threshold, not a station AQI category and not a health warning.

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

API keys (FIRMS, OpenAQ) are read from the **repo-root** `.env` via `pavana_ml.config`. They are not
needed for the flows below: the snapshot is public and already cached. Never paste a key into a
notebook.

## Local flow — run in this order, from a clean kernel

Every stage reads its input **from disk**, so a stage can be re-run on its own and no stage depends
on variables left in a previous kernel.

| Step | Notebook | Reads | Writes |
| --- | --- | --- | --- |
| 1 | `02_data_sources.ipynb` | cached snapshot (`data/raw/`, `data/processed/hotspot_kalimantan.parquet`) | `data/interim/hourly_aligned.parquet`, `data/interim/audit_report.json` |
| 2 | `03_feature_engineering.ipynb` | the two interim files + the hotspot parquet | `data/processed/model_table.parquet`, `data/processed/model_table.metadata.json` |
| 3 | `04_baselines_and_lightgbm.ipynb` | the model table + its metadata | `artifacts/<version>/` — `report.json`, `metrics.csv`, `test_predictions.parquet`, `C|D|E/model.txt` + `metadata.json` |

`01_explore_demo_fixture.ipynb` (synthetic fixture) and `05_explainability_shap.ipynb` are optional
and outside this chain; `00_setup_and_conventions.ipynb` fixes units, UTC and provenance. Notebook 05
stays gated and prints "No evaluated model artifact — nothing to explain": the CAMS run keeps its
models in `C/`, `D/`, `E/` subdirectories, and `latest_evaluated_artifact()` deliberately does not
pick those up. `05` opens when an observation-target artifact exists.

Data lives at `ml/data/` (gitignored) and resolves through `pavana_ml.paths`. On a fresh clone, set
`DOWNLOAD_IF_MISSING = True` in notebook 02 once to fetch the snapshot at its pinned revision; the
files are then reused. Full numbers and the hashes they were computed from are in
[`PLAN.md`](PLAN.md).

## Cloud flow — Colab / Kaggle

### Notebook riset di Kaggle (CPU)

1. Login ke Kaggle, buat **New Notebook**, lalu **File → Import Notebook** dan unggah
   `notebooks/00_cloud_setup.ipynb` dari checkout terbaru ini.
2. Pilih **Accelerator: None (CPU)** dan **Internet: On**. Tidak perlu Kaggle CLI, token Hugging
   Face, atau API key penyedia data. Selesaikan verifikasi akun jika diminta untuk akses internet.
3. Mulai dari sesi baru dan **Run all**, dengan `SMOKE = False` untuk eksperimen penuh.
4. Notebook menampilkan audit, evaluasi A–E, deret historis, importance SHAP, beeswarm, dan
   waterfall. Sampel global berisi 1.000 jam dengan seed tetap; penjelasan lokal mencakup
   168 jam berurutan paling awal pada holdout, tanpa pemilihan berdasarkan polusi/error.
5. Unduh ZIP lewat tautan terakhir atau panel **Output → /kaggle/working/pavana**; gunakan
   **Save Version** untuk menyimpan notebook beserta outputnya di Kaggle.

ZIP memuat model C/D/E, metadata, `report.json`, `metrics.csv`, `test_predictions.parquet`,
`cloud_run.json`, `data_audit.json`, `research.json`, serta folder `presentation/`: lima PNG,
tabel metrik, cuplikan mingguan CSV, dan `ringkasan_riset.md`. Metrik dihitung ulang dari prediksi
sebelum ditampilkan. Jika baseline menang, ringkasan mengatakannya; tidak ada tuning pada test.
Hasil tetap bertarget CAMS, retrospektif, dan belum divalidasi terhadap pengukuran stasiun.

`research.json` dipakai halaman `/lab-ml` melalui asset statis `apps/web/public/ml/research.json`.
Schema bersama memeriksa dimensi, status riset, horizon, serta penjumlahan SHAP. Dataset ini tidak
menjadi provider prakiraan live dan tidak mengubah `is_app_ready`. Ekspor hanya dibuat setelah
checksum model dan fingerprint tabel sesuai, prediksi direproduksi, serta additivity SHAP lulus.

`00_cloud_setup.ipynb` is the all-in-one runner: set writable directories → install the code bundle
from Hugging Face at a pinned revision → download the curated data snapshot at *its own* pinned
revision → run the same three stages as 02→03→04 → write `cloud_run.json` and a zip of the artifact.

- Writable roots: `/kaggle/working/pavana` or `/content/pavana` (override with
  `PAVANA_CLOUD_WORK_ROOT`); `PAVANA_ML_DATA_DIR` and `PAVANA_ML_ARTIFACTS_DIR` are set **before**
  `pavana_ml` is imported, so restart the kernel if it was already imported.
- Internet must be **on** for the install and the download. No GPU and no provider API key: the
  snapshot is public and the experiment is CPU-only.
- The code revision and the data revision are separate pins; both are printed and recorded in
  `cloud_run.json`. `RESOLVE_CODE_HEAD = True` resolves the code ref once at the start instead of
  using the pinned commit.
- Take `00_cloud_setup.ipynb` from this repository or from the pull-request head, **not** from the
  pinned bundle commit: the copy inside `a9a0d6d9…` predates the pin and still points at the data PR
  ref (`refs/pr/5` → `aaa0d271…`), where no `code/` folder exists, so it fails instead of installing
  anything. The head copy pins `a9a0d6d9…` and installs exactly that revision; the bundle at the pin
  verifies against its own `CODE_MANIFEST.json`.
- A cloud session is wiped when it ends. Download `cloud_run.json` and the artifact zip (or copy them
  to Drive) before closing it. `fatal: not a git repository` during training is expected and only
  makes `git_commit` `null`.
- Recorded in the CP4 evidence of [`PLAN.md`](PLAN.md): a real Kaggle run
  (`cams-t6h-retro-kaggle-v1`) reproduced the local 6 882 test predictions bit-for-bit, RMSE exactly
  and MAE to 1 ulp; only `upwind_score` moved (3.6e-16 relative, float summation order). Colab is
  **not** verified, and the Kaggle artifact is not kept in this workspace — the run record is.

## Rules

1. **No leakage.** Temporal splits only; features at time *t* use data available at *t* (hotspots
   acquired ≤ t, forecasts *issued* ≤ t). Never train on later re-analyses as if issued earlier.
2. **No fake results.** Don't commit metrics, plots of metrics, or SHAP output from synthetic
   fixtures. Notebooks are committed **with outputs stripped** (CI enforces `nbstripout --verify`).
3. **Missing ≠ zero.** Keep NaN; never fill missing PM2.5 or read "no detections" as "no fire".
4. **Parity.** If you change geo/wind/upwind math, change `packages/shared` too and update
   `fixtures/test-vectors/geo-wind.json`.
5. **Artifacts** must include `metadata.json` with features, data windows, holdout metrics and
   `evaluated: true`. That is not the same as servable — check `is_app_ready`.

## Layout

```
notebooks/
  00_cloud_setup.ipynb             all-in-one Colab/Kaggle runner (pinned, self-verifying)
  00_setup_and_conventions.ipynb   units, UTC, provenance, wind FROM vs TO
  01_explore_demo_fixture.ipynb    optional demo on the synthetic Kubu Raya scenario
  02_data_sources.ipynb            snapshot audit, validation, alignment, EDA
  03_feature_engineering.ipynb     model table: lags, weather, hotspot windows, upwind
  04_baselines_and_lightgbm.ipynb  splits, baselines A/B, LightGBM C/D/E, holdout metrics
  05_explainability_shap.ipynb     gated on an evaluated, observation-target artifact
src/pavana_ml/
  data/         fixtures + loaders (firms, open_meteo implemented; openaq fetch not implemented)
  features/     geo, wind, upwind (mirrors packages/shared), model_table
  models/       lgbm wrapper, experiment runner + versioned artifacts
  evaluation/   temporal splits, MAE/RMSE/event precision-recall
tests/          pytest, offline only (incl. TS↔Python parity on fixtures/test-vectors/geo-wind.json)
data/           raw/ interim/ processed/  (gitignored)
artifacts/      versioned runs + metadata (gitignored)
```

Before committing a notebook: `uv run nbstripout notebooks/*.ipynb`.

Full gate, from the repo root:

```bash
uv sync --project ml --extra hub
uv run --project ml --extra hub ruff check ml
uv run --project ml --extra hub ruff format --check ml
uv run --project ml --extra hub pytest ml/tests
uv run --project ml --extra hub nbstripout --verify ml/notebooks/*.ipynb
pnpm check
```
