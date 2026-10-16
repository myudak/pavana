# Pavana ML live — context for Claude, Codex, and reviewers

User-approved expansion, 16 October 2026. The branch starts from Claude's
`proj/ml-usable-c5439b` at `5be5780`, preserving its four ML commits, on top of the map redesign
at `origin/main` (`b1aac3f`). The original checkout, Claude worktree, and its running paced weather
fetch were preserved. Work happens in managed worktree `pavana-ml-live`,
branch `codex/ml-live-expansion`.

The original weather process stopped independently after 17 cached points. One resumable fetch
completed the remaining eleven using the same raw cache; the first seventeen were not downloaded
again. All 28 points completed and the audited dataset was published on 16 October.

## Outputs and boundaries

| Output       | Target                                                       | Serving reference                                                         |
| ------------ | ------------------------------------------------------------ | ------------------------------------------------------------------------- |
| Hotspot      | Probability of ≥1 Suomi NPP VIIRS detection on UTC d+1       | 0.25° land grid in the documented Kalimantan bbox                         |
| Haze, 6/24 h | METAR visibility <3 km with HZ/FU, without precipitation/fog | Named airport and distance                                                |
| PM2.5, 6 h   | Numeric estimate against the CAMS model field                | Requested Sungai Raya anchor; returned CAMS cell -0.099998474, 109.399994 |
| Wind, 6 h    | METAR u/v components, converted to speed and direction FROM  | Named airport and distance                                                |

There are six actual LightGBM boosters: hotspot, haze-6h, haze-24h, pm25, wind-u, wind-v.
All are experimental and `operationalReady: false`. Losing to persistence does not disqualify an
otherwise correctly trained/evaluated experimental model. Scores must be reported as found.

The PM2.5 serving exception is deliberately separate: `targetKind: model` and
`servingPolicy: experimental-cams-proxy`. It is not an observation, a station validation, or a
change to `is_app_ready`. The historical H-1 CAMS ablation in
[the research handoff](ML_RESEARCH_HANDOFF.md) remains a separate artifact and unchanged result.

The UI displays ML cards in Prakiraan and a compact summary in Hari Ini. The map keeps Claude's
risk-grid overlay. Provider forecasts remain separate comparisons. Each detailed card includes
input/target timestamps, reference, model version, and live/replay status. The nearest available
airport within 300 km is shown, with its actual name and distance; this is not a prediction at the
user's home. PM2.5's initial display policy is within 25 km of the requested Sungai Raya anchor;
that is a product scope limit, not a validated 25 km spatial accuracy claim.

Missing or stale critical input gives null with reasons. CAMS requires complete autoregressive
features and an origin no more than 2 h old; a different returned CAMS grid is refused. METAR
requires a report no more than 3 h old. Wind lags may be missing (learned missing routing), but
current u/v, temperature and humidity are required. Direction is null below 0.5 m/s.
Classifiers' SHAP units are log-odds; PM2.5 uses µg/m³; wind explanations remain separate u/v m/s.
SHAP does not establish causation.

## Sources, training, and leakage guards

Data kernel uses internet; training kernel has internet disabled. The weather is fetched locally
once, not by Kaggle: 28 points on a 2° grid, approximately 230 s between requests, cached per point.
Never run a second fetcher while the Claude process is active. Upload can create or version a
dataset independently of download, using `--upload-only`. The cache audit checks checksums,
coordinates, duplicate point/day keys, dates, columns, and missingness. Effective end follows
complete actual weather coverage.

The historical weather request did not set `models=era5`; it is therefore recorded as
Open-Meteo's default historical model blend, not pure ERA5. Serving uses daily forecast/analysis
history from the forecast endpoint. That product difference remains unvalidated.

FIRMS uses Claude's 2015–2025 Indonesia/Malaysia Suomi NPP archive loader and pinned HF snapshot
for 2026. METAR uses the same twelve IEM airports, now including raw reports to distinguish absent
significant weather from unknown codes. PM2.5 uses pinned HF CAMS revision
`aaa0d2714102b7d3a7b3ad0beb2b1da1ce6a6dbe`, verified against manifest SHA256
`8cf1a9494a1d8dffe3d2816b68909b5df79ab75eaf8cadbdfe880aef69af4787`.
That source contains 24,432 hours through 2026-10-14 23:00 UTC, with no missing PM2.5.

Verified snapshot (data kernel version 4, weather dataset version 1):

| Source                              |      Rows | Actual last timestamp (UTC) |
| ----------------------------------- | --------: | --------------------------- |
| Suomi NPP VIIRS                     | 2,300,919 | 2026-10-14 17:00            |
| Twelve airports, METAR              | 1,714,960 | 2026-10-14 23:30            |
| Historical daily weather, 28 points |   120,568 | 2026-10-15                  |
| Sungai Raya CAMS grid               |    24,432 | 2026-10-14 23:00            |

Weather has no missing values across its five feature columns. METAR retains 4,789 missing
visibility values, 250,970 missing directions (including variable wind), 1,884 missing speeds,
27,534 unknown weather codes, and 12,047 missing/invalid relative humidities. Eligibility and
label availability further reduce the actual training/evaluation cohorts. Full per-column and
per-station counts are embedded in each model's `dataSnapshot` metadata.

METAR hourly bins use the last **whole report**, labelled at the completed hour's end. A 10:30
report belongs to the 11:00 origin and cannot influence the 10:00 origin. Missing fields are
retained; columns never come from different reports. Targets use the same hour-bin definition.
The actual report timestamp is retained separately from the origin.

Live serving retains IEM's 72-hour history and fills recent publication gaps from the
[NOAA Aviation Weather Center METAR API](https://aviationweather.gov/data/api/), in requests of
two stations over 12 hours. NOAA replaces whole reports at identical timestamps, never individual
fields. The response names the actual provider of the current report. Both sources use the same
completed-hour and freshness rules. The training archive remains IEM; provider differences have
not received a separate validation study. Censored NOAA visibility and variable wind direction
remain null.

- Observed targets: train 2015–2021, validation 2022–2023, test 2024–2025.
- PM2.5: train 2024, validation 2025, test 2026 through actual snapshot coverage.
- Any origin whose target crosses a split end is purged (24 h hotspot, 6/24 h haze, 6 h regressions).
- Static-source cell masks and climatologies are fitted from training data only.
- Early stopping uses validation only: maximum 600 rounds, patience 50, seed 20261016, four threads.
- Every method shares finite evaluation rows. Wind direction uses one additional common non-calm
  subset across all methods. Undefined scores become JSON null, never NaN or zero.
- Binary persistence is the train-calibrated conditional event rate given the current event.
  Regression persistence carries the current CAMS value or current u/v vector forward.
- Hotspot also reports available 2026 separately; it does not tune against that period.

Classification PR-AUC is average precision, with tied scores grouped. Brier skill uses a constant
equal to the evaluated cohort's prevalence as its metric reference; this differs from the
separately scored train-only climatology predictor. Higher AUC/AP and lower Brier/error are better.

Acquisition/report validity time does not prove publication availability. Historical SP detections
and model fields may be revised or arrive late. These are retrospective holdouts, not a historical
simulation of every provider's real-time latency. Detection-day presence is only a sensor-data
heuristic, not proof of complete satellite coverage; no detections does not mean no fire.

## Reproduce and install

`ml/kaggle/input-lock.json` pins weather manifest and data snapshot content hashes plus source
versions. The CLI attaches sources by slug, and both kernels refuse a content mismatch, so a
new upstream version cannot silently enter a run. The generated bundle records source SHA256,
git revision/dirty status, entry hash, metadata hash, and the input lock. `run.json` records the
Kaggle environment and completion of all six boosters.

From the repo root, after the single weather fetch finishes:

```sh
uv run --project ml python ml/scripts/fetch_weather_cache.py --source-stage <completed-Claude-weather-stage> --upload-only --upload
# Record the resulting weather version and manifest hash in input-lock.json.
uv run --project ml python ml/kaggle/build.py observed-data --push
kaggle kernels output myudak/pavana-observed-data -p ml/artifacts/live-data
# Record the successful data kernel version and snapshot hash in input-lock.json.
uv run --project ml python ml/kaggle/build.py observed-train --push
kaggle kernels output myudak/pavana-observed-train -p ml/artifacts/live-train
uv run --project ml python ml/scripts/install_live_models.py ml/artifacts/live-train/models --kernel-version <version>
```

The installer first recomputes all reported test metrics from prediction parquet, checks
horizons and JSON validity, verifies six model contracts and missing-input parity probes,
and only then copies serving JSON. Native boosters and predictions stay in Kaggle output/local
ignored artifacts. Checksums are recorded in `apps/api/src/models/artifact-manifest.json`;
`ml/reports/ml-live-run.json` preserves full evaluation metadata and the data audit.
The shared TS tests compare every booster and TreeSHAP output against Python LightGBM vectors.

## Implementation map

- Python: `features/pm25.py`, `features/station_wind.py`, `pipelines/regressions.py`,
  `pipelines/contract.py`, `data/live_snapshot.py`; existing hotspot/haze pipelines corrected.
- Shared: `model/gbdt.ts` supports identity regression without changing the binary sigmoid;
  `regression-features.ts` mirrors Python; `schemas/model.ts` preserves classification contracts
  and adds a separate `regressionModels` evaluation array.
- API: `services/regression-models.ts`, `providers/model-inputs/index.ts`,
  new `/api/model/pm25` and `/api/model/wind`; existing classifier routes remain.
- Web: `features/models/ModelCard.tsx`, `ServedModelsEvaluation.tsx`; all new copy in `lib/i18n/id.ts`.
- Synthetic arithmetic fixtures are explicitly test-only; no fixture model metrics are published.

Run `pnpm check`, `pnpm build`, ML pytest, ruff lint/format, and nbstripout verification before
handing over. See the run report and PR for the actual trained versions, metrics, and check results.

Source operations note: NASA currently announces that Suomi NPP product delivery will cease on
1 November 2026 on its [active-fire download page](https://firms.modaps.eosdis.nasa.gov/active_fire).
The models must not silently substitute NOAA-20/21 inputs; a sensor change requires a new evaluated
training run. Open-Meteo request limits follow its [pricing terms](https://open-meteo.com/en/pricing).
