"""Validate, align and audit the cached research snapshot (CP1 owner).

Notebook `02_data_sources.ipynb` only calls this module and explains the result. Everything that
decides whether data may be used lives here so it can be tested without a notebook and without
network access.

What the sources are, and are not:

* `weather_*.parquet` — ERA5 **reanalysis** (`kind=reanalysis`). Model output constrained by
  observations, not a station reading, and not proof the value was available at prediction time.
* `cams_*.parquet` — CAMS global **model** field (`kind=model`) on the grid cell the API snapped
  to. It has no `issued_at`; `fetched_at` in the sidecar is when we downloaded it, not when the
  model ran, so it must never be presented as an issue time.
* `hotspot_kalimantan.parquet` — cached FIRMS detections. A detection is not a confirmed fire and
  a zero count is not proof of complete satellite coverage.

Outputs of `save_prepared` (see `ml/PLAN.md` CP1):

    ml/data/interim/hourly_aligned.parquet
    ml/data/interim/audit_report.json
"""

from __future__ import annotations

import hashlib
import json
import os
from collections.abc import Iterable
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd

from ..paths import DATA_DIR, ML_DIR

REPO_ID = "myudak/pavana"

# Pinned data revision. Experiments use this commit, never `main`, so results stay reproducible
# while PR #5 is still open.
DATASET_REVISION = "aaa0d2714102b7d3a7b3ad0beb2b1da1ce6a6dbe"

# sha256 of `manifest.json` at DATASET_REVISION. The tracked copy in `ml/huggingface/` was
# byte-identical on 2026-10-15; comparing it here is what lets the audit report name a revision
# for data that was not fetched through `download_snapshot`.
DATASET_MANIFEST_SHA256 = "8cf1a9494a1d8dffe3d2816b68909b5df79ab75eaf8cadbdfe880aef69af4787"

# Allowlist of snapshot files this pipeline consumes, keyed by the name used in the report.
# `raw/firms/*.csv` batches and the legacy CSVs on the Hub are deliberately excluded.
MANIFEST_PATHS = {
    "weather": "raw/open_meteo/weather_kubu_raya_sungai_raya_2024-01-01_2026-10-14.parquet",
    "weather_provenance": (
        "raw/open_meteo/weather_kubu_raya_sungai_raya_2024-01-01_2026-10-14.provenance.json"
    ),
    "cams": "raw/open_meteo/cams_kubu_raya_sungai_raya_2024-01-01_2026-10-14.parquet",
    "cams_provenance": (
        "raw/open_meteo/cams_kubu_raya_sungai_raya_2024-01-01_2026-10-14.provenance.json"
    ),
    "hotspots": "processed/hotspot_kalimantan.parquet",
    "bmkg_pm25": "pm25/pm25_observasi_kalimantan.parquet",
    "bmkg_weather": "prakiraan/prakiraan_cuaca_kalimantan.parquet",
}

# Local names for the two BMKG files. The Hub groups them under `pm25/` and `prakiraan/`; the
# working copy keeps them at the data root.
LOCAL_FALLBACKS = {
    "bmkg_pm25": "pm25_observasi_kalimantan.parquet",
    "bmkg_weather": "prakiraan_cuaca_kalimantan.parquet",
}

# Context-only sources: inventoried and described, never joined into the anchor series. The PM2.5
# file holds 21 hours for 9 separate stations; merging different stations into one series would
# invent a location that was never observed.
CONTEXT_SOURCES = {
    "bmkg_pm25": {
        "group_column": "stasiun_id",
        "role": "context only; not a historical training target",
        "note": (
            "Rows are per station across Kalimantan, not one series. Do not merge these stations "
            "into the CAMS/ERA5 anchor."
        ),
    },
    "bmkg_weather": {
        "group_column": "adm4",
        "role": "context only; not a historical training target",
        "note": "A single BMKG forecast run, not a 2024-2026 weather archive.",
    },
}

WEATHER_REQUIRED = (
    "valid_at",
    "temperature_c",
    "rh_pct",
    "precip_mm",
    "wind_speed_ms",
    "wind_dir_from_deg",
    "wind_gusts_ms",
    "surface_pressure_hpa",
    "boundary_layer_height_m",
    "shortwave_radiation_wm2",
    "lat",
    "lon",
)
CAMS_REQUIRED = ("valid_at", "pm25_ug_m3", "pm10_ug_m3", "lat", "lon")
HOTSPOT_REQUIRED = (
    "lat",
    "lon",
    "acquired_at",
    "frp_mw",
    "satellite",
    "instrument",
    "source_sensor",
    "processing",
)

EXPECTED_KIND = {"weather": "reanalysis", "cams": "model"}

# Values the instrument or model cannot produce at all. A violation is refused, because carrying
# it forward would corrupt every downstream aggregate.
IMPOSSIBLE_RANGES: dict[str, tuple[float | None, float | None]] = {
    "rh_pct": (0.0, 100.0),
    "precip_mm": (0.0, None),
    "wind_speed_ms": (0.0, None),
    "wind_gusts_ms": (0.0, None),
    "shortwave_radiation_wm2": (0.0, None),
    "boundary_layer_height_m": (0.0, None),
    "pm25_ug_m3": (0.0, None),
    "pm10_ug_m3": (0.0, None),
    "frp_mw": (0.0, None),
    "surface_pressure_hpa": (300.0, 1100.0),
    "wind_dir_from_deg": (0.0, 360.0),
}

# Physically possible but far outside this location's recorded range. Counted into the audit
# report and kept: the plan forbids trimming or winsorising extremes without a stated reason.
EXTREME_RANGES: dict[str, tuple[float | None, float | None]] = {
    "temperature_c": (-5.0, 45.0),
    "surface_pressure_hpa": (950.0, 1050.0),
    "boundary_layer_height_m": (None, 4000.0),
    "shortwave_radiation_wm2": (None, 1400.0),
    "wind_speed_ms": (None, 30.0),
    "wind_gusts_ms": (None, 50.0),
    "precip_mm": (None, 150.0),
    "pm25_ug_m3": (None, 500.0),
    "pm10_ug_m3": (None, 600.0),
}

HOTSPOT_KEY = ("lat", "lon", "acquired_at", "satellite", "instrument")

# Columns only one FIRMS sensor family sends, and the one column only the SP archive carries.
# These alone may be read as a schema difference. Everything else that is empty for a whole
# sensor is left unexplained, because an empty `frp_mw` on a VIIRS group is a collection gap, not
# a schema difference — and treating it as schema is how a failed pull turns into "no fire".
HOTSPOT_EXCLUSIVE_COLUMNS = {
    "MODIS": ("brightness", "bright_t31_k", "confidence_pct"),
    "VIIRS": ("bright_ti4_k", "bright_ti5_k", "confidence_class"),
}
HOTSPOT_PROCESSING_EXCLUSIVE = {"SP": ("type",)}

# A coordinate outside WGS84 is not a place on Earth, so it is refused rather than carried.
COORDINATE_BOUNDS = {"lat": (-90.0, 90.0), "lon": (-180.0, 180.0)}

# Reported, never enforced: FIRMS tiles and the Open-Meteo requests were made for this extent, so a
# coordinate beyond it is a signal that the wrong area was requested, not an invalid value.
STUDY_EXTENT = {"lat": (-6.0, 8.0), "lon": (108.0, 120.0)}

# The FIRMS sensor mix changes on this date: the SP archive stops at 2026-07-31 and NRT takes
# over. Any level shift across it is confounded with the change of detector, so the audit reports
# it as a distribution probe instead of an air-quality event.
SENSOR_MIX_BOUNDARY = "2026-08-01"

LIMITATIONS = [
    "Retrospective CAMS-target research; not station validation and not operational prediction.",
    "ERA5 is reanalysis and CAMS is model output; neither proves availability at prediction time.",
    "The CAMS snapshot carries no issued_at, so no issue-time baseline can be reconstructed.",
    "Weather and CAMS each describe one returned grid cell, not all of Kalimantan.",
    "Hotspots are cached detections: not confirmed fires, and not a count of fire events.",
    "A zero detection count means no record in this cache; it is not proof of satellite coverage.",
    "Per-sensor collection completeness is unverified; NRT windows keep changing as they fill in.",
    "Acquisition time is not publication time; SP archive rows can arrive months later.",
    "boundary_layer_height_m is missing for 4368 hours and stays NaN; it is not interpolated.",
]


def sha256(path: Path) -> str:
    with Path(path).open("rb") as stream:
        return hashlib.file_digest(stream, "sha256").hexdigest()


def _finite(value: Any) -> float | None:
    """`null` for missing, never 0: an absent statistic must not read as a real measurement."""
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    return number if np.isfinite(number) else None


def _count(value: Any) -> int:
    return int(value)


def _jsonable(value: Any) -> Any:
    """Coerce numpy/pandas scalars so the report can be written with `allow_nan=False`."""
    if isinstance(value, dict):
        return {str(k): _jsonable(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [_jsonable(v) for v in value]
    if isinstance(value, (bool, np.bool_)):
        return bool(value)
    if isinstance(value, (int, np.integer)):
        return int(value)
    if isinstance(value, (float, np.floating)):
        return _finite(value)
    if isinstance(value, pd.Timestamp):
        return value.isoformat()
    if value is None or isinstance(value, str):
        return value
    return str(value)


def assert_credential_free(payload: Any) -> None:
    """Refuse to persist any configured secret.

    The report is committed as evidence, so a provider key that leaked into a sidecar or a path
    would be published permanently. Notebook 02 never prints a key, and this is the backstop.
    """
    names = ("FIRMS_MAP_KEY", "OPENAQ_API_KEY", "HF_TOKEN", "HUGGING_FACE_HUB_TOKEN")
    text = json.dumps(_jsonable(payload), allow_nan=False)
    leaked = [name for name in names if (os.getenv(name) or "") and os.environ[name] in text]
    if leaked:
        raise ValueError(f"Refusing to write a report containing credentials: {', '.join(leaked)}")


def download_snapshot(
    destination: Path,
    revision: str = DATASET_REVISION,
    include: Iterable[str] | None = None,
) -> Path:
    """Fetch the pinned snapshot and verify every consumed file against its manifest.

    `revision` is resolved to a commit once, and the manifest is read at that commit, so the file
    list cannot drift while the download runs. `destination` is the data root (files land under
    their Hub paths) and a `dataset_snapshot.json` receipt is written beside them.

    `include` narrows the download to specific manifest paths. A cloud runtime passes
    `MANIFEST_PATHS.values()` so the raw FIRMS batches and the context-only files stay on the Hub;
    those are not inputs to the model table. Every requested path must exist in the manifest at
    `revision`, and nothing outside the request is fetched. The default (`None`) keeps the original
    behaviour of fetching the whole manifest.
    """
    from huggingface_hub import HfApi, hf_hub_download

    destination = Path(destination)
    destination.mkdir(parents=True, exist_ok=True)
    api = HfApi()
    resolved = api.dataset_info(REPO_ID, revision=revision).sha
    manifest_path = Path(
        hf_hub_download(
            REPO_ID, "manifest.json", repo_type="dataset", revision=resolved, local_dir=destination
        )
    )
    manifest = json.loads(manifest_path.read_text())
    if manifest.get("repo_id") != REPO_ID:
        raise ValueError(f"Manifest belongs to {manifest.get('repo_id')!r}, not {REPO_ID!r}")
    entries = {entry["path"]: entry for entry in manifest.get("files", [])}
    missing = sorted(set(MANIFEST_PATHS.values()) - set(entries))
    if missing:
        raise ValueError(f"Manifest at {resolved} lacks required files: {missing}")
    requested = None if include is None else {str(path) for path in include}
    if requested is not None:
        unknown = sorted(requested - set(entries))
        if unknown:
            raise ValueError(f"Requested files are not in the manifest at {resolved}: {unknown}")

    verified: dict[str, str] = {}
    for entry in manifest["files"]:
        if requested is not None and entry["path"] not in requested:
            continue
        path = Path(
            hf_hub_download(
                REPO_ID,
                entry["path"],
                repo_type="dataset",
                revision=resolved,
                local_dir=destination,
            )
        )
        if sha256(path) != entry["sha256"]:
            raise ValueError(f"Checksum mismatch: {entry['path']}")
        if entry["path"] in MANIFEST_PATHS.values():
            verified[entry["path"]] = entry["sha256"]

    receipt = {
        "repo_id": REPO_ID,
        "requested_revision": revision,
        "resolved_revision": resolved,
        "manifest_sha256": sha256(manifest_path),
        "downloaded_at_utc": datetime.now(UTC).isoformat(timespec="seconds"),
        "requested_paths": None if requested is None else sorted(requested),
        "verified_files": verified,
    }
    (destination / "dataset_snapshot.json").write_text(json.dumps(receipt, indent=2) + "\n")
    return destination


def regular_hourly(df: pd.DataFrame, name: str) -> pd.DataFrame:
    """Require explicit UTC whole-hour keys, sort, and restore missing hours as NaN.

    Reindexing before any shift/rolling is what stops a gap from being read as 6 consecutive
    hours. Duplicate or naive timestamps are refused rather than silently reordered.
    """
    if "valid_at" not in df:
        raise ValueError(f"{name}: missing valid_at")
    ts = df["valid_at"]
    if not isinstance(ts.dtype, pd.DatetimeTZDtype) or str(ts.dt.tz) != "UTC":
        raise ValueError(f"{name}: valid_at must have an explicit UTC timezone")
    if ts.isna().any() or ts.duplicated().any():
        raise ValueError(f"{name}: missing or duplicate timestamps")
    if df.empty or (ts != ts.dt.floor("h")).any():
        raise ValueError(f"{name}: expected nonempty whole-hour timestamps")
    df = df.sort_values("valid_at").set_index("valid_at")
    index = pd.date_range(df.index.min(), df.index.max(), freq="h", tz="UTC", name="valid_at")
    return df.reindex(index).reset_index()


def _grid_identity(df: pd.DataFrame, name: str) -> dict[str, float]:
    """The single grid cell this source served. Not the coordinate that was requested."""
    cells = df[["lat", "lon"]].dropna().drop_duplicates()
    if len(cells) != 1:
        raise ValueError(
            f"{name}: expected exactly one returned grid cell, found {len(cells)}. "
            "Two cells cannot be merged into one series."
        )
    return {"lat": float(cells["lat"].iloc[0]), "lon": float(cells["lon"].iloc[0])}


def _expect_columns(df: pd.DataFrame, required: tuple[str, ...], name: str) -> None:
    missing = [column for column in required if column not in df.columns]
    if missing:
        raise ValueError(f"{name}: missing required columns {missing}")


def _numeric(series: pd.Series) -> pd.Series:
    """Numbers as float64; anything that is not a number becomes NaN rather than raising."""
    return pd.to_numeric(series, errors="coerce").astype("float64")


def _invalid_count(original: pd.Series, numeric: pd.Series) -> int:
    """Values that are neither a number nor missing: `inf`, `-inf`, or unparseable text.

    `NaN` is *not* counted: a missing value is missing, not impossible.
    """
    text_or_inf = int(np.isinf(numeric).sum()) + int((original.notna() & numeric.isna()).sum())
    return text_or_inf


def _range_report(
    series: dict[str, pd.Series], ranges: dict[str, tuple[float | None, float | None]]
) -> dict:
    """Count values outside a documented envelope, without altering the input."""
    report: dict[str, dict] = {}
    for column, (low, high) in ranges.items():
        values = series.get(column)
        if values is None:
            continue
        values = _numeric(values)
        outside = pd.Series(False, index=values.index)
        if low is not None:
            outside |= values < low
        if high is not None:
            outside |= values > high
        if outside.any():
            report[column] = {
                "count": _count(outside.sum()),
                "low": _finite(low),
                "high": _finite(high),
                "min_seen": _finite(values.min()),
                "max_seen": _finite(values.max()),
            }
    return report


def value_check(frame: pd.DataFrame, name: str, renames: dict[str, str] | None = None) -> dict:
    """Refuse non-finite and physically impossible values; report-but-keep merely extreme ones.

    `renames` maps a canonical range key onto the column that carries it after a merge, so the
    CAMS columns are still checked once they are named `cams_pm25_ug_m3`.
    """
    series = {c: frame[c] for c in frame.columns if c in IMPOSSIBLE_RANGES or c in EXTREME_RANGES}
    for canonical, actual in (renames or {}).items():
        series[canonical] = frame[actual]
    invalid: dict[str, int] = {}
    for column, values in series.items():
        count = _invalid_count(values, _numeric(values))
        if count:
            invalid[column] = count
    if invalid:
        raise ValueError(f"{name}: non-finite or non-numeric values {invalid}")
    violations = _range_report(series, IMPOSSIBLE_RANGES)
    if violations:
        raise ValueError(f"{name}: physically impossible values {sorted(violations)}")
    return _range_report(series, EXTREME_RANGES)


def coordinate_check(frame: pd.DataFrame, name: str) -> dict:
    """Refuse coordinates outside WGS84; report any that fall outside the requested extent.

    A missing coordinate is refused too: a row whose location is unknown cannot be placed, and
    silently dropping it would hide a parsing or collection failure.
    """
    missing = [c for c in COORDINATE_BOUNDS if c not in frame.columns]
    if missing:
        raise ValueError(f"{name}: missing coordinate columns {missing}")
    beyond_extent: dict[str, dict] = {}
    for column, (low, high) in COORDINATE_BOUNDS.items():
        values = _numeric(frame[column])
        outside = int(((values < low) | (values > high)).sum())
        unusable = int(values.isna().sum()) + int(np.isinf(values).sum())
        if outside or unusable:
            raise ValueError(
                f"{name}: {column} has {outside} value(s) outside WGS84 {low}..{high} and "
                f"{unusable} missing or non-finite value(s)"
            )
        extent_low, extent_high = STUDY_EXTENT[column]
        beyond = int(((values < extent_low) | (values > extent_high)).sum())
        if beyond:
            beyond_extent[column] = {
                "count": beyond,
                "study_extent": [extent_low, extent_high],
                "min_seen": _finite(values.min()),
                "max_seen": _finite(values.max()),
            }
    return beyond_extent


def _monthly_stats(values: pd.Series, timestamps: pd.Series) -> dict[str, dict]:
    """Per-calendar-month statistics in UTC. Missing months and missing values stay `null`."""
    grouped = values.groupby(timestamps.dt.strftime("%Y-%m"), dropna=False)
    out: dict[str, dict] = {}
    for period, block in grouped:
        out[str(period)] = {
            "n": _count(block.notna().sum()),
            "missing": _count(block.isna().sum()),
            "mean": _finite(block.mean()),
            "p50": _finite(block.median()),
            "p95": _finite(block.quantile(0.95)),
            "max": _finite(block.max()),
        }
    return out


def _schema_absent_candidates(block: pd.DataFrame) -> set[str]:
    """Columns this group cannot carry, because its sensor family or processing mode lacks them.

    Only columns that are exclusive to *another* family or processing mode qualify. A column both
    families send — `frp_mw` above all — can never be explained away as a schema difference, so an
    empty one stays visible as a gap.
    """
    families = {
        str(value).upper()
        for value in block.get("instrument", pd.Series(dtype="object")).dropna().unique()
    } & set(HOTSPOT_EXCLUSIVE_COLUMNS)
    if len(families) != 1:
        return set()
    candidates: set[str] = set()
    for family, columns in HOTSPOT_EXCLUSIVE_COLUMNS.items():
        if family not in families:
            candidates.update(columns)
    processings = {
        str(value) for value in block.get("processing", pd.Series(dtype="object")).dropna().unique()
    }
    for mode, columns in HOTSPOT_PROCESSING_EXCLUSIVE.items():
        if mode not in processings:
            candidates.update(columns)
    return candidates


def hotspot_null_origin(hotspots: pd.DataFrame, group_column: str = "source_sensor") -> dict:
    """Separate structural nulls from genuine gaps, using the sensor's known column contract.

    MODIS rows have no `bright_ti4_k`/`bright_ti5_k`/`confidence_class`, VIIRS rows have no
    `brightness`/`bright_t31_k`/`confidence_pct`, and only SP records carry `type`. Those columns
    are null for every row of the group because the sensor never sends them: `schema_absent`.

    Everything else that is null for a whole group is `all_null_unexplained` — an empty `frp_mw` is
    a collection failure, not a schema difference, and the two must not be conflated. A column null
    for *some* rows is `partial_null`. None of these counts may be summed as zero, because that
    would turn an uncollected hour into a clean one.
    """
    if group_column not in hotspots.columns:
        raise ValueError(f"hotspots: missing grouping column {group_column}")
    columns = [column for column in hotspots.columns if column != group_column]
    # A column empty across the whole frame cannot be explained by any single sensor's schema.
    null_everywhere = sorted(c for c in columns if hotspots[c].isna().all())
    groups: dict[str, dict] = {}
    for name, block in hotspots.groupby(group_column, dropna=False):
        candidates = _schema_absent_candidates(block)
        absent, partial, unexplained = [], {}, []
        for column in columns:
            if column in null_everywhere:
                continue
            nulls = _count(block[column].isna().sum())
            if nulls == len(block):
                (absent if column in candidates else unexplained).append(column)
            elif nulls:
                partial[column] = nulls
        groups[str(name)] = {
            "rows": len(block),
            "schema_absent": sorted(absent),
            "partial_null": partial,
            "all_null_unexplained": sorted(unexplained),
        }
    return {
        "group_column": group_column,
        "all_null_everywhere": null_everywhere,
        "groups": groups,
        "note": (
            "schema_absent is limited to columns the sensor family or processing mode does not "
            "send. Any other all-null column is all_null_unexplained, whose origin is unknown and "
            "may be a collection failure; partial_null is a gap inside a group. None of these may "
            "be summed as zero."
        ),
    }


def _sensor_coverage(hotspots: pd.DataFrame) -> dict[str, dict]:
    """Rows, period and month coverage per source sensor. NRT windows keep growing."""
    coverage: dict[str, dict] = {}
    for name, block in hotspots.groupby("source_sensor"):
        stamps = block["acquired_at"]
        coverage[str(name)] = {
            "rows": len(block),
            "first_acquired_utc": stamps.min().isoformat(),
            "last_acquired_utc": stamps.max().isoformat(),
            "distinct_days": _count(stamps.dt.date.nunique()),
            "distinct_months": _count(stamps.dt.strftime("%Y-%m").nunique()),
        }
    return coverage


def _snapshot_provenance(data_dir: Path, consumed: dict[str, Path]) -> dict:
    """Say where these bytes came from, and only claim a revision we actually verified."""
    manifest_path = data_dir / "manifest.json"
    manifest_source = "data directory"
    if not manifest_path.exists():
        manifest_path = ML_DIR / "huggingface" / "manifest.json"
        manifest_source = "tracked copy in ml/huggingface/"
    result: dict[str, Any] = {
        "repo_id": REPO_ID,
        "revision": None,
        "revision_verified": False,
        "revision_source": None,
        "manifest_path": str(manifest_path) if manifest_path.exists() else None,
        "manifest_sha256": None,
        "files": {},
        "reason": None,
    }
    checks = {
        name: {"sha256": sha256(path), "matches_manifest": None}
        for name, path in consumed.items()
        if path.exists()
    }
    result["files"] = checks
    if not manifest_path.exists():
        result["reason"] = "no manifest.json available; hashes recorded but origin unverified"
        return result

    digest = sha256(manifest_path)
    result["manifest_sha256"] = digest
    entries = {entry["path"]: entry for entry in json.loads(manifest_path.read_text())["files"]}
    for name, check in checks.items():
        entry = entries.get(MANIFEST_PATHS.get(name, ""))
        check["manifest_path"] = MANIFEST_PATHS.get(name)
        check["matches_manifest"] = bool(entry and entry["sha256"] == check["sha256"])
    all_match = all(check["matches_manifest"] for check in checks.values())

    receipt_path = data_dir / "dataset_snapshot.json"
    if receipt_path.exists():
        receipt = json.loads(receipt_path.read_text())
        if receipt.get("manifest_sha256") == digest and all_match:
            result["revision"] = receipt.get("resolved_revision")
            result["revision_verified"] = True
            result["revision_source"] = "download receipt"
            return result
        result["reason"] = "download receipt does not match the local manifest or file hashes"
        return result
    if digest == DATASET_MANIFEST_SHA256 and all_match:
        result["revision"] = DATASET_REVISION
        result["revision_verified"] = True
        result["revision_source"] = f"{manifest_source} pinned to DATASET_REVISION"
        return result
    result["reason"] = (
        "manifest is not the pinned revision or a consumed file differs from it; "
        "no revision is attached to these local bytes"
    )
    return result


def _source_entry(path: Path, frame: pd.DataFrame, kind: str, grid: dict | None = None) -> dict:
    entry: dict[str, Any] = {
        "path": str(path),
        "rows": len(frame),
        "columns": list(frame.columns),
        "kind": kind,
    }
    if grid:
        entry["grid"] = grid
    for column in ("valid_at", "valid_at_utc", "acquired_at"):
        if column not in frame.columns:
            continue
        stamps = pd.to_datetime(frame[column], utc=True, errors="coerce")
        if stamps.notna().any():
            entry["time_column"] = column
            entry["start_utc"] = stamps.min().isoformat()
            entry["end_utc"] = stamps.max().isoformat()
        break
    return entry


def _one(folder: Path, pattern: str) -> Path:
    matches = sorted(folder.glob(pattern))
    if len(matches) != 1:
        raise ValueError(
            f"Expected one {pattern} in {folder}, found {len(matches)}. Run notebook 02."
        )
    return matches[0]


def _locate_bmkg(data_dir: Path, name: str) -> Path | None:
    grouped = data_dir / MANIFEST_PATHS[name]
    if grouped.exists():
        return grouped
    fallback = data_dir / LOCAL_FALLBACKS[name]
    return fallback if fallback.exists() else None


def prepare_cached_data(data_dir: Path = DATA_DIR) -> tuple[pd.DataFrame, pd.DataFrame, dict]:
    """Validate and align cached ERA5/CAMS, audit hotspots, and describe every source.

    Reads only local files: no provider call, no credential, no network. Missing hours are
    restored as `NaN` before the join, and the CAMS target column is never filled or interpolated.
    """
    data_dir = Path(data_dir)
    folder = data_dir / "raw/open_meteo"
    weather_path = _one(folder, "weather_*.parquet")
    cams_path = _one(folder, "cams_*.parquet")
    hotspot_path = data_dir / MANIFEST_PATHS["hotspots"]
    paths = {"weather": weather_path, "cams": cams_path, "hotspots": hotspot_path}
    for name, path in paths.items():
        if not path.exists():
            raise ValueError(f"{name}: missing {path}. Fetch the snapshot or run notebook 02.")

    provenance: dict[str, dict] = {}
    for name, expected_kind in EXPECTED_KIND.items():
        sidecar = paths[name].with_suffix(".provenance.json")
        if not sidecar.exists():
            raise ValueError(f"{name}: missing provenance sidecar {sidecar.name}")
        provenance[name] = json.loads(sidecar.read_text())
        if provenance[name].get("kind") != expected_kind:
            raise ValueError(
                f"{name}: provenance kind must be {expected_kind!r}, "
                f"got {provenance[name].get('kind')!r}"
            )
        paths[f"{name}_provenance"] = sidecar

    weather_raw = pd.read_parquet(weather_path)
    cams_raw = pd.read_parquet(cams_path)
    hotspots = pd.read_parquet(hotspot_path)
    _expect_columns(weather_raw, WEATHER_REQUIRED, "weather")
    _expect_columns(cams_raw, CAMS_REQUIRED, "cams")
    _expect_columns(hotspots, HOTSPOT_REQUIRED, "hotspots")

    sources: dict[str, dict] = {}
    grids: dict[str, dict] = {}
    gaps: dict[str, dict] = {}
    for name, kind, raw in (
        ("weather", "reanalysis", weather_raw),
        ("cams", "model", cams_raw),
    ):
        grids[name] = _grid_identity(raw, name)
        sources[name] = _source_entry(paths[name], raw, kind, grids[name])
        sources[name]["provider"] = provenance[name].get("provider")
        sources[name]["dataset"] = provenance[name].get("dataset")
        sources[name]["fetched_at"] = provenance[name].get("fetched_at")
        sources[name]["requested_point"] = {
            "lat": provenance[name].get("lat"),
            "lon": provenance[name].get("lon"),
        }
        sources[name]["provenance_path"] = str(paths[f"{name}_provenance"])

    weather = regular_hourly(weather_raw, "weather")
    cams = regular_hourly(cams_raw, "cams")
    for name, frame in (("weather", weather), ("cams", cams)):
        gaps[name] = {
            "hours_present_in_file": sources[name]["rows"],
            "hours_in_span": len(frame),
            "hours_restored_as_nan": len(frame) - sources[name]["rows"],
        }
        # The grid cell identifies the series, not the hour: a restored gap must not erase it.
        frame["lat"], frame["lon"] = grids[name]["lat"], grids[name]["lon"]

    weather = weather.rename(columns={"lat": "weather_grid_lat", "lon": "weather_grid_lon"})
    cams = cams.rename(
        columns={
            "lat": "cams_grid_lat",
            "lon": "cams_grid_lon",
            "pm25_ug_m3": "cams_pm25_ug_m3",
            "pm10_ug_m3": "cams_pm10_ug_m3",
        }
    )
    hourly = weather.merge(cams, on="valid_at", how="inner", validate="one_to_one")
    if hourly.empty:
        raise ValueError("Weather/CAMS have no overlapping window")
    if not hourly["valid_at"].is_monotonic_increasing or not hourly["valid_at"].is_unique:
        raise ValueError("Aligned frame is not one row per timestamp in order")

    extremes = {
        "weather": value_check(weather_raw, "weather"),
        "cams": value_check(cams_raw, "cams"),
        "hotspots": value_check(hotspots, "hotspots"),
        "aligned": value_check(
            hourly,
            "aligned hourly data",
            renames={"pm25_ug_m3": "cams_pm25_ug_m3", "pm10_ug_m3": "cams_pm10_ug_m3"},
        ),
    }
    beyond_extent = {
        name: report
        for name, frame in (("weather", weather_raw), ("cams", cams_raw), ("hotspots", hotspots))
        if (report := coordinate_check(frame, name))
    }

    if not isinstance(hotspots["acquired_at"].dtype, pd.DatetimeTZDtype):
        raise ValueError("Hotspots require timezone-aware acquired_at")
    if str(hotspots["acquired_at"].dt.tz) != "UTC":
        raise ValueError("Hotspots require UTC acquired_at")
    if hotspots[list(HOTSPOT_KEY)].isna().any().any():
        raise ValueError("Hotspot key is missing a value; audit the source batches first")
    if hotspots.duplicated(list(HOTSPOT_KEY)).any():
        raise ValueError("Hotspot key is duplicated; audit the source batches first")

    for name, spec in CONTEXT_SOURCES.items():
        path = _locate_bmkg(data_dir, name)
        if path is None:
            continue
        frame = pd.read_parquet(path)
        paths[name] = path
        entry = _source_entry(path, frame, "context")
        entry["role"] = spec["role"]
        entry["note"] = spec["note"]
        group_column = spec["group_column"]
        if group_column in frame.columns:
            entry["group_column"] = group_column
            entry["group_count"] = _count(frame[group_column].nunique())
        sources[name] = entry

    consumed = {name: path for name, path in paths.items() if path.exists()}
    source_hashes = {name: sha256(path) for name, path in consumed.items()}
    snapshot = _snapshot_provenance(data_dir, consumed)
    hotspots = hotspots.sort_values("acquired_at")

    report = {
        "generated_at_utc": datetime.now(UTC).isoformat(timespec="seconds"),
        "target_kind": "model",
        "target_statement": (
            "CAMS model field PM2.5 on one grid cell; not an observation and not a station series"
        ),
        "snapshot": snapshot,
        "sources": sources,
        "grid_cells": grids,
        "hour_regularity": gaps,
        "aligned": {
            "rows": len(hourly),
            "start_utc": hourly["valid_at"].min().isoformat(),
            "end_utc": hourly["valid_at"].max().isoformat(),
            "unique_timestamps": bool(hourly["valid_at"].is_unique),
            "hourly_interval": bool(
                (hourly["valid_at"].diff().dropna() == pd.Timedelta(hours=1)).all()
            ),
            "missing_hour_rows": _count(hourly["cams_pm25_ug_m3"].isna().sum()),
            "columns": list(hourly.columns),
        },
        "missing_by_column": {c: _count(v) for c, v in hourly.isna().sum().items()},
        "cams_pm25_quantiles": {
            f"p{int(q * 100)}": _finite(hourly["cams_pm25_ug_m3"].quantile(q))
            for q in (0.01, 0.05, 0.25, 0.5, 0.75, 0.95, 0.99)
        },
        "cams_pm25_monthly": _monthly_stats(hourly["cams_pm25_ug_m3"], hourly["valid_at"]),
        "distribution_shift_probe": {
            "sensor_mix_boundary_utc": SENSOR_MIX_BOUNDARY,
            "before_mean_ug_m3": _finite(
                hourly.loc[
                    hourly["valid_at"] < pd.Timestamp(SENSOR_MIX_BOUNDARY, tz="UTC"),
                    "cams_pm25_ug_m3",
                ].mean()
            ),
            "after_mean_ug_m3": _finite(
                hourly.loc[
                    hourly["valid_at"] >= pd.Timestamp(SENSOR_MIX_BOUNDARY, tz="UTC"),
                    "cams_pm25_ug_m3",
                ].mean()
            ),
            "caveat": (
                "The FIRMS sensor/processing mix changes on the same date, so a level change "
                "here cannot be attributed to air quality alone. Not an episode claim."
            ),
        },
        "hotspot_audit": {
            "rows": len(hotspots),
            "start_utc": hotspots["acquired_at"].min().isoformat(),
            "end_utc": hotspots["acquired_at"].max().isoformat(),
            "by_source_sensor": _sensor_coverage(hotspots),
            "by_processing": {
                str(name): _count(count)
                for name, count in hotspots["processing"].value_counts().items()
            },
            "monthly_counts": {
                str(period): _count(count)
                for period, count in hotspots.set_index("acquired_at").resample("MS").size().items()
            },
            "null_origin": hotspot_null_origin(hotspots),
            "frp_missing": _count(hotspots["frp_mw"].isna().sum()),
            "note": (
                "Counts are records in this cache. A month with few or zero detections is not "
                "evidence that the satellite covered it or that no fire burned."
            ),
        },
        "value_checks": {
            "impossible": {},
            "extreme_reported_not_removed": extremes,
            "coordinates_outside_study_extent": beyond_extent,
            "policy": (
                "Non-finite values, unparseable text, coordinates outside WGS84 and physically "
                "impossible values abort the run, so those lists stay empty by construction. "
                "Extreme but possible values and coordinates outside the requested extent are "
                "counted and kept unchanged."
            ),
        },
        "source_sha256": source_hashes,
        "limitations": LIMITATIONS,
    }
    assert_credential_free(report)
    return hourly, hotspots, _jsonable(report)


def save_prepared(hourly: pd.DataFrame, report: dict, data_dir: Path = DATA_DIR) -> dict:
    """Write the aligned frame and its audit report; return the report with its checksum."""
    out = Path(data_dir) / "interim"
    out.mkdir(parents=True, exist_ok=True)
    table_path = out / "hourly_aligned.parquet"
    hourly.to_parquet(table_path, index=False)
    report = {
        **_jsonable(report),
        "interim_path": str(table_path),
        "hourly_sha256": sha256(table_path),
    }
    assert_credential_free(report)
    (out / "audit_report.json").write_text(json.dumps(report, indent=2, allow_nan=False) + "\n")
    return report
