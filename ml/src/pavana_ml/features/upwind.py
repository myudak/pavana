"""Wind-aware upwind hotspot exposure — a FEATURE, not a plume model.

    S(x,t) = Σ_i FRP_i · exp(-d_i / λ) · max(0, ŵ_to · ĥ_i→x) · exp(-age_i / τ)

Mirrors packages/shared/src/math/upwind.ts (keep in sync; shared test vectors).
Never interpret S as a probability that smoke reaches a location.
"""

from dataclasses import dataclass

import numpy as np
import pandas as pd

from .geo import bearing_to_unit, haversine_km, initial_bearing_deg
from .wind import wind_from_to_flow_bearing


@dataclass(frozen=True)
class UpwindParams:
    lambda_km: float = 50.0
    tau_hours: float = 24.0
    max_distance_km: float = 300.0
    frp_fallback: float = 1.0


DEFAULT_PARAMS = UpwindParams()


@dataclass(frozen=True)
class UpwindResult:
    score: float
    contributing_count: int
    considered_count: int


def upwind_exposure_score(
    target_lat: float,
    target_lon: float,
    wind_dir_from_deg: float,
    hs_lat: np.ndarray,
    hs_lon: np.ndarray,
    hs_frp_mw: np.ndarray,
    hs_age_hours: np.ndarray,
    params: UpwindParams = DEFAULT_PARAMS,
) -> UpwindResult:
    hs_lat, hs_lon = np.asarray(hs_lat, dtype=float), np.asarray(hs_lon, dtype=float)
    frp = np.asarray(hs_frp_mw, dtype=float)
    age = np.asarray(hs_age_hours, dtype=float)
    if hs_lat.size == 0:
        return UpwindResult(0.0, 0, 0)

    d = haversine_km(hs_lat, hs_lon, target_lat, target_lon)
    keep = (d <= params.max_distance_km) & (age >= 0)
    considered = int(keep.sum())
    if considered == 0:
        return UpwindResult(0.0, 0, 0)

    we, wn = bearing_to_unit(wind_from_to_flow_bearing(wind_dir_from_deg))
    de, dn = bearing_to_unit(initial_bearing_deg(hs_lat, hs_lon, target_lat, target_lon))
    alignment = np.where(d < 1e-6, 1.0, np.maximum(0.0, we * de + wn * dn))
    frp = np.where(np.isnan(frp), params.frp_fallback, frp)
    contrib = frp * np.exp(-d / params.lambda_km) * alignment * np.exp(-age / params.tau_hours)
    contrib = np.where(keep, contrib, 0.0)
    return UpwindResult(float(contrib.sum()), int((contrib > 0).sum()), considered)


def upwind_series(
    hourly: pd.DataFrame,
    hotspots: pd.DataFrame,
    target_lat: float,
    target_lon: float,
    window_hours: float = 48.0,
    params: UpwindParams = DEFAULT_PARAMS,
) -> pd.DataFrame:
    """Per-hour upwind score using only detections acquired AT OR BEFORE each hour (no leakage).

    `hourly` needs `valid_at` and `wind_dir_from_deg`; `hotspots` needs
    `lat, lon, acquired_at, frp_mw`.
    """
    rows = []
    for t, wdir in zip(hourly["valid_at"], hourly["wind_dir_from_deg"], strict=True):
        age_h = (t - hotspots["acquired_at"]).dt.total_seconds().to_numpy() / 3600.0
        visible = (age_h >= 0) & (age_h <= window_hours)
        if pd.isna(wdir):
            rows.append(
                {
                    "valid_at": t,
                    "upwind_score": np.nan,
                    "upwind_n": np.nan,
                    "hotspots_n": int(visible.sum()),
                }
            )
            continue
        r = upwind_exposure_score(
            target_lat,
            target_lon,
            float(wdir),
            hotspots["lat"].to_numpy()[visible],
            hotspots["lon"].to_numpy()[visible],
            hotspots["frp_mw"].to_numpy(dtype=float, na_value=np.nan)[visible],
            age_h[visible],
            params,
        )
        rows.append(
            {
                "valid_at": t,
                "upwind_score": r.score,
                "upwind_n": r.contributing_count,
                "hotspots_n": r.considered_count,
            }
        )
    return pd.DataFrame(rows)
