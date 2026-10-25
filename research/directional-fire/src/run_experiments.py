"""Trains every variant under the frozen protocol and saves out-of-sample predictions.

    uv run --project ../../ml python src/run_experiments.py --lag 3 --split loyo
    uv run --project ../../ml python src/run_experiments.py --lag 3 --split operational
    uv run --project ../../ml python src/run_experiments.py --lag 0 --split loyo --variants D D0 E

Predictions go to results/preds/{split}_L{lag}_{h}h.parquet with one column per variant.
"""

import argparse
import time
from pathlib import Path

import lightgbm as lgb
import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

ROOT = Path(__file__).resolve().parent.parent
CACHE = ROOT / "results" / "cache"
PREDS = ROOT / "results" / "preds"
PREDS.mkdir(parents=True, exist_ok=True)

C = [
    "vsby_km", "vsby_min_6h_km", "vsby_min_24h_km", "haze_now", "haze_frac_24h", "haze_frac_72h",
    "precip_frac_24h", "rh_pct", "tmpc", "wind_speed_ms", "wind_dir_sin", "wind_dir_cos",
    "hour_local", "doy", "station_month_rate",
]  # fmt: skip
D = C + ["det_100km_24h", "det_300km_72h"]
D0 = D + ["iso_72h"]
CAT = ["wind_calm", "wind_vrb", "wind_wmiss", "iso_def_72h", "iso_calm_72h", "iso_vrb_72h", "iso_wmiss_72h"]
D0V = C + ["det_100km_24h_veg", "det_300km_72h_veg", "iso_72h_veg"]
VARIANTS = {
    "C": C,
    "D": D,
    "D0": D0,
    "E": D0 + ["upwind_72h"],
    "R180": D0 + ["rot180_72h"],
    "R90": D0 + ["rot90_72h"],
    "Eserved": D + ["upwind_72h"],  # the deployed feature set (no iso term)
    # Exploratory (logged in PROTOCOL.md): 24 h vector-mean "persistent" wind for direction.
    "Ep": D0 + ["upwind_p24_72h"],
    "Rp180": D0 + ["rot180_p24_72h"],
    # Corrected placebos (protocol deviation 2026-10-18): wind taken 168 h earlier.
    "Rshift": D0 + ["upwind_shift_72h"],
    "Rpshift": D0 + ["upwind_pshift_72h"],
    # Diagnostic (exploratory): the non-directional exposure set to NaN when the wind is calm or
    # variable — the same missingness as the directional features, but no direction at all.
    "D0m": D0 + ["iso_masked_72h"],
    # Review round 1 (2026-10-25). Wind-report categories with the exposure split by category.
    "D0cat": D0 + CAT,
    "Ecat": D0 + CAT + ["upwind_72h"],
    # Mask-preserving placebos: permuted directions (3 seeds) and the 168 h shift with the mask kept.
    "Rperm1": D0 + ["upwind_perm1_72h"],
    "Rperm2": D0 + ["upwind_perm2_72h"],
    "Rperm3": D0 + ["upwind_perm3_72h"],
    "Rshiftm168": D0 + ["upwind_shiftm168_72h"],
    "Rshift72": D0 + ["upwind_shift72_72h"],
    "Rshift336": D0 + ["upwind_shift336_72h"],
    "Rshift720": D0 + ["upwind_shift720_72h"],
    # Vegetation-only detections (FIRMS type 0): drops gas flares and other static sources.
    "D0v": D0V,
    "Ev": D0V + ["upwind_72h_veg"],
    "Rshiftv": D0V + ["upwind_shift_72h_veg"],
    "D0mv": D0V + ["iso_masked_72h_veg"],
}
LOGIT = {  # second model family for the key comparison (log1p exposures, NaN → 0 + indicator)
    "lgC": C,
    "lgD0": D0,
    "lgE": D0 + ["upwind_72h"],
    "lgRshift": D0 + ["upwind_shift_72h"],
    "lgEp": D0 + ["upwind_p24_72h"],
    "lgRpshift": D0 + ["upwind_pshift_72h"],
    "lgD0cat": D0 + CAT,
    "lgEcat": D0 + CAT + ["upwind_72h"],
    "lgRperm1": D0 + ["upwind_perm1_72h"],
}
EXPOSURES = {"det_100km_24h", "det_300km_72h", "iso_72h", "upwind_72h", "upwind_shift_72h",
             "upwind_p24_72h", "upwind_pshift_72h", "iso_def_72h", "iso_calm_72h", "iso_vrb_72h",
             "iso_wmiss_72h", "upwind_perm1_72h"}  # fmt: skip
PARAMS = {
    "objective": "binary",
    "learning_rate": 0.05,
    "num_leaves": 31,
    "min_data_in_leaf": 200,
    "feature_fraction": 0.9,
    "bagging_fraction": 0.8,
    "bagging_freq": 1,
    "lambda_l2": 1.0,
    "seed": 20261016,
    "deterministic": True,
    "num_threads": 8,
    "verbosity": -1,
}
ROUNDS = 400
YEARS = range(2015, 2026)
BUFFER = pd.Timedelta(days=14)


def add_climatology(train: pd.DataFrame, test: pd.DataFrame) -> tuple[pd.DataFrame, pd.DataFrame]:
    """Station-month event rate from the training rows only (no test information)."""
    rate = train.groupby(["station", "month"])["current_event"].mean().rename("station_month_rate")
    out = []
    for df in (train, test):
        df = df.drop(columns=["station_month_rate"], errors="ignore")
        df = df.join(rate, on=["station", "month"])
        out.append(df)
    return out[0], out[1]


def folds(df: pd.DataFrame, split: str):
    year = df["issue_at"].dt.year
    if split == "operational":
        yield "2023-2025", year <= 2020, year >= 2023
        return
    for y in YEARS:
        lo = pd.Timestamp(f"{y}-01-01", tz="UTC") - BUFFER
        hi = pd.Timestamp(f"{y + 1}-01-01", tz="UTC") + BUFFER
        test = year == y
        train = ~test & ((df["issue_at"] < lo) | (df["issue_at"] >= hi))
        yield str(y), train, test


def fit_predict(cols, tr, te, ytr, seeds=None):
    """One LightGBM fit, or the mean predicted probability over `seeds` (seed ensemble)."""
    preds = []
    for seed in seeds or [PARAMS["seed"]]:
        model = lgb.train({**PARAMS, "seed": seed}, lgb.Dataset(tr[cols], ytr), num_boost_round=ROUNDS)
        preds.append(model.predict(te[cols]))
    return np.mean(preds, axis=0)


def _design(df, cols, med):
    x = pd.DataFrame(index=df.index)
    for c in cols:
        v = df[c]
        if c in EXPOSURES:
            x[c] = np.log1p(v.fillna(0).clip(lower=0))
            x[c + "_na"] = v.isna().astype(float)
        else:
            x[c] = v.fillna(med[c])
    return x


def logistic(tr, te, ytr, cols=C):
    med = tr[cols].median()
    clf = make_pipeline(StandardScaler(), LogisticRegression(max_iter=1000))
    clf.fit(_design(tr, cols, med), ytr)
    return clf.predict_proba(_design(te, cols, med))[:, 1]


def run(lag: int, split: str, variants: list[str], horizons: list[int], seeds=None) -> None:
    table = pd.read_parquet(CACHE / f"table_L{lag}.parquet")
    table["iso_masked_72h"] = table["iso_72h"].where(table["wind_dir_sin"].notna())
    review = CACHE / f"review_L{lag}.parquet"
    if review.exists():  # extra controls from src/review_controls.py (same row order)
        table = pd.concat([table, pd.read_parquet(review)], axis=1)
        table["iso_masked_72h_veg"] = table["iso_72h_veg"].where(table["wind_dir_sin"].notna())
    for h in horizons:
        ycol = f"y_{h}h"
        df = table[table[ycol].notna()].reset_index(drop=True)
        parts = []
        for name, tr_mask, te_mask in folds(df, split):
            tr, te = add_climatology(df[tr_mask], df[te_mask])
            ytr = tr[ycol].to_numpy()
            out = te[["issue_at", "station", "country", ycol, "current_event", "station_month_rate"]].rename(
                columns={ycol: "y"}
            )
            out["fold"] = name
            out["persistence"] = te["current_event"].fillna(0).to_numpy()
            out["climatology"] = te["station_month_rate"].fillna(ytr.mean()).to_numpy()
            if "logistic" in variants or not any(v in LOGIT or v not in list(VARIANTS)[:7] for v in variants):
                out["logistic"] = logistic(tr, te, ytr)
            t0 = time.time()
            for v in variants:
                if v in LOGIT:
                    out[v] = logistic(tr, te, ytr, LOGIT[v])
                else:
                    out[v] = fit_predict(VARIANTS[v], tr, te, ytr, seeds)
            print(
                f"L={lag} {split} h={h} fold={name}: train {len(tr):,} test {len(te):,} "
                f"events {int(te[ycol].sum())} ({time.time() - t0:.0f}s)",
                flush=True,
            )
            parts.append(out)
        res = pd.concat(parts, ignore_index=True)
        path = PREDS / f"{split}_L{lag}_{h}h{'_ens' if seeds else ''}.parquet"
        if path.exists():  # keep variants computed earlier for the same split/lag/horizon
            old = pd.read_parquet(path)
            for col in old.columns.difference(res.columns):
                res[col] = old[col].to_numpy()
        res.to_parquet(path, index=False)
        print(f"wrote {path}")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--lag", type=int, default=3)
    ap.add_argument("--split", choices=["loyo", "operational"], default="loyo")
    ap.add_argument("--variants", nargs="+", default=list(VARIANTS)[:7])
    ap.add_argument("--horizons", nargs="+", type=int, default=[6, 24])
    ap.add_argument("--seeds", nargs="+", type=int, help="seed ensemble; writes *_ens.parquet")
    ap.add_argument("--threads", type=int, default=8)
    a = ap.parse_args()
    PARAMS["num_threads"] = a.threads
    run(a.lag, a.split, a.variants, a.horizons, a.seeds)
