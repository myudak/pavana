"""Keyless NASA FIRMS files: yearly country archives and the rolling 7-day regional CSVs.

Neither needs a `FIRMS_MAP_KEY`:

    yearly:  https://firms.modaps.eosdis.nasa.gov/data/country/viirs-snpp/{Y}/viirs-snpp_{Y}_{C}.csv
    7 days:  https://firms.modaps.eosdis.nasa.gov/data/active_fire/suomi-npp-viirs-c2/csv/
             SUOMI_VIIRS_C2_SouthEast_Asia_7d.csv

Verified 2026-10-16: `viirs-snpp` yearly files exist for Indonesia and Malaysia through 2025
(2026 is not published yet; 404). The yearly files carry a `type` column (0 presumed vegetation
fire, 1 active volcano, 2 other static land source, 3 offshore); the 7-day NRT file does not.

The served hotspot model uses **Suomi NPP only**, so its labels and its live inputs come from one
sensor with one overpass schedule. Mixing satellites would change detection frequency over time
(NOAA-20 from 2018, NOAA-21 from 2023) and a model would learn the constellation, not the fires.

A detection is a satellite thermal anomaly, not a confirmed fire; absence of detections is not
absence of fire (cloud, smoke and canopy hide fires from the sensor).
"""

from __future__ import annotations

import io
import time
from pathlib import Path

import pandas as pd
import requests

COUNTRY_URL = "https://firms.modaps.eosdis.nasa.gov/data/country/{sensor}/{year}/{sensor}_{year}_{country}.csv"
REGIONAL_7D_URL = (
    "https://firms.modaps.eosdis.nasa.gov/data/active_fire/suomi-npp-viirs-c2/csv/"
    "SUOMI_VIIRS_C2_SouthEast_Asia_7d.csv"
)

# (west, south, east, north). Wide enough for Kalimantan plus the Sumatra / Malaysia airports used
# by the haze model, whose upwind features look up to 300 km away.
REGION_BBOX = (93.0, -9.0, 122.0, 9.0)

TIDY_COLUMNS = ("lat", "lon", "acquired_at", "frp_mw", "confidence_class", "fire_type", "daynight")


def parse_firms_csv(text: str) -> pd.DataFrame:
    """Parse a FIRMS VIIRS CSV (yearly archive or 7-day NRT) into the tidy columns.

    `fire_type` is the archive's `type` (missing in NRT files → NaN, never guessed). VIIRS
    `confidence` is a class letter or word; it is normalized to `l` / `n` / `h`.
    """
    text = text.strip()
    if not text or "latitude" not in text.splitlines()[0]:
        return pd.DataFrame(columns=list(TIDY_COLUMNS))
    raw = pd.read_csv(io.StringIO(text), dtype={"acq_time": "string", "acq_date": "string"})
    hhmm = raw["acq_time"].str.strip().str.zfill(4)
    acquired = pd.to_datetime(
        raw["acq_date"].str.strip() + " " + hhmm.str[:2] + ":" + hhmm.str[2:],
        format="%Y-%m-%d %H:%M",
        utc=True,
        errors="coerce",
    )
    conf = raw["confidence"].astype("string").str.strip().str.lower().str[:1]
    out = pd.DataFrame(
        {
            "lat": pd.to_numeric(raw["latitude"], errors="coerce"),
            "lon": pd.to_numeric(raw["longitude"], errors="coerce"),
            "acquired_at": acquired,
            # Missing FRP stays NaN — it is unknown heat, not zero heat.
            "frp_mw": pd.to_numeric(raw.get("frp"), errors="coerce"),
            "confidence_class": conf.where(conf.isin(["l", "n", "h"])),
            "fire_type": pd.to_numeric(raw["type"], errors="coerce")
            if "type" in raw.columns
            else pd.Series(float("nan"), index=raw.index),
            "daynight": raw.get("daynight", pd.Series(pd.NA, index=raw.index)).astype("string"),
        }
    )
    return out.dropna(subset=["lat", "lon", "acquired_at"]).reset_index(drop=True)


def clip_bbox(df: pd.DataFrame, bbox: tuple[float, float, float, float]) -> pd.DataFrame:
    w, s, e, n = bbox
    keep = df["lon"].between(w, e) & df["lat"].between(s, n)
    return df.loc[keep].reset_index(drop=True)


def _download(url: str, tries: int = 4, timeout: int = 300) -> str:
    last: Exception | None = None
    for attempt in range(tries):
        try:
            r = requests.get(url, timeout=timeout)
            if r.status_code == 404:
                raise FileNotFoundError(url)
            r.raise_for_status()
            return r.text
        except requests.RequestException as exc:
            last = exc
            time.sleep(10 * (attempt + 1))
    raise RuntimeError(f"FIRMS download failed: {url} — {last}")


def fetch_country_year(
    year: int,
    country: str,
    cache_dir: Path,
    sensor: str = "viirs-snpp",
    bbox: tuple[float, float, float, float] = REGION_BBOX,
) -> pd.DataFrame:
    """One yearly country archive, clipped to `bbox`, cached as parquet under `cache_dir`."""
    cache_dir.mkdir(parents=True, exist_ok=True)
    path = cache_dir / f"{sensor}_{year}_{country}.parquet"
    if path.exists():
        return pd.read_parquet(path)
    url = COUNTRY_URL.format(sensor=sensor, year=year, country=country)
    df = clip_bbox(parse_firms_csv(_download(url)), bbox)
    df.to_parquet(path, index=False)
    return df


def fetch_recent_7d(timeout: int = 60) -> pd.DataFrame:
    """The rolling 7-day Suomi NPP NRT file for South-East Asia (live inputs). Not reproducible."""
    return clip_bbox(parse_firms_csv(_download(REGIONAL_7D_URL, timeout=timeout)), REGION_BBOX)
