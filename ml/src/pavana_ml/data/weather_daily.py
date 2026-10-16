"""Daily ERA5 weather on a coarse grid from the Open-Meteo archive (multi-coordinate requests).

The hotspot model joins each 0.25° fire cell to its nearest weather grid point. Daily aggregates
are requested with `timezone=GMT`, so "day d" is the UTC day — the same day definition the
FIRMS labels use. The live API asks the Open-Meteo *forecast* endpoint (`past_days`) for the same
variables, so serving inputs are model analyses/forecasts rather than ERA5; that difference is a
documented train/serve skew, not hidden.

Values are reanalysis (model output constrained by observations), used only as features. The
target of the served models is always an observation.
"""

from __future__ import annotations

import time
from pathlib import Path

import numpy as np
import pandas as pd
import requests

ARCHIVE_URL = "https://archive-api.open-meteo.com/v1/archive"
ELEVATION_URL = "https://api.open-meteo.com/v1/elevation"

DAILY_VARIABLES = (
    "precipitation_sum",
    "temperature_2m_max",
    "relative_humidity_2m_min",
    "wind_speed_10m_max",
    "vapour_pressure_deficit_max",
)

DAILY_RENAME = {
    "precipitation_sum": "precip_mm",
    "temperature_2m_max": "tmax_c",
    "relative_humidity_2m_min": "rh_min_pct",
    "wind_speed_10m_max": "wind_max_ms",
    "vapour_pressure_deficit_max": "vpd_max_kpa",
}


def _get(url: str, params: dict, tries: int = 6, timeout: int = 180) -> object:
    last: Exception | str | None = None
    for attempt in range(tries):
        try:
            r = requests.get(url, params=params, timeout=timeout)
            if r.status_code == 429:
                last = r.text[:200]
                print(f"open-meteo 429 (attempt {attempt + 1}): {last}", flush=True)
                if "Daily" in last:
                    break  # waiting minutes will not help
                time.sleep(65 * (attempt + 1))
                continue
            r.raise_for_status()
            return r.json()
        except requests.RequestException as exc:
            last = exc
            time.sleep(10 * (attempt + 1))
    raise RuntimeError(f"Open-Meteo request failed: {url} — {last}")


def parse_daily(payload: dict | list, points: list[tuple[float, float]]) -> pd.DataFrame:
    """Tidy a (multi-location) daily payload. `point_lat`/`point_lon` are the requested point."""
    blocks = payload if isinstance(payload, list) else [payload]
    frames = []
    for (plat, plon), block in zip(points, blocks, strict=True):
        daily = block.get("daily") or {}
        if "time" not in daily:
            continue
        df = pd.DataFrame(daily).rename(columns={"time": "date", **DAILY_RENAME})
        df["date"] = pd.to_datetime(df["date"]).dt.date
        df["point_lat"] = plat
        df["point_lon"] = plon
        for col in DAILY_RENAME.values():
            if col in df.columns:
                df[col] = pd.to_numeric(df[col], errors="coerce")  # gaps stay NaN
        frames.append(df)
    if not frames:
        return pd.DataFrame(columns=["date", "point_lat", "point_lon", *DAILY_RENAME.values()])
    return pd.concat(frames, ignore_index=True)


def fetch_daily_points(
    points: list[tuple[float, float]],
    start: str,
    end: str,
    cache_dir: Path,
    batch: int = 10,
    pause_s: float = 2.0,
) -> pd.DataFrame:
    """Daily archive weather for many points, `batch` points per request, cached per batch."""
    cache_dir.mkdir(parents=True, exist_ok=True)
    frames = []
    for i in range(0, len(points), batch):
        chunk = points[i : i + batch]
        tag = "_".join(f"{la:.2f},{lo:.2f}" for la, lo in chunk[:1]) + f"_n{len(chunk)}"
        path = cache_dir / f"daily_{start}_{end}_{tag}.parquet"
        if path.exists():
            frames.append(pd.read_parquet(path))
            continue
        payload = _get(
            ARCHIVE_URL,
            {
                "latitude": ",".join(f"{la:g}" for la, _ in chunk),
                "longitude": ",".join(f"{lo:g}" for _, lo in chunk),
                "start_date": start,
                "end_date": end,
                "daily": ",".join(DAILY_VARIABLES),
                "wind_speed_unit": "ms",
                "timezone": "GMT",
            },
        )
        df = parse_daily(payload, chunk)  # type: ignore[arg-type]
        df.to_parquet(path, index=False)
        print(f"weather batch {i // batch + 1}/{-(-len(points) // batch)}: {len(df):,} rows", flush=True)
        frames.append(df)
        time.sleep(pause_s)
    return pd.concat(frames, ignore_index=True)


def fetch_elevation(points: list[tuple[float, float]], batch: int = 100) -> np.ndarray:
    """Copernicus DEM elevation (m) per point; sea points come back as 0 (or below)."""
    out: list[float] = []
    for i in range(0, len(points), batch):
        chunk = points[i : i + batch]
        payload = _get(
            ELEVATION_URL,
            {
                "latitude": ",".join(f"{la:g}" for la, _ in chunk),
                "longitude": ",".join(f"{lo:g}" for _, lo in chunk),
            },
        )
        out.extend(float(v) for v in payload["elevation"])  # type: ignore[index]
        time.sleep(1.0)
    return np.asarray(out, dtype=float)
