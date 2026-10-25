"""Data audit for the haze-visibility study: per-station coverage, cadence, event rates, coding
habits, and FIRMS coverage. Writes results/audit/*.csv and prints a summary.

    uv run --project ../../ml python src/audit_data.py
"""

from pathlib import Path

import pandas as pd
from pavana_ml.data.iem import AIRPORTS
from pavana_ml.features import haze_station as hs

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data" / "raw" / "data"
OUT = ROOT / "results" / "audit"
OUT.mkdir(parents=True, exist_ok=True)

metar = pd.read_parquet(DATA / "metar.parquet")
firms = pd.read_parquet(DATA / "firms_snpp.parquet")

rows = []
yearly = []
for a in AIRPORTS:
    m = metar[metar["station"] == a.icao]
    if m.empty:
        rows.append({"station": a.icao, "name": a.name, "reports": 0})
        continue
    h = hs.station_hourly(metar, a.icao, a.tz_offset_h)
    rep = h["reported"]
    ev = h["event"]
    vis = m["vsby_km"].dropna()
    gaps = rep.astype(int).groupby((rep != rep.shift()).cumsum()).agg(["first", "size"])
    longest_gap_h = int(gaps.loc[gaps["first"] == 0, "size"].max()) if (gaps["first"] == 0).any() else 0
    rows.append(
        {
            "station": a.icao,
            "name": a.name,
            "lat": a.lat,
            "lon": a.lon,
            "first": h.index.min(),
            "last": h.index.max(),
            "reports": int(len(m)),
            "hours_span": int(len(h)),
            "hours_reported_pct": round(100 * rep.mean(), 1),
            "longest_gap_h": longest_gap_h,
            "event_hours": int((ev == 1).sum()),
            "event_rate_pct": round(100 * ev.mean(), 3),
            "hz_report_pct": round(100 * m["wx_haze"].mean(), 2),
            "fu_report_pct": round(100 * m["wx_smoke"].mean(), 2),
            "vis_max_km": round(float(vis.max()), 1),
            "vis_mode_km": round(float(vis.round(1).mode().iloc[0]), 1),
            "vis_ge_9_pct": round(100 * (vis >= 9).mean(), 1),
        }
    )
    yr = (
        pd.DataFrame({"reported": rep, "event": ev})
        .groupby(h.index.year)
        .agg(
            reported_pct=("reported", lambda s: round(100 * s.mean(), 1)),
            events=("event", lambda s: int((s == 1).sum())),
        )
    )
    yr["station"] = a.icao
    yearly.append(yr.reset_index(names="year"))

st = pd.DataFrame(rows)
st.to_csv(OUT / "stations.csv", index=False)
yr = pd.concat(yearly)
yr.to_csv(OUT / "station_years.csv", index=False)

firms["year"] = firms["acquired_at"].dt.year
fy = firms.groupby(["year", "source"]).size().unstack(fill_value=0)
fy.to_csv(OUT / "firms_years.csv")

pd.set_option("display.width", 220)
print(st.drop(columns=["lat", "lon"]).to_string(index=False))
print()
print(yr.pivot(index="station", columns="year", values="events").fillna(0).astype(int).to_string())
print()
print(yr.pivot(index="station", columns="year", values="reported_pct").to_string())
print()
print(fy.to_string())
print("\nfire_type counts:", firms["fire_type"].value_counts(dropna=False).to_dict())
print("confidence:", firms["confidence_class"].value_counts(dropna=False).to_dict())
print("daynight:", firms["daynight"].value_counts(dropna=False).to_dict())
