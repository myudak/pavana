"""Past-only features for the single-grid retrospective CAMS experiment (CP2).

The target is the **CAMS model field** at `t + 6 h` on one returned grid cell. It is not a station
observation, and the snapshot carries no `issued_at`, so this table supports a retrospective
experiment only: nothing here shows operational forecast skill.

Leakage rules enforced here:

* every feature at hour `t` is built from inputs dated at or before `t`;
* the target is the only value column that reads `t + horizon`, and no allowlist contains it or
  `eligible`, which records whether that future value exists;
* missing hours are restored as `NaN` before any shift, so a gap never counts as consecutive hours.

Detection features read a sorted timestamp array with `searchsorted` plus prefix sums, so a
1.16-million-row cache is never rescanned for each of the 24 thousand hours.
"""

from __future__ import annotations

import json
import platform
from dataclasses import asdict
from pathlib import Path

import numpy as np
import pandas as pd
import pyarrow

from ..data import research
from ..data.research import (
    LIMITATIONS,
    MANIFEST_PATHS,
    assert_credential_free,
    regular_hourly,
    sha256,
)
from ..paths import DATA_DIR
from . import geo, upwind, wind
from .geo import haversine_km
from .upwind import DEFAULT_PARAMS, UpwindParams, upwind_exposure_score
from .wind import wind_from_to_flow_vector

# Requested anchor, Sungai Raya (Kubu Raya). Not a station: each provider answers with its own
# grid cell, and hotspots are filtered/weighted against this point alone.
ANCHOR_LAT = -0.0710660252
ANCHOR_LON = 109.3712469865

HORIZON_HOURS = 6
PM25_LAGS_HOURS = (1, 3, 6, 12, 24, 48)
PM25_MEAN_WINDOWS_HOURS = (6, 24)
PM25_CHANGE_HOURS = 3
WARMUP_HOURS = max(PM25_LAGS_HOURS)
RADII_KM = (50, 100, 300)
WINDOWS_HOURS = (6, 24, 48)
UPWIND_WINDOW_HOURS = 48

HOUR_NS = 3_600_000_000_000

CORE_INPUTS = (
    "cams_pm25_ug_m3",
    "wind_dir_from_deg",
    "wind_speed_ms",
    "temperature_c",
    "rh_pct",
    "precip_mm",
    "wind_gusts_ms",
    "surface_pressure_hpa",
    "shortwave_radiation_wm2",
)
OPTIONAL_INPUTS = ("boundary_layer_height_m",)

# Column names that belong to the synthetic fixture / station frames. Seeing them means the wrong
# table was passed in, so the run stops instead of training on a demo series.
NON_CAMS_COLUMNS = ("is_demo", "pm25_ug_m3")

FEATURE_LIMITATIONS = [
    "The target is the CAMS model field on one grid cell: not a station observation.",
    "No issue time exists in the snapshot, so no issue-time baseline or forecast lead time holds.",
    "Detection counts are records in this cache. Zero means no record in the window, not that the "
    "satellite covered the area or that no fire burned.",
    "FRP sums stay NaN when any record inside the window has no FRP; they are never filled with 0.",
    "boundary_layer_height_m keeps its 4368 missing hours as NaN and is not interpolated.",
    "Eligible rows keep the 48-hour warm-up and the 6-hour target tail out of training on purpose, "
    "and a row whose trailing 48 h window misses any pm25_model feature is ineligible too.",
]


def feature_module_sha256() -> dict[str, str]:
    """sha256 of every module whose maths decides a value in this table.

    `feature_code_sha256` covers this file alone. If the upwind or wind formula moves, the table
    changes while that single hash does not, so the metadata also records the helpers it calls.
    """
    modules = (geo, wind, upwind, research)
    hashes = {module.__name__: sha256(Path(module.__file__)) for module in modules}
    hashes["pavana_ml.features.model_table"] = sha256(Path(__file__))
    return dict(sorted(hashes.items()))


def _nanoseconds(values: pd.Series | pd.DatetimeIndex) -> np.ndarray:
    """Explicit UTC nanosecond int64, whatever resolution the parquet stored.

    The cache arrives as `datetime64[us, UTC]`; window arithmetic done in the stored unit would
    mis-scale every boundary. The unit is stated once, here, and everything downstream is int64 ns.
    """
    index = pd.DatetimeIndex(values)
    if index.tz is None:
        raise ValueError("timestamps must carry an explicit UTC timezone")
    if str(index.tz) != "UTC":
        raise ValueError(f"timestamps must be UTC, got {index.tz}")
    return index.as_unit("ns").asi8


def _numeric_series(series: pd.Series, name: str) -> pd.Series:
    """float64 with `NaN` for missing. Text and `inf` are refused, never quietly turned into `NaN`.

    The audit refuses that class of value, so meeting one here means the frame did not come from
    the audited cache. Silently coercing it would drop a detection with an unreadable coordinate
    without leaving a trace, while the table still looked complete.
    """
    numeric = pd.to_numeric(series, errors="coerce").astype("float64")
    unusable = int(np.isinf(numeric).sum()) + int((series.notna() & numeric.isna()).sum())
    if unusable:
        raise ValueError(f"{name}: {unusable} value(s) that are neither a number nor missing")
    return numeric


def _float_array(series: pd.Series, name: str) -> np.ndarray:
    """float64 array that keeps `NaN`, for the vector maths."""
    return _numeric_series(series, name).to_numpy()


def _window_edges(
    times: np.ndarray, origin: np.ndarray, hours: int
) -> tuple[np.ndarray, np.ndarray]:
    """Half-open `[t - W, t]` bounds into a sorted array of int64 nanosecond timestamps."""
    left = np.searchsorted(times, origin - hours * HOUR_NS, side="left")
    right = np.searchsorted(times, origin, side="right")
    return left, right


def hotspot_features(
    hourly: pd.DataFrame,
    hotspots: pd.DataFrame,
    target_lat: float = ANCHOR_LAT,
    target_lon: float = ANCHOR_LON,
    params: UpwindParams = DEFAULT_PARAMS,
) -> pd.DataFrame:
    """Detection counts, FRP sums and upwind exposure from records acquired at or before each hour.

    Distance to the anchor is computed once for the whole cache and used both to drop everything
    beyond `params.max_distance_km` and to slice each radius; per-hour work is then a window search
    plus prefix sums. The sort key is canonical (no tie left to the stored row order) because the
    FRP sums are floating-point accumulations: an arbitrary order would move the checksum of the
    table by an ulp without any change to the detections.
    """
    missing = {"valid_at", "wind_dir_from_deg"} - set(hourly.columns)
    if missing:
        raise ValueError(f"hourly: missing required columns {sorted(missing)}")
    missing = {"lat", "lon", "acquired_at", "frp_mw"} - set(hotspots.columns)
    if missing:
        raise ValueError(f"hotspots: missing required columns {sorted(missing)}")

    ordered = hotspots.sort_values(
        ["acquired_at", "lat", "lon", "frp_mw"], kind="stable", ignore_index=True
    )
    lat = _float_array(ordered["lat"], "hotspots: lat")
    lon = _float_array(ordered["lon"], "hotspots: lon")
    distance = haversine_km(lat, lon, target_lat, target_lon)
    inside = distance <= params.max_distance_km

    acquired = _nanoseconds(ordered["acquired_at"])[inside]
    distance = distance[inside]
    frp = _float_array(ordered["frp_mw"], "hotspots: frp_mw")[inside]
    lat, lon = lat[inside], lon[inside]
    null_frp = np.isnan(frp)

    origin = _nanoseconds(hourly["valid_at"])
    out: dict[str, np.ndarray] = {}
    for radius in RADII_KM:
        # Radii are cumulative and each subset keeps the ascending time order searchsorted needs.
        in_radius = distance <= radius
        times = acquired[in_radius]
        nulls_in_radius = null_frp[in_radius]
        cum_frp = np.concatenate(([0.0], np.cumsum(np.where(nulls_in_radius, 0.0, frp[in_radius]))))
        cum_null = np.concatenate(([0], np.cumsum(nulls_in_radius)))
        for hours in WINDOWS_HOURS:
            left, right = _window_edges(times, origin, hours)
            out[f"hotspot_records_n_{radius}km_{hours}h"] = (right - left).astype("int64")
            total = cum_frp[right] - cum_frp[left]
            # A window holding a record with no FRP has no honest sum. NaN, never a silent 0.
            out[f"hotspot_frp_sum_mw_{radius}km_{hours}h"] = np.where(
                cum_null[right] - cum_null[left] > 0, np.nan, total
            )

    wind_dir = _float_array(hourly["wind_dir_from_deg"], "hourly: wind_dir_from_deg")
    upwind_left, upwind_right = _window_edges(acquired, origin, UPWIND_WINDOW_HOURS)
    scores = np.full(origin.shape, np.nan)
    for i in range(origin.size):
        if np.isnan(wind_dir[i]):
            # No wind direction: the indicator is undefined, not zero. Same rule as `upwind_series`.
            continue
        lo, hi = int(upwind_left[i]), int(upwind_right[i])
        scores[i] = upwind_exposure_score(
            target_lat,
            target_lon,
            float(wind_dir[i]),
            lat[lo:hi],
            lon[lo:hi],
            frp[lo:hi],
            (origin[i] - acquired[lo:hi]) / HOUR_NS,
            params,
        ).score
    out["upwind_score"] = scores
    return pd.DataFrame(out, index=hourly.index)


def build_model_table(
    hourly: pd.DataFrame,
    hotspots: pd.DataFrame,
    *,
    target_lat: float = ANCHOR_LAT,
    target_lon: float = ANCHOR_LON,
    horizon_hours: int = HORIZON_HOURS,
    params: UpwindParams = DEFAULT_PARAMS,
    inputs: dict | None = None,
) -> tuple[pd.DataFrame, dict]:
    """Build the feature table and its metadata. See the module docstring for the leakage rules."""
    if horizon_hours < 1:
        raise ValueError("horizon_hours must be positive")
    wrong = sorted(set(NON_CAMS_COLUMNS) & set(hourly.columns))
    if wrong:
        raise ValueError(f"Use the aligned CAMS table, not a fixture or station frame: {wrong}")
    table = regular_hourly(hourly, "aligned hourly data")
    missing = sorted(set(CORE_INPUTS) - set(table.columns))
    if missing:
        raise ValueError(f"Missing research inputs: {missing}")
    absent_optional = sorted(set(OPTIONAL_INPUTS) - set(table.columns))

    # float64 with NaN for missing, on the table's own index so every shift stays aligned.
    pm25 = _numeric_series(table["cams_pm25_ug_m3"], "cams_pm25_ug_m3")
    for lag in PM25_LAGS_HOURS:
        table[f"cams_pm25_lag{lag}h"] = pm25.shift(lag)
    for window in PM25_MEAN_WINDOWS_HOURS:
        table[f"cams_pm25_mean{window}h"] = pm25.rolling(window, min_periods=window).mean()
    table[f"cams_pm25_change{PM25_CHANGE_HOURS}h"] = pm25 - pm25.shift(PM25_CHANGE_HOURS)

    east, north = wind_from_to_flow_vector(table["wind_dir_from_deg"], table["wind_speed_ms"])
    table["wind_east_ms"], table["wind_north_ms"] = east, north

    # Time features are UTC by construction: `valid_at` is a validated UTC whole hour.
    table["month"] = table["valid_at"].dt.month.astype("int8")
    table["hour"] = table["valid_at"].dt.hour.astype("int8")
    day_of_year = table["valid_at"].dt.dayofyear
    table["hour_sin"] = np.sin(2 * np.pi * table["hour"] / 24.0)
    table["hour_cos"] = np.cos(2 * np.pi * table["hour"] / 24.0)
    table["dayofyear_sin"] = np.sin(2 * np.pi * day_of_year / 365.25)
    table["dayofyear_cos"] = np.cos(2 * np.pi * day_of_year / 365.25)

    detection = hotspot_features(table, hotspots, target_lat, target_lon, params)
    table = pd.concat([table, detection], axis=1)

    # The PM2.5-model columns are also the eligibility contract: a row is scorable only when every
    # one of them is present, so a single missing hour inside the trailing warm-up window cannot
    # leave a row looking complete while a lag or a rolling mean silently reads NaN.
    pm25_model_columns = [
        "cams_pm25_ug_m3",
        *(f"cams_pm25_lag{lag}h" for lag in PM25_LAGS_HOURS),
        *(f"cams_pm25_mean{window}h" for window in PM25_MEAN_WINDOWS_HOURS),
        f"cams_pm25_change{PM25_CHANGE_HOURS}h",
    ]

    target = f"target_cams_pm25_ug_m3_t+{horizon_hours}h"
    table[target] = pm25.shift(-horizon_hours)
    table["target_valid_at"] = table["valid_at"] + pd.Timedelta(hours=horizon_hours)
    target_present = table[target].notna()
    history_present = table[pm25_model_columns].notna().all(axis=1)
    # Warm-up and tail rows stay in the table so the loss of samples is auditable, not implicit.
    table["eligible"] = target_present & history_present

    groups = {
        "pm25_model": pm25_model_columns,
        "weather": [
            "temperature_c",
            "rh_pct",
            "precip_mm",
            "wind_speed_ms",
            "wind_gusts_ms",
            "surface_pressure_hpa",
            *(name for name in OPTIONAL_INPUTS if name not in absent_optional),
            "shortwave_radiation_wm2",
        ],
        "wind": ["wind_east_ms", "wind_north_ms"],
        "time": ["month", "hour", "hour_sin", "hour_cos", "dayofyear_sin", "dayofyear_cos"],
        "detection": [f"hotspot_records_n_{r}km_{w}h" for r in RADII_KM for w in WINDOWS_HOURS]
        + [f"hotspot_frp_sum_mw_{r}km_{w}h" for r in RADII_KM for w in WINDOWS_HOURS],
        "upwind": ["upwind_score"],
    }
    allowlists = {
        "C": groups["pm25_model"] + groups["weather"] + groups["wind"] + groups["time"],
        "D": groups["pm25_model"]
        + groups["weather"]
        + groups["wind"]
        + groups["time"]
        + groups["detection"],
        "E": groups["pm25_model"]
        + groups["weather"]
        + groups["wind"]
        + groups["time"]
        + groups["detection"]
        + groups["upwind"],
    }
    feature_columns = list(dict.fromkeys(allowlists["E"]))
    eligible = table["eligible"]
    metadata = {
        "experiment_kind": "retrospective_cams_target",
        "target": target,
        "target_kind": "model",
        "target_statement": (
            "CAMS model-field PM2.5 at the returned grid cell; not an observation and not a "
            "station series"
        ),
        "target_valid_column": "target_valid_at",
        "horizon_hours": horizon_hours,
        "target_location": {"lat": target_lat, "lon": target_lon},
        "target_location_note": (
            "Requested anchor. ERA5 and CAMS each answer with a different grid cell, so this point "
            "identifies the experiment, not a station."
        ),
        "eligible_rule": (
            "eligible = every pm25_model feature (CAMS at t, lags "
            f"{'/'.join(str(lag) for lag in PM25_LAGS_HOURS)} h, means "
            f"{'/'.join(str(window) for window in PM25_MEAN_WINDOWS_HOURS)} h and the "
            f"{PM25_CHANGE_HOURS} h change) and the t+{horizon_hours} h target are all present. "
            f"One missing hour inside the trailing {WARMUP_HOURS} h window makes every row that "
            "reads it ineligible; ineligible rows stay in the table with eligible=false."
        ),
        "eligibility": {
            "rows": int(len(table)),
            "eligible": int(eligible.sum()),
            "excluded_missing_target": int((~target_present & history_present).sum()),
            "excluded_incomplete_pm25_history": int((target_present & ~history_present).sum()),
            "excluded_both": int((~target_present & ~history_present).sum()),
        },
        "origin_span_utc": {
            "first": table["valid_at"].min().isoformat(),
            "last": table["valid_at"].max().isoformat(),
        },
        "eligible_origin_span_utc": {
            "first": table.loc[eligible, "valid_at"].min().isoformat(),
            "last": table.loc[eligible, "valid_at"].max().isoformat(),
        },
        "target_valid_span_utc": {
            "first": table.loc[target_present, "target_valid_at"].min().isoformat(),
            "last": table.loc[target_present, "target_valid_at"].max().isoformat(),
        },
        "feature_groups": groups,
        "feature_allowlists": allowlists,
        "feature_columns": feature_columns,
        "windows": {
            "detection": "[t-W, t] with W in 6/24/48 h, both ends inclusive",
            "upwind": f"[t-{UPWIND_WINDOW_HOURS}h, t]",
            "pm25_mean": "W samples ending at t: t-W+1 .. t, so t itself is included",
            "pm25_change": f"t minus t-{PM25_CHANGE_HOURS}h",
            "target": "t + horizon, written to target_valid_at",
            "timezone": "All timestamps are UTC; no local-time feature is derived.",
        },
        "upwind_params": asdict(params),
        "upwind_statement": (
            "Indicator combining FRP, distance decay, wind alignment and recency. Not a plume "
            "model and not a probability that smoke reaches the anchor."
        ),
        "detection_statement": (
            "Counts are detection records in this cached extract, not confirmed fires and not fire "
            "events. Zero means no record in the window, not proof of satellite coverage."
        ),
        "missing_data_policy": (
            "CAMS gaps stay NaN and are never interpolated; FRP sums are NaN when a record in the "
            "window lacks FRP; NaN features are kept for LightGBM instead of being filled."
        ),
        "absent_optional_inputs": absent_optional,
        "feature_nan_counts_in_eligible": {
            column: int(table.loc[eligible, column].isna().sum()) for column in feature_columns
        },
        "inputs": inputs,
        "built_at_utc": pd.Timestamp.now(tz="UTC").isoformat(),
        "package_versions": {
            "python": platform.python_version(),
            "pandas": pd.__version__,
            "numpy": np.__version__,
            "pyarrow": pyarrow.__version__,
        },
        "feature_module_sha256": feature_module_sha256(),
        "feature_code_sha256": sha256(Path(__file__)),
        "research_only": True,
        "operational_ready": False,
        "observation_validated": False,
        "limitations": [*LIMITATIONS, *FEATURE_LIMITATIONS],
    }
    assert_credential_free(metadata)
    return table, metadata


def save_model_table(table: pd.DataFrame, metadata: dict, data_dir: Path = DATA_DIR) -> dict:
    """Write the table and its metadata, and record the checksum of what was written."""
    out = Path(data_dir) / "processed"
    out.mkdir(parents=True, exist_ok=True)
    path = out / "model_table.parquet"
    table.to_parquet(path, index=False)
    stored = {
        **metadata,
        "table_path": str(path),
        "table_sha256": sha256(path),
        "table_rows": int(len(table)),
    }
    stored["metadata_path"] = str(out / "model_table.metadata.json")
    assert_credential_free(stored)
    (out / "model_table.metadata.json").write_text(
        json.dumps(stored, indent=2, allow_nan=False) + "\n"
    )
    return stored


def load_feature_inputs(data_dir: Path = DATA_DIR) -> tuple[pd.DataFrame, pd.DataFrame, dict]:
    """Read the CP1 output from disk and verify both checksums against the audit report.

    The report is the evidence for which inputs produced this table. If a byte changed since the
    audit ran, the features would no longer describe the audited data, so the run stops.
    """
    data_dir = Path(data_dir)
    interim = data_dir / "interim"
    report_path = interim / "audit_report.json"
    hourly_path = interim / "hourly_aligned.parquet"
    hotspot_path = data_dir / MANIFEST_PATHS["hotspots"]
    if not report_path.exists() or not hourly_path.exists():
        raise ValueError(f"Missing CP1 output under {interim}. Run notebook 02 first.")
    if not hotspot_path.exists():
        raise ValueError(f"Missing hotspot cache {hotspot_path}. Run notebook 02 first.")
    report = json.loads(report_path.read_text())
    if report.get("target_kind") != "model":
        raise ValueError(
            f"Audit report target_kind is {report.get('target_kind')!r}, expected 'model'"
        )

    hourly_sha = sha256(hourly_path)
    if hourly_sha != report.get("hourly_sha256"):
        raise ValueError(
            f"hourly_aligned.parquet changed since the audit: {hourly_sha} != "
            f"{report.get('hourly_sha256')}"
        )
    hotspot_sha = sha256(hotspot_path)
    audited_hotspot_sha = report.get("source_sha256", {}).get("hotspots")
    if hotspot_sha != audited_hotspot_sha:
        raise ValueError(
            f"hotspot cache changed since the audit: {hotspot_sha} != {audited_hotspot_sha}"
        )

    hourly = pd.read_parquet(hourly_path)
    hotspots = pd.read_parquet(hotspot_path)
    inputs = {
        "hourly_aligned": {
            "path": str(hourly_path),
            "sha256": hourly_sha,
            "rows": int(len(hourly)),
            "audited_at_utc": report.get("generated_at_utc"),
            "audit_report": str(report_path),
        },
        "hotspots": {
            "path": str(hotspot_path),
            "sha256": hotspot_sha,
            "rows": int(len(hotspots)),
            "audited_at_utc": report.get("generated_at_utc"),
        },
        "snapshot": report.get("snapshot"),
        "audit_limitations": report.get("limitations"),
    }
    return hourly, hotspots, inputs
