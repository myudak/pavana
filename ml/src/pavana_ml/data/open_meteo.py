"""Open-Meteo weather (ERA5 archive) + air quality (CAMS) loaders.

Weather:     https://open-meteo.com/en/docs  (historical: archive-api)
Air quality: https://open-meteo.com/en/docs/air-quality-api

Both are asked for `timezone=GMT` so every row is UTC and joins to FIRMS without a silent
7-hour shift. (The `data_kualitas_udara.csv` series on Hugging Face was pulled with
`timezone=Asia/Jakarta`, which is why its `waktu` column is WIB — do not repeat that here.)

What these endpoints actually serve:

* Weather — ERA5 **reanalysis**: model output constrained by observations. Fine as a *feature*;
  it is not a station measurement, so never call it one.
* Air quality — CAMS **model** fields. Three consequences that matter for the research plan:

  1. There is no observed-PM2.5 column here, and there cannot be: CAMS is the model, not the
     instrument. It assimilates surface observations internally, but the value returned is one
     grid cell of the CAMS global domain (0.4°, ~45 km, 3-hourly, interpolated to hourly by
     Open-Meteo).
  2. Open-Meteo serves only forecast + reanalysis for a valid time. It does **not** expose the
     model run that produced a past value, so an honest issue-time baseline cannot be
     reconstructed retroactively — only archived going forward.
  3. For every optional `FIRMS_MAP_KEY`-style parameter, keys stay in the repo-root `.env`.

Record `issued_at` separately from `valid_at` for anything forecast-shaped; this loader only
claims `valid_at` + `fetched_at`.
"""

from __future__ import annotations

import time
from datetime import UTC, datetime

import pandas as pd
import requests

ARCHIVE_URL = "https://archive-api.open-meteo.com/v1/archive"
AIR_QUALITY_URL = "https://air-quality-api.open-meteo.com/v1/air-quality"

# ERA5 reanalysis, hourly, global, no API key.
WEATHER_VARIABLES = (
    "temperature_2m",
    "relative_humidity_2m",
    "precipitation",
    "wind_speed_10m",
    "wind_direction_10m",
    "wind_gusts_10m",
    "surface_pressure",
    "boundary_layer_height",
    "shortwave_radiation",
)

# CAMS model fields — not observations (see module docstring).
AIR_QUALITY_VARIABLES = ("pm2_5", "pm10")

_WEATHER_RENAME = {
    "temperature_2m": "temperature_c",
    "relative_humidity_2m": "rh_pct",
    "precipitation": "precip_mm",
    "wind_speed_10m": "wind_speed_ms",
    "wind_direction_10m": "wind_dir_from_deg",
    "wind_gusts_10m": "wind_gusts_ms",
    "surface_pressure": "surface_pressure_hpa",
    "boundary_layer_height": "boundary_layer_height_m",
    "shortwave_radiation": "shortwave_radiation_wm2",
}

_AIR_QUALITY_RENAME = {"pm2_5": "pm25_ug_m3", "pm10": "pm10_ug_m3"}


def _get(url: str, params: dict, tries: int = 4, timeout: int = 120) -> dict:
    last: Exception | None = None
    for attempt in range(tries):
        try:
            r = requests.get(url, params=params, timeout=timeout)
            r.raise_for_status()
            return r.json()
        except requests.RequestException as exc:  # transient TLS timeouts are common
            last = exc
            time.sleep(5 * (attempt + 1))
    raise RuntimeError(f"Open-Meteo request failed: {url} — {last}")


def parse_hourly(payload: dict, rename: dict[str, str]) -> pd.DataFrame:
    """Tidy one Open-Meteo `hourly` block: UTC `valid_at` plus renamed value columns.

    `lat`/`lon` are the **grid cell the API snapped to**, not the point requested — the response
    echoes the cell it served. Verified 2026-10-15: asking for (-0.14, 109.45) returns cell
    (-0.099998474, 109.5), while (-0.07107, 109.37125) returns (-0.099998474, 109.399994) — one
    cell apart in longitude, and those two cells differ by 63% in mean CAMS PM2.5 over
    Aug–Oct 2026 (130.4 vs 79.9 µg/m³). Keep the returned cell beside the values: at ~0.1° the
    requested coordinate alone does not identify what was measured.
    """
    hourly = payload.get("hourly") or {}
    if "time" not in hourly:
        return pd.DataFrame(columns=["valid_at", *rename.values()])
    df = pd.DataFrame(hourly)
    df = df.rename(columns={"time": "valid_at", **rename})
    df["valid_at"] = pd.to_datetime(df["valid_at"], utc=True)
    df["lat"] = payload.get("latitude")
    df["lon"] = payload.get("longitude")
    # Missing stays NaN: a gap in a reanalysis is not a zero.
    for col in rename.values():
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce")
    return df


def fetch_weather_hourly(
    lat: float, lon: float, start: str, end: str, chunk_days: int = 366
) -> pd.DataFrame:
    """ERA5 hourly weather for `start .. end` inclusive, in yearly chunks."""
    frames: list[pd.DataFrame] = []
    cur, last = pd.Timestamp(start).normalize(), pd.Timestamp(end).normalize()
    while cur <= last:
        stop = min(cur + pd.Timedelta(days=chunk_days - 1), last)
        payload = _get(
            ARCHIVE_URL,
            {
                "latitude": lat,
                "longitude": lon,
                "start_date": cur.strftime("%Y-%m-%d"),
                "end_date": stop.strftime("%Y-%m-%d"),
                "hourly": ",".join(WEATHER_VARIABLES),
                "wind_speed_unit": "ms",
                "timezone": "GMT",
            },
        )
        frames.append(parse_hourly(payload, _WEATHER_RENAME))
        cur = stop + pd.Timedelta(days=1)
    if not frames:
        return pd.DataFrame(columns=["valid_at", *_WEATHER_RENAME.values()])
    return pd.concat(frames, ignore_index=True).drop_duplicates("valid_at").reset_index(drop=True)


def fetch_air_quality_hourly(
    lat: float, lon: float, start: str, end: str, chunk_days: int = 366
) -> pd.DataFrame:
    """CAMS PM2.5 / PM10 for `start .. end` inclusive. Model fields, not observations."""
    frames: list[pd.DataFrame] = []
    cur, last = pd.Timestamp(start).normalize(), pd.Timestamp(end).normalize()
    while cur <= last:
        stop = min(cur + pd.Timedelta(days=chunk_days - 1), last)
        payload = _get(
            AIR_QUALITY_URL,
            {
                "latitude": lat,
                "longitude": lon,
                "start_date": cur.strftime("%Y-%m-%d"),
                "end_date": stop.strftime("%Y-%m-%d"),
                "hourly": ",".join(AIR_QUALITY_VARIABLES),
                "timezone": "GMT",
            },
        )
        frames.append(parse_hourly(payload, _AIR_QUALITY_RENAME))
        cur = stop + pd.Timedelta(days=1)
    if not frames:
        return pd.DataFrame(columns=["valid_at", *_AIR_QUALITY_RENAME.values()])
    return pd.concat(frames, ignore_index=True).drop_duplicates("valid_at").reset_index(drop=True)


def provenance(kind: str, lat: float, lon: float, source: str) -> dict[str, object]:
    """Sidecar metadata for a frame from these endpoints.

    `lat`/`lon` here are the coordinates **requested**; the grid cell actually served is stored in
    the frame's own `lat`/`lon` columns. Keep both — they are not the same thing.
    """
    return {
        "provider": "Open-Meteo",
        "dataset": source,
        "kind": kind,  # "reanalysis" | "model"
        "lat": lat,
        "lon": lon,
        "fetched_at": datetime.now(UTC).isoformat(timespec="seconds"),
        "is_demo": False,
    }
