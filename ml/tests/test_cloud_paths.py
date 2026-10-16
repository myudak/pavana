"""The writable-directory override has to take effect before anything imports `pavana_ml`.

Colab and Kaggle keep the checkout read-only and write under `/content` or `/kaggle/working`, so
`paths` reads `PAVANA_ML_DATA_DIR` and `PAVANA_ML_ARTIFACTS_DIR` at import time. These tests reload
the module with the variables set, then restore it, because a stale `DATA_DIR` bound into another
module is exactly the failure the override exists to prevent.
"""

from __future__ import annotations

import importlib

from pavana_ml import paths


def test_environment_overrides_move_every_derived_directory(tmp_path, monkeypatch):
    data = (tmp_path / "pavana-data").resolve()
    artifacts = (tmp_path / "pavana-artifacts").resolve()
    monkeypatch.setenv("PAVANA_ML_DATA_DIR", str(data))
    monkeypatch.setenv("PAVANA_ML_ARTIFACTS_DIR", str(artifacts))

    reloaded = importlib.reload(paths)
    try:
        assert reloaded.DATA_DIR == data
        assert reloaded.ARTIFACTS_DIR == artifacts
        assert reloaded.RAW_DIR == data / "raw"
        assert reloaded.INTERIM_DIR == data / "interim"
        assert reloaded.PROCESSED_DIR == data / "processed"
    finally:
        monkeypatch.delenv("PAVANA_ML_DATA_DIR")
        monkeypatch.delenv("PAVANA_ML_ARTIFACTS_DIR")
        importlib.reload(paths)


def test_without_the_overrides_the_directories_stay_inside_the_workspace(monkeypatch):
    monkeypatch.delenv("PAVANA_ML_DATA_DIR", raising=False)
    monkeypatch.delenv("PAVANA_ML_ARTIFACTS_DIR", raising=False)

    reloaded = importlib.reload(paths)
    try:
        assert reloaded.DATA_DIR == reloaded.ML_DIR / "data"
        assert reloaded.ARTIFACTS_DIR == reloaded.ML_DIR / "artifacts"
        assert reloaded.DATA_DIR.is_absolute()
    finally:
        importlib.reload(paths)
