"""Shared run contracts: strict JSON, immutable inputs and purged temporal holdouts."""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pandas as pd

from ..data.research import _jsonable, sha256


def write_json(path: Path, value: object) -> None:
    path.write_text(
        json.dumps(_jsonable(value), allow_nan=False, separators=(",", ":")), encoding="utf-8"
    )


def verify_snapshot(data_dir: Path, required: set[str] | None = None) -> dict:
    snapshot = json.loads((data_dir / "snapshot.json").read_text(encoding="utf-8"))
    if required and not required.issubset(snapshot["files"]):
        raise ValueError("Snapshot is missing required source files")
    for name, info in snapshot["files"].items():
        path = (data_dir / info["path"]).resolve()
        if path.parent != data_dir.resolve() or sha256(path) != info["sha256"]:
            raise ValueError(f"Snapshot checksum/path mismatch: {name}")
        frame = pd.read_parquet(path)
        if len(frame) != info["rows"] or frame.empty:
            raise ValueError(f"Snapshot row count mismatch: {name}")
    return snapshot


def temporal_parts(
    table: pd.DataFrame,
    time: str,
    horizon_h: int,
    train_end: str,
    valid_end: str,
    test_end: str,
) -> dict[str, pd.DataFrame]:
    """Split by origin AND target: no label crosses any inclusive split end."""
    t = pd.to_datetime(table[time], utc=True)
    target = t + pd.Timedelta(hours=horizon_h)
    ends = [pd.Timestamp(x, tz="UTC") for x in (train_end, valid_end, test_end)]
    return {
        "train": table[target <= ends[0]],
        "valid": table[(t > ends[0]) & (target <= ends[1])],
        "test": table[(t > ends[1]) & (target <= ends[2])],
    }


def common_cohort(y: np.ndarray, predictions: dict[str, np.ndarray]) -> np.ndarray:
    keep = np.isfinite(y).all(axis=1) if y.ndim > 1 else np.isfinite(y)
    for p in predictions.values():
        keep &= np.isfinite(p).all(axis=1) if p.ndim > 1 else np.isfinite(p)
    if not keep.any():
        raise ValueError("No common finite evaluation rows for all methods")
    return keep


def windows(parts: dict[str, pd.DataFrame], time: str) -> dict[str, list[str]]:
    return {
        ("validation" if k == "valid" else k): [
            v[time].min().isoformat(),
            v[time].max().isoformat(),
        ]
        for k, v in parts.items()
    }
