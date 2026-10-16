"""Regenerate arithmetic-only cross-language fixtures, never model scores or real events."""

from datetime import UTC, datetime, timedelta
from pathlib import Path

import numpy as np
import pandas as pd

from pavana_ml.data.iem import wx_flags
from pavana_ml.features import haze_station, pm25, station_wind
from pavana_ml.features import hotspot_grid as g
from pavana_ml.pipelines.contract import write_json


def build() -> dict:
    t = datetime(2025, 9, 5, tzinfo=UTC)
    reports = []
    for lag in range(74, -2, -1):
        at = t - timedelta(hours=lag, minutes=30)
        reports.append(
            {
                "validAt": at.isoformat(),
                "vsbyKm": None if lag == 3 else 2.0 if lag % 7 == 0 else 10.0,
                "wxcodes": None if lag == 3 else "HZ" if lag % 7 == 0 else "",
                "tmpc": None if lag == 3 else 28.0,
                "dwpc": 24.0,
                "windSpeedMs": 0.0 if lag == 6 else 2.0,
                "windDirFromDeg": None if lag == 6 else 90.0,
            }
        )
    station = {"lat": -0.15, "lon": 109.4, "tzOffsetHours": 7}
    detections = [
        {
            "lat": -0.15,
            "lon": 109.4,
            "acquiredAt": (t - timedelta(hours=lag)).isoformat(),
            "frpMw": 3.0,
        }
        for lag in (0, 24, 72, -1)
    ]
    metar = pd.DataFrame(
        {
            "station": "WIOO",
            "valid_at": pd.to_datetime([r["validAt"] for r in reports], utc=True),
            "vsby_km": [r["vsbyKm"] for r in reports],
            "tmpc": [r["tmpc"] for r in reports],
            "wind_speed_ms": [r["windSpeedMs"] for r in reports],
            "wind_dir_from_deg": [r["windDirFromDeg"] for r in reports],
        }
    )
    metar["rh_pct"] = 100 * np.exp(
        17.625 * 24 / (243.04 + 24) - 17.625 * metar.tmpc / (243.04 + metar.tmpc)
    )
    metar = pd.concat(
        [metar, wx_flags(pd.Series([r["wxcodes"] for r in reports], dtype="string"))], axis=1
    )
    h = haze_station.station_hourly(metar, "WIOO", 7)
    fire = pd.DataFrame(
        {
            "lat": [d["lat"] for d in detections],
            "lon": [d["lon"] for d in detections],
            "acquired_at": pd.to_datetime([d["acquiredAt"] for d in detections], utc=True),
            "frp_mw": [d["frpMw"] for d in detections],
        }
    )
    hf = haze_station.report_features(h).join(
        haze_station.fire_features(
            h.index, h.wind_dir_from_deg.to_numpy(), station["lat"], station["lon"], fire
        )
    )
    hf["station_month_rate"] = 0.05
    wf = station_wind.feature_table(h, station["lat"], station["lon"]).set_index("issue_at")
    cams = pd.DataFrame(
        {
            "valid_at": pd.date_range(t - timedelta(hours=72), t + timedelta(hours=6), freq="h"),
            "pm25_ug_m3": np.arange(79) * 0.5 + 10,
        }
    )
    pf = pm25.feature_table(cams).set_index("issue_at")
    origin = pd.Timestamp(t)
    cells = g.cell_index(np.array([station["lat"]]), np.array([station["lon"]]))
    lat, lon = g.cell_center(cells)
    cell = {
        "id": int(cells[0]),
        "lat": float(lat[0]),
        "lon": float(lon[0]),
        "histRate": 0.0123456789,
        "weatherLat": 0.0,
        "weatherLon": 110.0,
    }
    grid = {
        "bbox": list(g.GRID_BBOX),
        "cellDeg": g.CELL_DEG,
        "nCols": g.N_COLS,
        "nRows": g.N_ROWS,
        "cells": [cell],
    }
    days = pd.date_range(t.date() - timedelta(days=6), t.date(), freq="D")
    grid_detections = [
        {"lat": cell["lat"], "lon": cell["lon"], "acquiredAt": (t - timedelta(days=3)).isoformat()}
    ]
    grid_frame = pd.DataFrame(
        {
            "lat": [cell["lat"]],
            "lon": [cell["lon"]],
            "acquired_at": pd.to_datetime([grid_detections[0]["acquiredAt"]], utc=True),
        }
    )
    counts = g.daily_counts(grid_frame, days)
    weather = {
        "precipMm": [float(i % 5) / 8 for i in range(60)],
        "rhMinPct": [65.0] * 60,
        "tmaxC": [31.25] * 60,
        "windMaxMs": [3.125] * 60,
        "vpdMaxKpa": [1.125] * 60,
    }
    wf_grid = g.weather_features(
        {
            k: np.array(weather[n], dtype=float)[:, None]
            for k, n in (
                ("precip_mm", "precipMm"),
                ("rh_min_pct", "rhMinPct"),
                ("tmax_c", "tmaxC"),
                ("wind_max_ms", "windMaxMs"),
                ("vpd_max_kpa", "vpdMaxKpa"),
            )
        }
    )
    grid_cases = []
    for gap in (False, True):
        ok = np.ones(7, dtype=bool)
        if gap:
            ok[2] = False
        ff = g.fire_features(counts, ok)
        row, col = np.divmod(cells[0], g.N_COLS)
        values = {k: v[-1, row, col] for k, v in ff.items()}
        values.update({k: v[-1, 0] for k, v in wf_grid.items()})
        values.update({"doy": origin.dayofyear, "cell_hist_rate": cell["histRate"]})
        grid_cases.append(
            {
                "daysSeen": [
                    d.strftime("%Y-%m-%d") for d, present in zip(days, ok, strict=True) if present
                ],
                "x": [values[f] for f in g.FEATURES],
            }
        )
    return {
        "note": (
            "SYNTHETIC ARITHMETIC FIXTURE ONLY. "
            "Not detections, observations, or evaluation metrics."
        ),
        "asOf": (t + timedelta(minutes=40)).isoformat(),
        "station": station,
        "reports": reports,
        "detections": detections,
        "stationMonthRate": 0.05,
        "hotspot": {
            "grid": grid,
            "cell": cell,
            "issueDay": t.strftime("%Y-%m-%d"),
            "weather": weather,
            "detections": grid_detections,
            "cases": grid_cases,
        },
        "haze": {"issueAt": origin, "x": hf.loc[origin, list(haze_station.FEATURES)].tolist()},
        "wind": {"issueAt": origin, "x": wf.loc[origin, list(station_wind.FEATURES)].tolist()},
        "cams": [
            {"validAt": r.valid_at.isoformat(), "pm25": r.pm25_ug_m3} for r in cams.itertuples()
        ],
        "pm25": {"issueAt": origin, "x": pf.loc[origin, list(pm25.FEATURES)].tolist()},
    }


if __name__ == "__main__":
    destination = Path(__file__).resolve().parents[2] / "fixtures/test-vectors/live-features.json"
    write_json(destination, build())
