"""Verify real Kaggle exports and install only immutable serving JSON into the API.

No fitting occurs here. Prediction parquet and native boosters remain in Kaggle output/local
artifacts; their checksums and recomputed metrics are recorded alongside the serving files.
"""

import argparse
import json
import shutil
from pathlib import Path

import numpy as np
import pandas as pd

from pavana_ml.data.research import sha256
from pavana_ml.evaluation import classification, regression
from pavana_ml.features import haze_station, hotspot_grid, pm25, station_wind
from pavana_ml.pipelines.contract import write_json

ROOT = Path(__file__).resolve().parents[2]
EXPECTED = {
    "hotspot-risk": ("binary", hotspot_grid.FEATURES),
    "haze-6h": ("binary", haze_station.FEATURES),
    "haze-24h": ("binary", haze_station.FEATURES),
    "pm25": ("regression", pm25.FEATURES),
    "wind-u": ("regression", station_wind.FEATURES),
    "wind-v": ("regression", station_wind.FEATURES),
}


def strict_read(path: Path):
    def refuse(constant):
        raise ValueError(f"Non-JSON constant: {constant} in {path.name}")

    return json.loads(path.read_text(encoding="utf-8"), parse_constant=refuse)


def compare(actual: dict, expected: dict):
    for key, value in expected.items():
        if value is None:
            assert actual[key] is None or not np.isfinite(actual[key]), key
        else:
            assert np.isclose(actual[key], value, rtol=1e-10, atol=1e-10), (key, actual[key], value)


def verify_predictions(source: Path) -> None:
    for name in ("hotspot-risk", "haze-6h", "haze-24h"):
        df = pd.read_parquet(source / f"{name}.predictions.parquet")
        if name == "hotspot-risk":
            meta = strict_read(source / "hotspot-risk.meta.json")["metrics"]["test"]
            y = df.y.to_numpy()
            target = pd.to_datetime(df.issue_day, utc=True) + pd.Timedelta(days=1)
        else:
            horizon = int(name.split("-")[1][:-1])
            meta = strict_read(source / "haze.meta.json")["horizons"][f"{horizon}h"]["metrics"][
                "test"
            ]
            y = df[f"y_{horizon}h"].to_numpy()
            target = pd.to_datetime(df.target_at, utc=True)
            assert (
                target - pd.to_datetime(df.issue_at, utc=True) == pd.Timedelta(hours=horizon)
            ).all()
        # Hotspot tests 2024+; haze tests 2023+ so the 2023 El Niño haze season is scored.
        assert target.max().year <= 2025 and target.min().year >= (2024 if name == "hotspot-risk" else 2023)
        methods = ("model", "persistence", "climatology")
        if name == "hotspot-risk":
            methods += ("recentActivity",)
        for method in methods:
            assert np.isfinite(df[method]).all()
            compare(classification.binary_metrics(y, df[method]), meta[method])
    for name in ("pm25", "wind"):
        df = pd.read_parquet(source / f"{name}.predictions.parquet")
        meta = strict_read(source / f"{name}.meta.json")["metrics"]["test"]
        target = pd.to_datetime(df.target_at, utc=True)
        assert (target - pd.to_datetime(df.issue_at, utc=True) == pd.Timedelta(hours=6)).all()
        assert (target.dt.year == 2026).all() if name == "pm25" else target.max().year <= 2025
        if name == "pm25":
            for method in ("model", "persistence", "climatology"):
                compare(
                    regression.scalar(df.target.to_numpy(), df[method].to_numpy()), meta[method]
                )
        else:
            y = df[["target_u", "target_v"]].to_numpy()
            preds = {
                method: df[[f"{method}_u", f"{method}_v"]].to_numpy()
                for method in ("model", "persistence", "climatology")
            }
            directional = np.linalg.norm(y, axis=1) >= 0.5
            for p in preds.values():
                directional &= np.linalg.norm(p, axis=1) >= 0.5
            for method, p in preds.items():
                compare(regression.wind(y, p, directional), meta[method])


def install(source: Path, kernel_version: int) -> dict:
    run = strict_read(source / "run.json")
    if run.get("status") != "completed" or run.get("boosterCount") != 6:
        raise ValueError("Training run is incomplete")
    json_paths = sorted(source.glob("*.json"))
    for p in json_paths:
        strict_read(p)
    for name, (objective, features) in EXPECTED.items():
        model = strict_read(source / f"{name}.model.json")
        if (
            model["objective"] != objective
            or model["featureNames"] != list(features)
            or not model["trees"]
        ):
            raise ValueError(f"Incorrect model contract: {name}")
        probe = strict_read(source / f"{name}.parity.json")
        if not any(any(v is None for v in row["x"]) for row in probe["rows"]):
            raise ValueError(f"Missing-input parity probe absent: {name}")
    for name in ("hotspot-risk", "haze", "pm25", "wind"):
        meta = strict_read(source / f"{name}.meta.json")
        if not meta["evaluated"] or not meta["experimental"] or meta["operationalReady"]:
            raise ValueError(f"Invalid experimental status: {name}")
        if meta["codeSha256"] != run["code"]["sha256"]:
            raise ValueError(f"Mixed source bundles: {name}")
    verify_predictions(source)
    # Validate everything before installing any file.
    destination = ROOT / "apps/api/src/models"
    destination.mkdir(parents=True, exist_ok=True)
    for p in json_paths:
        shutil.copyfile(p, destination / p.name)
    manifest = {
        "trainingKernel": "myudak/pavana-observed-train",
        "kernelVersion": kernel_version,
        "run": run,
        "files": {p.name: sha256(p) for p in json_paths},
        "researchFiles": {
            p.name: sha256(p) for p in source.glob("*") if p.suffix in (".parquet", ".txt")
        },
        "metricsRecomputedFromPredictions": True,
    }
    write_json(destination / "artifact-manifest.json", manifest)
    report = ROOT / "ml/reports/ml-live-run.json"
    report.parent.mkdir(parents=True, exist_ok=True)
    write_json(
        report,
        {
            "artifactManifest": manifest,
            "models": {
                name: strict_read(source / f"{name}.meta.json")
                for name in ("hotspot-risk", "haze", "pm25", "wind")
            },
        },
    )
    print(f"Installed {len(EXPECTED)} evaluated boosters in {destination}", flush=True)
    return manifest


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("--kernel-version", type=int, required=True)
    args = parser.parse_args()
    install(args.source, args.kernel_version)
