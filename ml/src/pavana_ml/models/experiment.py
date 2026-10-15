"""CP3: the ablation ladder, the holdout evaluation and the versioned run artifact.

The target is the CAMS **model field** at `t + 6 h` (see `features/model_table.py`). Nothing in
this module measures station skill: the snapshot carries no `issued_at`, so the product
methodology's issue-time baseline cannot be reconstructed, and a model field cannot validate a
monitor. Every run therefore writes `research_only: true`, `operational_ready: false` and
`observation_validated: false`, and no run may be served or described as a forecast.

What is enforced here:

* a stored table is refused when its SHA256 no longer matches its metadata, when its target is not
  the CAMS model field, when it carries fixture/station columns, or when the target column is not
  the CAMS value at `target_valid_at`;
* the split is chronological with a full-horizon gap on both boundaries, so a training label never
  reaches an origin in a later split;
* every variant is scored on the identical eligible test rows, and a variant that cannot produce a
  prediction for one of them fails the run instead of quietly shrinking the comparison;
* no test value is fitted on, and none is tuned on: the split boundaries, the feature lists and the
  parameters are fixed before the run. LightGBM takes `NaN` as-is, so no imputation or scaling is
  fitted at all; the fitted statistics are the boosted trees and baseline B's train-only
  month/hour means, and the only thing early stopping reads is the validation split;
* the frame that is trained on is the audited table: when the metadata names the parquet it was
  built from, that file must still match the metadata checksum and the frame handed in must match
  the file, so neither can drift unnoticed; the report records both the file checksum and the
  fingerprint of the frame actually used;
* a finished run is reused only when it is complete and self-consistent: its models, csv and
  holdout predictions must be present, the model files must match the checksums recorded for them,
  and all of it must agree with the report, while the requested target, horizon, feature allowlists
  and frame must equal the ones the run recorded.

The variant named in the report is chosen from validation MAE alone. The test split takes no part
in that choice, and the test metrics of every variant are written regardless of which one wins, so
a negative result cannot be hidden by it.
"""

from __future__ import annotations

import hashlib
import json
import os
import platform
import shutil
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd

from ..data.research import LIMITATIONS, assert_credential_free, sha256
from ..evaluation.metrics import event_precision_recall, mae, rmse
from ..features.model_table import NON_CAMS_COLUMNS
from ..paths import ARTIFACTS_DIR, DATA_DIR
from . import lgbm

MODEL_TABLE_FILE = "model_table.parquet"
MODEL_TABLE_METADATA_FILE = "model_table.metadata.json"

# Split boundaries from the plan. `validation_start - horizon` is the last origin a train row may
# take, so no train label (origin + 6 h) can land inside validation, and the same holds at the
# validation/test boundary. The 2023-10-01 scaffold boundary is gone: the table starts in 2024.
DEFAULT_VALIDATION_START = "2025-01-01"
DEFAULT_TEST_START = "2026-01-01"

DEFAULT_MAX_ROUNDS = 500
DEFAULT_EARLY_STOPPING_ROUNDS = 50
DEFAULT_SEED = 20261015
DEFAULT_NUM_THREADS = max(1, os.cpu_count() or 1)

# Every parameter is explicit in the report: seed, thread count and the deterministic flags are
# recorded, so a rerun can be reproduced and a diff in the artifact can be explained.
EXPERIMENT_PARAMS: dict[str, Any] = {
    "objective": "regression_l1",
    "metric": "mae",
    "learning_rate": 0.05,
    "num_leaves": 31,
    "min_data_in_leaf": 50,
    "feature_fraction": 0.9,
    "seed": DEFAULT_SEED,
    "num_threads": DEFAULT_NUM_THREADS,
    "deterministic": True,
    "force_row_wise": True,
    "verbosity": -1,
}

# US AQI 151 ("Unhealthy") lower bound of the 24 h PM2.5 breakpoints. It is applied here to hourly
# CAMS model-field values, so it marks a high-value hour in the model field; it is not a station
# AQI and not a health category for that hour.
EVENT_THRESHOLD_UG_M3 = 55.5
EVENT_THRESHOLD_STANDARD = "US AQI 151 'Unhealthy' lower bound of the 24 h PM2.5 breakpoints"

SELECTION_RULE = (
    "The named variant is the one with the lowest validation MAE, ties broken by fewer features "
    "(C before D before E). No test value takes part in that choice: the rule, the feature lists "
    "and the parameters are fixed before the run, and the test metrics of every variant are "
    "written either way."
)

CALENDAR_BREAKDOWN_RULE = (
    "Test rows are also reported per calendar month (UTC). The breakdown is calendar-only: no "
    "month is labelled a haze episode or an air-quality event, and the sensor mix changes on "
    "2026-08-01."
)

VARIANT_ORDER = ("A", "B", "C", "D", "E")
# C/D/E are the trained variants; A and B are the reference baselines.
VARIANTS = ("C", "D", "E")

VARIANT_LABELS = {
    "A": "A persistence: CAMS at t",
    "B": "B month/hour mean of the CAMS target, fitted on train rows only",
    "C": "C LightGBM: CAMS history + weather + wind + time",
    "D": "D LightGBM: C + detection counts and FRP sums",
    "E": "E LightGBM: D + upwind exposure",
}

BASELINE_A_FEATURES = ["cams_pm25_ug_m3"]

REQUIRED_METADATA_KEYS = (
    "target",
    "target_kind",
    "target_valid_column",
    "horizon_hours",
    "feature_allowlists",
    "feature_columns",
    "research_only",
    "operational_ready",
    "observation_validated",
)

RUN_LIMITATIONS = [
    "Metrics compare a retrospective model against the CAMS model field, not against observations.",
    "No issue time exists in the snapshot, so no forecast lead time and no operational skill "
    "holds.",
    "Validation rows are out-of-sample for the trees but were used for early stopping, so their "
    "scores are mildly optimistic; test rows were never used for any choice.",
    "Baseline B is a train-only seasonal mean, not the product's CAMS issue-time baseline, which "
    "cannot be built from this snapshot.",
    "One grid cell and one anchor: nothing here generalises to Kalimantan or to another site.",
    "A negative result (E no better than C or D) is a valid outcome and is reported as found.",
    "A boosted tree cannot predict above the target range it was trained on. When the test period "
    "sits above that range, a persistence baseline that carries the current level can score better "
    "for a reason that is not a coding error, and the target ranges of each split are reported "
    "here so that reading stays possible.",
]


def experiment_module_sha256() -> dict[str, str]:
    """sha256 of every module that decides a number in a run.

    `lgbm.py` holds the training wrapper and its default parameters, so a run recorded with this
    file alone would not detect a change in the booster settings.
    """
    hashes = {lgbm.__name__: sha256(Path(lgbm.__file__))}
    hashes["pavana_ml.models.experiment"] = sha256(Path(__file__))
    return dict(sorted(hashes.items()))


def _utc(value: str | pd.Timestamp) -> pd.Timestamp:
    stamp = pd.Timestamp(value)
    return stamp.tz_localize("UTC") if stamp.tzinfo is None else stamp.tz_convert("UTC")


def _finite_or_none(value: Any) -> Any:
    """JSON-safe scalar. `NaN`/`inf` become `null`, never 0 and never a non-standard `NaN` token."""
    if isinstance(value, (bool, np.bool_)):
        return bool(value)
    if isinstance(value, (int, np.integer)):
        return int(value)
    if isinstance(value, (float, np.floating)):
        number = float(value)
        return number if np.isfinite(number) else None
    return value


def _require_utc(series: pd.Series, name: str) -> None:
    tz = getattr(series.dtype, "tz", None)
    if tz is None:
        raise ValueError(f"{name} must carry an explicit UTC timezone, not naive timestamps")
    if str(tz) != "UTC":
        raise ValueError(f"{name} must be UTC, got {tz}")


def _verify_target_alignment(
    table: pd.DataFrame, target: str, target_valid: str, horizon: int
) -> None:
    """Re-read the target through timestamps instead of row positions.

    The stored table is already checked in notebook 03. This is the CP3-side guard that the column
    about to be scored really is the CAMS value at `target_valid_at`, so a table rebuilt with a
    different horizon or row order cannot be trained on silently.
    """
    cams = table.set_index("valid_at")["cams_pm25_ug_m3"]
    try:
        expected = cams.reindex(pd.DatetimeIndex(table[target_valid])).to_numpy(dtype="float64")
    except ValueError as error:  # duplicate or unsortable keys
        raise ValueError(f"cannot align {target} on valid_at: {error}") from error
    actual = table[target].to_numpy(dtype="float64")
    delta = table[target_valid].to_numpy(dtype="datetime64[ns]") - table["valid_at"].to_numpy(
        dtype="datetime64[ns]"
    )
    if not np.all(delta == np.timedelta64(horizon, "h")):
        raise ValueError(f"{target_valid} is not exactly {horizon} h after valid_at")
    if not np.array_equal(actual, expected, equal_nan=True):
        raise ValueError(
            f"{target} is not the CAMS value at {target_valid}; the table does not match its "
            "metadata horizon"
        )


def _validate_table(table: pd.DataFrame, metadata: dict[str, Any]) -> dict[str, list[str]]:
    """Refuse anything that is not the audited CAMS table with a past-only feature allowlist."""
    missing = [key for key in REQUIRED_METADATA_KEYS if key not in metadata]
    if missing:
        raise ValueError(
            f"metadata is missing {missing}; refusing to guess a target or a feature list"
        )
    if metadata["target_kind"] != "model":
        raise ValueError(
            f"target_kind is {metadata['target_kind']!r}, expected 'model'. This experiment "
            "predicts the CAMS model field; a fixture or station target answers a different "
            "question."
        )
    wrong = sorted(set(NON_CAMS_COLUMNS) & set(table.columns))
    if wrong:
        raise ValueError(f"refusing a synthetic fixture or station frame: {wrong}")
    target, target_valid = metadata["target"], metadata["target_valid_column"]
    for column in ("valid_at", target, target_valid, "eligible"):
        if column not in table.columns:
            raise ValueError(f"table is missing {column!r}; rebuild it with notebook 03")
    if table.empty:
        raise ValueError("table is empty")
    if table["valid_at"].duplicated().any():
        raise ValueError("table has duplicate origin timestamps; one origin would be counted twice")
    _require_utc(table["valid_at"], "valid_at")
    _require_utc(table[target_valid], target_valid)
    if table["eligible"].dtype != bool:
        raise ValueError("eligible must be a boolean column")
    horizon = metadata["horizon_hours"]
    if not isinstance(horizon, int) or isinstance(horizon, bool) or horizon < 1:
        raise ValueError(f"horizon_hours must be a positive whole number of hours, got {horizon!r}")
    if target.startswith("target_pm25") or target.startswith("target_observed"):
        raise ValueError(
            f"{target!r} looks like an observed-PM2.5 target, not the CAMS model field"
        )
    _verify_target_alignment(table, target, target_valid, horizon)

    allowlists = metadata["feature_allowlists"]
    if not isinstance(allowlists, dict) or set(VARIANTS) - set(allowlists):
        raise ValueError(f"feature_allowlists must define {list(VARIANTS)}")
    forbidden = {target, target_valid, "eligible"}
    declared = set(metadata["feature_columns"])
    checked: dict[str, list[str]] = {}
    for name in VARIANTS:
        columns = list(allowlists[name])
        if not columns:
            raise ValueError(
                f"allowlist {name} is empty; the ladder needs an explicit feature list"
            )
        unknown = sorted(set(columns) - set(table.columns))
        if unknown:
            raise ValueError(f"allowlist {name} names columns the table does not have: {unknown}")
        leaked = sorted(forbidden & set(columns)) + [
            column for column in columns if column.startswith("target")
        ]
        if leaked:
            raise ValueError(f"allowlist {name} contains a future column: {leaked}")
        undeclared = sorted(set(columns) - declared)
        if undeclared:
            raise ValueError(f"allowlist {name} is not covered by feature_columns: {undeclared}")
        checked[name] = columns
    if not set(checked["C"]) <= set(checked["D"]) <= set(checked["E"]):
        raise ValueError("the ladder must nest: C features must be a subset of D, and D of E")
    for column in checked["E"]:
        if table[column].equals(table[target]):
            raise ValueError(f"feature {column!r} is identical to the target column")
    return checked


def frame_fingerprint(table: pd.DataFrame) -> str:
    """sha256 over the frame's values, column order and dtypes.

    `table_sha256` names the audited parquet file; this names the frame that is actually handed to
    the trainer. Recording both makes "this run used that file" checkable instead of assumed.
    """
    header = json.dumps(
        [[str(name), str(dtype)] for name, dtype in table.dtypes.items()], separators=(",", ":")
    )
    hashed = pd.util.hash_pandas_object(table, index=True, categorize=False).to_numpy(
        dtype="uint64"
    )
    digest = hashlib.sha256()
    digest.update(header.encode("utf-8"))
    digest.update(hashed.tobytes())
    return digest.hexdigest()


def _verified_frame_fingerprint(table: pd.DataFrame, metadata: dict[str, Any]) -> tuple[str, bool]:
    """Fingerprint the training frame, and prove it is the audited file when that file is available.

    Without this, a caller could edit the frame after `load_model_table` returned it — dropping a
    feature or filling a column with a constant — and the report would still carry the checksum of
    the unedited parquet, so its provenance would describe data that never reached the trainer.

    The file is checked against the metadata checksum as well, not only against the frame: if both
    the frame and the parquet moved while an older metadata dict was reused, comparing the two would
    still agree, and the report would name a checksum that no longer describes any file.
    """
    fingerprint = frame_fingerprint(table)
    declared = metadata.get("table_path")
    if not declared:
        return fingerprint, False
    source = Path(declared)
    if not source.is_file():
        return fingerprint, False
    recorded = metadata.get("table_sha256")
    if not recorded:
        raise ValueError(
            f"{source} is named as the table behind this frame, but the metadata records no "
            "table_sha256, so provenance cannot be shown. Reload it with load_model_table()."
        )
    actual = sha256(source)
    if actual != recorded:
        raise ValueError(
            f"{source} no longer matches the checksum in its metadata: {actual} != {recorded}. "
            "Rebuild the table with notebook 03 before training on it."
        )
    on_disk = pd.read_parquet(source)
    if frame_fingerprint(on_disk) != fingerprint:
        raise ValueError(
            f"the frame passed to run_experiment is not the audited table at {source}: the "
            "in-memory frame changed after it was loaded. Reload it with load_model_table() "
            "instead of editing it, so the run records the data it really trained on."
        )
    return fingerprint, True


def load_model_table(data_dir: Path = DATA_DIR) -> tuple[pd.DataFrame, dict[str, Any]]:
    """Read the CP2 table and metadata, verify the stored checksum, and validate the contract.

    The table is the evidence for a run's metrics, so a byte that changed after notebook 03 wrote
    it stops the run instead of producing a number that describes an unknown table.
    """
    processed = Path(data_dir) / "processed"
    table_path = processed / MODEL_TABLE_FILE
    metadata_path = processed / MODEL_TABLE_METADATA_FILE
    if not table_path.exists() or not metadata_path.exists():
        raise FileNotFoundError(f"Missing CP2 output under {processed}. Run notebook 03 first.")
    metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
    recorded = metadata.get("table_sha256")
    if not recorded:
        raise ValueError(f"{metadata_path} records no table_sha256; rebuild the table first")
    actual = sha256(table_path)
    if actual != recorded:
        raise ValueError(
            f"{table_path.name} changed since it was written: {actual} != {recorded}. "
            "Rebuild it with notebook 03 before training on it."
        )
    table = pd.read_parquet(table_path)
    if metadata.get("table_rows") != len(table):
        raise ValueError(
            f"{table_path.name} holds {len(table)} rows but its metadata says "
            f"{metadata.get('table_rows')}"
        )
    _validate_table(table, metadata)
    return table, metadata


def chronological_split(
    table: pd.DataFrame,
    metadata: dict[str, Any],
    *,
    validation_start: str | pd.Timestamp = DEFAULT_VALIDATION_START,
    test_start: str | pd.Timestamp = DEFAULT_TEST_START,
) -> tuple[dict[str, pd.DataFrame], dict[str, Any]]:
    """Cut eligible rows into train/validation/test with a full-horizon gap at both boundaries.

    `temporal_split` in `evaluation/splits.py` is a two-way cut with an origin-only gap, which
    cannot express the validation band nor prove `max(target_valid_at) < min(next origin)`. This
    function does both and refuses an empty split: a window with no rows would otherwise be read as
    a metric of `NaN` instead of a configuration error.
    """
    target = metadata["target"]
    target_valid = metadata["target_valid_column"]
    horizon = int(metadata["horizon_hours"])
    validation_start, test_start = _utc(validation_start), _utc(test_start)
    if validation_start >= test_start:
        raise ValueError(
            f"validation_start {validation_start} must precede test_start {test_start}"
        )
    if "eligible" not in table.columns:
        raise ValueError("table has no eligible column; rebuild it with notebook 03")
    if table["valid_at"].duplicated().any():
        raise ValueError("table has duplicate origin timestamps")

    eligible = table["eligible"].astype(bool)
    origin = table["valid_at"]
    masks = {
        "train": eligible & (origin < validation_start - pd.Timedelta(hours=horizon)),
        "validation": eligible
        & (origin >= validation_start)
        & (origin < test_start - pd.Timedelta(hours=horizon)),
        "test": eligible & (origin >= test_start),
    }
    splits = {}
    for name, mask in masks.items():
        frame = table.loc[mask]
        if frame.empty:
            raise ValueError(
                f"{name} split is empty ({int(mask.sum())} of {len(table)} rows). Check the split "
                "boundaries against the table's origin span."
            )
        splits[name] = frame

    boundaries = (
        ("train", "validation", validation_start),
        ("validation", "test", test_start),
    )
    for earlier, later, boundary in boundaries:
        last_label = splits[earlier][target_valid].max()
        first_origin = splits[later]["valid_at"].min()
        if not last_label < first_origin:
            raise ValueError(
                f"the {horizon} h gap is not respected at {boundary.date()}: the last {earlier} "
                f"label is {last_label} but the first {later} origin is {first_origin}"
            )

    def window(frame: pd.DataFrame) -> dict[str, Any]:
        return {
            "rows": int(len(frame)),
            "first_origin_utc": frame["valid_at"].min().isoformat(),
            "last_origin_utc": frame["valid_at"].max().isoformat(),
            "first_target_valid_utc": frame[target_valid].min().isoformat(),
            "last_target_valid_utc": frame[target_valid].max().isoformat(),
        }

    windows = {
        "gap_hours": horizon,
        "rule": (
            f"train origin < validation_start - {horizon} h; validation origin in "
            f"[validation_start, test_start - {horizon} h); test origin >= test_start. Eligible "
            "rows inside either gap are dropped on purpose so no label crosses a boundary."
        ),
        "validation_start_utc": validation_start.isoformat(),
        "test_start_utc": test_start.isoformat(),
        "splits": {name: window(frame) for name, frame in splits.items()},
        "dropped_in_gap": {
            "before_validation": int(
                (
                    eligible
                    & (origin >= validation_start - pd.Timedelta(hours=horizon))
                    & (origin < validation_start)
                ).sum()
            ),
            "before_test": int(
                (
                    eligible
                    & (origin >= test_start - pd.Timedelta(hours=horizon))
                    & (origin < test_start)
                ).sum()
            ),
        },
        "ineligible_rows": int((~eligible).sum()),
        # Reported so a level shift between splits is visible next to the metrics. A tree cannot
        # predict above its training range, and hiding that here would make the scores look odd
        # without a stated reason.
        "target_distribution_ug_m3": {
            name: {
                "min": _finite_or_none(frame[target].min()),
                "p50": _finite_or_none(frame[target].median()),
                "max": _finite_or_none(frame[target].max()),
                "mean": _finite_or_none(frame[target].mean()),
            }
            for name, frame in splits.items()
        },
    }
    return splits, windows


def seasonal_mean_predictions(
    train: pd.DataFrame, frame: pd.DataFrame, target: str
) -> tuple[np.ndarray, dict[str, int]]:
    """Baseline B: mean of the train target per (month, hour), with train-only fallbacks.

    This is deliberately *not* the product methodology's baseline B. That one is the CAMS forecast
    as issued before `t`, and the snapshot has no `issued_at`, so it cannot be reconstructed. This
    baseline is a seasonal mean fitted on train rows only: changing any validation or test value
    cannot move it, and a (month, hour) group the train rows never showed falls back to that
    month's train mean, then to the overall train mean.
    """
    by_month_hour = train.groupby(["month", "hour"], dropna=True)[target].mean()
    by_month = train.groupby("month", dropna=True)[target].mean()
    overall = float(train[target].mean())
    if not np.isfinite(overall):
        raise ValueError("the train split has no finite target mean; baseline B cannot be fitted")

    index = pd.MultiIndex.from_arrays([frame["month"], frame["hour"]], names=["month", "hour"])
    prediction = by_month_hour.reindex(index).to_numpy(dtype="float64").copy()
    source = np.full(len(frame), "month_hour", dtype=object)
    from_month = np.isnan(prediction)
    prediction[from_month] = frame.loc[from_month, "month"].map(by_month).to_numpy(dtype="float64")
    source[from_month] = "month"
    from_overall = np.isnan(prediction)
    prediction[from_overall] = overall
    source[from_overall] = "overall"
    counts = {name: int((source == name).sum()) for name in ("month_hour", "month", "overall")}
    return prediction, counts


def _predict(model, features: pd.DataFrame) -> np.ndarray:
    """Predict with the early-stopped iteration, stated explicitly rather than left to a default."""
    best = model.best_iteration
    num_iteration = int(best) if best is not None and best > 0 else None
    return np.asarray(model.predict(features, num_iteration=num_iteration), dtype="float64")


def _metric_row(
    *,
    split: str,
    period: str,
    variant: str,
    features: list[str],
    y_true: np.ndarray,
    y_pred: np.ndarray,
) -> dict[str, Any]:
    usable = ~(np.isnan(y_true) | np.isnan(y_pred))
    events = event_precision_recall(y_true, y_pred, EVENT_THRESHOLD_UG_M3)
    return {
        "split": split,
        "period": period,
        "variant": variant,
        "label": VARIANT_LABELS[variant],
        "features_n": len(features),
        "n": int(usable.sum()),
        "mae": mae(y_true, y_pred),
        "rmse": rmse(y_true, y_pred),
        "event_threshold_ug_m3": EVENT_THRESHOLD_UG_M3,
        "event_precision": events["precision"],
        "event_recall": events["recall"],
        "event_support": events["support"],
    }


def _calendar_periods(frame: pd.DataFrame) -> list[tuple[str, np.ndarray]]:
    labels = frame["valid_at"].dt.strftime("%Y-%m")
    return [(str(label), (labels == label).to_numpy()) for label in sorted(labels.unique())]


def _json_report(payload: dict[str, Any]) -> str:
    """Report text with `null` for every undefined number, written with `allow_nan=False`."""
    return json.dumps(payload, indent=2, allow_nan=False) + "\n"


def _recorded_settings(report: dict[str, Any]) -> dict[str, Any]:
    """Every setting a stored report says it ran with; reuse compares all of them.

    The feature allowlists, the target and the horizon belong here as much as the split bounds do:
    dropping a feature from an allowlist and then reading the old run back would hand out a model
    that answers a different question under the new call's configuration.
    """
    lightgbm = report.get("lightgbm") or {}
    data = report.get("data") or {}
    splits = report.get("splits") or {}
    return {
        "validation_start_utc": splits.get("validation_start_utc"),
        "test_start_utc": splits.get("test_start_utc"),
        "max_rounds": lightgbm.get("max_rounds"),
        "early_stopping_rounds": lightgbm.get("early_stopping_rounds"),
        "params": lightgbm.get("params"),
        "target": report.get("target"),
        "target_valid_column": report.get("target_valid_column"),
        "horizon_hours": report.get("horizon_hours"),
        "feature_allowlists": report.get("feature_allowlists"),
        "frame_sha256": data.get("frame_sha256"),
    }


RUN_FILES = ("report.json", "metrics.csv", "test_predictions.parquet")
PREDICTION_COLUMNS = (
    "valid_at",
    "target_valid_at",
    "target",
    *(f"pred_{key}" for key in VARIANT_ORDER),
)


def _verify_finished_run(
    output_dir: Path,
    report: dict[str, Any],
    results: pd.DataFrame,
    predictions: pd.DataFrame,
) -> None:
    """Refuse a run directory that is incomplete or whose files contradict one another.

    The metrics, the holdout predictions and the per-variant models are one artifact. A deleted
    model file or a hand-edited csv would otherwise be handed back as the finished run, so the
    files are checked against each other before any of them is returned.
    """
    missing = [name for name in RUN_FILES if not (output_dir / name).is_file()]
    for key in VARIANTS:
        missing += [
            f"{key}/{name}"
            for name in ("model.txt", "metadata.json")
            if not (output_dir / key / name).is_file()
        ]
    if missing:
        raise ValueError(
            f"{output_dir} is not a complete run: missing {sorted(missing)}. Delete the run or use "
            "a new version."
        )
    recorded_models = report.get("artifacts") or {}
    for key in VARIANTS:
        recorded_hash = (recorded_models.get(key) or {}).get("model_sha256")
        if not recorded_hash:
            raise ValueError(
                f"{output_dir}/report.json records no checksum for {key}/model.txt; rebuild the "
                "run."
            )
        actual_hash = sha256(output_dir / key / "model.txt")
        if actual_hash != recorded_hash:
            raise ValueError(
                f"{output_dir}/{key}/model.txt does not match the checksum the report records "
                f"({actual_hash} != {recorded_hash}); rebuild the run."
            )
    absent = sorted(set(PREDICTION_COLUMNS) - set(predictions.columns))
    if absent:
        raise ValueError(
            f"{output_dir}/test_predictions.parquet is missing {absent}; rebuild the run."
        )
    expected_rows = (report.get("evaluation_rows") or {}).get("test")
    if expected_rows is None or len(predictions) != int(expected_rows):
        raise ValueError(
            f"{output_dir}/test_predictions.parquet holds {len(predictions)} rows but the report "
            f"says {expected_rows}; rebuild the run."
        )
    recorded_test = (report.get("metrics") or {}).get("test") or {}
    for key in VARIANT_ORDER:
        rows = results[
            (results["split"] == "test")
            & (results["period"] == "all")
            & (results["variant"] == key)
        ]
        if len(rows) != 1:
            raise ValueError(
                f"{output_dir}/metrics.csv must hold exactly one test/all row for {key}, found "
                f"{len(rows)}; rebuild the run."
            )
        row = rows.iloc[0]
        reported = recorded_test.get(key) or {}
        for field in ("n", "mae", "rmse"):
            if field not in reported or float(row[field]) != float(reported[field]):
                raise ValueError(
                    f"{output_dir} contradicts itself on {key} test {field}: metrics.csv says "
                    f"{float(row[field])!r}, report.json says {reported.get(field)!r}. Rebuild the "
                    "run."
                )
        target_values = predictions["target"].to_numpy(dtype="float64")
        predicted = predictions[f"pred_{key}"].to_numpy(dtype="float64")
        for field, metric in (("mae", mae), ("rmse", rmse)):
            # Recomputed from the stored floats, so it has to match bit for bit: a hand-edited csv
            # row or a prediction file from another run cannot pass.
            if float(metric(target_values, predicted)) != float(row[field]):
                raise ValueError(
                    f"{output_dir}/test_predictions.parquet does not reproduce the {field} that "
                    f"{output_dir}/metrics.csv claims for {key}; rebuild the run."
                )
        validation = results[
            (results["split"] == "validation")
            & (results["period"] == "all")
            & (results["variant"] == key)
        ]
        if key not in VARIANTS:
            # A and B are reference baselines: they are scored in the csv and the predictions file
            # but write no model artifact of their own.
            continue
        meta_path = output_dir / key / "metadata.json"
        meta = json.loads(meta_path.read_text(encoding="utf-8"))
        recorded = {
            "version": meta.get("version"),
            "features": meta.get("features"),
            "data_sha256": meta.get("data_sha256"),
            "code_sha256": meta.get("code_sha256"),
            "best_iteration": meta.get("best_iteration"),
            "model_sha256": meta.get("model_sha256"),
            "metrics": meta.get("metrics"),
        }
        expected_meta = {
            "version": key,
            "features": report["feature_allowlists"][key],
            "data_sha256": report["data"]["table_sha256"],
            "code_sha256": report["code"]["module_sha256"]["pavana_ml.models.experiment"],
            "best_iteration": report["lightgbm"]["best_iteration"][key],
            "model_sha256": recorded_models[key]["model_sha256"],
            "metrics": {
                "mae": float(row["mae"]),
                "rmse": float(row["rmse"]),
                "n": int(row["n"]),
                "validation_mae": float(validation.iloc[0]["mae"]),
            },
        }
        if recorded != expected_meta:
            differing = sorted(
                name for name in expected_meta if recorded.get(name) != expected_meta[name]
            )
            raise ValueError(
                f"{meta_path} disagrees with the run report on {differing}; rebuild the run."
            )


def _load_finished_run(
    output_dir: Path,
    metadata: dict[str, Any],
    module_sha256: dict[str, str],
    expected: dict[str, Any],
) -> dict[str, Any]:
    """Read a finished run back when it describes this code, this frame and these settings.

    A run that was trained on other split boundaries, other feature allowlists, more rounds or other
    parameters answers a different question. Handing its metrics back under the new call would make
    a report match a configuration it never ran, so every recorded setting is compared, and the
    directory itself is checked for completeness and self-consistency, before anything is returned.
    """
    report = json.loads((output_dir / "report.json").read_text(encoding="utf-8"))
    recorded_table = report.get("data", {}).get("table_sha256")
    if not recorded_table or recorded_table != metadata.get("table_sha256"):
        raise ValueError(
            f"{output_dir} was built from table {recorded_table!r}, not from the metadata given "
            f"({metadata.get('table_sha256')!r}). Delete the run or use a new version."
        )
    if report.get("code", {}).get("module_sha256") != module_sha256:
        raise ValueError(
            f"{output_dir} was produced by different experiment code. Delete the run or use a new "
            "version instead of reading stale results."
        )
    actual = _recorded_settings(report)
    mismatched = {
        key: {"recorded": actual.get(key), "requested": value}
        for key, value in expected.items()
        if actual.get(key) != value
    }
    if mismatched:
        raise ValueError(
            f"{output_dir} was run with different settings: {mismatched}. Delete the run or use a "
            "new version."
        )
    # `round_trip` keeps the metrics exactly as written: the default CSV parser can move a float by
    # one ulp, which would make a reused run's numbers differ from the stored file.
    results = pd.read_csv(output_dir / "metrics.csv", float_precision="round_trip")
    predictions = pd.read_parquet(output_dir / "test_predictions.parquet")
    _verify_finished_run(output_dir, report, results, predictions)
    return {
        "results": results,
        "test_predictions": predictions,
        "output_dir": output_dir,
        "report": report,
    }


def run_experiment(
    table: pd.DataFrame,
    metadata: dict[str, Any],
    *,
    validation_start: str | pd.Timestamp = DEFAULT_VALIDATION_START,
    test_start: str | pd.Timestamp = DEFAULT_TEST_START,
    max_rounds: int = DEFAULT_MAX_ROUNDS,
    output_dir: Path | str | None = None,
    version: str | None = None,
    early_stopping_rounds: int = DEFAULT_EARLY_STOPPING_ROUNDS,
    params: dict[str, Any] | None = None,
    if_exists: str = "raise",
) -> dict[str, Any]:
    """Train the C/D/E ladder, score A/B/C/D/E on the same test rows, and write one run artifact.

    `params` is merged over `EXPERIMENT_PARAMS`, so the seed or the thread count can be overridden
    while every value still lands in the report. `if_exists="reuse"` reads a finished run back when
    it was built by this exact frame, this exact code and these exact settings — the target, the
    horizon, the feature allowlists and the frame fingerprint included — and only when the run
    directory is complete and its own files agree with each other; the default refuses to touch an
    existing directory, because reusing a version silently is how a report stops matching its
    numbers.
    """
    if max_rounds < 1:
        raise ValueError("max_rounds must be positive")
    if if_exists not in {"raise", "reuse"}:
        raise ValueError(f"if_exists must be 'raise' or 'reuse', got {if_exists!r}")
    allowlists = _validate_table(table, metadata)
    frame_sha256, frame_source_verified = _verified_frame_fingerprint(table, metadata)
    target, target_valid = metadata["target"], metadata["target_valid_column"]
    horizon = int(metadata["horizon_hours"])
    resolved_params = {**EXPERIMENT_PARAMS, **(params or {})}
    module_sha256 = experiment_module_sha256()
    requested = {
        "validation_start_utc": _utc(validation_start).isoformat(),
        "test_start_utc": _utc(test_start).isoformat(),
        "max_rounds": max_rounds,
        "early_stopping_rounds": early_stopping_rounds,
        "params": {key: _finite_or_none(value) for key, value in resolved_params.items()},
        "target": target,
        "target_valid_column": target_valid,
        "horizon_hours": horizon,
        "feature_allowlists": {key: list(allowlists[key]) for key in VARIANTS},
        "frame_sha256": frame_sha256,
    }

    if version is None:
        version = (
            Path(output_dir).name
            if output_dir is not None
            else f"cams-t6h-retro-{datetime.now(UTC):%Y%m%dT%H%M%SZ}"
        )
    resolved_dir = Path(output_dir) if output_dir is not None else Path(ARTIFACTS_DIR) / version
    if resolved_dir.exists():
        if if_exists != "reuse":
            raise FileExistsError(
                f"{resolved_dir} already exists. Runs are immutable: pick a new version, or pass "
                "if_exists='reuse' to read the finished run."
            )
        return _load_finished_run(resolved_dir, metadata, module_sha256, requested)

    splits, windows = chronological_split(
        table, metadata, validation_start=validation_start, test_start=test_start
    )
    y_true = {name: frame[target].to_numpy(dtype="float64") for name, frame in splits.items()}
    predictions: dict[str, dict[str, np.ndarray]] = {}
    models: dict[str, Any] = {}
    feature_columns: dict[str, list[str]] = {"A": BASELINE_A_FEATURES, "B": []}

    # Baseline A: persistence of the CAMS model field, `pred(t+6) = CAMS(t)`. Retrospective only.
    predictions["A"] = {
        name: frame["cams_pm25_ug_m3"].to_numpy(dtype="float64") for name, frame in splits.items()
    }
    # Baseline B: train-only month/hour means. Fitted on train rows for every split it scores.
    predictions["B"], fallback_counts = {}, {}
    for name, frame in splits.items():
        prediction, counts = seasonal_mean_predictions(splits["train"], frame, target)
        predictions["B"][name], fallback_counts[name] = prediction, counts

    best_iterations: dict[str, int | None] = {}
    for key in VARIANTS:
        columns = allowlists[key]
        feature_columns[key] = columns
        model = lgbm.train(
            splits["train"][columns],
            splits["train"][target],
            params=resolved_params,
            num_boost_round=max_rounds,
            valid=(splits["validation"][columns], splits["validation"][target]),
            early_stopping_rounds=early_stopping_rounds,
        )
        models[key] = model
        best_iterations[key] = int(model.best_iteration) if model.best_iteration else None
        predictions[key] = {name: _predict(model, frame[columns]) for name, frame in splits.items()}

    # Fair comparison: one row set for everything. A variant that cannot score a test row would
    # shrink its own sample and make its metrics incomparable, so it fails the run instead.
    for key in VARIANT_ORDER:
        test_prediction = predictions[key]["test"]
        unusable = int((~np.isfinite(test_prediction)).sum())
        if test_prediction.shape[0] != len(splits["test"]) or unusable:
            raise ValueError(
                f"variant {key} produced {unusable} unusable test prediction(s); every variant "
                "must score the identical eligible test rows"
            )

    rows: list[dict[str, Any]] = []
    for split_name in ("train", "validation", "test"):
        for key in VARIANT_ORDER:
            rows.append(
                _metric_row(
                    split=split_name,
                    period="all",
                    variant=key,
                    features=feature_columns[key],
                    y_true=y_true[split_name],
                    y_pred=predictions[key][split_name],
                )
            )
    for period, mask in _calendar_periods(splits["test"]):
        for key in VARIANT_ORDER:
            rows.append(
                _metric_row(
                    split="test",
                    period=period,
                    variant=key,
                    features=feature_columns[key],
                    y_true=y_true["test"][mask],
                    y_pred=predictions[key]["test"][mask],
                )
            )
    results = pd.DataFrame(rows)

    validation_mae = {
        key: float(
            results.loc[
                (results["split"] == "validation") & (results["variant"] == key), "mae"
            ].iloc[0]
        )
        for key in VARIANTS
    }
    selected = min(VARIANTS, key=lambda key: (validation_mae[key], len(allowlists[key]), key))

    test_summary = {
        key: {
            field: _finite_or_none(value)
            for field, value in results.loc[
                (results["split"] == "test")
                & (results["period"] == "all")
                & (results["variant"] == key)
            ][
                [
                    "n",
                    "mae",
                    "rmse",
                    "event_precision",
                    "event_recall",
                    "event_support",
                    "features_n",
                ]
            ]
            .iloc[0]
            .items()
        }
        for key in VARIANT_ORDER
    }
    test_predictions = pd.DataFrame(
        {
            "valid_at": splits["test"]["valid_at"].to_numpy(),
            "target_valid_at": splits["test"][target_valid].to_numpy(),
            "target": y_true["test"],
            **{f"pred_{key}": predictions[key]["test"] for key in VARIANT_ORDER},
        }
    )

    metadata_path = metadata.get("metadata_path")
    report: dict[str, Any] = {
        "experiment": "retrospective CAMS t+6h ablation (CP3)",
        "version": version,
        "run_dir": str(resolved_dir),
        "created_at_utc": datetime.now(UTC).isoformat(timespec="seconds"),
        "target": target,
        "target_kind": metadata["target_kind"],
        "target_statement": metadata.get("target_statement"),
        "horizon_hours": horizon,
        "target_valid_column": target_valid,
        "splits": windows,
        "variants": {key: VARIANT_LABELS[key] for key in VARIANT_ORDER},
        "feature_allowlists": {key: allowlists[key] for key in VARIANTS},
        "feature_counts": {key: len(allowlists[key]) for key in VARIANTS},
        "lightgbm": {
            "params": {key: _finite_or_none(value) for key, value in resolved_params.items()},
            "max_rounds": max_rounds,
            "early_stopping_rounds": early_stopping_rounds,
            "early_stopping_metric": "validation MAE",
            "best_iteration": best_iterations,
            "device": "cpu",
            "imputation": "none; LightGBM keeps NaN and no scaler is fitted",
        },
        "selection_rule": SELECTION_RULE,
        "selected_variant": selected,
        "selected_on": "validation MAE",
        "validation_mae": {key: _finite_or_none(validation_mae[key]) for key in VARIANTS},
        "baselines": {
            "A": "persistence: pred(t+6) = CAMS(t), the model field at the origin hour",
            "B": (
                "mean of the train target per (month, hour), fallbacks: that month's train mean, "
                "then the overall train mean"
            ),
            "B_is_not_the_issue_time_baseline": (
                "The product methodology's baseline B is the CAMS forecast as issued before t. The "
                "snapshot has no issued_at, so it cannot be reconstructed and is NOT run here. "
                "This B is a train-only seasonal mean and is not comparable to an issued "
                "forecast."
            ),
            "issue_time_baseline_run": False,
            "b_fallback_rows": fallback_counts,
        },
        "event_metric": {
            "threshold_ug_m3": EVENT_THRESHOLD_UG_M3,
            "standard": EVENT_THRESHOLD_STANDARD,
            "meaning": (
                "precision/recall on hours whose CAMS model-field value reaches the threshold. It "
                "is not a station AQI category and not a health warning; the model field is not an "
                "observed concentration."
            ),
        },
        "calendar_breakdown_rule": CALENDAR_BREAKDOWN_RULE,
        "evaluation_rows": {
            "identical_for_all_variants": True,
            "note": (
                "every variant is scored on the same eligible rows; a variant that cannot score "
                "one of them fails the run"
            ),
            "test": int(len(splits["test"])),
            "train_is_in_sample": True,
        },
        "metrics": {"test": test_summary},
        "data": {
            "table_path": metadata.get("table_path"),
            "table_sha256": metadata.get("table_sha256"),
            # The file checksum names the audited parquet; this fingerprint names the frame that was
            # actually trained on, and `frame_source_verified` says whether the two were compared.
            "frame_sha256": frame_sha256,
            "frame_source_verified": frame_source_verified,
            "table_rows": int(len(table)),
            "metadata_path": metadata_path,
            "metadata_sha256": (
                sha256(Path(metadata_path))
                if metadata_path and Path(metadata_path).exists()
                else None
            ),
            "table_built_at_utc": metadata.get("built_at_utc"),
            "snapshot": (metadata.get("inputs") or {}).get("snapshot"),
            "feature_code_sha256": metadata.get("feature_code_sha256"),
            "feature_module_sha256": metadata.get("feature_module_sha256"),
        },
        "code": {
            "module_sha256": module_sha256,
            "git_commit": lgbm.git_commit(),
            "package_versions": {
                "python": platform.python_version(),
                "pandas": pd.__version__,
                "numpy": np.__version__,
                "lightgbm": lgbm.lightgbm_version(),
            },
        },
        "status": {
            "evaluated": True,
            "research_only": True,
            "operational_ready": False,
            "observation_validated": False,
            "statement": (
                "Scored on a retrospective holdout of the CAMS model field. The model has never "
                "been compared against observed station PM2.5, so it must not be served by the app "
                "and must not be described as validated or operational."
            ),
        },
        "limitations": [*LIMITATIONS, *RUN_LIMITATIONS],
    }
    assert_credential_free(report)

    staging = resolved_dir.parent / f".{resolved_dir.name}.partial"
    if staging.exists():
        shutil.rmtree(staging)
    staging.mkdir(parents=True)
    saved_models: dict[str, dict[str, str]] = {}
    try:
        (staging / "metrics.csv").write_text(results.to_csv(index=False), encoding="utf-8")
        test_predictions.to_parquet(staging / "test_predictions.parquet", index=False)
        for key in VARIANTS:
            test_row = results.loc[
                (results["split"] == "test")
                & (results["period"] == "all")
                & (results["variant"] == key)
            ].iloc[0]
            meta = lgbm.ArtifactMeta(
                version=key,
                target=target,
                features=allowlists[key],
                train_window=(
                    windows["splits"]["train"]["first_origin_utc"],
                    windows["splits"]["train"]["last_origin_utc"],
                ),
                test_window=(
                    windows["splits"]["test"]["first_origin_utc"],
                    windows["splits"]["test"]["last_origin_utc"],
                ),
                metrics={
                    "mae": float(test_row["mae"]),
                    "rmse": float(test_row["rmse"]),
                    "n": int(test_row["n"]),
                    "validation_mae": float(validation_mae[key]),
                },
                evaluated=True,
                git_commit=report["code"]["git_commit"],
                notes=(
                    f"{VARIANT_LABELS[key]}. Target is the CAMS model field at t+{horizon} h: "
                    "retrospective research, not station validation."
                ),
                target_kind=metadata["target_kind"],
                validation_window=(
                    windows["splits"]["validation"]["first_origin_utc"],
                    windows["splits"]["validation"]["last_origin_utc"],
                ),
                data_sha256=metadata.get("table_sha256"),
                code_sha256=module_sha256["pavana_ml.models.experiment"],
                params={key_: _finite_or_none(value) for key_, value in resolved_params.items()},
                best_iteration=best_iterations[key],
            )
            saved = lgbm.save_artifact(models[key], meta, root=staging)
            # The checksum of the file that was just written, so reuse can prove the model it hands
            # back is the model this report describes instead of only that a path exists.
            saved_models[key] = {"model_sha256": sha256(saved / "model.txt")}
        report["artifacts"] = saved_models
        (staging / "report.json").write_text(_json_report(report), encoding="utf-8")
        if resolved_dir.exists():  # a run appeared while this one was training
            raise FileExistsError(f"{resolved_dir} appeared while the run was training")
        staging.rename(resolved_dir)
    except BaseException:
        shutil.rmtree(staging, ignore_errors=True)
        raise

    return {
        "results": results,
        "test_predictions": test_predictions,
        "output_dir": resolved_dir,
        "report": report,
    }


def run_summary(report: dict[str, Any]) -> dict[str, Any]:
    """Small dict for a notebook or a log line: what ran, on what, and under which status."""
    return {
        "version": report["version"],
        "run_dir": report["run_dir"],
        "target": report["target"],
        "target_kind": report["target_kind"],
        "selected_variant": report["selected_variant"],
        "selected_on": report["selected_on"],
        "splits": {name: part["rows"] for name, part in report["splits"]["splits"].items()},
        "table_sha256": report["data"]["table_sha256"],
        "status": report["status"],
    }


def artifact_status(root: Path = ARTIFACTS_DIR) -> list[dict[str, Any]]:
    """Every `*/<variant>/metadata.json` under `root`, with the app-ready verdict.

    A run directory keeps its models one level down and has no top-level `metadata.json`, so
    `latest_evaluated_artifact` does not pick one up. Even when pointed straight at these files,
    `is_app_ready` refuses them: a holdout score against a model field is not station validation.
    """
    found = []
    for metadata_path in sorted(Path(root).glob("*/*/metadata.json")):
        meta = json.loads(metadata_path.read_text(encoding="utf-8"))
        found.append(
            {
                "path": str(metadata_path.parent),
                "version": meta.get("version"),
                "target": meta.get("target"),
                "target_kind": meta.get("target_kind"),
                "evaluated": meta.get("evaluated"),
                "research_only": meta.get("research_only"),
                "operational_ready": meta.get("operational_ready"),
                "observation_validated": meta.get("observation_validated"),
                "app_ready": lgbm.is_app_ready(meta),
            }
        )
    return found


__all__ = [
    "CALENDAR_BREAKDOWN_RULE",
    "DEFAULT_MAX_ROUNDS",
    "DEFAULT_TEST_START",
    "DEFAULT_VALIDATION_START",
    "EVENT_THRESHOLD_UG_M3",
    "EXPERIMENT_PARAMS",
    "SELECTION_RULE",
    "VARIANT_LABELS",
    "VARIANT_ORDER",
    "VARIANTS",
    "artifact_status",
    "chronological_split",
    "experiment_module_sha256",
    "frame_fingerprint",
    "load_model_table",
    "run_experiment",
    "run_summary",
    "seasonal_mean_predictions",
]
