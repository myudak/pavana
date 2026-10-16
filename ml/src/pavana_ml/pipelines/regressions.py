"""Kaggle CPU training: CAMS proxy t+6h and METAR station wind u/v t+6h.

No test-driven selection. Early stopping uses validation only; the held-out predictions and
honest train-only baselines are exported on exactly the same rows.
"""

from __future__ import annotations

from datetime import UTC, datetime
from pathlib import Path

import numpy as np
import pandas as pd

from ..data.iem import AIRPORTS
from ..evaluation import regression as metrics
from ..features import haze_station, pm25, station_wind
from ..models.export import parity_vectors, to_compact
from .contract import common_cohort, temporal_parts, verify_snapshot, windows, write_json

PARAMS = {
    "objective": "regression_l1",
    "metric": "l1",
    "learning_rate": 0.05,
    "num_leaves": 31,
    "min_data_in_leaf": 100,
    "lambda_l2": 1.0,
    "seed": 20261016,
    "deterministic": True,
    "num_threads": 4,
    "verbosity": -1,
}
MAX_ROUNDS = 600


def _fit(parts: dict, features: list[str], target: str):
    import lightgbm as lgb

    a = lgb.Dataset(parts["train"][features], parts["train"][target], free_raw_data=False)
    b = lgb.Dataset(parts["valid"][features], parts["valid"][target], reference=a)
    model = lgb.train(
        PARAMS,
        a,
        MAX_ROUNDS,
        valid_sets=[b],
        callbacks=[lgb.early_stopping(50, verbose=False), lgb.log_evaluation(100)],
    )
    return model


def _export(model, name: str, features: list[str], test: pd.DataFrame, out: Path) -> list[dict]:
    probe = test[features].head(30).to_numpy(float)
    # These additional missing-input probes verify routing, never contribute to metrics.
    probe = np.vstack([probe, np.full((1, len(features)), np.nan)])
    write_json(out / f"{name}.model.json", to_compact(model))
    write_json(out / f"{name}.parity.json", parity_vectors(model, probe))
    model.save_model(str(out / f"{name}.lgb.txt"))
    sample = test[features].sample(min(20000, len(test)), random_state=20261016)
    phi = model.predict(sample, pred_contrib=True)
    return sorted(
        [
            {"feature": f, "meanAbsShap": float(np.abs(phi[:, i]).mean())}
            for i, f in enumerate(features)
        ],
        key=lambda r: -r["meanAbsShap"],
    )


def _metadata(
    model_id: str,
    target: str,
    kind: str,
    parts: dict,
    features: list,
    snapshot: dict,
    code: str | None,
) -> dict:
    import lightgbm as lgb

    return {
        "modelId": model_id,
        "version": f"{model_id}-{datetime.now(UTC):%Y%m%d%H%M%S}-{(code or 'untracked')[:8]}",
        "createdAt": datetime.now(UTC).isoformat(timespec="seconds"),
        "target": target,
        "targetKind": kind,
        "evaluated": True,
        "experimental": True,
        "operationalReady": False,
        "features": features,
        "horizonHours": 6,
        "windows": windows(parts, "issue_at"),
        "rows": {k: len(v) for k, v in parts.items()},
        "purgeHours": 6,
        "params": PARAMS,
        "lightgbm": lgb.__version__,
        "codeSha256": code,
        "dataSnapshot": snapshot,
        "limitations": [
            "Retrospective temporal holdout; publication latency is not reconstructed.",
            "Inputs at or before origin only. Missing inputs are never replaced with zero.",
            "Experimental, not operational or an official forecast.",
        ],
    }


def run_pm25(data_dir: Path, out_dir: Path, code_sha256: str | None = None) -> dict:
    snapshot = verify_snapshot(data_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    table = pm25.feature_table(pd.read_parquet(data_dir / "cams.parquet"))
    features = list(pm25.FEATURES)
    # Serving also requires every autoregressive input. Target is never filled.
    table = table.dropna(subset=[*features, "target"])
    parts = temporal_parts(
        table, "issue_at", 6, "2024-12-31 23:00", "2025-12-31 23:00", "2026-12-31 23:00"
    )
    model = _fit(parts, features, "target")
    tr, test = parts["train"], parts["test"]
    climatology = tr.groupby([tr.issue_at.dt.month, tr.issue_at.dt.hour])["target"].mean()
    clim = climatology.reindex(
        pd.MultiIndex.from_arrays([test.issue_at.dt.month, test.issue_at.dt.hour])
    ).to_numpy()
    clim = np.where(np.isfinite(clim), clim, tr.target.mean())
    predictions = {
        "model": model.predict(test[features]),
        "persistence": test.pm25_now.to_numpy(),
        "climatology": clim,
    }
    y = test.target.to_numpy()
    keep = common_cohort(y, predictions)
    meta = _metadata(
        "pm25",
        "CAMS PM2.5 field at Sungai Raya t+6h (not a station measurement)",
        "model",
        parts,
        features,
        snapshot,
        code_sha256,
    )
    meta.update(
        {
            "title": "Estimasi PM2.5 terhadap CAMS (eksperimental)",
            "servingPolicy": "experimental-cams-proxy",
            "reference": pm25.REFERENCE,
            "metrics": {
                "test": {k: metrics.scalar(y[keep], p[keep]) for k, p in predictions.items()}
            },
            "validation": metrics.scalar(
                parts["valid"].target.to_numpy(), model.predict(parts["valid"][features])
            ),
            "bestIteration": model.best_iteration,
            "evaluationRows": int(keep.sum()),
            "globalImportance": _export(model, "pm25", features, test, out_dir),
            "camsProvenance": snapshot.get("cams_provenance"),
        }
    )
    meta["limitations"] += [
        "CAMS is model output, not observed station PM2.5; this measures agreement with CAMS.",
        "CAMS issue time is unarchived; historical/live product differences remain unvalidated.",
        "Fixed requested reference point; no spatial extrapolation to the user's home.",
    ]
    demo = test.iloc[-1]
    write_json(
        out_dir / "pm25.demo.json",
        {
            "issueAt": demo.issue_at,
            "x": demo[features].tolist(),
            "observed": demo.target,
        },
    )
    pred = test.loc[keep, ["issue_at", "target"]].copy()
    pred["target_at"] = pred.issue_at + pd.Timedelta(hours=6)
    for k, p in predictions.items():
        pred[k] = p[keep]
    pred.to_parquet(out_dir / "pm25.predictions.parquet", index=False)
    write_json(out_dir / "pm25.meta.json", meta)
    print("pm25", meta["metrics"], flush=True)
    return meta


def run_wind(data_dir: Path, out_dir: Path, code_sha256: str | None = None) -> dict:
    snapshot = verify_snapshot(data_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    metar = pd.read_parquet(data_dir / "metar.parquet")
    frames = []
    for a in AIRPORTS:
        h = haze_station.station_hourly(metar, a.icao, a.tz_offset_h)
        if h.empty:
            continue
        f = station_wind.feature_table(h, a.lat, a.lon)
        f["station"] = a.icao
        frames.append(f)
    table = pd.concat(frames, ignore_index=True).dropna(
        subset=["u_now", "v_now", "tmpc", "rh_pct", "target_u", "target_v"]
    )
    features = list(station_wind.FEATURES)
    parts = temporal_parts(
        table, "issue_at", 6, "2021-12-31 23:00", "2023-12-31 23:00", "2025-12-31 23:00"
    )
    models = [_fit(parts, features, f"target_{c}") for c in ("u", "v")]
    tr, test = parts["train"], parts["test"]
    keys = ["station", tr.issue_at.dt.month, tr.issue_at.dt.hour]
    climatology = tr.groupby(keys)[["target_u", "target_v"]].mean()
    clim = climatology.reindex(
        pd.MultiIndex.from_arrays([test.station, test.issue_at.dt.month, test.issue_at.dt.hour])
    ).to_numpy()
    fallback = tr[["target_u", "target_v"]].mean().to_numpy()
    clim = np.where(np.isfinite(clim), clim, fallback)
    predictions = {
        "model": np.column_stack([m.predict(test[features]) for m in models]),
        "persistence": test[["u_now", "v_now"]].to_numpy(),
        "climatology": clim,
    }
    y = test[["target_u", "target_v"]].to_numpy()
    keep = common_cohort(y, predictions)
    # Direction is undefined for calm wind. Use one shared non-calm subset for all methods.
    direction_mask = np.linalg.norm(y[keep], axis=1) >= 0.5
    for prediction in predictions.values():
        direction_mask &= np.linalg.norm(prediction[keep], axis=1) >= 0.5
    meta = _metadata(
        "wind",
        "Airport METAR wind vector t+6h; meteorological direction FROM",
        "observation",
        parts,
        features,
        snapshot,
        code_sha256,
    )
    meta.update(
        {
            "title": "Angin stasiun t+6 jam (eksperimental)",
            "stations": [
                {
                    "icao": a.icao,
                    "name": a.name,
                    "lat": a.lat,
                    "lon": a.lon,
                    "tzOffsetHours": a.tz_offset_h,
                }
                for a in AIRPORTS
            ],
            "metrics": {
                "test": {
                    k: metrics.wind(y[keep], p[keep], direction_mask)
                    for k, p in predictions.items()
                }
            },
            "bestIteration": {c: m.best_iteration for c, m in zip(("u", "v"), models, strict=True)},
            "evaluationRows": int(keep.sum()),
            "globalImportance": {
                c: _export(m, f"wind-{c}", features, test, out_dir)
                for c, m in zip(("u", "v"), models, strict=True)
            },
        }
    )
    valid = parts["valid"]
    meta["validation"] = metrics.wind(
        valid[["target_u", "target_v"]].to_numpy(),
        np.column_stack([m.predict(valid[features]) for m in models]),
    )
    meta["limitations"] += [
        "Airport point observations are not a wind field at the user's home.",
        "Direction is suppressed for speed below 0.5 m/s.",
        "Direction error uses one common subset: target and every method have speed >= 0.5 m/s.",
        "A station hour is the last whole report in the completed hour, labelled at its end.",
    ]
    # Same archive origin for every station when available; latest real report before that origin.
    demo_at = pd.Timestamp("2025-09-01", tz="UTC")
    replay = test[(test.issue_at <= demo_at) & (test.issue_at > demo_at - pd.Timedelta(hours=3))]
    rows = []
    for st, grp in replay.groupby("station"):
        row = grp.sort_values("issue_at").iloc[-1]
        rows.append(
            {
                "station": st,
                "issueAt": row.issue_at,
                "reportAt": row.report_at,
                "x": row[features].tolist(),
                "observedU": row.target_u,
                "observedV": row.target_v,
            }
        )
    write_json(out_dir / "wind.demo.json", {"issueAt": demo_at, "rows": rows})
    pred = test.loc[keep, ["station", "issue_at", "target_u", "target_v"]].copy()
    pred["target_at"] = pred.issue_at + pd.Timedelta(hours=6)
    for k, p in predictions.items():
        pred[f"{k}_u"], pred[f"{k}_v"] = p[keep, 0], p[keep, 1]
    pred.to_parquet(out_dir / "wind.predictions.parquet", index=False)
    write_json(out_dir / "wind.meta.json", meta)
    print("wind", meta["metrics"], flush=True)
    return meta
