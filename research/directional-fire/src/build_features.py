"""Builds the modelling table for each fire-data latency L (PROTOCOL.md).

    uv run --project ../../ml python src/build_features.py [L ...]   # default: 0 3 6 12 24

One row per station-hour with a METAR report (issue time t), 2015–2025. Columns: station-state
features (group C), fire features with detections acquired at or before t − L (groups D, D0, E
and the rotated-wind placebos), and targets at t+6 h / t+24 h (NaN when unknown).
Output: results/cache/table_L{L}.parquet
"""

import sys
from pathlib import Path

import numpy as np
import pandas as pd
from pavana_ml.data.iem import AIRPORTS
from pavana_ml.features import haze_station as hs
from pavana_ml.features.geo import haversine_km, initial_bearing_deg
from pavana_ml.features.upwind import DEFAULT_PARAMS as P
from pavana_ml.features.wind import wind_from_to_flow_bearing

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data" / "raw" / "data"
CACHE = ROOT / "results" / "cache"
CACHE.mkdir(parents=True, exist_ok=True)
START = pd.Timestamp("2015-01-01", tz="UTC")
END = pd.Timestamp("2026-01-01", tz="UTC")  # exclusive; 2026 is out of the main study
VIS_CAP_KM = 10.0


def fire_block(times, wind_from, st_lat, st_lon, firms, lag_h):
    """Counts, non-directional (iso) and directional (dir, rot180, rot90) exposure at each t."""
    d_all = haversine_km(firms["lat"].to_numpy(), firms["lon"].to_numpy(), st_lat, st_lon)
    near = firms.loc[d_all <= P.max_distance_km].copy()
    near["d"] = d_all[d_all <= P.max_distance_km]
    near = near.sort_values("acquired_at")
    t_det = near["acquired_at"].to_numpy(dtype="datetime64[ns]").astype("int64") / 3.6e12
    d = near["d"].to_numpy()
    brg = np.deg2rad(initial_bearing_deg(near["lat"].to_numpy(), near["lon"].to_numpy(), st_lat, st_lon))
    de, dn = np.sin(brg), np.cos(brg)
    frp = near["frp_mw"].to_numpy(dtype=float)
    frp = np.where(np.isnan(frp), P.frp_fallback, frp)
    base = frp * np.exp(-d / P.lambda_km)
    c100 = np.r_[0, np.cumsum((d <= 100).astype(float))]

    th = times.to_numpy(dtype="datetime64[ns]").astype("int64") / 3.6e12 - lag_h
    hi = np.searchsorted(t_det, th, side="right")
    lo24 = np.searchsorted(t_det, th - 24, side="right")
    lo72 = np.searchsorted(t_det, th - 72, side="right")
    n = len(th)
    out = {
        "det_100km_24h": c100[hi] - c100[lo24],
        "det_300km_72h": (hi - lo72).astype(float),
        "iso_72h": np.zeros(n),
        "upwind_72h": np.full(n, np.nan),
        "rot180_72h": np.full(n, np.nan),
        "rot90_72h": np.full(n, np.nan),
    }
    for k in range(n):
        a, b = lo72[k], hi[k]
        if a == b:
            if not np.isnan(wind_from[k]):
                out["upwind_72h"][k] = out["rot180_72h"][k] = out["rot90_72h"][k] = 0.0
            continue
        w = base[a:b] * np.exp(-(th[k] - t_det[a:b]) / P.tau_hours)
        out["iso_72h"][k] = float(w.sum())
        wd = wind_from[k]
        if np.isnan(wd):
            continue
        dd = d[a:b] < 1e-6
        for key, rot in (("upwind_72h", 0.0), ("rot180_72h", 180.0), ("rot90_72h", 90.0)):
            flow = np.deg2rad(float(wind_from_to_flow_bearing((wd + rot) % 360)))
            align = np.maximum(0.0, np.sin(flow) * de[a:b] + np.cos(flow) * dn[a:b])
            align = np.where(dd, 1.0, align)
            out[key][k] = float(np.sum(w * align))
    return pd.DataFrame(out, index=times)


def persistent_wind_from(h: pd.DataFrame) -> pd.Series:
    """Speed-weighted vector-mean wind FROM direction over the last 24 h of reports (exploratory).

    Smoke arriving over a 72 h window follows the persistent flow rather than one hourly surface
    report. NaN when the 24 h mean vector is (near) zero or no wind was reported.
    """
    rad = np.deg2rad(h["wind_dir_from_deg"])
    spd = h["wind_speed_ms"]
    u = (np.sin(rad) * spd).rolling("24h", min_periods=3).mean()
    v = (np.cos(rad) * spd).rolling("24h", min_periods=3).mean()
    mag = np.hypot(u, v)
    out = (np.rad2deg(np.arctan2(u, v)) + 360) % 360
    return out.where(mag > 0.3)


def directional_only(times, wind_from, st_lat, st_lon, firms, lag_h, prefix):
    """Directional exposure and its 180° placebo for an alternative wind series."""
    full = fire_block(times, wind_from, st_lat, st_lon, firms, lag_h)
    return full[["upwind_72h", "rot180_72h"]].rename(
        columns={"upwind_72h": f"upwind_{prefix}_72h", "rot180_72h": f"rot180_{prefix}_72h"}
    )


def build(lag_h: int) -> Path:
    metar = pd.read_parquet(DATA / "metar.parquet")
    metar["vsby_km"] = metar["vsby_km"].clip(upper=VIS_CAP_KM)
    firms = pd.read_parquet(DATA / "firms_snpp.parquet")
    firms = firms[(firms["acquired_at"] >= START - pd.Timedelta(days=4)) & (firms["acquired_at"] < END)]
    frames = []
    for a in AIRPORTS:
        h = hs.station_hourly(metar, a.icao, a.tz_offset_h)
        if h.empty:
            continue
        f = hs.report_features(h)
        wd = h["wind_dir_from_deg"]
        f["wind_dir_sin"] = np.sin(np.deg2rad(wd))
        f["wind_dir_cos"] = np.cos(np.deg2rad(wd))
        f["month"] = h.index.month
        f["current_event"] = h["event"]
        for hz in (6, 24):
            f[f"y_{hz}h"] = h["event"].shift(-hz)
        f = f[h["reported"] & (h.index >= START) & (h.index < END)]
        fire = fire_block(f.index, wd.loc[f.index].to_numpy(), a.lat, a.lon, firms, lag_h)
        f = f.join(fire)
        pw_series = persistent_wind_from(h)
        pw = pw_series.loc[f.index].to_numpy()
        f = f.join(directional_only(f.index, pw, a.lat, a.lon, firms, lag_h, "p24"))
        # Placebo: the same station's wind 168 h earlier (same hour of day and season, unrelated
        # synoptic situation). Unlike rotations, this breaks the wind-fire geometry entirely.
        ws = wd.shift(168).loc[f.index].to_numpy()
        f = f.join(directional_only(f.index, ws, a.lat, a.lon, firms, lag_h, "shift"))
        pws = pw_series.shift(168).loc[f.index].to_numpy()
        f = f.join(directional_only(f.index, pws, a.lat, a.lon, firms, lag_h, "pshift"))
        f["station"] = a.icao
        f["country"] = "MY" if a.icao.startswith("WB") else "ID"
        frames.append(f.reset_index(names="issue_at"))
        print(f"L={lag_h}h {a.icao}: {len(f):,} rows", flush=True)
    df = pd.concat(frames, ignore_index=True)
    path = CACHE / f"table_L{lag_h}.parquet"
    df.to_parquet(path, index=False)
    print(f"wrote {path} ({len(df):,} rows)")
    return path


if __name__ == "__main__":
    lags = [int(x) for x in sys.argv[1:]] or [0, 3, 6, 12, 24]
    for lag in lags:
        build(lag)
