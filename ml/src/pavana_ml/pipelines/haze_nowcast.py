"""Model B — "Asap / jarak pandang": P(haze-limited visibility at an airport at t+6 h / t+24 h).

Target kind: **observation** (airport METAR visibility + present weather, IEM archive). One
LightGBM model per horizon. Temporal split by issue time: train 2015–2021, validation 2022–2023,
test 2024-01-01 → 2025-12-31 (the last complete year of the keyless FIRMS archive for Sumatra;
2026 FIRMS in the snapshot covers Kalimantan only, so 2026 is not scored).
"""

from __future__ import annotations

import json
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd

from ..data.iem import AIRPORTS
from ..evaluation import classification as cm
from ..features import haze_station as hs
from ..models.export import parity_vectors, to_compact

MODEL_ID = "haze"
TRAIN_END = pd.Timestamp("2021-12-31 23:00", tz="UTC")
VALID_END = pd.Timestamp("2023-12-31 23:00", tz="UTC")
TEST_END = pd.Timestamp("2025-12-31 23:00", tz="UTC")

PARAMS: dict[str, Any] = {
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
    "verbosity": -1,
}
MAX_ROUNDS = 600


def build_table(data_dir: Path) -> pd.DataFrame:
    metar = pd.read_parquet(data_dir / "metar.parquet")
    firms = pd.read_parquet(data_dir / "firms_snpp.parquet")
    frames = []
    for a in AIRPORTS:
        h = hs.station_hourly(metar, a.icao, a.tz_offset_h)
        if h.empty:
            continue
        f = hs.report_features(h)
        f = f.join(hs.fire_features(h.index, h["wind_dir_from_deg"].to_numpy(), a.lat, a.lon, firms))
        for hz in hs.HORIZONS_H:
            f[f"y_{hz}h"] = h["event"].shift(-hz)  # report at exactly t+h, NaN when absent
        f["station"] = a.icao
        f["month"] = h.index.month
        f = f[h["reported"].to_numpy()]  # issue only at hours with a report
        frames.append(f)
        print(f"haze table {a.icao}: {len(f):,}", flush=True)
    table = pd.concat(frames)
    table.index.name = "issue_at"
    table = table.reset_index()
    # Station × month haze rate, from the TRAINING period only.
    train = table[table["issue_at"] <= TRAIN_END]
    rate = train.groupby(["station", "month"])["haze_now"].mean()
    table["station_month_rate"] = rate.reindex(
        pd.MultiIndex.from_arrays([table["station"], table["month"]])
    ).to_numpy()
    return table


def run(data_dir: Path, out_dir: Path, code_sha256: str | None = None) -> dict[str, Any]:
    import lightgbm as lgb

    out_dir.mkdir(parents=True, exist_ok=True)
    table = build_table(data_dir)
    feats = list(hs.FEATURES)
    t = table["issue_at"]
    parts = {
        "train": table[t <= TRAIN_END],
        "valid": table[(t > TRAIN_END) & (t <= VALID_END)],
        "test": table[(t > VALID_END) & (t <= TEST_END)],
    }
    rate_table = (
        parts["train"].groupby(["station", "month"])["haze_now"].mean().reset_index()
    )
    rng = np.random.default_rng(20261016)
    models: dict[str, Any] = {}
    for hz in hs.HORIZONS_H:
        ycol = f"y_{hz}h"
        sp = {k: v.dropna(subset=[ycol]) for k, v in parts.items()}
        dtrain = lgb.Dataset(sp["train"][feats], sp["train"][ycol], free_raw_data=False)
        dvalid = lgb.Dataset(sp["valid"][feats], sp["valid"][ycol], reference=dtrain)
        booster = lgb.train(
            PARAMS,
            dtrain,
            MAX_ROUNDS,
            valid_sets=[dvalid],
            callbacks=[lgb.early_stopping(50, verbose=False), lgb.log_evaluation(100)],
        )
        best = int(booster.best_iteration or MAX_ROUNDS)
        booster = lgb.train(PARAMS, dtrain, best)
        test = sp["test"]
        y = test[ycol].to_numpy()
        p = booster.predict(test[feats])
        tr = sp["train"]
        # Persistence: event-rate given the current report is / is not haze-limited (train only).
        now_event = (test["vsby_km"] < hs.VIS_KM) & (test["haze_now"] == 1)
        tr_event = (tr["vsby_km"] < hs.VIS_KM) & (tr["haze_now"] == 1)
        p1, p0 = float(tr.loc[tr_event, ycol].mean()), float(tr.loc[~tr_event, ycol].mean())
        persistence = np.where(now_event, p1, p0)
        clim = tr.groupby(["station", "month"])[ycol].mean()
        climatology = clim.reindex(
            pd.MultiIndex.from_arrays([test["station"], test["month"]])
        ).to_numpy()
        climatology = np.where(np.isnan(climatology), float(tr[ycol].mean()), climatology)
        metrics = {
            "model": cm.binary_metrics(y, p),
            "persistence": cm.binary_metrics(y, persistence),
            "climatology": cm.binary_metrics(y, climatology),
        }
        per_station = {
            st: cm.binary_metrics(y[test["station"].to_numpy() == st], p[test["station"].to_numpy() == st])
            for st in sorted(test["station"].unique())
        }
        sample = test.iloc[rng.choice(len(test), size=min(20000, len(test)), replace=False)]
        contrib = booster.predict(sample[feats], pred_contrib=True)
        importance = sorted(
            (
                {"feature": f, "meanAbsShap": float(np.mean(np.abs(contrib[:, i])))}
                for i, f in enumerate(feats)
            ),
            key=lambda r: -r["meanAbsShap"],
        )
        nan_rows = test[test[feats].isna().any(axis=1)].head(10)
        probe = pd.concat([sample.head(30), nan_rows])[feats].to_numpy(dtype=float)
        name = f"{MODEL_ID}-{hz}h"
        (out_dir / f"{name}.model.json").write_text(
            json.dumps(to_compact(booster), separators=(",", ":"))
        )
        (out_dir / f"{name}.parity.json").write_text(
            json.dumps(parity_vectors(booster, probe), separators=(",", ":"))
        )
        booster.save_model(str(out_dir / f"{name}.lgb.txt"))
        models[f"{hz}h"] = {
            "horizonHours": hz,
            "rows": {k: int(len(v)) for k, v in sp.items()},
            "baseRate": {k: float(v[ycol].mean()) for k, v in sp.items()},
            "metrics": {"test": metrics},
            "perStationTest": per_station,
            "calibration": cm.calibration_bins(y, p, n_bins=10),
            "globalImportance": importance,
            "bestIteration": best,
            "validation": cm.binary_metrics(sp["valid"][ycol], booster.predict(sp["valid"][feats])),
        }
        print(name, json.dumps(metrics, indent=1), flush=True)

    # Demo replay: real archived inputs at one 00 UTC issue time in the test period. 2026 is not
    # used because the keyless FIRMS archive does not cover Sumatra in 2026 yet (its fire features
    # would read as zero). The time is the 00 UTC hour with the most stations reporting HZ/FU, so
    # the demo shows the model during a haze episode; it is a replay, not a score.
    test_00 = parts["test"][parts["test"]["issue_at"].dt.hour == 0]
    demo_at = test_00.groupby("issue_at")["haze_now"].sum().idxmax()
    demo_rows = []
    window = table[
        (table["issue_at"] <= demo_at) & (table["issue_at"] > demo_at - pd.Timedelta(hours=3))
    ]
    for st, grp in window.groupby("station"):
        r = grp.sort_values("issue_at").iloc[-1]
        demo_rows.append(
            {
                "station": st,
                "issueAt": r["issue_at"].strftime("%Y-%m-%dT%H:%M:%SZ"),
                "x": [None if pd.isna(r[f]) else float(r[f]) for f in feats],
                "observed": {
                    f"{hz}h": None if pd.isna(r[f"y_{hz}h"]) else bool(r[f"y_{hz}h"] > 0)
                    for hz in hs.HORIZONS_H
                },
            }
        )

    meta = {
        "modelId": MODEL_ID,
        "version": f"{MODEL_ID}-{datetime.now(UTC):%Y%m%d}",
        "createdAt": datetime.now(UTC).isoformat(timespec="seconds"),
        "title": "Asap / jarak pandang (eksperimental)",
        "target": "METAR visibility < 3 km with HZ or FU and no precipitation/fog code, at t+h",
        "targetKind": "observation",
        "evaluated": True,
        "experimental": True,
        "operationalReady": False,
        "features": feats,
        "stations": [
            {"icao": a.icao, "name": a.name, "lat": a.lat, "lon": a.lon, "tzOffsetHours": a.tz_offset_h}
            for a in AIRPORTS
        ],
        "stationMonthRate": [
            {"station": r.station, "month": int(r.month), "rate": float(r.haze_now)}
            for r in rate_table.itertuples()
        ],
        "windows": {
            "train": ["2015-01-01", "2021-12-31"],
            "validation": ["2022-01-01", "2023-12-31"],
            "test": ["2024-01-01", "2025-12-31"],
        },
        "horizons": models,
        "params": PARAMS,
        "lightgbm": lgb.__version__,
        "codeSha256": code_sha256,
        "dataSnapshot": json.loads((data_dir / "snapshot.json").read_text()),
        "demo": {
            "issueAt": demo_at.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "note": "Replay of real archived METAR/FIRMS inputs (test period), not live data.",
        },
    }
    (out_dir / f"{MODEL_ID}.meta.json").write_text(json.dumps(meta, indent=2))
    (out_dir / f"{MODEL_ID}.demo.json").write_text(
        json.dumps({"issueAt": meta["demo"]["issueAt"], "rows": demo_rows}, separators=(",", ":"))
    )
    return meta
