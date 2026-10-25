# Study protocol (frozen before running the experiments)

Frozen: 2026-10-17. This file is committed in the local paper repo before any new result is
computed. Changes after that are logged at the bottom, with their reasons.

## Question

Do **wind-directional** satellite fire features improve short-term forecasts of smoke-haze
visibility events at airports in Borneo and Sumatra? The comparison is against a **matched
non-directional** fire-exposure feature with identical distance, age and FRP weighting. A second
question: does any gain survive realistic fire-data latency?

## Data (all keyless and public)

- **Target and station inputs:** METAR reports from the Iowa Environmental Mesonet archive for
  12 airports: WIOO, WAOO, WALL, WAQQ, WBGG, WBGS, WBGR, WBGB, WBKK, WIBB, WIPP, WIDD.
- **Fire inputs:** NASA FIRMS VIIRS Suomi NPP yearly country archives for Indonesia and
  Malaysia, bounding box 93–122°E, 9°S–9°N.
- **Study period:** 2015-01-01 to 2025-12-31. 2026 is excluded from the main analysis because
  its FIRMS coverage is Kalimantan only and is NRT after June. It may appear as a labelled
  supplement only.
- **Snapshot:** Kaggle kernel `myudak/pavana-observed-data` v4, built 2026-10-16. File
  checksums are in `data/raw/data/snapshot.json`.
- **Cleaning:** visibility is clipped to the 10 km reporting cap; one Pekanbaru report says
  8000 km. Calm winds count as unknown direction. Nothing else is cleaned.

## Unit, target, horizons

- **Issue time t:** each station-hour that has a METAR report.
- **Horizons:** h = 6 h and 24 h.
- **Target (as served by Pavana):** at t+h, visibility < 3 km AND the present weather contains
  HZ or FU AND there is no precipitation or fog code. Rows with an unknown target (no report at
  t+h) are dropped. Test labels are never imputed.

## Feature groups (nested)

| Group                 | Adds                                                                                                                                                                                                                                                                                              |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **C** (station state) | visibility now / min 6 h / min 24 h; haze-report fraction 24 h and 72 h; haze now; precipitation fraction 24 h; RH; temperature; wind speed; **wind direction (sin, cos)**; local hour; day of year; station-month climatological event rate (computed from the training years of each fold only) |
| **D**                 | C + detection counts (≤100 km in 24 h, ≤300 km in 72 h)                                                                                                                                                                                                                                           |
| **D0**                | D + non-directional exposure `Σ FRP·exp(−d/λ)·exp(−age/τ)` (≤300 km, ≤72 h)                                                                                                                                                                                                                       |
| **E**                 | D0 + directional exposure `Σ FRP·exp(−d/λ)·max(0, ŵ_to·ĥ)·exp(−age/τ)`                                                                                                                                                                                                                            |
| **R180**              | D0 + the directional exposure computed with the wind rotated by 180° (placebo)                                                                                                                                                                                                                    |
| **R90**               | D0 + the directional exposure with the wind rotated by +90° (placebo)                                                                                                                                                                                                                             |

λ = 50 km, τ = 24 h and missing FRP → 1, as in the deployed Pavana model. The wind is the
station's own METAR wind at t (FROM → TO conversion). C includes wind direction, so any gain
from E must come from where the fires are relative to the wind, not from wind direction alone.

**Main comparison: E vs D0.** Also reported: D vs C, D0 vs D, E vs R180 and E vs R90.

## Latency

FIRMS detections are used only if they were acquired at or before t − L.

- **L = 3 h** is the main setting (NRT nominal latency).
- **L ∈ {0, 6, 12, 24} h** is a sensitivity analysis.
- METAR is assumed available at t, since reports go out within minutes.

## Models and tuning

- LightGBM binary classifier with the deployed parameters (learning rate 0.05, 31 leaves, min
  200 rows per leaf, feature fraction 0.9, bagging 0.8, λ2 = 1, seed 20261016).
- **Fixed 400 rounds for every variant** (equal budget, no per-variant early stopping).
- Baselines: persistence (event at t), station-month climatology, and logistic regression on C.

## Evaluation

1. **Primary: leave-one-year-out (LOYO) over 2015–2025.**
   - 11 folds. The test fold is one calendar year.
   - Training uses all other years, minus 14 days on each side of the test year.
   - Pooled out-of-fold predictions per variant and horizon.
2. **Operational split** (matches the deployed model): train 2015–2020, test 2023–2025, with
   the same fixed rounds. 2021–2022 is not used for tuning, because rounds are fixed.
3. **Metrics:**
   - Primary: **average precision (PR-AUC)**.
   - Secondary: Brier skill score vs climatology, ROC-AUC, and hit rate at a 2% alert rate.
4. **Uncertainty:** paired block bootstrap, 1000 resamples. Blocks are station × ISO week, so
   temporal and within-station dependence is preserved. Report 95% CIs for ΔAP.
5. **Breakdowns:** per horizon, per haze season (2015, 2019, 2023 vs non-season years), per
   station, and per country (FU vs HZ coding).

## Hypotheses

|                  | Hypothesis                                                                                 |
| ---------------- | ------------------------------------------------------------------------------------------ |
| **H1 (primary)** | ΔAP(E − D0) > 0 at h = 24 h, L = 3 h, LOYO (95% CI excludes 0)                             |
| **H2**           | The directional gain at 24 h exceeds the gain at 6 h, where persistence dominates          |
| **H3**           | The placebos do not beat D0: ΔAP(R180 − D0) and ΔAP(R90 − D0) CIs include 0 or are below E |
| **H4**           | The directional gain decreases as L grows                                                  |

All results are reported whatever their direction. Negative results are written up as such.

## Changes after freezing

(none yet)

- 2026-10-17: fixed `hit@2%` tie handling (binary predictors such as persistence flagged every
  tied row). Exactly k = 2% of hours are now alerted, with ties broken at random. Metric
  definition unchanged; no effect on AP, ROC-AUC or BSS.
- 2026-10-17 (exploratory, added after seeing the operational-split result, before the LOYO
  result): variant **Ep** = D0 + directional exposure computed with the 24 h speed-weighted
  vector-mean station wind (persistent flow), and placebo **Rp180**. Reported as exploratory
  only; it does not replace H1.
- 2026-10-18 (protocol deviation, after seeing the LOYO L=3 h results): the rotated-wind placebos
  R180/R90 are **not null**. Combined with the non-directional total (D0), the downwind or
  sideways share also reveals the upwind share. We add the placebo **Rshift**: the directional
  exposure computed with the same station's wind 168 h earlier (same hour and season, unrelated
  synoptic flow), plus **Rpshift** for the exploratory persistent wind. E vs Rshift becomes the
  placebo test for H3. R180/R90 are still reported. Added a logistic-regression family (lgC,
  lgD0, lgE, lgRshift, lgEp, lgRpshift) as a robustness check, after observing that logistic
  regression on C outperformed LightGBM under LOYO. Added per-season (fold-averaged) ΔAP next
  to pooled ΔAP, because pooled AP is dominated by the 2015 fold.
- 2026-10-18 (exploratory diagnostic, after the LOYO results showed Rshift ≈ E): variant **D0m**
  = D0 + the non-directional exposure set to missing when the station wind is calm or variable
  (the missingness pattern of the directional features, with no direction). It tests whether the
  shared gain of E/Rshift comes from that interaction rather than from wind–fire geometry.
- 2026-10-25 (review round 1, before any of these were computed): external review comments asked
  for stronger controls. Added, all labelled post hoc in the paper:
  - **Wind-report categories:** calm (00000KT), variable (VRB), missing wind group. Variants
    **D0cat** / **Ecat** add the category indicators and the non-directional exposure split by
    category, so exposure × reporting-state interactions are explicit.
  - **Mask-preserving placebos:** **Rperm1–3** (directions permuted among defined hours of the same
    station and calendar month, 3 seeds) and **Rshiftm168** (168 h-shifted direction, used only
    where the current direction is defined). Their missingness equals the real feature's exactly.
  - **More shifts:** **Rshift72 / Rshift336 / Rshift720**, plus diagnostics of how similar shifted
    and current winds are (mean cosine of the direction difference, missingness agreement).
  - **Vegetation-only fires** (FIRMS type 0): **D0v, Ev, Rshiftv, D0mv**. Non-vegetation sources
    are 54% of the weighted exposure at Bintulu (LNG plant).
  - **Regional bootstrap blocks:** all stations together by ISO week, calendar month and year
    (500 resamples), next to the pre-specified station × week blocks.
  - Logistic versions lgD0cat, lgEcat, lgRperm1.
    The decision rule for the directional claim is unchanged: direction counts as helping only if E
    beats the placebos and the non-directional controls, not only D0.
- 2026-10-25 (after the review-round controls were computed): **seed sensitivity.** Under LOYO the
  pooled differences between single-seed LightGBM variants came almost entirely from the 2015
  fold, where variants fell into two groups (AP ≈ 0.52 or ≈ 0.59) unrelated to feature content.
  Refitting that fold with five seeds showed the ≈ 0.59 outcome for about one fit in five,
  whatever the variant (D0 0.498–0.525, E 0.510–0.602). Other folds also move by 0.02–0.06 AP
  across seeds. A single fit therefore cannot resolve the effects of interest (≤ 0.01 AP).
  **Change:** the main LightGBM results now use a 5-seed ensemble (seeds 20261016, 1, 2, 3, 4;
  mean predicted probability; all other settings unchanged) for C, D, D0, E, Rshift, Rperm1, D0m,
  D0cat, Ecat, D0v, Ev, and for the 24 h latency runs (D0, E, Rshift). The pre-specified
  single-seed results are kept and reported as such. Logistic regression is deterministic and
  unchanged.
