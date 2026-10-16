"""Offline tests for the served observed-target models. Synthetic inputs only — they pin
parsing, feature arithmetic and the pipeline wiring, never skill or published metrics."""

import json

import numpy as np
import pandas as pd
import pytest

from pavana_ml.data import firms_archive, iem
from pavana_ml.evaluation import classification as cm
from pavana_ml.features import haze_station as hs
from pavana_ml.features import hotspot_grid as g
from pavana_ml.features.upwind import upwind_exposure_score

FIRMS_ARCHIVE = (
    "latitude,longitude,bright_ti4,scan,track,acq_date,acq_time,satellite,instrument,"
    "confidence,version,bright_ti5,frp,daynight,type\n"
    """\
-0.10,109.40,333.4,0.4,0.4,2019-09-01,554,N,VIIRS,n,2,290.1,5.5,D,0
-0.12,109.41,330.0,0.4,0.4,2019-09-01,1806,N,VIIRS,h,2,290.1,,N,3
"""
)
FIRMS_NRT = (
    "latitude,longitude,bright_ti4,scan,track,acq_date,acq_time,satellite,confidence,"
    "version,bright_ti5,frp,daynight\n"
    """\
-1.5,113.9,367,0.34,0.56,2026-10-09,0228,N,high,2.0NRT,293.86,9.22,D
"""
)
ASOS = """station,valid,vsby,wxcodes,tmpf,dwpf,drct,sknt
WIOO,2019-09-15 00:00,1.24,HZ,80.6,73.4,90,5
WIOO,2019-09-15 00:30,M,M,M,M,M,M
WIOO,2019-09-15 01:00,1.24,-RA HZ,78.8,75.2,0,0
"""


def test_parse_firms_archive_and_nrt():
    a = firms_archive.parse_firms_csv(FIRMS_ARCHIVE)
    assert list(a["acquired_at"].dt.strftime("%H:%M")) == ["05:54", "18:06"]
    assert np.isnan(a["frp_mw"].iloc[1])  # missing FRP stays missing
    assert list(a["fire_type"]) == [0, 3]
    n = firms_archive.parse_firms_csv(FIRMS_NRT)
    assert n["confidence_class"].iloc[0] == "h" and np.isnan(n["fire_type"].iloc[0])
    assert firms_archive.parse_firms_csv("").empty


def test_parse_asos_units_and_flags():
    df = iem.parse_asos_csv(ASOS)
    assert df["vsby_km"].iloc[0] == pytest.approx(1.24 * iem.MILE_KM)
    assert np.isnan(df["vsby_km"].iloc[1])
    assert bool(df["wx_haze"].iloc[0]) and not bool(df["wx_precip"].iloc[0])
    assert bool(df["wx_precip"].iloc[2])
    ev = hs.haze_event(df)
    assert ev.iloc[0] == 1.0 and np.isnan(ev.iloc[1]) and ev.iloc[2] == 0.0  # rain excludes


def test_grid_cell_roundtrip():
    lat, lon = g.cell_center(np.array([0, g.N_COLS * g.N_ROWS - 1]))
    assert g.cell_index(lat, lon).tolist() == [0, g.N_COLS * g.N_ROWS - 1]
    assert g.cell_index(np.array([10.0]), np.array([110.0])).tolist() == [-1]


def test_fire_features_windows_and_gaps():
    counts = np.zeros((10, g.N_ROWS, g.N_COLS), dtype=np.float32)
    counts[2, 5, 5] = 2
    counts[8, 5, 6] = 1
    ok = np.ones(10, dtype=bool)
    ok[4] = False  # sensor gap
    f = g.fire_features(counts, ok)
    assert f["det_cell_1d"][2, 5, 5] == 2
    assert np.isnan(f["det_cell_1d"][4, 5, 5])  # gap is unknown, not zero
    assert np.isnan(f["det_cell_3d"][5, 5, 5])  # window touches the gap
    assert f["det_cell_3d"][7, 5, 5] == 0
    assert f["det_nbr_1d"][8, 5, 5] == 1  # neighbour counted
    assert np.isnan(f["det_cell_6d"][9, 5, 5])  # 6-day window still includes day 4
    assert f["days_since_det"][3, 5, 5] == 1  # detection found before reaching the record start
    assert np.isnan(f["days_since_det"][1, 5, 5])  # record start reached first: unknown
    assert np.isnan(f["days_since_det"][9, 5, 5])  # gap on day 4 reached first
    assert f["days_since_det"][9, 5, 6] == 1


def test_dry_day_run_and_precip_windows():
    p = np.array([[5.0], [0.0], [0.5], [np.nan], [0.0], [2.0]], dtype=np.float32)
    assert g.dry_day_run(p)[:, 0].tolist()[:3] == [0, 1, 2]
    run = g.dry_day_run(p)[:, 0]
    assert np.isnan(run[3]) and run[4] == 1 and run[5] == 0
    w = g.weather_features(
        {
            k: np.ones((70, 1), np.float32)
            for k in ("precip_mm", "rh_min_pct", "tmax_c", "wind_max_ms", "vpd_max_kpa")
        }
    )
    assert np.isnan(w["precip_60d_mm"][58, 0]) and w["precip_60d_mm"][59, 0] == 60


def test_upwind_feature_matches_shared_formula():
    rng = np.random.default_rng(3)
    n = 40
    t0 = pd.Timestamp("2019-09-15T00:00Z")
    firms = pd.DataFrame(
        {
            "lat": rng.uniform(-2, 2, n),
            "lon": rng.uniform(108, 112, n),
            "acquired_at": t0 - pd.to_timedelta(rng.uniform(0, 80, n), unit="h"),
            "frp_mw": np.where(rng.random(n) < 0.2, np.nan, rng.uniform(1, 50, n)),
        }
    )
    times = pd.DatetimeIndex([t0])
    out = hs.fire_features(times, np.array([135.0]), -0.15, 109.4, firms)
    age = (t0 - firms["acquired_at"]).dt.total_seconds().to_numpy() / 3600
    keep = age <= 72
    ref = upwind_exposure_score(
        -0.15,
        109.4,
        135.0,
        firms["lat"][keep],
        firms["lon"][keep],
        firms["frp_mw"][keep],
        age[keep],
    )
    assert out["upwind_72h"].iloc[0] == pytest.approx(ref.score, rel=1e-9)
    nan_wind = hs.fire_features(times, np.array([np.nan]), -0.15, 109.4, firms)
    assert np.isnan(nan_wind["upwind_72h"].iloc[0])


def test_classification_metrics_against_known_values():
    y = np.array([0, 0, 1, 1])
    p = np.array([0.1, 0.4, 0.35, 0.8])
    assert cm.roc_auc(y, p) == pytest.approx(0.75)
    assert cm.average_precision(y, p) == pytest.approx(0.8333333333)
    assert cm.brier(y, p) == pytest.approx((0.01 + 0.16 + 0.4225 + 0.04) / 4)
    bins = cm.calibration_bins(y, p, n_bins=2)
    assert sum(b["n"] for b in bins) == 4


def test_compact_export_reproduces_lightgbm():
    lgb = pytest.importorskip("lightgbm")
    from pavana_ml.models.export import parity_vectors, to_compact

    rng = np.random.default_rng(0)
    x = rng.normal(size=(500, 3))
    x[rng.random(500) < 0.1, 0] = np.nan
    y = (x[:, 1] + rng.normal(size=500) > 0).astype(int)
    b = lgb.train(
        {"objective": "binary", "verbosity": -1, "num_leaves": 7, "num_threads": 2},
        lgb.Dataset(x, y),
        10,
    )
    m = to_compact(b)
    assert m["format"] == "pavana-gbdt-v1" and len(m["trees"]) == 10
    v = parity_vectors(b, x[:5])
    for row in v["rows"]:
        assert sum(row["shap"]) == pytest.approx(row["raw"], abs=1e-9)
    json.dumps(m)


def _synthetic_snapshot(tmp_path):
    """Tiny but complete data dir in the data-kernel layout, spanning the real split dates."""
    tmp_path.mkdir(parents=True, exist_ok=True)
    rng = np.random.default_rng(1)
    days = pd.date_range("2015-01-01", "2024-06-30", freq="D")
    cells = np.array([g.cell_index(np.array([-0.1]), np.array([109.4]))[0] + k for k in range(4)])
    lat, lon = g.cell_center(cells)
    rows = []
    for d in days:
        # A sensor heartbeat elsewhere in the study region, outside the four test grid cells.
        rows.append((-1.0, 100.0, d + pd.Timedelta(hours=6), 1.0, "n", 0.0, "D", "test"))
        for la, lo in zip(lat, lon, strict=True):
            if rng.random() < (0.3 if d.month in (8, 9) else 0.05):
                rows.append((la, lo, d + pd.Timedelta(hours=6), 5.0, "n", 0.0, "D", "test"))
    firms = pd.DataFrame(
        rows,
        columns=[
            "lat",
            "lon",
            "acquired_at",
            "frp_mw",
            "confidence_class",
            "fire_type",
            "daynight",
            "source",
        ],
    )
    firms["acquired_at"] = pd.to_datetime(firms["acquired_at"], utc=True)
    firms.to_parquet(tmp_path / "firms_snpp.parquet")
    land = pd.DataFrame(
        {"cell": cells, "lat": lat, "lon": lon, "elev_center_m": 10.0, "land_points": 5}
    )
    land.to_parquet(tmp_path / "grid_land.parquet")
    wlat, wlon = g.weather_point(lat, lon)
    pts = sorted({(float(a), float(b)) for a, b in zip(wlat, wlon, strict=True)})
    w = []
    for la, lo in pts:
        w.append(
            pd.DataFrame(
                {
                    "date": days.date,
                    "point_lat": la,
                    "point_lon": lo,
                    "precip_mm": rng.gamma(0.5, 8, len(days)),
                    "tmax_c": 31.0,
                    "rh_min_pct": 60.0,
                    "wind_max_ms": 3.0,
                    "vpd_max_kpa": 1.2,
                }
            )
        )
    pd.concat(w).to_parquet(tmp_path / "weather_daily.parquet")
    snap = {"data_start": "2015-01-01", "data_end": "2024-06-30", "files": {}}
    (tmp_path / "snapshot.json").write_text(json.dumps(snap))
    return tmp_path


def test_hotspot_pipeline_runs_on_synthetic_snapshot(tmp_path, monkeypatch):
    pytest.importorskip("lightgbm")
    from pavana_ml.pipelines import hotspot_risk

    monkeypatch.setattr(hotspot_risk, "MAX_ROUNDS", 20)
    monkeypatch.setattr(hotspot_risk, "PARAMS", {**hotspot_risk.PARAMS, "min_data_in_leaf": 20})
    monkeypatch.setattr(hotspot_risk, "DEMO_ISSUE_DAY", "2024-06-01")
    data = _synthetic_snapshot(tmp_path / "data")
    meta = hotspot_risk.run(data, tmp_path / "out")
    assert meta["targetKind"] == "observation" and meta["evaluated"] is True
    assert set(meta["metrics"]["test"]) == {
        "model",
        "persistence",
        "climatology",
        "recentActivity",
    }
    model = json.loads((tmp_path / "out" / "hotspot-risk.model.json").read_text())
    assert model["featureNames"] == list(g.FEATURES)
    demo = json.loads((tmp_path / "out" / "hotspot-risk.demo.json").read_text())
    assert len(demo["rows"]) == 4


def test_haze_station_features_use_only_past_reports():
    idx = pd.date_range("2019-09-15", periods=30, freq="h", tz="UTC")
    metar = pd.DataFrame(
        {
            "station": "WIOO",
            "valid_at": idx,
            "vsby_km": np.r_[np.full(10, 10.0), np.full(20, 2.0)],
            "wx_haze": np.r_[np.zeros(10, bool), np.ones(20, bool)],
            "wx_smoke": False,
            "wx_precip": False,
            "wx_fog": False,
            "wx_mist": False,
            "rh_pct": 70.0,
            "tmpc": 30.0,
            "wind_speed_ms": 2.0,
            "wind_dir_from_deg": 90.0,
        }
    )
    h = hs.station_hourly(metar, "WIOO", 7)
    f = hs.report_features(h)
    assert f["vsby_min_24h_km"].iloc[9] == 10.0  # the drop at hour 10 is not visible at hour 9
    assert f["vsby_min_24h_km"].iloc[10] == 2.0
    assert h["event"].iloc[10] == 1.0
    assert f["hour_local"].iloc[0] == 7.0
