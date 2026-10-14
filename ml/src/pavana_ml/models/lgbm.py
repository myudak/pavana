"""LightGBM regression wrapper with versioned artifacts.

An artifact = model file + metadata.json (features, data window, split, metrics on holdout,
git commit). The API may only expose a model whose metadata has `evaluated: true`.
"""

import json
import subprocess
from dataclasses import asdict, dataclass, field
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import pandas as pd

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


def train(
    x_train: pd.DataFrame,
    y_train: pd.Series,
    params: dict[str, Any] | None = None,
    num_boost_round: int = 500,
):
    import lightgbm as lgb  # heavy import kept local

    ds = lgb.Dataset(x_train, label=y_train)
    return lgb.train({**DEFAULT_PARAMS, **(params or {})}, ds, num_boost_round=num_boost_round)


def _git_commit() -> str | None:
    try:
        return subprocess.check_output(["git", "rev-parse", "HEAD"], text=True).strip()
    except Exception:
        return None


def save_artifact(model, meta: ArtifactMeta, root: Path = ARTIFACTS_DIR) -> Path:
    out = root / meta.version
    out.mkdir(parents=True, exist_ok=False)
    model.save_model(str(out / "model.txt"))
    meta.git_commit = meta.git_commit or _git_commit()
    (out / "metadata.json").write_text(json.dumps(asdict(meta), indent=2), encoding="utf-8")
    return out


def latest_evaluated_artifact(root: Path = ARTIFACTS_DIR) -> Path | None:
    """Most recent artifact whose metadata says it was evaluated on a holdout."""
    candidates = sorted(p for p in root.glob("*/metadata.json"))
    for meta_path in reversed(candidates):
        if json.loads(meta_path.read_text(encoding="utf-8")).get("evaluated") is True:
            return meta_path.parent
    return None
