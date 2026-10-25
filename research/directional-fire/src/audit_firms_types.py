"""Share of non-vegetation FIRMS detections near each airport (2015-2025, within 300 km).

    uv run --project ../../ml python -I src/audit_firms_types.py

FIRMS archive `type`: 0 presumed vegetation fire, 1 active volcano, 2 other static land source
(e.g. gas flares), 3 offshore. "weighted" uses the exposure kernel FRP * exp(-d / 50 km).
Writes results/audit/firms_types.csv.
"""

from pathlib import Path

import numpy as np
import pandas as pd
from pavana_ml.data.iem import AIRPORTS
from pavana_ml.features.geo import haversine_km
from pavana_ml.features.upwind import DEFAULT_PARAMS as P

ROOT = Path(__file__).resolve().parent.parent


def main():
    f = pd.read_parquet(ROOT / "data" / "raw" / "data" / "firms_snpp.parquet")
    f = f[(f["acquired_at"] >= "2015-01-01") & (f["acquired_at"] < "2026-01-01")]
    rows = []
    for a in AIRPORTS:
        d = haversine_km(f["lat"].to_numpy(), f["lon"].to_numpy(), a.lat, a.lon)
        w = d <= P.max_distance_km
        nonveg = f["fire_type"].to_numpy()[w] != 0
        wt = f["frp_mw"].fillna(P.frp_fallback).to_numpy()[w] * np.exp(-d[w] / P.lambda_km)
        rows.append({"station": a.icao, "detections": int(w.sum()),
                     "nonveg_pct": 100 * float(nonveg.mean()),
                     "nonveg_weighted_pct": 100 * float(wt[nonveg].sum() / wt.sum())})  # fmt: skip
    out = pd.DataFrame(rows)
    out.to_csv(ROOT / "results" / "audit" / "firms_types.csv", index=False)
    print(out.round(1).to_string(index=False))


if __name__ == "__main__":
    main()
