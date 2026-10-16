"""Synthetic end-to-end artifact checks; these are not Pavana experiment results."""

import json
import shutil
from pathlib import Path

import numpy as np
import pandas as pd
import pytest
from test_experiment import FAST, SPLIT_KWARGS, detection_frame, hourly_frame

from pavana_ml.features.model_table import build_model_table
from pavana_ml.models.experiment import run_experiment


@pytest.fixture(scope="module")
def explained(tmp_path_factory):
    notebook = Path(__file__).parents[1] / "notebooks" / "00_cloud_setup.ipynb"
    cells = json.loads(notebook.read_text(encoding="utf-8"))["cells"]
    namespace = {"pd": pd, "json": json}
    for tag in ("h1-demo-functions", "research-shap-functions"):
        code = next(
            "".join(cell["source"])
            for cell in cells
            if tag in cell.get("metadata", {}).get("tags", [])
        )
        exec(compile(code, str(notebook), "exec"), namespace)
    table, metadata = build_model_table(hourly_frame(), detection_frame())
    root = tmp_path_factory.mktemp("research") / "unit-test-only"
    run_experiment(table, metadata, output_dir=root, **SPLIT_KWARGS, **FAST)
    return namespace["build_research_explanations"], root, table, metadata


def test_research_bundle_reconstructs_the_evaluated_predictions(explained):
    build, root, table, metadata = explained
    bundle, global_explanation, local_explanation = build(root, table, metadata, "a" * 40, "b" * 40)
    assert len(bundle["cases"]) == 168
    assert bundle["researchOnly"] is True
    assert bundle["operationalReady"] is bundle["observationValidated"] is False
    assert len(bundle["globalImportance"]["meanAbsShapUgM3"]) == len(bundle["features"])
    assert len(global_explanation) == bundle["globalImportance"]["sampleN"]
    assert len(local_explanation.values) == len(bundle["features"])
    for sample in bundle["cases"]:
        assert np.isclose(
            sample["baseValueUgM3"] + sum(sample["shapValuesUgM3"]), sample["predictionUgM3"]
        )
    json.dumps(bundle, allow_nan=False)


def test_changed_feature_table_cannot_be_explained_as_the_same_run(explained):
    build, root, table, metadata = explained
    changed = table.copy()
    changed.loc[0, "rh_pct"] += 1
    with pytest.raises(ValueError, match="frame training"):
        build(root, changed, metadata, "a" * 40, "b" * 40)


def test_replaced_model_is_rejected_before_loading(explained, tmp_path):
    build, root, table, metadata = explained
    shutil.copytree(root, tmp_path / "run")
    copied = tmp_path / "run"
    report = json.loads((copied / "report.json").read_text())
    (copied / report["selected_variant"] / "model.txt").write_text("unit-test corruption")
    with pytest.raises(ValueError, match="Checksum"):
        build(copied, table, metadata, "a" * 40, "b" * 40)
