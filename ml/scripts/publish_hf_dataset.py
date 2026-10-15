"""Publish an explicit data allowlist; default to a local manifest preview.

Run with `uv run --project ml --extra hub python ml/scripts/publish_hf_dataset.py`.
Only --upload writes to Hugging Face. Existing remote files are retained.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from datetime import UTC, datetime
from pathlib import Path

import pandas as pd

from pavana_ml.paths import DATA_DIR, ML_DIR

REPO_ID = "myudak/pavana"
CARD_DIR = ML_DIR / "huggingface"
LEGACY_FILES = [
    "data_kualitas_udara.csv",
    "hotspot_kalimantan_2024_terbaru.csv",
    "MODIS_SP_Kalimantan_2024_terbaru.csv",
    "VIIRS_SNPP_SP_Kalimantan_2024_terbaru.csv",
    "VIIRS_NOAA20_SP_Kalimantan_2024_terbaru.csv",
    "VIIRS_NOAA21_SP_Kalimantan_2024_terbaru.csv",
]


def data_files() -> dict[str, Path]:
    files: dict[str, Path] = {}
    for prefix in ("raw/firms", "raw/open_meteo", "processed"):
        for p in sorted((DATA_DIR / prefix).iterdir()):
            allowed = (
                p.suffix == ".csv"
                if prefix == "raw/firms"
                else p.suffix == ".parquet" or p.name.endswith(".provenance.json")
                if prefix == "raw/open_meteo"
                else p.name == "hotspot_kalimantan.parquet"
            )
            if p.is_file() and allowed:
                files[p.relative_to(DATA_DIR).as_posix()] = p
    for stem, folder in (
        ("pm25_observasi_kalimantan", "pm25"),
        ("prakiraan_cuaca_kalimantan", "prakiraan"),
    ):
        for suffix in (".csv", ".parquet"):
            files[f"{folder}/{stem}{suffix}"] = DATA_DIR / f"{stem}{suffix}"
    for p in sorted((DATA_DIR / "raw").glob("forecast_*.json")):
        if p.name != "forecast_checkpoint.json":
            files[f"prakiraan/raw/{p.name}"] = p
    for p in sorted(DATA_DIR.glob("DataIklimBulanan_*.xlsx")):
        files[f"data-online/{p.name}"] = p
    for p in sorted(DATA_DIR.glob("*_Data_Iklim_Bulanan_*.pdf")):
        period = p.stem.split("_Data_Iklim_Bulanan_", 1)[1]
        files[f"data-online/metadata_{period}.pdf"] = p
    if not files or any(not p.is_file() for p in files.values()):
        raise FileNotFoundError("The local dataset is incomplete; nothing was uploaded.")
    return files


def describe(path: str, source: Path) -> dict:
    with source.open("rb") as stream:
        digest = hashlib.file_digest(stream, "sha256").hexdigest()
    entry = {
        "path": path,
        "bytes": source.stat().st_size,
        "sha256": digest,
    }
    if source.suffix in {".csv", ".parquet"}:
        df = pd.read_parquet(source) if source.suffix == ".parquet" else pd.read_csv(source)
        entry.update(rows=len(df), columns=list(df.columns))
        for time_col in ("valid_at", "valid_at_utc", "acquired_at"):
            if time_col in df:
                ts = pd.to_datetime(df[time_col], utc=True)
                entry["time_column"] = time_col
                entry["start_utc"] = ts.min().isoformat()
                entry["end_utc"] = ts.max().isoformat()
                break
        else:
            if {"acq_date", "acq_time"}.issubset(df.columns):
                ts = pd.to_datetime(
                    df["acq_date"] + " " + df["acq_time"].astype(str).str.zfill(4),
                    format="%Y-%m-%d %H%M",
                    utc=True,
                )
                entry.update(start_utc=ts.min().isoformat(), end_utc=ts.max().isoformat())
    return entry


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--upload", action="store_true")
    parser.add_argument("--create-pr", action="store_true")
    args = parser.parse_args()
    from huggingface_hub import CommitOperationAdd, HfApi

    files = data_files()
    manifest = {
        "schema_version": 1,
        "repo_id": REPO_ID,
        "prepared_at_utc": datetime.now(UTC).isoformat(),
        "target_kind": "CAMS model field; retrospective experiment, not station validation",
        "legacy_files_excluded_from_pipeline": LEGACY_FILES,
        "notes": [
            "Checksums identify these cached bytes, not the time of provider publication.",
            "FIRMS CSV batches do not carry per-request fetch timestamps.",
            "Source-specific provenance sidecars accompany Open-Meteo data.",
        ],
        "files": [describe(path, p) for path, p in files.items()],
    }
    CARD_DIR.mkdir(parents=True, exist_ok=True)
    manifest_path = CARD_DIR / "manifest.json"
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n")
    print(json.dumps({"files": len(files), "bytes": sum(p.stat().st_size for p in files.values())}))
    if not args.upload:
        print(f"Preview only: {manifest_path}")
        return
    if not (CARD_DIR / "README.md").is_file():
        raise FileNotFoundError("Review ml/huggingface/README.md before uploading.")
    api = HfApi()
    head = api.dataset_info(REPO_ID).sha
    operations = [CommitOperationAdd(path_in_repo=k, path_or_fileobj=p) for k, p in files.items()]
    operations += [
        CommitOperationAdd(path_in_repo=name, path_or_fileobj=CARD_DIR / name)
        for name in ("README.md", "manifest.json")
    ]
    result = api.create_commit(
        repo_id=REPO_ID,
        repo_type="dataset",
        parent_commit=head,
        operations=operations,
        create_pr=args.create_pr,
        commit_message="Update cached Kalimantan data and document provenance",
    )
    print(json.dumps({"commit": result.oid, "url": result.commit_url, "pr": result.pr_url}))


if __name__ == "__main__":
    main()
