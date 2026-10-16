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
import re
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
_WX_TOKEN = re.compile(
    r"^(?:[-+]|VC)?(?:MI|BC|PR|DR|BL|SH|TS|FZ)?(?:DZ|RA|SN|SG|IC|PL|GR|GS|UP|BR|FG|FU|VA|DU|SA|HZ|PY|PO|SQ|FC|SS|DS)+$"
)


def normalise_wx(code: object, metar: object) -> str | None:
    """IEM uses M for both absent weather and missing fields; inspect the original report.

    A parseable visibility group with no weather token means no significant present weather.
    An absent/NIL/partial raw report remains unknown. Trend groups are excluded.
    """
    if pd.notna(code) and str(code) not in ("M", "T"):
        return str(code)
    if pd.isna(metar):
        return None
    body = re.split(r"\b(?:TEMPO|BECMG|NOSIG)\b", str(metar).upper())[0]
    if "NIL" in body or not re.search(r"\b\d{6}Z\b", body):
        return None
    if not re.search(r"(?:\bCAVOK\b|\b\d{4}\b|\b\d+(?:/\d+)?SM\b)", body):
        return None
    if "////" in body:
        return None
    return " ".join(t for t in body.split() if _WX_TOKEN.fullmatch(t))


def wx_flags(wxcodes: pd.Series) -> pd.DataFrame:
    """Nullable flags: blank means no significant weather; a missing code stays unknown."""
    s = wxcodes.astype("string").str.upper()
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
    raw = pd.read_csv(io.StringIO(text), na_values=["M", "T"], keep_default_na=False)
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
    original = raw.get("metar", pd.Series(pd.NA, index=raw.index))
    out["raw_metar"] = original
    out["wxcodes"] = pd.Series(
        [normalise_wx(c, m) for c, m in zip(out["wxcodes"], original.loc[out.index], strict=True)],
        index=out.index,
        dtype="string",
    )
    out = pd.concat(
        [out.reset_index(drop=True), wx_flags(out["wxcodes"]).reset_index(drop=True)], axis=1
    )
    # Relative humidity from temperature and dew point (Magnus); NaN when either is missing.
    a, b = 17.625, 243.04
    t, td = out["tmpc"], out["dwpc"]
    out["rh_pct"] = 100.0 * np.exp(a * td / (b + td) - a * t / (b + t))
    # Inconsistent temperature/dew-point reports are unknown, never clipped into valid data.
    out.loc[~out["rh_pct"].between(0, 100), "rh_pct"] = np.nan
    out.loc[~out["wind_dir_from_deg"].between(0, 360), "wind_dir_from_deg"] = np.nan
    for col in ("wind_speed_ms", "vsby_km"):
        out.loc[out[col] < 0, col] = np.nan
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
        *[("data", d) for d in ("vsby", "wxcodes", "metar", "tmpf", "dwpf", "drct", "sknt")],
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
    """One whole report per completed UTC hour, labelled at the hour END."""
    if df.empty:
        return df
    out = df.sort_values("valid_at").copy()
    out["hour"] = out["valid_at"].dt.ceil("h")
    return out.drop_duplicates(["station", "hour"], keep="last").reset_index(drop=True)
