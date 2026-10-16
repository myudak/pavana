# ML research and daily forecasts — implementation handoff

Updated: 16 October 2026. This is the implementation context for Claude Code, Codex,
and reviewers. Read `AGENTS.md` and `CONTRIBUTING.md` first. The older
`PAVANA_HANDOFF.md` remains the product brief; its original scaffold status is historical.

## What is implemented

The Today page now shows daily minimum/maximum PM2.5 from the existing CAMS provider.
`GET /api/forecast` accepts up to 120 hours; Open-Meteo weather and air-quality adapters
request 121 forecast hours, with the existing one-hour past buffer. The response includes
the current hour and can contain nulls beyond actual provider coverage.

`summarizeDailyForecast` groups timestamps in the selected location's time zone, removes
duplicate timestamps, preserves real zero, leaves missing values unknown, and trims only
the all-null leading/trailing dates. Internal unknown dates remain visible. Each row shows
available hours out of 24 and marks partial days. Bars show the range of available hourly
values, not uncertainty intervals. Demo mode still uses the labelled synthetic fixture.

`/lab-ml` is a separate historical research page, linked from Prakiraan. It loads
`apps/web/public/ml/research.json`, a real notebook export, and lets the reader choose among
168 historical target hours. It shows the CAMS target, LightGBM prediction, persistence,
local SHAP contributions, global importance, a historical chart, all five test scores,
and source/model revisions. It is fixed to the documented Kubu Raya research location,
independent of the user's selected live location. It does not run inference in the browser.

## Boundaries to preserve

- The six-hour ML target is **CAMS model output**, not BMKG/OpenAQ station observations.
  Weather features are ERA5 reanalysis. There is no historical CAMS issue-time evidence
  sufficient to claim operational forecast skill.
- `evaluated: true` means scored on a retrospective holdout. `operational_ready` and
  `observation_validated` remain false. Do not weaken `is_app_ready` in
  `ml/src/pavana_ml/models/lgbm.py` or plug this model into live forecast routes.
- Live forecasts continue to use provider data. The historical export has its own
  `ResearchBundleSchema`; it is not a `ForecastResponse` or a provider response.
- The selected LightGBM variant is **D**, chosen using validation MAE only. Persistence
  wins on test. SHAP is an attribution of model output, not proof of pollution causation
  or evidence that a feature group improves forecast skill.
- The short BMKG snapshot supplies context only. No additional training data was collected
  in this change. Hotspots remain satellite detections, not confirmed fires.

## Notebook, artifacts, and exact evidence

Use `ml/notebooks/00_cloud_setup.ipynb`. In Kaggle: **CPU**, **Internet On**, clean session,
then **Run all** with `SMOKE = False`. No provider API key or Kaggle CLI is required for
the notebook. The private notebook belongs to `myudak`:
<https://www.kaggle.com/code/myudak/pavana-ml-h1-demo> (version 4 completed successfully).
Access to that private page requires the owning Kaggle account; public dataset downloads
inside the notebook do not require its credentials.

| Item                   | Recorded value                                                                            |
| ---------------------- | ----------------------------------------------------------------------------------------- |
| Run                    | `cams-t6h-retro-kaggle-explain-v1`                                                        |
| Dataset                | `myudak/pavana` on Hugging Face                                                           |
| Data revision          | `aaa0d2714102b7d3a7b3ad0beb2b1da1ce6a6dbe`                                                |
| Training code revision | `a9a0d6d98008e08e80d6e978d82cfc89f79282af`                                                |
| Code ref               | `refs/pr/6` — preserve the pin; do not merge the Hugging Face PR to make the notebook run |
| Selected model SHA256  | `3510a708682ac04b333ac6c7ffbb77f83d9d0052cc56526ead059366d6f869aa`                        |
| Web export SHA256      | `197e32a8fae407cd1b02942c9fbacb9daeae4fd1ce5292a4a9219cd50ddaea88`                        |
| Downloaded ZIP SHA256  | `f23564a99568c4e4dfcccdb6b39991b5a9d895d773deed61306265c8dfa4b73e`                        |

The notebook installs the pinned training bundle and verifies code/data manifests. The
SHAP/export helpers are in this repository's notebook; the older notebook inside the
pinned bundle is not a replacement for this file. Original chronological train/validation/test
splits and six-hour gaps are preserved. All variants share 6,882 test rows.

| Variant | Inputs                      | Test MAE | Test RMSE |
| ------- | --------------------------- | -------: | --------: |
| A       | Persistence                 |    14.39 |     28.38 |
| B       | Train-only seasonal mean    |    25.42 |     47.09 |
| C       | CAMS history + weather/time |    21.58 |     43.48 |
| D       | C + hotspot detections/FRP  |    20.75 |     42.26 |
| E       | D + upwind indicator        |    20.89 |     42.45 |

Errors are in µg/m³. These are real research results, not fixture metrics. Unrounded
values are in the committed research export and the notebook's metrics artifacts.

Tree SHAP uses `tree_path_dependent`, raw model output, SHAP 0.52.0. Global plots use
1,000 holdout hours sampled with seed 20261015; local cases use the earliest contiguous
168-hour window, without selection by error/pollution. The notebook checks model/report
checksums, feature order, table fingerprint, target alignment, reproduced predictions,
and SHAP additivity before exporting. Web validation repeats shape/horizon/status and
additivity checks; the sum of omitted local contributions is retained as “Fitur lainnya”.

The downloadable ZIP contains model C/D/E files and metadata, predictions, metrics,
report, data audit, `cloud_run.json`, `research.json`, five PNGs (errors, historical series,
SHAP bar/beeswarm/waterfall), CSV presentation tables, and `ringkasan_riset.md`.
Full outputs stay in Kaggle and ignored `ml/artifacts/`; locally the final download is
`ml/artifacts/pavana-research-shap.zip`. A fresh clone does not contain that ignored ZIP.
Re-run the notebook to regenerate it. Only the compact research export is committed for
the web page; do not hand-edit its values or readiness flags.

## Code map and verification

- Daily aggregation and view: `apps/web/src/features/today/daily-forecast.ts`,
  `DailyForecast.tsx`, and `TodayPage.tsx`.
- Historical view: `apps/web/src/features/research/LabPage.tsx` and `research-derive.ts`.
- Contract: `packages/shared/src/schemas/research.ts`; Indonesian UI copy:
  `apps/web/src/lib/i18n/id.ts`.
- Notebook regression checks: `ml/tests/test_cloud_demo.py` and
  `ml/tests/test_research_explanations.py`. Synthetic test runs are explicitly labelled
  and are not the published experiment's scores.
- Full checkpoint history: `ml/PLAN.md`; runtime/regeneration guide: `ml/README.md`;
  provider behavior: `docs/data-sources.md`.

Verified before committing the implementation: `pnpm check` (139 JS/TS tests),
`pnpm build`, 149 Python tests, ruff lint/format, stripped notebooks, and diff/format checks.
Browser checks covered Prakiraan → Lab ML, hour selection, desktop and 375 px dark layouts,
and the production build. A real API call at Kubu Raya returned five local dates with
20/24/24/24/8 non-null hours at the time of the check; that is evidence of provider coverage,
not a promise of five dates for every location/run. No provider key was needed for that check.

From the repository root:

```sh
pnpm install --frozen-lockfile
pnpm dev
# /lab-ml: historical export; /?demo=1: reproducible labelled daily fixture
pnpm check
pnpm build
uv run --project ml pytest ml/tests
uv run --project ml ruff check ml
uv run --project ml ruff format --check ml
uv run --project ml nbstripout --verify ml/notebooks/*.ipynb
```

PowerShell does not expand the last glob: collect notebook paths with `Get-ChildItem`
and pass the resulting array to nbstripout. Browser rendering is verified separately;
jsdom's zero-size Recharts warning is not evidence of a browser layout failure.
