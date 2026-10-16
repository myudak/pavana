"""CAMS-only autoregressive proxy. All windows are trailing, with no filling."""

import numpy as np
import pandas as pd

REFERENCE = {"name": "Sungai Raya, Kubu Raya", "lat": -0.0710660252, "lon": 109.3712469865}
FEATURES = (
    "pm25_now",
    "pm25_lag_1h",
    "pm25_lag_3h",
    "pm25_lag_6h",
    "pm25_lag_12h",
    "pm25_lag_24h",
    "pm25_lag_48h",
    "pm25_mean_6h",
    "pm25_mean_24h",
    "pm25_change_3h",
    "hour_sin",
    "hour_cos",
    "doy_sin",
    "doy_cos",
)


def cyclic(index: pd.DatetimeIndex) -> pd.DataFrame:
    return pd.DataFrame(
        {
            "hour_sin": np.sin(2 * np.pi * index.hour / 24),
            "hour_cos": np.cos(2 * np.pi * index.hour / 24),
            "doy_sin": np.sin(2 * np.pi * index.dayofyear / 366),
            "doy_cos": np.cos(2 * np.pi * index.dayofyear / 366),
        },
        index=index,
    )


def feature_table(raw: pd.DataFrame) -> pd.DataFrame:
    df = raw.sort_values("valid_at").set_index("valid_at")
    if not df.index.is_unique:
        raise ValueError("Duplicate CAMS timestamps")
    idx = pd.date_range(df.index.min(), df.index.max(), freq="h")
    s = df["pm25_ug_m3"].reindex(idx)
    f = cyclic(idx)
    f["pm25_now"] = s
    for lag in (1, 3, 6, 12, 24, 48):
        f[f"pm25_lag_{lag}h"] = s.shift(lag)
    for hours in (6, 24):
        f[f"pm25_mean_{hours}h"] = s.rolling(hours, min_periods=hours).mean()
    f["pm25_change_3h"] = s - s.shift(3)
    f["target"] = s.shift(-6)
    f["issue_at"] = idx
    return f.reset_index(drop=True)
