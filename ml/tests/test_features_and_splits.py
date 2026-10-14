import numpy as np
import pandas as pd

from pavana_ml.data.fixtures import load_scenario, scenario_frames
from pavana_ml.evaluation.metrics import event_precision_recall, mae, rmse
from pavana_ml.evaluation.splits import rolling_origin_folds, temporal_split
from pavana_ml.features.lags import add_lags, add_target
from pavana_ml.features.upwind import upwind_series


def hourly_frame(n=48):
    t = pd.date_range("2026-09-01", periods=n, freq="h", tz="UTC")
    return pd.DataFrame({"valid_at": t, "pm25_ug_m3": np.arange(n, dtype=float)})


def test_fixture_loads_and_is_demo():
    hourly, hotspots = scenario_frames(load_scenario())
    assert hourly["is_demo"].all() and hotspots["is_demo"].all()
    assert str(hourly["valid_at"].dt.tz) == "UTC"
    assert len(hourly) == 25 and len(hotspots) > 0


def test_lags_use_past_and_target_uses_future():
    df = add_target(add_lags(hourly_frame(), "pm25_ug_m3", (1,)), "pm25_ug_m3", 6)
    row = df.iloc[10]
    assert row["pm25_ug_m3_lag1h"] == 9
    assert row["target_pm25_ug_m3_t+6h"] == 16
    assert np.isnan(df.iloc[-1]["target_pm25_ug_m3_t+6h"])


def test_temporal_split_has_no_overlap_and_respects_gap():
    df = hourly_frame()
    train, test = temporal_split(df, "valid_at", "2026-09-02T00:00:00Z", gap_hours=6)
    assert train["valid_at"].max() < test["valid_at"].min() - pd.Timedelta(hours=5)


def test_rolling_folds_train_precedes_test():
    for train, test in rolling_origin_folds(hourly_frame(96), "valid_at", n_folds=3, test_hours=12):
        assert train["valid_at"].max() < test["valid_at"].min()


def test_upwind_series_ignores_future_detections():
    hourly, hotspots = scenario_frames(load_scenario())
    s = upwind_series(hourly.iloc[:1], hotspots, -0.1, 109.38)
    t0 = hourly["valid_at"].iloc[0]
    assert s["hotspots_n"].iloc[0] == int((hotspots["acquired_at"] <= t0).sum())
    # SE wind + SE hotspots in the fixture → positive indicator.
    assert s["upwind_score"].iloc[0] > 0


def test_metrics_skip_nan_and_never_treat_missing_as_zero():
    assert mae([1, np.nan, 3], [1, 100, 5]) == 1.0
    assert rmse([0, 0], [3, 4]) == np.sqrt(12.5)
    pr = event_precision_recall([10, 60, 70], [60, 60, 10], threshold_ug_m3=55.5)
    assert pr == {"precision": 0.5, "recall": 0.5, "support": 2}
