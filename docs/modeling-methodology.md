# Modeling methodology

## What the app does today (no ML)

`apps/api/src/services/insights.ts` returns three **deterministic indicators**, labelled
`method: "deterministic_indicators"`, `evaluated: false`:

| Factor            | Computation                                                                        | Signal                                                                         |
| ----------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `pm25_trend`      | current vs peak/trough of the next 24 h forecast; thresholds `max(10 µg/m³, 20 %)` | worsening / improving / neutral / unknown                                      |
| `wind`            | current speed + FROM direction, derived flow TO                                    | neutral / unknown                                                              |
| `upwind_hotspots` | upwind exposure score (below) over detections from the last 48 h within 300 km     | worsening if any contributes; **unknown** if no detections (absence ≠ no fire) |

## Upwind exposure indicator

```
S(x,t) = Σ_i FRP_i · exp(-d_i / λ) · max(0, ŵ_to · ĥ_i→x) · exp(-age_i / τ)
```

- `ŵ_to`: unit wind flow vector = meteorological FROM + 180°.
- `ĥ_i→x`: unit vector from hotspot _i_ toward the target (initial great-circle bearing).
- Defaults: `λ = 50 km`, `τ = 24 h`, max distance 300 km, missing FRP → weight 1.
- Implemented in `packages/shared/src/math/upwind.ts` and `ml/src/pavana_ml/features/upwind.py`,
  both tested against `fixtures/test-vectors/geo-wind.json`.

**Limitations:** single surface wind vector; ignores plume rise, vertical mixing, terrain,
precipitation scavenging, and transport time. It is a feature/indicator — **never** a probability
or an arrival-time prediction.

## "Will the smoke reach me?" — exposure potential level

`GET /api/exposure` returns one level per forecast hour (`none · low · moderate · high · unknown`):

```
level = max(level from PM2.5 forecast, level from upwind score S at that hour)
```

- PM2.5 bands (µg/m³, US EPA 2024 breakpoints, same as the AQI pill): ≤ 9.0 none · ≤ 35.4 low · ≤ 55.4 moderate · above high.
- Upwind bands on `S`: ≥ 2 low · ≥ 20 moderate · ≥ 80 high. **Heuristic, not calibrated against
  observations yet.** Tuned only so the demo day is not flat; revisit with real FIRMS + OpenAQ data.
- For future hours, detections from the last 48 h are assumed to persist and decay by age (τ);
  no new detections are invented. The forecast wind for that hour is used.
- Missing inputs never lower the level; both missing → `unknown` (never `none`).
- The target is the requested point, so two places under the same wind can differ by their
  position relative to the detections (the demo moment).
- Code: `packages/shared/src/math/exposure.ts`, `apps/api/src/services/exposure.ts`.

## Smoke-direction trails (map)

The map's "Arah asap" layer follows the wind field forward from the strongest detections
(steady wind, 30-minute steps, up to 12 h; `packages/shared/src/math/plumes.ts`). It shows
**where the wind carries air** from a detection. It is not a dispersion model: no concentrations,
plume rise, mixing or deposition. The UI labels it as indicative.

## Research plan (ml/)

**Question:** does adding wind-aware hotspot features improve `t+6h` PM2.5 prediction vs
persistence and the CAMS forecast?

| ID  | Model           | Features                        |
| --- | --------------- | ------------------------------- |
| A   | Persistence     | y(t)                            |
| B   | CAMS issue-time | forecast for t+h issued ≤ t     |
| C   | LightGBM        | weather + CAMS + PM2.5 lags     |
| D   | LightGBM        | C + hotspot counts/distance/FRP |
| E   | LightGBM        | D + upwind exposure             |

- **Target:** observed station PM2.5 at t+h (OpenAQ/BMKG) — never a model forecast.
- **Splits:** temporal (expanding-window), gap ≥ horizon; spatial/station holdout if feasible;
  report smoke season separately.
- **Metrics:** MAE, RMSE; high-pollution event precision/recall at a stated threshold
  (e.g. 55.5 µg/m³ = US AQI "Unhealthy" lower bound).
- **Leakage guards:** features at t use data available at t (hotspots acquired ≤ t, forecasts issued ≤ t).
- **Explainability:** SHAP only on a versioned, evaluated artifact (`ml/artifacts/<version>/metadata.json` with `evaluated: true`).
- **Uncertainty:** quantile / conformal intervals later, with empirical coverage reported.

A negative result (E ≤ B) is a valid, reportable outcome.
