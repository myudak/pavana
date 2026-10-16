"""Features for the served haze nowcast ("Asap / jarak pandang") at airport METAR stations.

Issue time t = a station-hour with a METAR report. Target at t+h (h = 6 or 24):
**haze-limited visibility** = visibility < 3 km AND present weather contains HZ or FU AND no
precipitation or fog code in that report. Target hours without a report are unknown (dropped).

Every feature uses reports at or before t and FIRMS detections acquired at or before t.
Mirrored in TypeScript (`packages/shared/src/model/haze-features.ts`); keep both in sync.
"""

from __future__ import annotations

import numpy as np
import pandas as pd

from .geo import haversine_km, initial_bearing_deg
from .upwind import DEFAULT_PARAMS
from .wind import wind_from_to_flow_bearing

VIS_KM = 3.0
HORIZONS_H = (6, 24)

FEATURES = (
    "vsby_km",
    "vsby_min_6h_km",
    "vsby_min_24h_km",
    "haze_now",
    "haze_frac_24h",
    "haze_frac_72h",
    "precip_frac_24h",
    "rh_pct",
    "tmpc",
    "wind_speed_ms",
    "hour_local",
    "doy",
    "det_100km_24h",
    "det_300km_72h",
    "upwind_72h",
    "station_month_rate",
)


def haze_event(df: pd.DataFrame) -> pd.Series:
    """1.0 haze-limited report, 0.0 otherwise, NaN when visibility is missing."""
    hz = df["wx_haze"] | df["wx_smoke"]
    clean = ~(df["wx_precip"] | df["wx_fog"])
    ev = ((df["vsby_km"] < VIS_KM) & hz & clean).astype(float)
    return ev.where(df["vsby_km"].notna())


def station_hourly(metar: pd.DataFrame, station: str, tz_offset_h: int) -> pd.DataFrame:
    """Regular hourly frame for one station (NaN rows where no report)."""
    df = metar[metar["station"] == station].sort_values("valid_at")
    df = df.assign(hour=df["valid_at"].dt.floor("h")).groupby("hour").last()
    idx = pd.date_range(df.index.min(), df.index.max(), freq="h")
    df = df.reindex(idx)
    df.index.name = "hour"
    out = pd.DataFrame(index=idx)
    out["reported"] = df["vsby_km"].notna()
    out["vsby_km"] = df["vsby_km"]
    out["event"] = haze_event(df.fillna({c: False for c in ("wx_haze", "wx_smoke", "wx_precip", "wx_fog")}))
    out["haze_wx"] = (df["wx_haze"].fillna(False) | df["wx_smoke"].fillna(False)).astype(float)
    out.loc[~out["reported"], "haze_wx"] = np.nan
    out["precip_wx"] = df["wx_precip"].astype("boolean").astype(float)
    out.loc[~out["reported"], "precip_wx"] = np.nan
    for c in ("rh_pct", "tmpc", "wind_speed_ms", "wind_dir_from_deg"):
        out[c] = df[c].astype(float)
    # Calm (0 kt) reports carry direction 0, which is not "from the north": unknown direction.
    out.loc[out["wind_speed_ms"] == 0, "wind_dir_from_deg"] = np.nan
    out["hour_local"] = ((idx.hour + tz_offset_h) % 24).astype(float)
    out["doy"] = idx.dayofyear.astype(float)
    return out


def _roll(s: pd.Series, hours: int, fn: str) -> pd.Series:
    """Trailing window over the last `hours` hours including t; needs ≥1 report in the window."""
    r = s.rolling(f"{hours}h", min_periods=1)
    return getattr(r, fn)()


def report_features(h: pd.DataFrame) -> pd.DataFrame:
    f = pd.DataFrame(index=h.index)
    f["vsby_km"] = h["vsby_km"]
    f["vsby_min_6h_km"] = _roll(h["vsby_km"], 6, "min")
    f["vsby_min_24h_km"] = _roll(h["vsby_km"], 24, "min")
    f["haze_now"] = h["haze_wx"]
    f["haze_frac_24h"] = _roll(h["haze_wx"], 24, "mean")
    f["haze_frac_72h"] = _roll(h["haze_wx"], 72, "mean")
    f["precip_frac_24h"] = _roll(h["precip_wx"], 24, "mean")
    for c in ("rh_pct", "tmpc", "wind_speed_ms", "hour_local", "doy"):
        f[c] = h[c]
    return f


def fire_features(
    times: pd.DatetimeIndex,
    wind_dir_from: np.ndarray,
    st_lat: float,
    st_lon: float,
    firms: pd.DataFrame,
) -> pd.DataFrame:
    """Detection counts near the station and the upwind exposure score (shared formula).

    upwind_72h = Σ FRP·exp(-d/λ)·max(0, ŵ_to·ĥ_i→station)·exp(-age/τ) over detections within
    300 km acquired in the last 72 h, λ = 50 km, τ = 24 h (DEFAULT_PARAMS, same as upwind.ts).
    NaN when the wind direction is missing (calm/variable): the alignment is undefined.
    """
    p = DEFAULT_PARAMS
    d_all = haversine_km(firms["lat"].to_numpy(), firms["lon"].to_numpy(), st_lat, st_lon)
    near = firms.loc[d_all <= p.max_distance_km].copy()
    near["d"] = d_all[d_all <= p.max_distance_km]
    near = near.sort_values("acquired_at")
    t_det = near["acquired_at"].to_numpy(dtype="datetime64[ns]").astype("int64") / 3.6e12
    d = near["d"].to_numpy()
    brg = np.deg2rad(initial_bearing_deg(near["lat"].to_numpy(), near["lon"].to_numpy(), st_lat, st_lon))
    de, dn = np.sin(brg), np.cos(brg)
    frp = near["frp_mw"].to_numpy(dtype=float)
    frp = np.where(np.isnan(frp), p.frp_fallback, frp)
    base = frp * np.exp(-d / p.lambda_km)
    within100 = (d <= 100).astype(float)
    c100 = np.r_[0, np.cumsum(within100)]

    th = times.to_numpy(dtype="datetime64[ns]").astype("int64") / 3.6e12
    hi = np.searchsorted(t_det, th, side="right")
    lo24 = np.searchsorted(t_det, th - 24, side="right")
    lo72 = np.searchsorted(t_det, th - 72, side="right")
    det100 = c100[hi] - c100[lo24]
    det300 = (hi - lo72).astype(float)
    up = np.full(len(th), np.nan)
    for k in range(len(th)):
        wd = wind_dir_from[k]
        if np.isnan(wd):
            continue
        a, b = lo72[k], hi[k]
        if a == b:
            up[k] = 0.0
            continue
        flow = np.deg2rad(float(wind_from_to_flow_bearing(wd)))
        align = np.maximum(0.0, np.sin(flow) * de[a:b] + np.cos(flow) * dn[a:b])
        align = np.where(d[a:b] < 1e-6, 1.0, align)
        age = th[k] - t_det[a:b]
        up[k] = float(np.sum(base[a:b] * align * np.exp(-age / p.tau_hours)))
    return pd.DataFrame(
        {"det_100km_24h": det100, "det_300km_72h": det300, "upwind_72h": up}, index=times
    )
