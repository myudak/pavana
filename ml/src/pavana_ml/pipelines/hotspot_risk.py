"""Model A — "Risiko titik panas": P(≥1 Suomi NPP detection in a 0.25° cell on UTC day d+1).

Target kind: **observation** (satellite thermal-anomaly detections). A detection is not a
confirmed fire, and no detection is not "no fire" — so the model predicts *detections*, and the
UI words it that way.

Runs in the Kaggle training kernel on the snapshot written by `observed_data.run`. Temporal split
by issue day: train 2015–2021, validation 2022–2023 (early stopping only), test 2024 → end.
"""

from __future__ import annotations

import json
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd

from ..data.firms_archive import REGION_BBOX
from ..evaluation import classification as cm
from ..features import hotspot_grid as g
from ..models.export import parity_vectors, to_compact
from .contract import common_cohort, write_json

MODEL_ID = "hotspot-risk"
TRAIN_END = "2021-12-31"
VALID_END = "2023-12-31"
# Demo replay: real inputs of the day before the demo fixture's reference time (2026-09-15).
DEMO_ISSUE_DAY = "2026-09-14"

PARAMS: dict[str, Any] = {
    "objective": "binary",
    "learning_rate": 0.05,
    "num_leaves": 31,
    "min_data_in_leaf": 500,
    "feature_fraction": 0.9,
    "bagging_fraction": 0.7,
    "bagging_freq": 1,
    "lambda_l2": 1.0,
    "seed": 20261016,
    "deterministic": True,
    "num_threads": 4,
    "verbosity": -1,
}
MAX_ROUNDS = 600


def _sensor_ok(firms: pd.DataFrame, days: pd.DatetimeIndex) -> np.ndarray:
    """A day counts as observed when the sensor delivered ≥1 detection anywhere in the region.

    Suomi NPP had outages; a day with no rows at all over Sumatra + Borneo is a data gap, not a
    fire-free day, so its labels and features become NaN instead of zeros.
    """
    w, s, e, n = REGION_BBOX
    inside = firms["lon"].between(w, e) & firms["lat"].between(s, n)
    day = firms.loc[inside, "acquired_at"].dt.tz_convert("UTC").dt.normalize().dt.tz_localize(None)
    seen = set(day.unique())
    return np.array([d in seen for d in days])


def _static_cells(firms: pd.DataFrame) -> set[int]:
    """Train-only cells dominated by type 1 (volcano), 2 (static), or 3 (offshore)."""
    train_only = firms[firms["acquired_at"] < pd.Timestamp("2022-01-01", tz="UTC")]
    typed = train_only.dropna(subset=["fire_type"])
    cells = g.cell_index(typed["lat"].to_numpy(), typed["lon"].to_numpy())
    df = pd.DataFrame({"cell": cells, "static": typed["fire_type"].to_numpy() > 0})
    df = df[df["cell"] >= 0]
    share = df.groupby("cell")["static"].mean()
    return {int(c) for c in share[share > 0.5].index}


def build_table(data_dir: Path, end: str | None = None) -> tuple[pd.DataFrame, dict[str, Any]]:
    firms = pd.read_parquet(data_dir / "firms_snpp.parquet")
    land = pd.read_parquet(data_dir / "grid_land.parquet")
    weather = pd.read_parquet(data_dir / "weather_daily.parquet")
    snapshot = json.loads((data_dir / "snapshot.json").read_text())
    end = end or snapshot["data_end"]
    days = pd.date_range(snapshot["data_start"], end, freq="D")

    ok = _sensor_ok(firms, days)
    counts = g.daily_counts(firms, days)
    fire = g.fire_features(counts, ok)

    static = _static_cells(firms)
    cells = np.array(
        [c for c in land.loc[land["land_points"] > 0, "cell"] if int(c) not in static], dtype=int
    )
    rows, cols = np.divmod(cells, g.N_COLS)
    clat, clon = g.cell_center(cells)
    wlat, wlon = g.weather_point(clat, clon)

    weather["date"] = pd.to_datetime(weather["date"])
    points = sorted({(float(a), float(b)) for a, b in zip(wlat, wlon, strict=True)})
    pidx = {p: i for i, p in enumerate(points)}
    cell_point = np.array([pidx[(float(a), float(b))] for a, b in zip(wlat, wlon, strict=True)])
    warr: dict[str, np.ndarray] = {}
    for col in ("precip_mm", "rh_min_pct", "tmax_c", "wind_max_ms", "vpd_max_kpa"):
        wide = weather.pivot_table(index="date", columns=["point_lat", "point_lon"], values=col)
        wide = wide.reindex(index=days, columns=pd.MultiIndex.from_tuples(points))
        warr[col] = wide.to_numpy(dtype=np.float64)
    wf = g.weather_features(warr)

    # Historical frequency from the TRAINING period only (no look-ahead into validation/test).
    train_days = (days <= pd.Timestamp(TRAIN_END)) & ok
    hist = (counts[train_days] > 0).mean(axis=0)[rows, cols].astype(np.float32)

    n_days, n_cells = len(days) - 1, len(cells)
    issue = np.repeat(days[:-1].to_numpy(), n_cells)
    target_ok = np.repeat(ok[1:], n_cells)
    y = (counts[1:, rows, cols] > 0).astype(np.float32).reshape(-1)

    cols_out: dict[str, np.ndarray] = {
        "issue_day": issue,
        "cell": np.tile(cells, n_days),
    }
    for name, arr in fire.items():
        cols_out[name] = arr[:-1, rows, cols].reshape(-1)
    for name, arr in wf.items():
        cols_out[name] = arr[:-1][:, cell_point].reshape(-1)
    cols_out["doy"] = np.repeat(days[:-1].dayofyear.to_numpy().astype(np.float32), n_cells)
    cols_out["cell_hist_rate"] = np.tile(hist, n_days)
    cols_out["y"] = y
    table = pd.DataFrame(cols_out)
    table = table[target_ok].reset_index(drop=True)

    grid = {
        "bbox": list(g.GRID_BBOX),
        "cellDeg": g.CELL_DEG,
        "nCols": g.N_COLS,
        "nRows": g.N_ROWS,
        "weatherDeg": g.WEATHER_DEG,
        "cells": [
            {
                "id": int(c),
                "lat": round(float(a), 4),
                "lon": round(float(b), 4),
                "histRate": float(h),
                "weatherLat": float(wa),
                "weatherLon": float(wo),
            }
            for c, a, b, h, wa, wo in zip(cells, clat, clon, hist, wlat, wlon, strict=True)
        ],
        "excludedStaticCells": sorted(static),
        "sensorGapDays": [d.strftime("%Y-%m-%d") for d, k in zip(days, ok, strict=True) if not k],
    }
    return table, {"grid": grid, "snapshot": snapshot, "end": end}


def _split(table: pd.DataFrame) -> dict[str, pd.DataFrame]:
    d = table["issue_day"]
    return {
        "train": table[d < pd.Timestamp(TRAIN_END)],
        "valid": table[(d > pd.Timestamp(TRAIN_END)) & (d < pd.Timestamp(VALID_END))],
        "test": table[(d > pd.Timestamp(VALID_END)) & (d < pd.Timestamp("2025-12-31"))],
    }


def baselines(train: pd.DataFrame, test: pd.DataFrame) -> dict[str, np.ndarray]:
    """Honest reference forecasts, all fitted on the training split only."""
    # Persistence: rate of next-day detection given a detection today vs. not.
    p1 = float(train.loc[train["det_cell_1d"] > 0, "y"].mean())
    p0 = float(train.loc[train["det_cell_1d"] == 0, "y"].mean())
    persistence = np.where(test["det_cell_1d"] > 0, p1, p0)
    persistence = np.where(test["det_cell_1d"].isna(), np.nan, persistence)
    # Climatology: per cell × calendar month rate.
    month = pd.to_datetime(train["issue_day"]).dt.month
    clim = train.assign(month=month).groupby(["cell", "month"])["y"].mean()
    tm = pd.to_datetime(test["issue_day"]).dt.month
    climatology = clim.reindex(pd.MultiIndex.from_arrays([test["cell"], tm])).to_numpy()
    climatology = np.where(np.isnan(climatology), float(train["y"].mean()), climatology)
    return {"persistence": persistence, "climatology": climatology}


def run(data_dir: Path, out_dir: Path, code_sha256: str | None = None) -> dict[str, Any]:
    import lightgbm as lgb

    out_dir.mkdir(parents=True, exist_ok=True)
    table, ctx = build_table(data_dir)
    input_rows = len(table)
    table = table.dropna(subset=list(g.FEATURES))
    parts = _split(table)
    feats = list(g.FEATURES)
    print({k: (len(v), float(v["y"].mean())) for k, v in parts.items()}, flush=True)

    dtrain = lgb.Dataset(parts["train"][feats], parts["train"]["y"], free_raw_data=False)
    dvalid = lgb.Dataset(parts["valid"][feats], parts["valid"]["y"], reference=dtrain)
    booster = lgb.train(
        PARAMS,
        dtrain,
        num_boost_round=MAX_ROUNDS,
        valid_sets=[dvalid],
        callbacks=[lgb.early_stopping(50, verbose=False), lgb.log_evaluation(50)],
    )
    best = int(booster.best_iteration or MAX_ROUNDS)
    booster = lgb.train(PARAMS, dtrain, num_boost_round=best)  # same model, trimmed to best

    test = parts["test"]
    p_model = booster.predict(test[feats])
    refs = baselines(parts["train"], test)
    y = test["y"].to_numpy()
    keep = common_cohort(y, {"model": p_model, **refs})
    test = test.loc[keep].copy()
    y, p_model = y[keep], p_model[keep]
    refs = {k: v[keep] for k, v in refs.items()}
    metrics = {
        "model": cm.binary_metrics(y, p_model),
        **{k: cm.binary_metrics(y, v) for k, v in refs.items()},
    }
    valid_metrics = cm.binary_metrics(
        parts["valid"]["y"].to_numpy(), booster.predict(parts["valid"][feats])
    )
    season = pd.to_datetime(test["issue_day"]).dt.month.isin([8, 9, 10]).to_numpy()
    seasonal = {
        "model": cm.binary_metrics(y[season], p_model[season]),
        **{k: cm.binary_metrics(y[season], v[season]) for k, v in refs.items()},
    }
    calibration = cm.calibration_bins(y, p_model, n_bins=10)

    rng = np.random.default_rng(20261016)
    sample = test.iloc[rng.choice(len(test), size=min(20000, len(test)), replace=False)]
    contrib = booster.predict(sample[feats], pred_contrib=True)
    importance = sorted(
        (
            {"feature": f, "meanAbsShap": float(np.mean(np.abs(contrib[:, i])))}
            for i, f in enumerate(feats)
        ),
        key=lambda r: -r["meanAbsShap"],
    )

    # Parity rows: real test rows, including the NaN-bearing ones.
    nan_rows = test[test[feats].isna().any(axis=1)].head(10)
    probe = pd.concat(
        [sample.head(24), nan_rows.head(6), parts["train"].tail(1), parts["valid"].tail(1)]
    )[feats].to_numpy(dtype=float)
    probe = np.vstack([probe, np.full((1, len(feats)), np.nan)])

    demo = table[table["issue_day"] == pd.Timestamp(DEMO_ISSUE_DAY)]
    demo_rows = [
        {
            "cell": int(r.cell),
            "x": [None if pd.isna(r[f]) else float(r[f]) for f in feats],
            "observedNextDay": bool(r.y > 0),
        }
        for _, r in demo.iterrows()
    ]

    compact = to_compact(booster)
    version = f"{MODEL_ID}-{datetime.now(UTC):%Y%m%d%H%M%S}-{(code_sha256 or 'untracked')[:8]}"
    meta = {
        "modelId": MODEL_ID,
        "version": version,
        "createdAt": datetime.now(UTC).isoformat(timespec="seconds"),
        "title": "Risiko titik panas (eksperimental)",
        "target": "≥1 Suomi NPP VIIRS detection in the 0.25° cell on UTC day d+1",
        "targetKind": "observation",
        "evaluated": True,
        "experimental": True,
        "operationalReady": False,
        "purgeHours": 24,
        "evaluationRows": len(test),
        "discardedMissingPredictorRows": input_rows - len(table),
        "features": feats,
        "windows": {
            "train": [
                str(parts["train"]["issue_day"].min().date()),
                str(parts["train"]["issue_day"].max().date()),
            ],
            "validation": [
                str(parts["valid"]["issue_day"].min().date()),
                str(parts["valid"]["issue_day"].max().date()),
            ],
            "test": [
                str(test["issue_day"].min().date()),
                str(test["issue_day"].max().date()),
            ],
        },
        "rows": {k: int(len(v)) for k, v in parts.items()},
        "baseRate": {k: float(v["y"].mean()) for k, v in parts.items()},
        "metrics": {
            "test": metrics,
            "testAugOct": seasonal,
            "validation": {"model": valid_metrics},
        },
        "calibration": calibration,
        "globalImportance": importance,
        "params": PARAMS,
        "bestIteration": best,
        "lightgbm": lgb.__version__,
        "codeSha256": code_sha256,
        "dataSnapshot": ctx["snapshot"],
        "demo": {
            "issueDay": DEMO_ISSUE_DAY,
            "note": "Replay of real archived inputs for the demo fixture's date, not live data.",
        },
    }
    extra = table[table["issue_day"] >= pd.Timestamp("2026-01-01")]
    if not extra.empty:
        ep = {"model": booster.predict(extra[feats]), **baselines(parts["train"], extra)}
        ey = extra.y.to_numpy()
        ek = common_cohort(ey, ep)
        meta["metrics"]["test2026"] = {k: cm.binary_metrics(ey[ek], v[ek]) for k, v in ep.items()}
        meta["test2026Window"] = [
            str(extra.issue_day.min().date()),
            str(extra.issue_day.max().date()),
        ]
    predictions = test[["issue_day", "cell", "y"]].copy()
    predictions["model"] = p_model
    for k, p in refs.items():
        predictions[k] = p
    predictions.to_parquet(out_dir / f"{MODEL_ID}.predictions.parquet", index=False)
    write_json(out_dir / f"{MODEL_ID}.model.json", compact)
    write_json(out_dir / f"{MODEL_ID}.meta.json", meta)
    write_json(out_dir / f"{MODEL_ID}.grid.json", ctx["grid"])
    write_json(out_dir / f"{MODEL_ID}.demo.json", {"issueDay": DEMO_ISSUE_DAY, "rows": demo_rows})
    write_json(
        out_dir / f"{MODEL_ID}.parity.json",
        {"modelVersion": version, **parity_vectors(booster, probe)},
    )
    booster.save_model(str(out_dir / f"{MODEL_ID}.lgb.txt"))
    print(json.dumps(meta["metrics"]["test"], indent=1), flush=True)
    return meta
