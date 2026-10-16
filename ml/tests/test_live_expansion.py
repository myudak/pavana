"""Offline contracts only; fixture models never become published skill claims."""

import json
import runpy
from pathlib import Path

import numpy as np
import pandas as pd
import pytest

from pavana_ml.data import iem
from pavana_ml.data.research import _jsonable, sha256
from pavana_ml.evaluation import regression
from pavana_ml.features import haze_station, pm25, station_wind
from pavana_ml.models.export import parity_vectors, to_compact
from pavana_ml.pipelines import haze_nowcast, hotspot_risk, regressions
from pavana_ml.pipelines.contract import temporal_parts, verify_snapshot, write_json


def test_python_feature_fixture_regenerates_without_drift():
    root = Path(__file__).resolve().parents[2]
    module = runpy.run_path(str(root / "ml/scripts/build_live_feature_vectors.py"))
    expected = json.loads((root / "fixtures/test-vectors/live-features.json").read_text())
    def same(actual, recorded):
        if isinstance(recorded, dict):
            assert actual.keys() == recorded.keys()
            for key in recorded:
                same(actual[key], recorded[key])
        elif isinstance(recorded, list):
            assert len(actual) == len(recorded)
            for a, b in zip(actual, recorded, strict=True):
                same(a, b)
        elif isinstance(recorded, float):
            # libm/NumPy may differ by a last bit between Windows and Linux.
            assert actual == pytest.approx(recorded, rel=1e-12, abs=1e-12)
        else:
            assert actual == recorded

    same(_jsonable(module["build"]()), expected)


@pytest.mark.parametrize("horizon", [6, 24])
def test_no_label_crosses_temporal_split(horizon):
    times = pd.date_range("2021-12-30", "2024-01-02", freq="h", tz="UTC")
    table = pd.DataFrame({"issue_at": times})
    parts = temporal_parts(
        table, "issue_at", horizon, "2021-12-31 23:00", "2023-12-31 23:00", "2025-12-31 23:00"
    )
    assert (parts["train"].issue_at + pd.Timedelta(hours=horizon)).max().year == 2021
    assert parts["valid"].issue_at.min().year == 2022
    assert (parts["valid"].issue_at + pd.Timedelta(hours=horizon)).max().year == 2023
    assert parts["test"].issue_at.min().year == 2024
    assert set(parts["train"].index).isdisjoint(parts["valid"].index)


def test_static_source_mask_is_fitted_on_train_only():
    # The future classification of this cell may not change the training mask.
    df = pd.DataFrame(
        {
            "acquired_at": pd.to_datetime(["2020-01-01", "2024-01-01", "2024-01-02"], utc=True),
            "lat": -0.1,
            "lon": 109.4,
            "fire_type": [0, 2, 2],
        }
    )
    assert hotspot_risk._static_cells(df) == set()


def test_latest_metar_row_is_whole_and_never_from_future():
    raw = """station,valid,vsby,wxcodes,tmpf,dwpf,drct,sknt
WIOO,2024-01-01 10:00,1,HZ,80,75,90,5
WIOO,2024-01-01 10:30,M,M,82,M,M,2
WIOO,2024-01-01 10:40,6,,83,75,180,3
WIOO,2024-01-01 11:20,2,HZ,90,75,180,3
"""
    h = haze_station.station_hourly(iem.parse_asos_csv(raw), "WIOO", 7)
    row = h.loc[pd.Timestamp("2024-01-01 11:00", tz="UTC")]
    assert row.report_at == pd.Timestamp("2024-01-01 10:40", tz="UTC")
    assert row.tmpc == pytest.approx((83 - 32) * 5 / 9)
    earlier = iem.hourly(iem.parse_asos_csv(raw.split("WIOO,2024-01-01 10:40")[0]))
    last = earlier.iloc[-1]
    assert np.isnan(last.vsby_km) and np.isnan(last.dwpc)  # never backfilled from 10:00
    assert h.loc[pd.Timestamp("2024-01-01 10:00", tz="UTC")].vsby_km == pytest.approx(1.609344)


def test_raw_metar_distinguishes_clear_from_unknown_weather():
    assert iem.normalise_wx(None, "WIOO 010000Z 01003KT 9999 SCT012 25/24 Q1010 NOSIG") == ""
    assert iem.normalise_wx(None, "WIOO 010000Z 01003KT 2000 HZ SCT012 25/24 Q1010") == "HZ"
    assert iem.normalise_wx(None, None) is None
    assert iem.normalise_wx(None, "WIOO 010000Z NIL") is None


def test_pm25_lags_exact_hours_and_never_fill_missing():
    idx = pd.date_range("2024-01-01", periods=72, freq="h", tz="UTC")
    raw = pd.DataFrame({"valid_at": idx, "pm25_ug_m3": np.arange(72, dtype=float)})
    f = pm25.feature_table(raw)
    assert f.pm25_lag_48h.iloc[60] == 12
    assert f.pm25_mean_6h.iloc[60] == 57.5
    assert f.target.iloc[60] == 66
    changed_future = raw.copy()
    changed_future.loc[61:, "pm25_ug_m3"] = 999
    pd.testing.assert_series_equal(
        f.loc[60, list(pm25.FEATURES)],
        pm25.feature_table(changed_future).loc[60, list(pm25.FEATURES)],
    )
    raw.loc[40, "pm25_ug_m3"] = np.nan
    assert np.isnan(pm25.feature_table(raw).pm25_mean_24h.iloc[60])


def test_wind_vectors_and_calm_direction_metrics():
    u, v = station_wind.components(np.array([2, 2, 0]), np.array([90, 0, np.nan]))
    np.testing.assert_allclose(u, [-2, 0, 0], atol=1e-12)
    np.testing.assert_allclose(v, [0, -2, 0], atol=1e-12)
    m = regression.wind(np.array([[0, 0], [-2, 0]]), np.array([[0, 0], [0, -2]]))
    assert m["directionN"] == 1 and m["directionMaeDeg"] == pytest.approx(90)
    assert m["vectorRmse"] == pytest.approx(2)
    u_bad, v_bad = station_wind.components(
        np.array([0.0, -1.0, 2.0]), np.array([np.nan, 90.0, 400.0])
    )
    assert u_bad[0] == 0 and v_bad[0] == 0
    assert np.isnan(u_bad[1:]).all() and np.isnan(v_bad[1:]).all()


def test_regression_export_keeps_identity_link_and_missing_shap():
    import lightgbm as lgb

    x = np.arange(200, dtype=float).reshape(-1, 2)
    x[::9, 0] = np.nan
    b = lgb.train(
        {"objective": "regression_l1", "verbosity": -1, "num_threads": 2},
        lgb.Dataset(x, x[:, 1]),
        5,
    )
    assert to_compact(b)["objective"] == "regression"
    rows = parity_vectors(b, np.vstack([x[:2], [np.nan, np.nan]]))["rows"]
    assert "proba" not in rows[0] and rows[0]["prediction"] == rows[0]["raw"]
    assert sum(rows[-1]["shap"]) == pytest.approx(rows[-1]["raw"])


def test_snapshot_refuses_changed_bytes_and_json_is_strict(tmp_path):
    p = tmp_path / "x.parquet"
    pd.DataFrame({"value": [1]}).to_parquet(p)
    write_json(
        tmp_path / "snapshot.json",
        {"files": {"x": {"path": p.name, "rows": 1, "sha256": sha256(p)}}},
    )
    verify_snapshot(tmp_path)
    p.write_bytes(b"changed")
    with pytest.raises(ValueError, match="checksum"):
        verify_snapshot(tmp_path)
    write_json(tmp_path / "empty-metric.json", {"metric": np.nan})
    assert json.loads((tmp_path / "empty-metric.json").read_text()) == {"metric": None}


def test_regression_pipelines_on_fixture_snapshot(tmp_path, monkeypatch):
    monkeypatch.setattr(regressions, "MAX_ROUNDS", 5)
    monkeypatch.setattr(regressions, "PARAMS", {**regressions.PARAMS, "min_data_in_leaf": 5})
    monkeypatch.setattr(regressions, "AIRPORTS", iem.AIRPORTS[:1])
    monkeypatch.setattr(haze_nowcast, "AIRPORTS", iem.AIRPORTS[:1])
    monkeypatch.setattr(haze_nowcast, "MAX_ROUNDS", 5)
    monkeypatch.setattr(haze_nowcast, "PARAMS", {**haze_nowcast.PARAMS, "min_data_in_leaf": 5})
    frames = []
    for year in (2015, 2021, 2022, 2023, 2024, 2025):
        idx = pd.date_range(f"{year}-09-01", periods=120, freq="h", tz="UTC")
        i = np.arange(len(idx))
        frames.append(
            pd.DataFrame(
                {
                    "station": "WIOO",
                    "valid_at": idx,
                    "vsby_km": np.where(i % 24 < 8, 2.0, 10.0),
                    "tmpc": 27.0 + i % 5,
                    "dwpc": 24.0,
                    "rh_pct": 75.0,
                    "wind_speed_ms": 1.0 + i % 4,
                    "wind_dir_from_deg": (i * 10.0) % 360,
                    "wx_haze": i % 24 < 8,
                    "wx_smoke": False,
                    "wx_precip": False,
                    "wx_fog": False,
                }
            )
        )
    metar = pd.concat(frames)
    metar.to_parquet(tmp_path / "metar.parquet", index=False)
    cams = pd.concat(
        [
            pd.DataFrame(
                {
                    "valid_at": pd.date_range(f"{year}-09-01", periods=120, freq="h", tz="UTC"),
                    "pm25_ug_m3": np.arange(120) % 15 + 10.0,
                }
            )
            for year in (2024, 2025, 2026)
        ]
    )
    cams.to_parquet(tmp_path / "cams.parquet", index=False)
    pd.DataFrame(
        {
            "lat": [-0.1],
            "lon": [109.4],
            "acquired_at": pd.to_datetime(["2024-09-01"], utc=True),
            "frp_mw": [5.0],
        }
    ).to_parquet(tmp_path / "firms_snpp.parquet", index=False)
    files = {
        p.stem: {"path": p.name, "rows": len(pd.read_parquet(p)), "sha256": sha256(p)}
        for p in tmp_path.glob("*.parquet")
    }
    write_json(tmp_path / "snapshot.json", {"files": files})
    a = regressions.run_pm25(tmp_path, tmp_path / "out")
    b = regressions.run_wind(tmp_path, tmp_path / "out")
    c = haze_nowcast.run(tmp_path, tmp_path / "out")
    assert a["targetKind"] == "model" and a["servingPolicy"] == "experimental-cams-proxy"
    assert b["targetKind"] == "observation" and not b["operationalReady"]
    assert set(c["horizons"]) == {"6h", "24h"}
    for meta in (a, b):
        assert len({v["n"] for v in meta["metrics"]["test"].values()}) == 1
