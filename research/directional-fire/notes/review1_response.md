# Response to review round 1

Thank you for the careful review. Every point led to a change, and point 3 led to something
bigger than the change it asked for: the main result of the first draft was wrong. It did not
survive seed ensembles. All changes are logged in `PROTOCOL.md` with dates, and the paper labels
them as post hoc.

## The most important change: single fits were seed noise

While adding the controls you asked for, we noticed that pooled differences between LightGBM
variants came almost entirely from the 2015 fold. There the variants fell into two groups (AP ≈
0.52 or ≈ 0.59), and membership did not follow feature content. For example, Ecat contains every
column of D0cat plus the directional exposure, yet it scored 0.52 while D0cat scored 0.59.
Refitting the 2015 fold with five seeds settled it:

| seed                | D0    | D0cat | E     | Ecat  |
| ------------------- | ----- | ----- | ----- | ----- |
| 20261016 (protocol) | 0.525 | 0.590 | 0.602 | 0.520 |
| 1                   | 0.521 | 0.522 | 0.515 | 0.593 |
| 2                   | 0.498 | 0.504 | 0.510 | 0.505 |
| 3                   | 0.525 | 0.527 | 0.530 | 0.521 |
| 4                   | 0.517 | 0.528 | 0.516 | 0.514 |

The high outcome appears in about one fit in five, for any variant. Other folds also move by
0.02–0.06 AP across seeds. The pre-specified single-fit comparison (E−D0 = +0.057 pooled) is
therefore uninformative. So is the first draft's explanation, which said the gain came from
exposure interacting with calm air. All main LightGBM results now use five-seed ensembles (mean
predicted probability). The single-fit results are kept in an appendix table next to the
ensemble ones.

With ensembles (LOYO, 24 h, L = 3 h, station × week blocks):

| contrast                     | pooled ΔAP [95% CI]    | per-season mean         |
| ---------------------------- | ---------------------- | ----------------------- |
| D − C (fire counts)          | +0.019 [0.010, 0.030]  | +0.016 [0.010, 0.023]   |
| E − D0                       | +0.017 [0.007, 0.027]  | −0.000 [−0.004, 0.002]  |
| E − Rshift (168 h)           | +0.003 [0.000, 0.005]  | −0.003 [−0.006, −0.000] |
| E − Rperm1 (mask-preserving) | +0.004 [0.002, 0.007]  | −0.001 [−0.003, 0.002]  |
| E − D0m (same missingness)   | +0.002 [−0.000, 0.004] | −0.000 [−0.003, 0.002]  |
| Ecat − D0cat (categories)    | +0.003 [−0.000, 0.008] | +0.000 [−0.003, 0.003]  |
| logistic E − Rperm1          | −0.000 [−0.001, 0.001] | −0.000 [−0.002, 0.002]  |

The conclusion is now worded as: the directional exposure is at most a few thousandths of AP above
its placebos and controls, with no consistent sign across aggregation, horizon or model family,
and the margin is smaller than the seed noise left in five-seed ensembles. Ecat − D0cat at 6 h is
−0.017, which is clearly residual noise. We no longer claim any mechanism.

## Point by point

**1. Mechanism claims too strong; separate calm, VRB and other missing directions.**
Agreed. Phrases like "truly directional contribution", "the gain comes from" and "the model is
learning" are gone, and so is the stagnation interpretation, which the seed analysis removed
anyway. We now parse the selected METAR's wind group into calm (00000KT, 13.6% of issue hours),
variable (VRB, 15.5%) and missing (0.1%). Variant D0cat adds the three indicators and the
non-directional exposure split by category, and Ecat adds the directional exposure on top. Calm
reports are about twice as common in event hours as overall (26% vs 14%). With ensembles,
Ecat − D0cat = +0.003 [−0.000, 0.008] at 24 h.

**2. The rotated-placebo explanation was mathematically wrong.**
Agreed. The claim that the total plus the downwind share reconstructs the upwind share is
removed. The text now says rotations are not clean negative controls for two reasons. They are
computed from the current wind axis and the real fire positions, and S_dir + S_180 =
Σ w_i |ŵ·ĥ_i| measures alignment with the wind axis. They also share the directional feature's
missingness exactly.

**3. The 168 h placebo may not break the link.**
Agreed, and the diagnostics confirm it. The mean cosine between the current direction and the
direction k hours earlier is 0.42 (72 h), 0.39 (168 h), 0.38 (336 h) and 0.36 (720 h).
Missingness agrees in only about 69% of hours. We added:

- shifts of 72, 336 and 720 h;
- **mask-preserving** placebos with exactly the missingness of the real feature: directions
  permuted among defined hours of the same station and calendar month (Rperm1–3; mean cosine
  0.19), and the 168 h-shifted direction used only where the current one is defined
  (Rshiftm168).

The permuted placebo is now the main comparison. As single fits these variants all landed in the
same seed lottery, which is how we found the seed problem.

**4. The bootstrap ignores regional dependence.**
Agreed. We added blocks that hold all stations together: ISO weeks, calendar months and calendar
years (500 resamples each). The paper says that eleven years are not eleven independent episodes
and that the year blocks are coarse. At 24 h (ensembles), the intervals change like this:

| contrast   | station × week         | all-station month | year            |
| ---------- | ---------------------- | ----------------- | --------------- |
| D − C      | +0.019 [0.010, 0.030]  | [0.007, 0.036]    | [0.009, 0.028]  |
| E − D0     | +0.017 [0.007, 0.028]  | [−0.004, 0.035]   | [−0.007, 0.030] |
| E − Rperm1 | +0.004 [0.002, 0.007]  | [−0.000, 0.008]   | [−0.002, 0.007] |
| E − D0m    | +0.002 [−0.000, 0.004] | [−0.001, 0.005]   | [−0.002, 0.003] |

Fire counts survive every block design, and E − D0 does not survive month blocks. At 6 h, E
stays about 0.003 above D0m and Rshift even with month and year blocks, but not above the
permuted placebo, and the logistic family shows nothing. The paper reports this as "at most about
0.01 AP, plausibly a few thousandths at 6 h, not established".

**5. Limit model and forecasting conclusions to the evaluation.**
Agreed. "Nowcasts" is now "forecasts" throughout. The recommendation that logistic regression is
the more robust default is removed, since it contradicted the operational split (GBM counts
0.311 vs logistic C 0.263 at 24 h). The paper now says the ranking depends on the split, and that
LOYO measures cross-season generalisation while the forward split is the relevant one for
deployment.

**6. Target, availability and references.**

- _Several METARs per hour, SPECI, corrections:_ routine and special reports (IEM types 3, 4) are
  both used, and the last report in each UTC hour is kept. 62% of issue hours had more than one
  report, mostly half-hourly Indonesian METARs, and 0.8% of selected reports are COR. This is now
  stated in the Data section.
- _Missing reports and unknown weather codes:_ hours without a report at t + h are dropped.
  Reports with visibility below 3 km and an unparseable weather group get an unknown target.
- _FIRMS version:_ the yearly country files carry the archive `type` attribute on every record,
  which the NRT feed lacks, so they are processed archive detections. The paper now says the
  latency shift cannot reproduce NRT-vs-archive differences.
- _Is the target smoke-specific?_ We added a caveat and two checks. 88% of event hours fall in
  July–November. Proximity to detections is a weak check, which we say, because 93% of non-event
  hours also have a detection within 300 km.
- _IEM quality control:_ "homogeneous" is removed, and the text says IEM applies little QC.
- _A new issue found while auditing:_ FIRMS non-vegetation sources (type 1–3) were included, as in
  the deployed model. They make up 54% of the distance-weighted exposure at Bintulu (an LNG plant)
  and about 7% at Miri and Batam. A vegetation-only sensitivity (D0v, Ev) leaves the conclusions
  unchanged: Ev − D0v = +0.016 at 24 h, close to E − D0.
- _Pontianak reference:_ fixed (Faryuni & Sampurno, Buletin Fisika 27(2):188–195, 2026, with the
  publisher URL, since the DOI is not registered yet).

**Title.** Adopted: "Do Wind-Directional Fire Features Improve Haze-Visibility Forecasts? A
Multi-Season Evaluation in Borneo and Sumatra".

## What we would like a second opinion on

1. Is a five-seed ensemble enough? The 6 h Ecat outlier says residual noise is still about 0.01 AP
   for single variants. Would you ask for more seeds, or for reporting the across-seed spread of
   each contrast instead?
2. The exploratory variants that were never ensembled (persistent flow, Rperm2–3, Rshiftm168,
   other shifts) are now in the appendix only as single fits, with a warning. Is that acceptable,
   or should they be dropped?
3. Does the framing, a negative result plus two method lessons (seed ensembles, mask-preserving
   placebos), read as a contribution, or as a retraction of the first draft?
