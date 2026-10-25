"""Extra controls requested in review round 1 (PROTOCOL.md, change log 2026-10-25). L = 3 h only.

    uv run --project ../../ml python -I src/review_controls.py

Adds columns aligned row-for-row with results/cache/table_L3.parquet and writes
results/cache/review_L3.parquet:

- Wind-report category of the selected hourly METAR: calm (00000KT), variable (VRB), wind group
  missing for another reason, or a defined direction. Indicators plus the non-directional
  exposure split by category (iso_def / iso_calm / iso_vrb / iso_wmiss).
- upwind_perm{1,2,3}_72h: directional exposure with directions permuted among the defined hours of
  the same station and calendar month (mask identical to the real feature, geometry broken).
- upwind_shift{72,336,720}_72h: wind from k hours earlier (its own missingness), as Rshift.
- upwind_shiftm168_72h: wind from 168 h earlier (last defined value at or before t-168 h), used
  only where the current direction is defined (mask identical to the real feature).
- Vegetation-only fire features (FIRMS type 0): counts, iso, upwind, shift-168 upwind.

Also writes results/tables/shift_diagnostics.csv and results/tables/target_audit.csv.
"""

import re
import sys
from pathlib import Path

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent))  # run with python -I
from pavana_ml.data.iem import AIRPORTS, hourly  # noqa: E402
from pavana_ml.features.geo import haversine_km, initial_bearing_deg  # noqa: E402
from pavana_ml.features.upwind import DEFAULT_PARAMS as P  # noqa: E402
from pavana_ml.features.wind import wind_from_to_flow_bearing  # noqa: E402

from build_features import DATA, END, START, fire_block  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
CACHE = ROOT / "results" / "cache"
TABLES = ROOT / "results" / "tables"
LAG = 3
SHIFTS = (72, 336, 720)
VRB = re.compile(r"\bVRB\d{2,3}(?:G\d{2,3})?(?:KT|MPS)\b")


def upwind_only(times, wind_from, st_lat, st_lon, firms, lag_h):
    """Directional exposure only (same formula as build_features.fire_block)."""
    d_all = haversine_km(firms["lat"].to_numpy(), firms["lon"].to_numpy(), st_lat, st_lon)
    near = firms.loc[d_all <= P.max_distance_km].copy()
    near["d"] = d_all[d_all <= P.max_distance_km]
    near = near.sort_values("acquired_at")
    t_det = near["acquired_at"].to_numpy(dtype="datetime64[ns]").astype("int64") / 3.6e12
    d = near["d"].to_numpy()
    brg = np.deg2rad(initial_bearing_deg(near["lat"].to_numpy(), near["lon"].to_numpy(), st_lat, st_lon))
    de, dn = np.sin(brg), np.cos(brg)
    frp = near["frp_mw"].to_numpy(dtype=float)
    base = np.where(np.isnan(frp), P.frp_fallback, frp) * np.exp(-d / P.lambda_km)
    th = times.to_numpy(dtype="datetime64[ns]").astype("int64") / 3.6e12 - lag_h
    hi = np.searchsorted(t_det, th, side="right")
    lo = np.searchsorted(t_det, th - 72, side="right")
    out = np.full(len(th), np.nan)
    for k in range(len(th)):
        wd = wind_from[k]
        if np.isnan(wd):
            continue
        a, b = lo[k], hi[k]
        if a == b:
            out[k] = 0.0
            continue
        w = base[a:b] * np.exp(-(th[k] - t_det[a:b]) / P.tau_hours)
        flow = np.deg2rad(float(wind_from_to_flow_bearing(wd)))
        align = np.maximum(0.0, np.sin(flow) * de[a:b] + np.cos(flow) * dn[a:b])
        out[k] = float(np.sum(w * np.where(d[a:b] < 1e-6, 1.0, align)))
    return out


def wind_category(rep: pd.DataFrame) -> pd.Series:
    """calm / vrb / wmiss / defined for the selected report of each hour."""
    raw = rep["raw_metar"].fillna("").astype(str)
    spd = rep["wind_speed_ms"]
    cat = pd.Series("defined", index=rep.index)
    cat[rep["wind_dir_from_deg"].isna() | spd.isna()] = "wmiss"
    cat[raw.str.contains(VRB) & (spd > 0)] = "vrb"
    cat[spd == 0] = "calm"
    return cat


def mean_cos(a, b):
    ok = ~(np.isnan(a) | np.isnan(b))
    return float(np.mean(np.cos(np.deg2rad(a[ok] - b[ok])))), int(ok.sum())


def main():
    table = pd.read_parquet(CACHE / f"table_L{LAG}.parquet", columns=["issue_at", "station", "iso_72h",
                                                                      "wind_dir_sin", "current_event",
                                                                      "y_24h", "det_300km_72h"])  # fmt: skip
    metar = pd.read_parquet(DATA / "metar.parquet")
    firms = pd.read_parquet(DATA / "firms_snpp.parquet")
    firms = firms[(firms["acquired_at"] >= START - pd.Timedelta(days=4)) & (firms["acquired_at"] < END)]
    veg = firms[firms["fire_type"] == 0]
    parts, diag, audit = [], [], []
    for a in AIRPORTS:
        rows = table[table["station"] == a.icao]
        if rows.empty:
            continue
        rep = hourly(metar[metar["station"] == a.icao]).set_index("hour")
        n_per_hour = metar[metar["station"] == a.icao]["valid_at"].dt.ceil("h").value_counts()
        rep = rep.reindex(pd.date_range(rep.index.min(), rep.index.max(), freq="h"))
        wd = rep["wind_dir_from_deg"].where(rep["wind_speed_ms"] != 0)  # calm → unknown (as served)
        cat = wind_category(rep)
        t = pd.DatetimeIndex(rows["issue_at"])
        out = pd.DataFrame(index=rows.index)
        c = cat.reindex(t).to_numpy()
        for k in ("calm", "vrb", "wmiss"):
            out[f"wind_{k}"] = (c == k).astype(float)
        iso = rows["iso_72h"].to_numpy()
        for k, name in (("defined", "def"), ("calm", "calm"), ("vrb", "vrb"), ("wmiss", "wmiss")):
            out[f"iso_{name}_72h"] = np.where(c == k, iso, 0.0)
        wd_t = wd.reindex(t).to_numpy()
        assert np.array_equal(np.isnan(wd_t), rows["wind_dir_sin"].isna().to_numpy()), a.icao
        # Permutation within station x calendar month, defined hours only (mask preserved).
        ym = t.year * 100 + t.month
        for seed in (1, 2, 3):
            rng = np.random.default_rng(seed * 1000 + int(a.icao.encode().hex(), 16) % 997)
            perm = wd_t.copy()
            for m in np.unique(ym):
                idx = np.flatnonzero((ym == m) & ~np.isnan(wd_t))
                perm[idx] = wd_t[rng.permutation(idx)]
            out[f"upwind_perm{seed}_72h"] = upwind_only(t, perm, a.lat, a.lon, firms, LAG)
            if seed == 1:
                mc, n = mean_cos(wd_t, perm)
                diag.append({"station": a.icao, "shift": "perm1", "mean_cos": mc, "n": n,
                             "mask_agree": 1.0})  # fmt: skip
        for k in (*SHIFTS, 168):
            ws = wd.shift(k).reindex(t).to_numpy()
            if k in SHIFTS:
                out[f"upwind_shift{k}_72h"] = upwind_only(t, ws, a.lat, a.lon, firms, LAG)
            mc, n = mean_cos(wd_t, ws)
            diag.append({"station": a.icao, "shift": f"{k}h", "mean_cos": mc, "n": n,
                         "mask_agree": float(np.mean(np.isnan(wd_t) == np.isnan(ws)))})  # fmt: skip
        wsm = wd.ffill().shift(168).reindex(t).to_numpy()
        wsm = np.where(np.isnan(wd_t), np.nan, wsm)
        out["upwind_shiftm168_72h"] = upwind_only(t, wsm, a.lat, a.lon, firms, LAG)
        vb = fire_block(t, wd_t, a.lat, a.lon, veg, LAG)
        out["det_100km_24h_veg"] = vb["det_100km_24h"].to_numpy()
        out["det_300km_72h_veg"] = vb["det_300km_72h"].to_numpy()
        out["iso_72h_veg"] = vb["iso_72h"].to_numpy()
        out["upwind_72h_veg"] = vb["upwind_72h"].to_numpy()
        out["upwind_shift_72h_veg"] = upwind_only(t, wd.shift(168).reindex(t).to_numpy(), a.lat, a.lon, veg, LAG)
        parts.append(out)
        # Target audit for this station (issue hours = reported hours, 2015-2025).
        ev = (rows["current_event"] == 1).to_numpy()
        rr = rep.reindex(t)
        audit.append({
            "station": a.icao, "hours": len(rows), "event_hours": int(ev.sum()),
            "multi_report_hours_pct": 100 * float((n_per_hour.reindex(t).fillna(0) > 1).mean()),
            "cor_pct": 100 * float(rr["raw_metar"].fillna("").str.contains(r"\bCOR\b").mean()),
            "auto_pct": 100 * float(rr["raw_metar"].fillna("").str.contains(r"\bAUTO\b").mean()),
            "calm_pct": 100 * float((c == "calm").mean()), "vrb_pct": 100 * float((c == "vrb").mean()),
            "wmiss_pct": 100 * float((c == "wmiss").mean()),
            "event_calm_pct": 100 * float((c[ev] == "calm").mean()) if ev.any() else np.nan,
            "event_vrb_pct": 100 * float((c[ev] == "vrb").mean()) if ev.any() else np.nan,
            "event_jul_nov_pct": 100 * float(t[ev].month.isin(range(7, 12)).mean()) if ev.any() else np.nan,
            "event_fire300_pct": 100 * float((rows["det_300km_72h"].to_numpy()[ev] > 0).mean()) if ev.any() else np.nan,
            "nonevent_fire300_pct": 100 * float((rows["det_300km_72h"].to_numpy()[~ev] > 0).mean()),
            "event_fu_pct": (100 * float(rr.loc[ev, "wx_smoke"].fillna(False).astype(bool).mean())
                             if ev.any() else np.nan),
        })  # fmt: skip
        print(a.icao, len(rows), flush=True)
    res = pd.concat(parts).loc[table.index]
    res.to_parquet(CACHE / f"review_L{LAG}.parquet", index=False)
    pd.DataFrame(diag).to_csv(TABLES / "shift_diagnostics.csv", index=False)
    au = pd.DataFrame(audit)
    tot = {"station": "ALL", "hours": au["hours"].sum(), "event_hours": au["event_hours"].sum()}
    for col in au.columns[3:]:
        w = au["event_hours"] if col.startswith("event_") else au["hours"]
        tot[col] = float(np.nansum(au[col] * w) / w[au[col].notna()].sum())
    au = pd.concat([au, pd.DataFrame([tot])], ignore_index=True)
    au.to_csv(TABLES / "target_audit.csv", index=False)
    print(au.round(1).to_string(index=False))
    d = pd.DataFrame(diag)
    print(d.groupby("shift")[["mean_cos", "mask_agree"]].mean().round(3))


if __name__ == "__main__":
    main()
