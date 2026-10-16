"""Features for the served hotspot-occurrence model ("Risiko titik panas").

Unit of prediction: one 0.25° grid cell over Kalimantan, issued at the end of UTC day d, for
"at least one Suomi NPP VIIRS detection in the cell on UTC day d+1". Every feature uses data up
to and including day d only.

The same definitions are implemented in TypeScript for live serving
(`packages/shared/src/model/hotspot-features.ts`); `fixtures/test-vectors/hotspot-features.json`
pins both implementations to the same numbers. Change both or neither.

Missing stays NaN. A cell with no detection *data* (outage) is not a cell with zero detections;
`detection_days` marks which days the sensor actually delivered anything, and days outside it
produce NaN features and no labels.
"""

from __future__ import annotations

import numpy as np
import pandas as pd

# Grid: (west, south, east, north). North is capped at 4.5° N because the 2026 SP/NRT snapshot
# used for the newest year was collected with that bounding box; Sabah is therefore outside.
GRID_BBOX = (108.5, -4.5, 119.5, 4.5)
CELL_DEG = 0.25
N_COLS = round((GRID_BBOX[2] - GRID_BBOX[0]) / CELL_DEG)  # 44
N_ROWS = round((GRID_BBOX[3] - GRID_BBOX[1]) / CELL_DEG)  # 36
WEATHER_DEG = 2.0

DRY_DAY_MM = 1.0
DRY_DAYS_CAP = 60
DAYS_SINCE_CAP = 7  # lags 0..6; 7 = none in the last 7 days (live inputs reach back 7 days)

FEATURES = (
    "det_cell_1d",
    "det_cell_3d",
    "det_cell_7d",
    "det_nbr_1d",
    "det_nbr_7d",
    "det_wide_7d",
    "days_since_det",
    "precip_1d_mm",
    "precip_7d_mm",
    "precip_30d_mm",
    "precip_60d_mm",
    "dry_days",
    "rh_min_pct",
    "tmax_c",
    "wind_max_ms",
    "vpd_max_kpa",
    "vpd_7d_mean_kpa",
    "doy",
    "cell_hist_rate",
)


def cell_index(lat: np.ndarray, lon: np.ndarray) -> np.ndarray:
    """Row-major cell id (row 0 = south), or -1 outside the grid."""
    lat = np.asarray(lat, dtype=float)
    lon = np.asarray(lon, dtype=float)
    col = np.floor((lon - GRID_BBOX[0]) / CELL_DEG).astype(int)
    row = np.floor((lat - GRID_BBOX[1]) / CELL_DEG).astype(int)
    ok = (col >= 0) & (col < N_COLS) & (row >= 0) & (row < N_ROWS)
    return np.where(ok, row * N_COLS + col, -1)


def cell_center(cell: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    cell = np.asarray(cell, dtype=int)
    row, col = np.divmod(cell, N_COLS)
    return GRID_BBOX[1] + (row + 0.5) * CELL_DEG, GRID_BBOX[0] + (col + 0.5) * CELL_DEG


def weather_point(lat: np.ndarray, lon: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    """Nearest point of the 2° weather grid."""
    return np.round(np.asarray(lat, float) / WEATHER_DEG) * WEATHER_DEG, np.round(
        np.asarray(lon, float) / WEATHER_DEG
    ) * WEATHER_DEG


def daily_counts(hotspots: pd.DataFrame, days: pd.DatetimeIndex) -> np.ndarray:
    """(n_days, n_rows, n_cols) detection counts per UTC day."""
    counts = np.zeros((len(days), N_ROWS, N_COLS), dtype=np.float32)
    if hotspots.empty:
        return counts
    cells = cell_index(hotspots["lat"].to_numpy(), hotspots["lon"].to_numpy())
    day = hotspots["acquired_at"].dt.tz_convert("UTC").dt.normalize().dt.tz_localize(None)
    di = days.get_indexer(day)
    ok = (cells >= 0) & (di >= 0)
    rows, cols = np.divmod(cells[ok], N_COLS)
    np.add.at(counts, (di[ok], rows, cols), 1.0)
    return counts


def _window_sum(a: np.ndarray, k: int) -> np.ndarray:
    """Trailing sum over the last `k` days (axis 0), inclusive of the current day.

    NaN anywhere in the window gives NaN (a window that includes an outage is unknown).
    """
    c = np.cumsum(np.nan_to_num(a, nan=0.0), axis=0, dtype=np.float64)
    nan_c = np.cumsum(np.isnan(a), axis=0)
    out = c.copy()
    out[k:] = c[k:] - c[:-k]
    nans = nan_c.copy()
    nans[k:] = nan_c[k:] - nan_c[:-k]
    out[: k - 1] = np.nan  # incomplete history at the start
    out[nans > 0] = np.nan
    return out.astype(np.result_type(a.dtype, np.float32))


def _box_sum(a: np.ndarray, radius: int) -> np.ndarray:
    """Sum over a (2r+1)² neighbourhood in the last two axes, zero padding at the grid edge."""
    p = np.pad(a, ((0, 0), (radius, radius), (radius, radius)))
    c = p.cumsum(axis=1).cumsum(axis=2)
    c = np.pad(c, ((0, 0), (1, 0), (1, 0)))
    w = 2 * radius + 1
    return c[:, w:, w:] - c[:, :-w, w:] - c[:, w:, :-w] + c[:, :-w, :-w]


def _days_since(counts: np.ndarray) -> np.ndarray:
    """Days since the last detection in the cell, looking back 7 days; 7 = none in that window.

    Walking back from today, the first detection gives the answer; reaching a day with no sensor
    data (or the start of the record) first makes it unknown (NaN).
    """
    n = counts.shape[0]
    out = np.empty(counts.shape, dtype=np.float32)
    for t in range(n):
        val = np.full(counts.shape[1:], np.nan, dtype=np.float32)
        undecided = np.ones(counts.shape[1:], dtype=bool)
        for lag in range(DAYS_SINCE_CAP):  # 0 .. 6
            if t - lag < 0 or np.isnan(counts[t - lag]).all():
                undecided[:] = False  # stays NaN
                break
            hit = undecided & (counts[t - lag] > 0)
            val[hit] = float(lag)
            undecided &= ~hit
        val[undecided] = float(DAYS_SINCE_CAP)
        out[t] = val
    return out


def fire_features(counts: np.ndarray, sensor_ok: np.ndarray) -> dict[str, np.ndarray]:
    """Detection features per (day, row, col). Days where `sensor_ok` is False are NaN."""
    c = counts.astype(np.float32).copy()
    c[~sensor_ok] = np.nan
    nbr = _box_sum(np.nan_to_num(c), 1)
    wide = _box_sum(np.nan_to_num(c), 3)
    nbr[~sensor_ok] = np.nan
    wide[~sensor_ok] = np.nan
    return {
        "det_cell_1d": c,
        "det_cell_3d": _window_sum(c, 3),
        "det_cell_7d": _window_sum(c, 7),
        "det_nbr_1d": nbr,
        "det_nbr_7d": _window_sum(nbr, 7),
        "det_wide_7d": _window_sum(wide, 7),
        "days_since_det": _days_since(c),
    }


def dry_day_run(precip: np.ndarray) -> np.ndarray:
    """Consecutive days with precipitation < 1 mm, capped at 60. NaN resets to NaN."""
    out = np.full(precip.shape, np.nan, dtype=np.float32)
    run = np.full(precip.shape[1:], np.nan, dtype=np.float32)
    for t in range(precip.shape[0]):
        p = precip[t]
        dry = p < DRY_DAY_MM
        prev = np.where(np.isnan(run), 0.0, run)
        run = np.where(np.isnan(p), np.nan, np.where(dry, np.minimum(prev + 1, DRY_DAYS_CAP), 0))
        out[t] = run
    return out


def weather_features(w: dict[str, np.ndarray]) -> dict[str, np.ndarray]:
    """Per-(day, point) weather features from daily arrays shaped (n_days, n_points)."""
    p = w["precip_mm"]
    return {
        "precip_1d_mm": p,
        "precip_7d_mm": _window_sum(p, 7),
        "precip_30d_mm": _window_sum(p, 30),
        "precip_60d_mm": _window_sum(p, 60),
        "dry_days": dry_day_run(p),
        "rh_min_pct": w["rh_min_pct"],
        "tmax_c": w["tmax_c"],
        "wind_max_ms": w["wind_max_ms"],
        "vpd_max_kpa": w["vpd_max_kpa"],
        "vpd_7d_mean_kpa": _window_sum(w["vpd_max_kpa"], 7) / 7.0,
    }
