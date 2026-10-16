"""LightGBM regression wrapper with versioned artifacts.

An artifact = model file + metadata.json (features, data window, split, metrics on holdout,
git commit, and the checksum of the model file it describes). `evaluated: true` only says the
artifact was scored on a holdout. It does **not** say the numbers came from observations, and it
does not make the model servable: a research model that predicts a CAMS model field is evaluated
and still has `observation_validated: false` and `operational_ready: false`. Anything that serves a
model must check `is_app_ready`, which also requires an observed `target_kind` — see
`pavana_ml.models.experiment` for the run that produces such artifacts.
"""

import json
import subprocess
from dataclasses import asdict, dataclass, field
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import pandas as pd

from ..data.research import sha256
from ..paths import ARTIFACTS_DIR

DEFAULT_PARAMS: dict[str, Any] = {
    "objective": "regression_l1",
    "learning_rate": 0.05,
    "num_leaves": 31,
    "min_data_in_leaf": 50,
    "feature_fraction": 0.9,
    "verbosity": -1,
}


@dataclass
class ArtifactMeta:
    version: str
    target: str
    features: list[str]
    train_window: tuple[str, str]
    test_window: tuple[str, str]
    metrics: dict[str, float]
    evaluated: bool
    git_commit: str | None = None
    notes: str = ""
    created_at: str = field(default_factory=lambda: datetime.now(UTC).isoformat())
    # Status fields default to the conservative reading: a holdout score against a model field is
    # not station validation, so an artifact must opt in explicitly to be considered servable.
    target_kind: str = "unknown"
    validation_window: tuple[str, str] | None = None
    research_only: bool = True
    operational_ready: bool = False
    observation_validated: bool = False
    data_sha256: str | None = None
    code_sha256: str | None = None
    params: dict[str, Any] = field(default_factory=dict)
    best_iteration: int | None = None
    # Written by `save_artifact` from the file it just saved, so a replaced or truncated model.txt
    # can be told apart from the model the metadata describes.
    model_sha256: str | None = None


def train(
    x_train: pd.DataFrame,
    y_train: pd.Series,
    params: dict[str, Any] | None = None,
    num_boost_round: int = 500,
    *,
    valid: tuple[pd.DataFrame, pd.Series] | None = None,
    early_stopping_rounds: int | None = None,
):
    """Fit a booster. With `valid`, early stopping watches the validation split, never the test."""
    import lightgbm as lgb  # heavy import kept local

    ds = lgb.Dataset(x_train, label=y_train)
    valid_sets: list[Any] = []
    callbacks: list[Any] = []
    if valid is not None:
        valid_sets.append(lgb.Dataset(valid[0], label=valid[1], reference=ds))
        if early_stopping_rounds:
            callbacks.append(lgb.early_stopping(early_stopping_rounds, verbose=False))
    return lgb.train(
        {**DEFAULT_PARAMS, **(params or {})},
        ds,
        num_boost_round=num_boost_round,
        valid_sets=valid_sets,
        callbacks=callbacks,
    )


def git_commit() -> str | None:
    try:
        return subprocess.check_output(["git", "rev-parse", "HEAD"], text=True).strip()
    except Exception:
        return None


def lightgbm_version() -> str | None:
    try:
        import lightgbm
    except ImportError:
        return None
    return str(lightgbm.__version__)


# Only a target that is an observation can make a model servable. A CAMS model field, a reanalysis
# series, a fixture and an unknown kind are all refused, so a hand-edited metadata.json that merely
# flips the two status flags still cannot turn a research artifact into an app model.
OBSERVED_TARGET_KINDS = frozenset({"observation"})


def is_app_ready(meta: dict[str, Any]) -> bool:
    """Whether the app may serve this artifact.

    Every condition is required on purpose. `evaluated` alone is satisfied by a research run scored
    against a model field, and `target_kind` is checked too: a model-field target says nothing about
    observed air quality, whatever the status flags claim.
    """
    return (
        meta.get("evaluated") is True
        and meta.get("observation_validated") is True
        and meta.get("operational_ready") is True
        and meta.get("target_kind") in OBSERVED_TARGET_KINDS
    )


def save_artifact(model, meta: ArtifactMeta, root: Path = ARTIFACTS_DIR) -> Path:
    """Write `model.txt` and its metadata, with the checksum of the file that was written.

    The checksum is taken after saving, so every reader can prove the model file still is the one
    the metadata describes instead of trusting that the path exists.
    """
    out = root / meta.version
    out.mkdir(parents=True, exist_ok=False)
    model.save_model(str(out / "model.txt"))
    meta.git_commit = meta.git_commit or git_commit()
    meta.model_sha256 = sha256(out / "model.txt")
    (out / "metadata.json").write_text(json.dumps(asdict(meta), indent=2), encoding="utf-8")
    return out


def latest_evaluated_artifact(root: Path = ARTIFACTS_DIR) -> Path | None:
    """Most recent artifact whose metadata says it was evaluated on a holdout.

    This is not a statement about the app. A CAMS-target research artifact is `evaluated: true`
    and still must not be served; check `is_app_ready` before anything exposes it. Only
    `*/metadata.json` is searched, so a run directory that keeps its models in `C/`, `D/`, `E/`
    subdirectories is not returned here by accident.
    """
    candidates = sorted(p for p in root.glob("*/metadata.json"))
    for meta_path in reversed(candidates):
        if json.loads(meta_path.read_text(encoding="utf-8")).get("evaluated") is True:
            return meta_path.parent
    return None


def latest_app_ready_artifact(root: Path = ARTIFACTS_DIR) -> Path | None:
    """Most recent artifact that may be served: evaluated on observations, on an observed target."""
    candidates = sorted(p for p in root.glob("*/metadata.json"))
    for meta_path in reversed(candidates):
        if is_app_ready(json.loads(meta_path.read_text(encoding="utf-8"))):
            return meta_path.parent
    return None


def is_servable_experimental(meta: dict[str, Any]) -> bool:
    """Whether the app may serve this artifact as an *experimental* model (policy 2026-10-16).

    Requires an observed target, a holdout evaluation and an explicit experimental label; the UI
    must show it as "eksperimental". It does not claim operational readiness (`is_app_ready`).
    CAMS-target research artifacts never qualify.
    """
    return (
        (meta.get("evaluated") is True)
        and (meta.get("experimental") is True)
        and (meta.get("target_kind", meta.get("targetKind")) in OBSERVED_TARGET_KINDS)
    )
