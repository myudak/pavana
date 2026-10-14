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
