"""Airport METAR observations from the Iowa Environmental Mesonet (IEM) ASOS archive. No key.

    https://mesonet.agron.iastate.edu/cgi-bin/request/asos.py

These are **observations**: visibility estimated by the airport observer or sensor, and present
weather codes (`HZ` haze, `FU` smoke, `BR` mist, `FG` fog, `RA`/`DZ`/`SH`/`TS` precipitation).
`vsby` is reported in statute miles and converted here to km. Missing stays NaN.

Verified 2026-10-16: the stations below have hourly reports from 2015. Palangka Raya (WAGG) has
no archive at IEM, so the haze model cannot cover it directly.
"""

from __future__ import annotations

import io
import time
from dataclasses import dataclass
from pathlib import Path

import numpy as np
import pandas as pd
import requests

ASOS_URL = "https://mesonet.agron.iastate.edu/cgi-bin/request/asos.py"
MILE_KM = 1.609344


@dataclass(frozen=True)
class Airport:
    icao: str
    name: str
    lat: float
    lon: float
    tz_offset_h: int


AIRPORTS: tuple[Airport, ...] = (
    Airport("WIOO", "Pontianak (Supadio)", -0.1507, 109.4039, 7),
    Airport("WAOO", "Banjarmasin (Syamsudin Noor)", -3.4424, 114.7626, 8),
    Airport("WALL", "Balikpapan (Sepinggan)", -1.2683, 116.8945, 8),
    Airport("WAQQ", "Tarakan (Juwata)", 3.3267, 117.5694, 8),
    Airport("WBGG", "Kuching", 1.4833, 110.3333, 8),
    Airport("WBGS", "Sibu", 2.2616, 111.9853, 8),
    Airport("WBGR", "Miri", 4.3220, 113.9869, 8),
    Airport("WBGB", "Bintulu", 3.2000, 113.0333, 8),
    Airport("WBKK", "Kota Kinabalu", 5.9372, 116.0510, 8),
    Airport("WIBB", "Pekanbaru (Sultan Syarif Kasim II)", 0.4608, 101.4445, 7),
    Airport("WIPP", "Palembang (Sultan Mahmud Badaruddin II)", -2.8983, 104.6997, 7),
    Airport("WIDD", "Batam (Hang Nadim)", 1.1210, 104.1190, 7),
)
AIRPORTS_BY_ICAO = {a.icao: a for a in AIRPORTS}

# Present-weather tokens that explain low visibility without smoke.
_PRECIP = ("RA", "DZ", "SH", "TS", "GR", "GS", "SN", "PL", "UP")


def wx_flags(wxcodes: pd.Series) -> pd.DataFrame:
    """Boolean flags from METAR present-weather strings. Missing codes → all False (no report)."""
    s = wxcodes.astype("string").fillna("").str.upper()
    return pd.DataFrame(
        {
            "wx_haze": s.str.contains("HZ", regex=False),
            "wx_smoke": s.str.contains("FU", regex=False),
            "wx_mist": s.str.contains("BR", regex=False),
            "wx_fog": s.str.contains("FG", regex=False),
            "wx_precip": s.str.contains("|".join(_PRECIP), regex=True),
        }
    )


def parse_asos_csv(text: str) -> pd.DataFrame:
    """Tidy IEM `format=onlycomma` output: UTC `valid_at`, `vsby_km`, weather flags, METAR wx."""
    text = text.strip()
    if not text or not text.startswith("station"):
        return pd.DataFrame(columns=["station", "valid_at", "vsby_km"])
    raw = pd.read_csv(io.StringIO(text), na_values=["M", "T", ""], keep_default_na=False)
    out = pd.DataFrame(
        {
            "station": raw["station"].astype("string"),
            "valid_at": pd.to_datetime(raw["valid"], utc=True, errors="coerce"),
            "vsby_km": pd.to_numeric(raw.get("vsby"), errors="coerce") * MILE_KM,
            "tmpc": (pd.to_numeric(raw.get("tmpf"), errors="coerce") - 32.0) * 5.0 / 9.0,
            "dwpc": (pd.to_numeric(raw.get("dwpf"), errors="coerce") - 32.0) * 5.0 / 9.0,
            "wind_dir_from_deg": pd.to_numeric(raw.get("drct"), errors="coerce"),
            "wind_speed_ms": pd.to_numeric(raw.get("sknt"), errors="coerce") * 0.514444,
            "wxcodes": raw.get("wxcodes", pd.Series(pd.NA, index=raw.index)).astype("string"),
        }
    )
    out = out.dropna(subset=["valid_at"])
    out = pd.concat([out.reset_index(drop=True), wx_flags(out["wxcodes"]).reset_index(drop=True)], axis=1)
    # Relative humidity from temperature and dew point (Magnus); NaN when either is missing.
    a, b = 17.625, 243.04
    t, td = out["tmpc"], out["dwpc"]
    out["rh_pct"] = 100.0 * np.exp(a * td / (b + td) - a * t / (b + t))
    return out


def fetch_station(
    icao: str, start: str, end: str, cache_dir: Path, tries: int = 4, timeout: int = 300
) -> pd.DataFrame:
    """Routine + special METARs (report_type 3, 4) for `start .. end` (UTC dates), cached."""
    cache_dir.mkdir(parents=True, exist_ok=True)
    path = cache_dir / f"metar_{icao}_{start}_{end}.parquet"
    if path.exists():
        return pd.read_parquet(path)
    s, e = pd.Timestamp(start), pd.Timestamp(end)
    params = [
        ("station", icao),
        *[("data", d) for d in ("vsby", "wxcodes", "tmpf", "dwpf", "drct", "sknt")],
        ("year1", s.year),
        ("month1", s.month),
        ("day1", s.day),
        ("year2", e.year),
        ("month2", e.month),
        ("day2", e.day),
        ("tz", "Etc/UTC"),
        ("format", "onlycomma"),
        ("latlon", "no"),
        ("missing", "M"),
        ("trace", "T"),
        ("direct", "no"),
        ("report_type", 3),
        ("report_type", 4),
    ]
    last: Exception | None = None
    for attempt in range(tries):
        try:
            r = requests.get(ASOS_URL, params=params, timeout=timeout)
            r.raise_for_status()
            df = parse_asos_csv(r.text)
            df.to_parquet(path, index=False)
            return df
        except requests.RequestException as exc:
            last = exc
            time.sleep(15 * (attempt + 1))
    raise RuntimeError(f"IEM download failed for {icao}: {last}")


def hourly(df: pd.DataFrame) -> pd.DataFrame:
    """One row per station-hour: the last report in each UTC hour (specials supersede routine)."""
    if df.empty:
        return df
    out = df.sort_values("valid_at").copy()
    out["hour"] = out["valid_at"].dt.floor("h")
    return out.groupby(["station", "hour"], as_index=False).last()
