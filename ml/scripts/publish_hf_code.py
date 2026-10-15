"""Publish the runnable code bundle so a cloud notebook can install it.

Run with `uv run --project ml --extra hub python ml/scripts/publish_hf_code.py` for a preview.
Only `--upload` writes to Hugging Face, and it only writes paths under `code/`; the dataset card,
the data manifest and every data file are left untouched.

The bundle is an allowlist, not a copy of the workspace: `.env`, caches, virtualenvs, local
artifacts, test output and the raw data are never candidates. `CODE_MANIFEST.json` is generated
from the exact bytes that are uploaded, so a cloud runtime can verify what it downloaded.

Direct writes to `main` are not allowed for this account, so the bundle reaches the Hub through a
pull request. Data PR #5 was merged by the repository owner on 2026-10-15; a later upload that
belongs to an open PR can target its ref with `--revision refs/pr/<n>`. Nothing here merges.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from datetime import UTC, datetime
from pathlib import Path

from pavana_ml.paths import ML_DIR

REPO_ID = "myudak/pavana"
CARD_DIR = ML_DIR / "huggingface"
CODE_DIR = CARD_DIR / "code"
DEFAULT_REVISION = "main"

# Notebooks a cloud runtime needs: the all-in-one runner plus the three stage notebooks it calls
# the same module APIs as. Explanatory notebooks (01, 05) and the BMKG deck stay out.
NOTEBOOKS = (
    "00_cloud_setup.ipynb",
    "02_data_sources.ipynb",
    "03_feature_engineering.ipynb",
    "04_baselines_and_lightgbm.ipynb",
)
FORBIDDEN_TOP_LEVEL = {".env", ".venv", "artifacts", "data", "tests", "uv.lock"}
FORBIDDEN_ANY_PART = {".venv", "__pycache__", ".ipynb_checkpoints"}
DEFAULT_DESCRIPTION = (
    "Code only: `pyproject.toml`, the `pavana_ml` modules and the cloud notebooks under "
    "`code/`.\n\n"
    "- No data, credentials, caches or local artifacts are included; the data stays where it is.\n"
    "- The target of the experiment is the **CAMS model-field PM2.5 at t+6 h**, not observed "
    "station PM2.5. This is not station validation and not proof of operational skill.\n"
    "- Models stay `research_only: true`, `operational_ready: false`, `observation_validated: "
    "false`. Nothing here is servable by the app.\n"
    "- Notebook `00_cloud_setup.ipynb` is the all-in-one Colab/Kaggle runner; it installs this "
    "bundle at a pinned revision and verifies every file against `code/CODE_MANIFEST.json`.\n"
    "- The notebook keeps installing the pinned code revision "
    "`a9a0d6d98008e08e80d6e978d82cfc89f79282af`, which is the revision the recorded runs were "
    "produced from. Later commits on this pull request only refresh documentation.\n\n"
    "What has been verified:\n\n"
    "- A real **Kaggle** run (kernel `muhamadkemalfaza/pavana`, run `cams-t6h-retro-kaggle-v1`) "
    "reproduced the local 6 882 test predictions bit-for-bit, RMSE exactly and MAE to within 1 "
    "ulp; only `upwind_score` moved (3.6e-16 relative, float summation order). **Colab has not "
    "been run.**\n"
    "- Holdout MAE in µg/m³, identical test rows for every variant: A persistence 14.39 · B "
    "train-only month/hour mean 25.42 · C 21.58 · D 20.75 · E 20.89. Persistence wins and the "
    "hotspot/upwind groups add nothing material; reported as found, not tuned.\n"
    "- Pinned data revision used by the notebook: "
    "`aaa0d2714102b7d3a7b3ad0beb2b1da1ce6a6dbe` (unchanged by this commit)."
)


def bundle_files() -> dict[str, Path]:
    """Map repository paths in the Hub dataset to local files, refusing anything off-allowlist."""
    files: dict[str, Path] = {"code/README.md": CODE_DIR / "README.md"}
    files["code/ml/pyproject.toml"] = ML_DIR / "pyproject.toml"
    files["code/ml/README.md"] = ML_DIR / "README.md"
    for source in sorted((ML_DIR / "src" / "pavana_ml").rglob("*.py")):
        files[f"code/ml/{source.relative_to(ML_DIR).as_posix()}"] = source
    for name in NOTEBOOKS:
        files[f"code/ml/notebooks/{name}"] = ML_DIR / "notebooks" / name

    missing = sorted(path for path in files.values() if not path.is_file())
    if missing:
        raise FileNotFoundError(f"The bundle is incomplete: {missing}")
    leaked = sorted(
        hub_path
        for hub_path in files
        if not hub_path.startswith("code/ml/") and hub_path != "code/README.md"
    )
    if leaked:
        raise ValueError(f"Refusing to publish outside code/: {leaked}")
    outside = sorted(
        hub_path
        for hub_path, path in files.items()
        if path.relative_to(ML_DIR).parts[0] in FORBIDDEN_TOP_LEVEL
        or FORBIDDEN_ANY_PART.intersection(path.relative_to(ML_DIR).parts)
    )
    if outside:
        raise ValueError(f"Refusing to publish local state: {outside}")
    return files


def describe(hub_path: str, source: Path) -> dict:
    digest = hashlib.sha256(source.read_bytes()).hexdigest()
    return {"path": hub_path, "bytes": source.stat().st_size, "sha256": digest}


def build_manifest(files: dict[str, Path]) -> dict:
    return {
        "schema_version": 1,
        "repo_id": REPO_ID,
        "kind": "code bundle",
        "prepared_at_utc": datetime.now(UTC).isoformat(),
        "notes": [
            "This manifest describes the files in the revision it is read at.",
            "The code revision and the data revision are separate pins; record both in a run.",
            "Install the bundle itself; it carries no data, no credentials and no local artifacts.",
        ],
        "files": [describe(hub_path, path) for hub_path, path in sorted(files.items())],
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--upload", action="store_true")
    parser.add_argument(
        "--create-pr", action="store_true", help="open a pull request with this commit"
    )
    parser.add_argument("--revision", default=DEFAULT_REVISION)
    parser.add_argument(
        "--message",
        default="Add runnable code bundle for Colab/Kaggle (research-only experiment)",
    )
    parser.add_argument("--description", default=DEFAULT_DESCRIPTION)
    args = parser.parse_args()

    files = bundle_files()
    manifest = build_manifest(files)
    CODE_DIR.mkdir(parents=True, exist_ok=True)
    manifest_path = CODE_DIR / "CODE_MANIFEST.json"
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n")
    print(
        json.dumps(
            {
                "files": len(files) + 1,
                "bytes": sum(path.stat().st_size for path in files.values()),
                "local_manifest": str(manifest_path),
                "sample": sorted(files)[:4],
            },
            indent=2,
        )
    )
    if not args.upload:
        print("Preview only. Re-run with --upload to commit under code/.")
        return

    from huggingface_hub import CommitOperationAdd, HfApi

    api = HfApi()
    operations = [CommitOperationAdd(path_in_repo=k, path_or_fileobj=p) for k, p in files.items()]
    operations.append(
        CommitOperationAdd(path_in_repo="code/CODE_MANIFEST.json", path_or_fileobj=manifest_path)
    )
    result = api.create_commit(
        repo_id=REPO_ID,
        repo_type="dataset",
        revision=args.revision,
        operations=operations,
        commit_message=args.message,
        commit_description=args.description,
        create_pr=args.create_pr,
    )
    print(
        json.dumps(
            {
                "commit": result.oid,
                "url": result.commit_url,
                "pr": result.pr_url,
                "revision": args.revision,
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
