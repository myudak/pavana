"""Source validation for the immutable six-booster data snapshot."""

import json
from pathlib import Path

import numpy as np
import pandas as pd
import requests

from .research import DATASET_MANIFEST_SHA256, DATASET_REVISION, MANIFEST_PATHS, REPO_ID, sha256

WEATHER_COLUMNS = ("precip_mm", "rh_min_pct", "tmax_c", "wind_max_ms", "vpd_max_kpa")


def weather_audit(folder: Path, expected_points: list[tuple[float, float]]) -> dict:
    manifest = json.loads((folder / "manifest.json").read_text())
    for name in ("weather_daily.parquet", "grid_land.parquet"):
        if manifest["files"].get(name) != sha256(folder / name):
            raise ValueError(f"Weather checksum mismatch: {name}")
    df = pd.read_parquet(folder / "weather_daily.parquet")
    required = ["date", "point_lat", "point_lon", *WEATHER_COLUMNS]
    if any(c not in df for c in required):
        raise ValueError("Weather cache columns incomplete")
    frame_audit(df, "weather")
    if df.duplicated(["date", "point_lat", "point_lon"]).any():
        raise ValueError("Duplicate weather point/day")
    points = set(zip(df.point_lat, df.point_lon, strict=True))
    if points != set(expected_points):
        raise ValueError("Weather coordinates do not match the land grid")
    df["date"] = pd.to_datetime(df.date)
    days = pd.date_range(manifest["params"]["start_date"], manifest["params"]["end_date"], freq="D")
    if len(df) != len(days) * len(points) or set(df.date) != set(days):
        raise ValueError("Weather dates/point coverage incomplete")
    numeric = df[list(WEATHER_COLUMNS)]
    if np.isinf(numeric.to_numpy()).any():
        raise ValueError("Infinite weather value")
    complete = numeric.notna().all(axis=1).groupby(df.date).sum() == len(points)
    if not complete.any():
        raise ValueError("No complete weather day across the grid")
    return {
        "rows": len(df),
        "points": len(points),
        "requestedStart": str(days.min().date()),
        "requestedEnd": str(days.max().date()),
        "effectiveEnd": str(complete[complete].index.max().date()),
        "missingByColumn": {k: int(v) for k, v in numeric.isna().sum().items()},
        "source": "Open-Meteo historical archive, default model blend (models not specified)",
        "manifestSha256": sha256(folder / "manifest.json"),
    }


def pinned_hf_file(relative: str, cache_dir: Path) -> Path:
    """Fetch one allowlisted input and verify both its bytes and the pinned HF manifest."""
    cache_dir.mkdir(parents=True, exist_ok=True)
    base = f"https://huggingface.co/datasets/{REPO_ID}/resolve/{DATASET_REVISION}"
    manifest_path = cache_dir / "hf-manifest.json"
    if not manifest_path.exists():
        response = requests.get(f"{base}/manifest.json", timeout=120)
        response.raise_for_status()
        manifest_path.write_bytes(response.content)
    if sha256(manifest_path) != DATASET_MANIFEST_SHA256:
        raise ValueError("Pinned HF manifest checksum mismatch")
    entries = {e["path"]: e for e in json.loads(manifest_path.read_text())["files"]}
    destination = cache_dir / Path(relative).name
    if not destination.exists():
        response = requests.get(f"{base}/{relative}", timeout=300)
        response.raise_for_status()
        destination.write_bytes(response.content)
    if sha256(destination) != entries[relative]["sha256"]:
        raise ValueError(f"Pinned HF checksum mismatch: {relative}")
    return destination


def pinned_cams(out_dir: Path, cache_dir: Path) -> tuple[Path, dict]:
    """Only required HF files, checked against the pinned manifest before use."""
    paths = {
        name: pinned_hf_file(MANIFEST_PATHS[name], cache_dir)
        for name in ("cams", "cams_provenance")
    }
    df = pd.read_parquet(paths["cams"])
    if df.duplicated("valid_at").any() or not df.valid_at.is_monotonic_increasing:
        raise ValueError("CAMS timestamps are duplicated or unsorted")
    if len(df[["lat", "lon"]].drop_duplicates()) != 1 or (df.pm25_ug_m3.dropna() < 0).any():
        raise ValueError("CAMS must be one physical, nonnegative reference series")
    out = out_dir / "cams.parquet"
    df.to_parquet(out, index=False)
    provenance = json.loads(paths["cams_provenance"].read_text())
    if provenance["kind"] != "model":
        raise ValueError("CAMS is not an observation")
    provenance.update(
        {
            "hfRevision": DATASET_REVISION,
            "manifestSha256": DATASET_MANIFEST_SHA256,
            "sourceSha256": sha256(paths["cams"]),
            "start": df.valid_at.min().isoformat(),
            "end": df.valid_at.max().isoformat(),
            "missingPm25": int(df.pm25_ug_m3.isna().sum()),
            "seriesCoordinates": df[["lat", "lon"]].iloc[0].to_dict(),
        }
    )
    return out, provenance


def frame_audit(df: pd.DataFrame, name: str) -> dict:
    """Refuse corrupt identity/units while retaining and counting ordinary missing fields."""
    identities = {
        "firms": ["lat", "lon", "acquired_at"],
        "metar": ["station", "valid_at"],
        "cams": ["valid_at"],
        "weather": ["date", "point_lat", "point_lon"],
        "land": ["cell"],
    }
    key = identities[name]
    if df.empty or df[key].isna().any().any() or df.duplicated(key).any():
        raise ValueError(f"{name}: empty, missing or duplicate identity")
    if np.isinf(df.select_dtypes(include="number").to_numpy(dtype=float, na_value=np.nan)).any():
        raise ValueError(f"{name}: infinite value")
    ranges = {
        "lat": (-90, 90),
        "lon": (-180, 180),
        "point_lat": (-90, 90),
        "point_lon": (-180, 180),
        "rh_pct": (0, 100.01),
        "rh_min_pct": (0, 100.01),
        "wind_dir_from_deg": (0, 360),
    }
    for column, (lo, hi) in ranges.items():
        if column in df and not df[column].dropna().between(lo, hi).all():
            raise ValueError(f"{name}: invalid {column}")
    for column in ("pm25_ug_m3", "wind_speed_ms", "vsby_km", "precip_mm", "wind_max_ms"):
        if column in df and (df[column].dropna() < 0).any():
            raise ValueError(f"{name}: negative {column}")
    time_column = next((c for c in ("valid_at", "acquired_at", "date") if c in df), None)
    times = pd.to_datetime(df[time_column], utc=True) if time_column else None
    return {
        "start": times.min().isoformat() if times is not None else None,
        "end": times.max().isoformat() if times is not None else None,
        "missingByColumn": {c: int(v) for c, v in df.isna().sum().items()},
        "groups": df.groupby("station").size().to_dict() if "station" in df else None,
    }
