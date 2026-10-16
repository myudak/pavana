"""Exercise the presentation code actually shipped in the self-contained cloud notebook.

All numbers below are synthetic unit-test records, never experiment results. The notebook keeps
its presentation code inline so it can install the existing pinned training bundle unchanged.
"""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pandas as pd
import pytest


@pytest.fixture(scope="module")
def demo():
    notebook = Path(__file__).parents[1] / "notebooks" / "00_cloud_setup.ipynb"
    cells = json.loads(notebook.read_text(encoding="utf-8"))["cells"]
    code = next(
        "".join(cell["source"])
        for cell in cells
        if "h1-demo-functions" in cell.get("metadata", {}).get("tags", [])
    )
    namespace = {"pd": pd, "json": json}
    exec(compile(code, str(notebook), "exec"), namespace)
    return namespace


@pytest.fixture
def saved_run(tmp_path):
    origins = pd.date_range("2026-01-01", periods=200, freq="h", tz="UTC")
    predictions = pd.DataFrame(
        {"valid_at": origins, "target_valid_at": origins + pd.Timedelta(hours=6), "target": 20.0}
    )
    rows, reported = [], {}
    for key, error in zip("ABCDE", (1.0, 5.0, 3.0, 2.0, 4.0), strict=True):
        predictions[f"pred_{key}"] = 20 + error
        reported[key] = {"mae": error, "rmse": error}
        rows.append({"split": "test", "period": "all", "variant": key, "n": 200, **reported[key]})
    report = {
        "target_kind": "model",
        "status": {
            "research_only": True,
            "operational_ready": False,
            "observation_validated": False,
        },
        "selected_variant": "D",
        "selected_on": "validation MAE",
        "validation_mae": {"C": 3.0, "D": 2.0, "E": 4.0},
        "metrics": {"test": reported},
    }
    predictions.to_parquet(tmp_path / "test_predictions.parquet", index=False)
    pd.DataFrame(rows).to_csv(tmp_path / "metrics.csv", index=False)
    (tmp_path / "report.json").write_text(json.dumps(report), encoding="utf-8")
    return tmp_path


def test_presentation_recomputes_every_variant_and_keeps_negative_result(demo, saved_run):
    report, metrics, predictions = demo["checked_demo_inputs"](saved_run)
    assert len(predictions) == 200
    assert metrics["n"].eq(200).all()
    takeaway = demo["demo_takeaway"](metrics, report["selected_variant"])
    assert "**A**" in takeaway
    assert "lebih tinggi (lebih buruk)" in takeaway
    assert "belum akurasi terhadap stasiun" in takeaway


@pytest.mark.parametrize("corruption", ["metrics", "rows", "selection", "status", "report"])
def test_inconsistent_artifacts_cannot_be_presented(demo, saved_run, corruption):
    metrics = pd.read_csv(saved_run / "metrics.csv")
    report = json.loads((saved_run / "report.json").read_text())
    if corruption == "metrics":
        metrics.loc[0, "mae"] = 0.01
    elif corruption == "rows":
        metrics.loc[0, "n"] = 199
    elif corruption == "selection":
        report["selected_variant"] = "C"
    elif corruption == "status":
        report["status"]["operational_ready"] = True
    elif corruption == "report":
        report["metrics"]["test"]["A"]["mae"] = 0.01
    metrics.to_csv(saved_run / "metrics.csv", index=False)
    (saved_run / "report.json").write_text(json.dumps(report), encoding="utf-8")
    with pytest.raises(ValueError):
        demo["checked_demo_inputs"](saved_run)


@pytest.mark.parametrize("corruption", ["horizon", "missing", "duplicate"])
def test_invalid_prediction_rows_are_refused(demo, saved_run, corruption):
    path = saved_run / "test_predictions.parquet"
    predictions = pd.read_parquet(path)
    if corruption == "horizon":
        predictions.loc[0, "target_valid_at"] += pd.Timedelta(minutes=1)
    elif corruption == "missing":
        predictions.loc[0, "pred_A"] = np.nan
    else:
        predictions.loc[0, "target_valid_at"] = predictions.loc[1, "target_valid_at"]
    predictions.to_parquet(path, index=False)
    with pytest.raises(ValueError):
        demo["checked_demo_inputs"](saved_run)


def test_first_week_skips_an_incomplete_prefix_without_selecting_on_values(demo):
    times = pd.date_range("2026-01-01", periods=300, freq="h", tz="UTC").delete(20)
    predictions = pd.DataFrame({"target_valid_at": times, "target": np.arange(len(times))})
    week = demo["first_holdout_week"](predictions)
    assert len(week) == 168
    assert week["target_valid_at"].iloc[0] == pd.Timestamp("2026-01-01T21:00:00Z")
    assert week["target_valid_at"].diff().dropna().eq(pd.Timedelta(hours=1)).all()
    with pytest.raises(ValueError, match="168"):
        demo["first_holdout_week"](predictions.iloc[:100])
