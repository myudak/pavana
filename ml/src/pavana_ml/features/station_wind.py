"""End-labelled station-hour wind vector features, mirrored in TypeScript."""

import numpy as np
import pandas as pd

from .pm25 import cyclic

FEATURES = (
    "u_now",
    "v_now",
    "u_lag_1h",
    "v_lag_1h",
    "u_lag_3h",
    "v_lag_3h",
    "u_lag_6h",
    "v_lag_6h",
    "u_mean_6h",
    "v_mean_6h",
    "u_mean_24h",
    "v_mean_24h",
    "tmpc",
    "rh_pct",
    "hour_sin",
    "hour_cos",
    "doy_sin",
    "doy_cos",
    "station_lat",
    "station_lon",
)


def components(speed, direction) -> tuple:
    rad = np.deg2rad(direction)
    # A zero speed defines a zero vector even if a direction wasn't reported.
    return np.where(speed == 0, 0, -speed * np.sin(rad)), np.where(
        speed == 0, 0, -speed * np.cos(rad)
    )


def feature_table(h: pd.DataFrame, lat: float, lon: float) -> pd.DataFrame:
    u, v = components(h["wind_speed_ms"], h["wind_dir_from_deg"])
    f = cyclic(h.index)
    for name, a in (("u", u), ("v", v)):
        s = pd.Series(a, index=h.index)
        f[f"{name}_now"] = s
        for lag in (1, 3, 6):
            f[f"{name}_lag_{lag}h"] = s.shift(lag)
        for hours in (6, 24):
            # Like METAR haze windows: at least one valid whole report, never imputed.
            f[f"{name}_mean_{hours}h"] = s.rolling(hours, min_periods=1).mean()
        f[f"target_{name}"] = s.shift(-6)
    f["tmpc"], f["rh_pct"] = h["tmpc"], h["rh_pct"]
    f["station_lat"], f["station_lon"] = lat, lon
    f["issue_at"] = h.index
    f["report_at"] = h["report_at"]
    return f.loc[h["reported"]].reset_index(drop=True)
