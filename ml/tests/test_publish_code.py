"""The cloud code bundle is an allowlist, and an incomplete one must never be published.

These tests read the local workspace only: no network, no Hugging Face call. What they protect is
the boundary the PLAN calls out explicitly - the bundle may carry code and notebooks, never `.env`,
caches, virtualenvs, local artifacts, test output or the raw data.
"""

from __future__ import annotations

import importlib.util
from pathlib import Path

import pytest

MODULE_PATH = Path(__file__).resolve().parents[1] / "scripts" / "publish_hf_code.py"


def load_publisher():
    spec = importlib.util.spec_from_file_location("publish_hf_code", MODULE_PATH)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_the_bundle_carries_every_package_module_and_the_cloud_notebooks():
    publisher = load_publisher()
    files = publisher.bundle_files()

    assert all(hub_path.startswith("code/") for hub_path in files)
    assert "code/ml/pyproject.toml" in files
    assert "code/ml/README.md" in files
    assert "code/ml/notebooks/00_cloud_setup.ipynb" in files

    modules = {
        f"code/ml/{path.relative_to(publisher.ML_DIR).as_posix()}"
        for path in (publisher.ML_DIR / "src" / "pavana_ml").rglob("*.py")
    }
    assert modules <= set(files)


def test_the_bundle_never_carries_secrets_or_local_state():
    publisher = load_publisher()
    files = publisher.bundle_files()

    published = [path.relative_to(publisher.ML_DIR).parts for path in files.values()]
    assert not [hub_path for hub_path in files if Path(hub_path).name.startswith(".env")]
    assert not [parts for parts in published if parts[0] in {".env", ".venv", "data", "artifacts"}]
    assert not [parts for parts in published if {"tests", "__pycache__"} & set(parts)]


def test_the_manifest_lists_exactly_the_paths_that_are_published():
    publisher = load_publisher()
    files = publisher.bundle_files()
    manifest = publisher.build_manifest(files)

    assert {entry["path"] for entry in manifest["files"]} == set(files)
    assert manifest["repo_id"] == publisher.REPO_ID
    for entry in manifest["files"]:
        assert entry["bytes"] == files[entry["path"]].stat().st_size
        assert len(entry["sha256"]) == 64


def test_an_incomplete_bundle_is_refused_instead_of_published(monkeypatch):
    publisher = load_publisher()
    monkeypatch.setattr(publisher, "NOTEBOOKS", ("99_not_written_yet.ipynb",))

    with pytest.raises(FileNotFoundError, match="incomplete"):
        publisher.bundle_files()
