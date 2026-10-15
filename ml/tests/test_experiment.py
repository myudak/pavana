"""Boundary tests for the CP3 experiment.

Every frame here is synthetic and exists only to exercise splitting, refusal behaviour, baseline
purity and artifact status at the module boundary. No number produced by this file is an
experimental result: the real run and its evidence live in `ml/artifacts/` and are produced by
notebook 04.
"""

from __future__ import annotations

import copy
import json

import numpy as np
import pandas as pd
import pytest

from pavana_ml.data.fixtures import load_scenario, scenario_frames
from pavana_ml.features.model_table import build_model_table, save_model_table
from pavana_ml.models import experiment, lgbm

VALIDATION_START = "2024-06-20"
TEST_START = "2024-07-01"
HOURS = pd.date_range("2024-06-01", periods=40 * 24, freq="h", tz="UTC")
SPLIT_KWARGS = {"validation_start": VALIDATION_START, "test_start": TEST_START}
FAST = {"max_rounds": 20, "early_stopping_rounds": 5}


def hourly_frame(hours: pd.DatetimeIndex = HOURS) -> pd.DataFrame:
    size = len(hours)
    return pd.DataFrame(
        {
            "valid_at": hours,
            "temperature_c": 27.0 + 3.0 * np.sin(np.arange(size) / 40.0),
            "rh_pct": 80.0 + 10.0 * np.cos(np.arange(size) / 55.0),
            "precip_mm": np.where(np.arange(size) % 37 == 0, 4.0, 0.0),
            "wind_speed_ms": 3.0 + 2.0 * np.sin(np.arange(size) / 17.0),
            "wind_dir_from_deg": np.where(np.arange(size) % 48 < 24, 100.0, 280.0),
            "wind_gusts_ms": 5.0 + 2.0 * np.sin(np.arange(size) / 23.0),
            "surface_pressure_hpa": 1008.0 + np.sin(np.arange(size) / 61.0),
            "boundary_layer_height_m": 700.0 + 200.0 * np.sin(np.arange(size) / 13.0),
            "shortwave_radiation_wm2": 300.0 + 250.0 * np.sin(np.arange(size) / 24.0),
            "cams_pm25_ug_m3": 12.0 + 6.0 * np.sin(np.arange(size) / 29.0),
            "cams_pm10_ug_m3": 14.0 + 7.0 * np.sin(np.arange(size) / 29.0),
        }
    )


def detection_frame() -> pd.DataFrame:
    rows = [
        ("2024-06-01T04:20:00Z", -0.05, 109.40, 12.0),
        ("2024-06-05T07:10:00Z", -0.20, 109.55, 30.0),
        ("2024-06-18T09:45:00Z", 0.35, 109.20, 8.0),
        ("2024-06-24T11:05:00Z", -0.90, 110.10, 45.0),
        ("2024-07-03T02:30:00Z", -0.30, 109.90, 21.0),
    ]
    return pd.DataFrame(
        {
            "acquired_at": pd.to_datetime([row[0] for row in rows], utc=True),
            "lat": [row[1] for row in rows],
            "lon": [row[2] for row in rows],
            "frp_mw": [row[3] for row in rows],
        }
    ).astype({"lat": "float64", "lon": "float64", "frp_mw": "float64"})


@pytest.fixture(scope="module")
def synthetic() -> tuple[pd.DataFrame, dict]:
    table, metadata = build_model_table(hourly_frame(), detection_frame())
    return table, metadata


@pytest.fixture(scope="module")
def run(tmp_path_factory, synthetic) -> dict:
    table, metadata = synthetic
    output = tmp_path_factory.mktemp("artifacts") / "v1"
    return experiment.run_experiment(table, metadata, output_dir=output, **SPLIT_KWARGS, **FAST)


def splits_of(table: pd.DataFrame, metadata: dict) -> dict[str, pd.DataFrame]:
    splits, _ = experiment.chronological_split(table, metadata, **SPLIT_KWARGS)
    return splits


# --------------------------------------------------------------------------- splits


def test_split_keeps_a_full_horizon_gap_at_both_boundaries(synthetic) -> None:
    table, metadata = synthetic
    splits, windows = experiment.chronological_split(table, metadata, **SPLIT_KWARGS)
    assert splits["train"]["target_valid_at"].max() < splits["validation"]["valid_at"].min()
    assert splits["validation"]["target_valid_at"].max() < splits["test"]["valid_at"].min()
    assert splits["train"]["valid_at"].max() == pd.Timestamp("2024-06-19 17:00", tz="UTC")
    assert splits["validation"]["valid_at"].min() == pd.Timestamp(VALIDATION_START, tz="UTC")
    assert splits["test"]["valid_at"].min() == pd.Timestamp(TEST_START, tz="UTC")
    # The hours inside each gap belong to no split: that is the point of the gap.
    assert windows["dropped_in_gap"] == {"before_validation": 6, "before_test": 6}
    assert windows["gap_hours"] == metadata["horizon_hours"] == 6


def test_split_only_uses_eligible_rows(synthetic) -> None:
    table, metadata = synthetic
    splits, windows = experiment.chronological_split(table, metadata, **SPLIT_KWARGS)
    assert all(frame["eligible"].all() for frame in splits.values())
    covered = sum(len(frame) for frame in splits.values()) + sum(windows["dropped_in_gap"].values())
    assert covered == int(table["eligible"].sum())


def test_empty_split_is_refused(synthetic) -> None:
    table, metadata = synthetic
    with pytest.raises(ValueError, match="test split is empty"):
        experiment.chronological_split(
            table, metadata, validation_start="2024-06-20", test_start="2024-09-01"
        )


def test_backwards_split_boundaries_are_refused(synthetic) -> None:
    table, metadata = synthetic
    with pytest.raises(ValueError, match="must precede"):
        experiment.chronological_split(
            table, metadata, validation_start="2024-07-01", test_start="2024-06-20"
        )


def test_duplicate_origins_are_refused(tmp_path, synthetic) -> None:
    table, metadata = synthetic
    doubled = pd.concat([table, table.iloc[[10]]], ignore_index=True)
    with pytest.raises(ValueError, match="duplicate origin"):
        experiment.run_experiment(
            doubled, metadata, output_dir=tmp_path / "never-written", **SPLIT_KWARGS, **FAST
        )


# --------------------------------------------------------------------------- refusals


def test_a_target_that_is_not_the_cams_model_field_is_refused(tmp_path, synthetic) -> None:
    table, metadata = synthetic
    observed = {**metadata, "target_kind": "observation"}
    with pytest.raises(ValueError, match="target_kind"):
        experiment.run_experiment(
            table, observed, output_dir=tmp_path / "never-written", **SPLIT_KWARGS, **FAST
        )


def test_a_fixture_frame_is_refused(tmp_path, synthetic) -> None:
    _, metadata = synthetic
    demo, _ = scenario_frames(load_scenario())
    with pytest.raises(ValueError, match="fixture"):
        experiment.run_experiment(
            demo, metadata, output_dir=tmp_path / "never-written", **SPLIT_KWARGS, **FAST
        )


def test_a_metadata_without_the_required_keys_is_refused(tmp_path, synthetic) -> None:
    table, metadata = synthetic
    broken = {key: value for key, value in metadata.items() if key != "target_kind"}
    with pytest.raises(ValueError, match="is missing"):
        experiment.run_experiment(
            table, broken, output_dir=tmp_path / "never-written", **SPLIT_KWARGS, **FAST
        )


def test_a_feature_allowlist_containing_the_target_is_refused(tmp_path, synthetic) -> None:
    table, metadata = synthetic
    broken = copy.deepcopy(metadata)
    broken["feature_allowlists"]["C"] = [*broken["feature_allowlists"]["C"], broken["target"]]
    with pytest.raises(ValueError, match="future column"):
        experiment.run_experiment(
            table, broken, output_dir=tmp_path / "never-written", **SPLIT_KWARGS, **FAST
        )


def test_a_feature_allowlist_naming_unknown_columns_is_refused(tmp_path, synthetic) -> None:
    table, metadata = synthetic
    broken = copy.deepcopy(metadata)
    broken["feature_allowlists"]["E"] = [*broken["feature_allowlists"]["E"], "not_a_column"]
    with pytest.raises(ValueError, match="does not have"):
        experiment.run_experiment(
            table, broken, output_dir=tmp_path / "never-written", **SPLIT_KWARGS, **FAST
        )


def test_a_target_that_is_not_cams_at_target_valid_at_is_refused(tmp_path, synthetic) -> None:
    table, metadata = synthetic
    target = metadata["target"]
    same_hour = table.copy()
    same_hour[target] = same_hour["cams_pm25_ug_m3"]
    with pytest.raises(ValueError, match="not the CAMS value at"):
        experiment.run_experiment(
            same_hour, metadata, output_dir=tmp_path / "never-written", **SPLIT_KWARGS, **FAST
        )

    shifted = table.copy()
    shifted[metadata["target_valid_column"]] = shifted[
        metadata["target_valid_column"]
    ] + pd.Timedelta(hours=1)
    with pytest.raises(ValueError, match="is not exactly"):
        experiment.run_experiment(
            shifted, metadata, output_dir=tmp_path / "never-written", **SPLIT_KWARGS, **FAST
        )


def test_a_stored_table_whose_checksum_no_longer_matches_is_refused(tmp_path, synthetic) -> None:
    table, metadata = synthetic
    save_model_table(table, metadata, tmp_path)
    loaded, stored = experiment.load_model_table(tmp_path)
    assert len(loaded) == len(table) and stored["table_sha256"]

    tampered = loaded.copy()
    tampered.loc[0, "temperature_c"] = tampered.loc[0, "temperature_c"] + 1.0
    tampered.to_parquet(tmp_path / "processed" / experiment.MODEL_TABLE_FILE, index=False)
    with pytest.raises(ValueError, match="changed since it was written"):
        experiment.load_model_table(tmp_path)


def test_a_missing_model_table_is_reported_as_a_missing_step(tmp_path) -> None:
    with pytest.raises(FileNotFoundError, match="Run notebook 03 first"):
        experiment.load_model_table(tmp_path)


# --------------------------------------------------------------------------- baselines


def test_persistence_baseline_is_the_model_field_at_the_origin(synthetic, run) -> None:
    table, metadata = synthetic
    test = splits_of(table, metadata)["test"]
    predictions = run["test_predictions"]
    assert np.array_equal(predictions["pred_A"].to_numpy(), test["cams_pm25_ug_m3"].to_numpy())
    assert (predictions["valid_at"] == test["valid_at"].to_numpy()).all()
    assert np.array_equal(predictions["target"].to_numpy(), test[metadata["target"]].to_numpy())


def test_seasonal_baseline_ignores_validation_and_test_values() -> None:
    train = pd.DataFrame(
        {
            "month": [1, 1, 1, 1, 2, 2],
            "hour": [0, 0, 6, 6, 0, 0],
            "target": [10.0, 20.0, 30.0, 40.0, 100.0, 200.0],
        }
    )
    frame = pd.DataFrame(
        {"month": [1, 1, 2, 3], "hour": [0, 12, 0, 0], "target": [0.0, 0.0, 0.0, 0.0]}
    )
    before, counts = experiment.seasonal_mean_predictions(train, frame, "target")
    # (1, 0) uses its own group, (1, 12) falls back to the January train mean, (2, 0) is its own
    # group, and (3, 0) has no March rows at all, so it falls back to the overall train mean.
    assert before.tolist() == pytest.approx([15.0, 25.0, 150.0, 400.0 / 6])
    assert counts == {"month_hour": 2, "month": 1, "overall": 1}

    loud = frame.assign(target=[9999.0, 9999.0, 9999.0, 9999.0])
    after, _ = experiment.seasonal_mean_predictions(train, loud, "target")
    assert np.array_equal(before, after)


def test_the_issue_time_baseline_is_declared_as_not_run(run) -> None:
    report = run["report"]
    assert report["baselines"]["issue_time_baseline_run"] is False
    assert report["baselines"]["B_is_not_the_issue_time_baseline"]
    assert "issued_at" in report["baselines"]["B_is_not_the_issue_time_baseline"]


# --------------------------------------------------------------------------- comparison


def test_every_variant_is_scored_on_the_identical_test_rows(run) -> None:
    results = run["results"]
    test_rows = results[(results["split"] == "test") & (results["period"] == "all")]
    assert set(test_rows["variant"]) == set(experiment.VARIANT_ORDER)
    assert test_rows["n"].nunique() == 1
    assert int(test_rows["n"].iloc[0]) == run["report"]["evaluation_rows"]["test"]
    predictions = run["test_predictions"]
    columns = [f"pred_{key}" for key in experiment.VARIANT_ORDER]
    assert np.isfinite(predictions[columns].to_numpy()).all()
    assert len(predictions) == int(test_rows["n"].iloc[0])


def test_the_selected_variant_follows_validation_not_test(run) -> None:
    results = run["results"]
    validation = results[
        (results["split"] == "validation")
        & (results["period"] == "all")
        & results["variant"].isin(experiment.VARIANTS)
    ].sort_values(["mae", "features_n", "variant"])
    assert run["report"]["selected_variant"] == validation.iloc[0]["variant"]
    assert run["report"]["selected_on"] == "validation MAE"


def test_test_values_cannot_move_a_validation_prediction(tmp_path, synthetic) -> None:
    table, metadata = synthetic
    tampered = table.copy()
    later = tampered["valid_at"] >= pd.Timestamp(TEST_START, tz="UTC")
    # A derived pm25 lag and a weather input are moved on test rows only. `cams_pm25_ug_m3` and the
    # target stay untouched, so the table still satisfies its own alignment contract.
    tampered.loc[later, "cams_pm25_lag1h"] = tampered.loc[later, "cams_pm25_lag1h"] + 50.0
    tampered.loc[later, "temperature_c"] = tampered.loc[later, "temperature_c"] + 50.0
    assert not table.loc[later, "cams_pm25_lag1h"].equals(tampered.loc[later, "cams_pm25_lag1h"])

    first = experiment.run_experiment(
        table, metadata, output_dir=tmp_path / "clean", **SPLIT_KWARGS, **FAST
    )
    second = experiment.run_experiment(
        tampered, metadata, output_dir=tmp_path / "tampered", **SPLIT_KWARGS, **FAST
    )
    # Nothing outside the test split was edited, so a model that never reads the test split must
    # score the same on train and validation, stop at the same iteration and serialise to the same
    # bytes. The model file is compared byte for byte because a metric could coincide by accident.
    for split in ("train", "validation"):
        pd.testing.assert_frame_equal(
            first["results"][first["results"]["split"] == split].reset_index(drop=True),
            second["results"][second["results"]["split"] == split].reset_index(drop=True),
        )
    assert (
        first["report"]["lightgbm"]["best_iteration"]
        == second["report"]["lightgbm"]["best_iteration"]
    )
    for variant in experiment.VARIANTS:
        assert (first["output_dir"] / variant / "model.txt").read_bytes() == (
            second["output_dir"] / variant / "model.txt"
        ).read_bytes()
    # The edit reached the model's inputs: predictions on the edited rows move even though the
    # fitted model did not.
    assert not (first["test_predictions"]["pred_C"] == second["test_predictions"]["pred_C"]).all()


def test_a_rerun_with_the_same_inputs_and_code_is_reproducible(tmp_path, synthetic) -> None:
    table, metadata = synthetic
    first = experiment.run_experiment(
        table, metadata, output_dir=tmp_path / "one", **SPLIT_KWARGS, **FAST
    )
    second = experiment.run_experiment(
        table, metadata, output_dir=tmp_path / "two", **SPLIT_KWARGS, **FAST
    )
    assert first["report"]["metrics"]["test"] == second["report"]["metrics"]["test"]
    assert (
        first["report"]["lightgbm"]["best_iteration"]
        == second["report"]["lightgbm"]["best_iteration"]
    )
    pd.testing.assert_frame_equal(first["test_predictions"], second["test_predictions"])


# --------------------------------------------------------------------------- artifacts


def test_run_writes_models_metrics_and_predictions_with_research_labels(run) -> None:
    output = run["output_dir"]
    for name in ("report.json", "metrics.csv", "test_predictions.parquet"):
        assert (output / name).exists(), name
    text = (output / "report.json").read_text(encoding="utf-8")

    def reject(token: str) -> None:
        raise AssertionError(f"report.json contains the non-standard JSON token {token}")

    report = json.loads(text, parse_constant=reject)
    assert {key: report["status"][key] for key in ("evaluated", "research_only")} == {
        "evaluated": True,
        "research_only": True,
    }
    assert report["status"]["operational_ready"] is False
    assert report["status"]["observation_validated"] is False
    assert "never been compared against observed station PM2.5" in report["status"]["statement"]
    for variant in experiment.VARIANTS:
        meta = json.loads((output / variant / "metadata.json").read_text(encoding="utf-8"))
        assert (output / variant / "model.txt").exists()
        assert meta["evaluated"] is True
        assert meta["target_kind"] == "model"
        assert meta["features"] == report["feature_allowlists"][variant]
        assert meta["data_sha256"] == report["data"]["table_sha256"]
        assert meta["evaluated"] is True and lgbm.is_app_ready(meta) is False


def test_the_run_uses_allowlists_not_every_numeric_column(synthetic, run) -> None:
    table, metadata = synthetic
    numeric = {name for name in table.columns if pd.api.types.is_numeric_dtype(table[name])}
    assert "cams_pm10_ug_m3" in numeric
    for variant in experiment.VARIANTS:
        features = run["report"]["feature_allowlists"][variant]
        assert features == list(metadata["feature_allowlists"][variant])
        assert "cams_pm10_ug_m3" not in features
        assert metadata["target"] not in features
        assert metadata["target_valid_column"] not in features
        assert "eligible" not in features


def test_calendar_breakdown_covers_test_months_only(run) -> None:
    results = run["results"]
    periods = set(results[results["split"] == "test"]["period"]) - {"all"}
    assert periods == {"2024-07"}
    assert set(results[results["split"] != "test"]["period"]) == {"all"}
    assert "no month is labelled a haze episode" in run["report"]["calendar_breakdown_rule"]


def test_the_event_threshold_states_its_standard(run) -> None:
    report = run["report"]
    assert report["event_metric"]["threshold_ug_m3"] == experiment.EVENT_THRESHOLD_UG_M3 == 55.5
    assert "not a station AQI" in report["event_metric"]["meaning"]
    assert "Unhealthy" in report["event_metric"]["standard"]


def test_a_cams_artifact_is_never_app_ready_nor_discovered_as_one(run) -> None:
    artifacts_root = run["output_dir"].parent
    # A run keeps its models one level down, so the single-level discovery finds nothing at all.
    assert lgbm.latest_evaluated_artifact(artifacts_root) is None
    assert lgbm.latest_app_ready_artifact(artifacts_root) is None
    status = experiment.artifact_status(artifacts_root)
    assert {entry["version"] for entry in status} == set(experiment.VARIANTS)
    assert all(entry["evaluated"] is True and entry["app_ready"] is False for entry in status)
    assert {entry["target_kind"] for entry in status} == {"model"}
    assert all(entry["operational_ready"] is False for entry in status)


def test_flipping_only_the_status_flags_cannot_make_a_model_field_app_ready(run) -> None:
    """A hand-edited metadata.json must not be enough: the target has to be an observation."""
    meta = json.loads((run["output_dir"] / "E" / "metadata.json").read_text(encoding="utf-8"))
    assert meta["target_kind"] == "model"
    hand_edited = {**meta, "operational_ready": True, "observation_validated": True}
    assert lgbm.is_app_ready(hand_edited) is False
    # Only an observed target, with the same flags, is servable at all.
    assert lgbm.is_app_ready({**hand_edited, "target_kind": "observation"}) is True


def test_a_finished_run_is_never_overwritten_and_can_only_be_reused_when_it_matches(
    tmp_path, synthetic
) -> None:
    table, metadata = synthetic
    save_model_table(table, metadata, tmp_path / "data")
    loaded, stored = experiment.load_model_table(tmp_path / "data")
    output = tmp_path / "artifacts" / "v1"
    first = experiment.run_experiment(loaded, stored, output_dir=output, **SPLIT_KWARGS, **FAST)

    with pytest.raises(FileExistsError, match="already exists"):
        experiment.run_experiment(loaded, stored, output_dir=output, **SPLIT_KWARGS, **FAST)

    again = experiment.run_experiment(
        loaded, stored, output_dir=output, if_exists="reuse", **SPLIT_KWARGS, **FAST
    )
    assert again["report"]["version"] == first["report"]["version"]
    assert again["report"]["data"]["table_sha256"] == stored["table_sha256"]
    # Exact, not approximate: a reused run must hand back the stored numbers unchanged.
    pd.testing.assert_frame_equal(again["results"], first["results"], check_exact=True)

    # A metadata dict whose checksum is not the file's is caught before the reuse branch is even
    # reached: the run must record a checksum that describes the parquet behind the frame.
    other_table = {**stored, "table_sha256": "0" * 64}
    with pytest.raises(ValueError, match="no longer matches the checksum in its metadata"):
        experiment.run_experiment(
            loaded, other_table, output_dir=output, if_exists="reuse", **SPLIT_KWARGS, **FAST
        )

    # A run answers the question it was configured for. Other split boundaries or another round
    # budget must not hand back this run's metrics as if they described the new request.
    with pytest.raises(ValueError, match="different settings"):
        experiment.run_experiment(
            loaded,
            stored,
            output_dir=output,
            if_exists="reuse",
            validation_start="2024-06-15",
            test_start=TEST_START,
            **FAST,
        )
    with pytest.raises(ValueError, match="different settings"):
        experiment.run_experiment(
            loaded, stored, output_dir=output, if_exists="reuse", max_rounds=7, **SPLIT_KWARGS
        )


def test_a_table_file_that_moved_with_its_frame_is_refused(tmp_path, synthetic) -> None:
    """A stale metadata dict must not launder a parquet that changed together with the frame."""
    table, metadata = synthetic
    save_model_table(table, metadata, tmp_path / "data")
    loaded, stored = experiment.load_model_table(tmp_path / "data")

    drifted = loaded.copy()
    drifted["temperature_c"] = 1000.0
    # Both the frame and the file move; only the metadata still holds the old checksum.
    drifted.to_parquet(tmp_path / "data" / "processed" / experiment.MODEL_TABLE_FILE, index=False)
    with pytest.raises(ValueError, match="no longer matches the checksum in its metadata"):
        experiment.run_experiment(
            drifted, stored, output_dir=tmp_path / "never-written", **SPLIT_KWARGS, **FAST
        )
    assert not (tmp_path / "never-written").exists()


def test_a_frame_drifted_from_the_audited_table_is_refused(tmp_path, synthetic) -> None:
    """The frame that trains must be the file whose checksum the report carries.

    Without this, editing the frame after `load_model_table` returned it would still produce a run
    whose provenance points at the unedited parquet.
    """
    table, metadata = synthetic
    save_model_table(table, metadata, tmp_path / "data")
    loaded, stored = experiment.load_model_table(tmp_path / "data")
    good = experiment.run_experiment(
        loaded, stored, output_dir=tmp_path / "clean", **SPLIT_KWARGS, **FAST
    )
    assert good["report"]["data"]["frame_source_verified"] is True
    assert good["report"]["data"]["frame_sha256"] == experiment.frame_fingerprint(loaded)

    drifted = loaded.copy()
    drifted["temperature_c"] = 1000.0
    with pytest.raises(ValueError, match="not the audited table"):
        experiment.run_experiment(
            drifted, stored, output_dir=tmp_path / "never-written", **SPLIT_KWARGS, **FAST
        )
    assert not (tmp_path / "never-written").exists()


def stored_run(tmp_path, synthetic, name: str = "v1"):
    """A run written from the audited file, so reuse has a table checksum and a frame to compare."""
    table, metadata = synthetic
    save_model_table(table, metadata, tmp_path / "data")
    loaded, stored = experiment.load_model_table(tmp_path / "data")
    output = tmp_path / "artifacts" / name
    experiment.run_experiment(loaded, stored, output_dir=output, **SPLIT_KWARGS, **FAST)
    return loaded, stored, output


def test_reuse_refuses_a_changed_feature_allowlist(tmp_path, synthetic) -> None:
    """A run answers the question its own feature lists describe, not the caller's."""
    table, metadata, output = stored_run(tmp_path, synthetic)
    changed = copy.deepcopy(metadata)
    changed["feature_allowlists"]["C"] = [
        column for column in changed["feature_allowlists"]["C"] if column != "temperature_c"
    ]
    with pytest.raises(ValueError, match="feature_allowlists"):
        experiment.run_experiment(
            table, changed, output_dir=output, if_exists="reuse", **SPLIT_KWARGS, **FAST
        )


def test_reuse_refuses_an_incomplete_run(tmp_path, synthetic) -> None:
    table, metadata, output = stored_run(tmp_path, synthetic)
    (output / "D" / "model.txt").unlink()
    with pytest.raises(ValueError, match="not a complete run"):
        experiment.run_experiment(
            table, metadata, output_dir=output, if_exists="reuse", **SPLIT_KWARGS, **FAST
        )


def test_reuse_refuses_metrics_that_do_not_match_the_report(tmp_path, synthetic) -> None:
    table, metadata, output = stored_run(tmp_path, synthetic)
    csv_path = output / "metrics.csv"
    results = pd.read_csv(csv_path, float_precision="round_trip")
    results.loc[
        (results["split"] == "test") & (results["period"] == "all") & (results["variant"] == "C"),
        "mae",
    ] = 999.0
    results.to_csv(csv_path, index=False)
    with pytest.raises(ValueError, match="contradicts itself"):
        experiment.run_experiment(
            table, metadata, output_dir=output, if_exists="reuse", **SPLIT_KWARGS, **FAST
        )


def test_reuse_refuses_predictions_that_do_not_reproduce_the_metrics(tmp_path, synthetic) -> None:
    table, metadata, output = stored_run(tmp_path, synthetic)
    parquet_path = output / "test_predictions.parquet"
    predictions = pd.read_parquet(parquet_path)
    predictions["pred_E"] = predictions["pred_E"] + 1.0
    predictions.to_parquet(parquet_path, index=False)
    with pytest.raises(ValueError, match="does not reproduce"):
        experiment.run_experiment(
            table, metadata, output_dir=output, if_exists="reuse", **SPLIT_KWARGS, **FAST
        )


def test_reuse_refuses_a_model_file_whose_contents_changed(tmp_path, synthetic) -> None:
    """A model that still has a path but no longer is the model the report scored is not reused."""
    table, metadata, output = stored_run(tmp_path, synthetic)
    model_path = output / "C" / "model.txt"
    assert json.loads((output / "C" / "metadata.json").read_text())["model_sha256"]
    model_path.write_text("this is not a LightGBM model\n", encoding="utf-8")
    with pytest.raises(ValueError, match="does not match the checksum the report records"):
        experiment.run_experiment(
            table, metadata, output_dir=output, if_exists="reuse", **SPLIT_KWARGS, **FAST
        )


def test_reuse_refuses_a_run_reporting_another_table(tmp_path, synthetic) -> None:
    table, metadata, output = stored_run(tmp_path, synthetic)
    report_path = output / "report.json"
    report = json.loads(report_path.read_text(encoding="utf-8"))
    report["data"]["table_sha256"] = "0" * 64
    report_path.write_text(json.dumps(report, indent=2), encoding="utf-8")
    with pytest.raises(ValueError, match="not from the metadata given"):
        experiment.run_experiment(
            table, metadata, output_dir=output, if_exists="reuse", **SPLIT_KWARGS, **FAST
        )


def test_the_report_records_the_split_windows_hashes_and_parameters(run, synthetic) -> None:
    _, metadata = synthetic
    report = run["report"]
    assert report["splits"]["splits"]["train"]["rows"] > 0
    assert report["splits"]["gap_hours"] == 6
    assert set(report["splits"]["target_distribution_ug_m3"]) == {"train", "validation", "test"}
    assert report["data"]["table_sha256"] == metadata.get("table_sha256")
    assert report["data"]["table_rows"] == len(synthetic[0])
    assert set(report["code"]["module_sha256"]) == {
        "pavana_ml.models.experiment",
        "pavana_ml.models.lgbm",
    }
    assert report["lightgbm"]["params"]["seed"] == experiment.DEFAULT_SEED
    assert report["lightgbm"]["params"]["num_threads"] >= 1
    assert report["lightgbm"]["params"]["deterministic"] is True
    assert report["lightgbm"]["device"] == "cpu"
    assert report["code"]["package_versions"]["lightgbm"]
    assert report["feature_counts"] == {
        key: len(report["feature_allowlists"][key]) for key in experiment.VARIANTS
    }
