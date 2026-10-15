"""Boundary tests for the CP2 feature table.

Every frame here is synthetic and exists only to exercise alignment, windowing and refusal
behaviour at the module boundary. No number produced by this file is an experimental result: the
real table and its audit trail live in `ml/data/processed/` and are rebuilt by notebook 03.
"""

from __future__ import annotations

import json

import numpy as np
import pandas as pd
import pytest

from pavana_ml.data.research import sha256
from pavana_ml.features.geo import haversine_km
from pavana_ml.features.model_table import (
    ANCHOR_LAT,
    ANCHOR_LON,
    HORIZON_HOURS,
    RADII_KM,
    UPWIND_WINDOW_HOURS,
    WINDOWS_HOURS,
    build_model_table,
    hotspot_features,
    load_feature_inputs,
    save_model_table,
)
from pavana_ml.features.upwind import upwind_series

HOURS = pd.date_range("2024-01-01", periods=120, freq="h", tz="UTC")
TARGET = "target_cams_pm25_ug_m3_t+6h"
KM_PER_DEGREE = 111.19


def hourly_frame(hours: pd.DatetimeIndex = HOURS, **overrides) -> pd.DataFrame:
    size = len(hours)
    frame = pd.DataFrame(
        {
            "valid_at": hours,
            "temperature_c": np.linspace(24.0, 31.0, size),
            "rh_pct": np.linspace(60.0, 95.0, size),
            "precip_mm": np.linspace(0.0, 12.0, size),
            "wind_speed_ms": np.full(size, 4.0),
            "wind_dir_from_deg": np.full(size, 270.0),
            "wind_gusts_ms": np.linspace(2.0, 9.0, size),
            "surface_pressure_hpa": np.linspace(1004.0, 1012.0, size),
            "boundary_layer_height_m": np.full(size, 700.0),
            "shortwave_radiation_wm2": np.linspace(0.0, 800.0, size),
            "cams_pm25_ug_m3": np.linspace(8.0, 40.0, size),
            "cams_pm10_ug_m3": np.linspace(9.0, 45.0, size),
        }
    )
    for column, values in overrides.items():
        frame[column] = values
    return frame


def detection_frame(rows: list[tuple[str, float, float, float]]) -> pd.DataFrame:
    """Rows of (ISO timestamp, lat, lon, frp). An empty list still returns the right dtypes."""
    frame = pd.DataFrame(
        {
            "acquired_at": pd.to_datetime([row[0] for row in rows], utc=True),
            "lat": [row[1] for row in rows],
            "lon": [row[2] for row in rows],
            "frp_mw": [row[3] for row in rows],
        }
    )
    return frame.astype({"lat": "float64", "lon": "float64", "frp_mw": "float64"})


def east_of_anchor(kilometres: float) -> tuple[float, float]:
    return ANCHOR_LAT, ANCHOR_LON + kilometres / KM_PER_DEGREE


def test_target_is_cams_at_exactly_the_horizon() -> None:
    table, metadata = build_model_table(hourly_frame(), detection_frame([]))
    assert metadata["target"] == TARGET
    assert metadata["horizon_hours"] == HORIZON_HOURS == 6
    assert (table["target_valid_at"] - table["valid_at"] == pd.Timedelta(hours=6)).all()
    # The value at t+6 is the CAMS value whose timestamp is target_valid_at, nothing else.
    np.testing.assert_array_equal(
        table[TARGET].to_numpy()[:-6], table["cams_pm25_ug_m3"].to_numpy()[6:]
    )
    assert table[TARGET].tail(6).isna().all()


def test_missing_hour_is_restored_and_never_read_as_consecutive() -> None:
    hours = HOURS.delete(60)
    table, metadata = build_model_table(hourly_frame(hours), detection_frame([]))
    assert len(table) == len(HOURS)  # the gap is restored, not silently dropped
    assert table.loc[60, "valid_at"] == HOURS[60]
    assert np.isnan(table.loc[60, "cams_pm25_ug_m3"])
    # shift(1) must land on the restored NaN rather than reaching two hours back.
    assert np.isnan(table.loc[61, "cams_pm25_lag1h"])
    assert not np.isnan(table.loc[60, "cams_pm25_lag1h"])
    assert np.isnan(table.loc[54, TARGET])  # target of t=54 is the missing t=60
    assert not table.loc[54, "eligible"]
    assert metadata["eligibility"]["eligible"] < len(table)


def test_features_at_t_ignore_every_change_after_t() -> None:
    plain, metadata = build_model_table(hourly_frame(), detection_frame([]))
    changed = hourly_frame()
    later = changed["valid_at"] > HOURS[80]
    for column in ("cams_pm25_ug_m3", "temperature_c", "rh_pct", "wind_speed_ms"):
        changed.loc[later, column] = changed.loc[later, column] * 3.0 + 100.0
    altered, _ = build_model_table(changed, detection_frame([]))

    columns = metadata["feature_allowlists"]["E"]
    assert TARGET not in columns and "target_valid_at" not in columns
    pd.testing.assert_frame_equal(plain[columns].iloc[:81], altered[columns].iloc[:81])


def test_detection_windows_start_at_t_minus_w_and_exclude_the_future() -> None:
    origin = HOURS[60]
    inside = east_of_anchor(40.0)
    rows = [
        ((origin + pd.Timedelta(minutes=1)).isoformat(), *inside, 5.0),  # future for t
        (origin.isoformat(), *inside, 5.0),  # exactly t
        ((origin - pd.Timedelta(hours=6)).isoformat(), *inside, 5.0),  # closed left end
        ((origin - pd.Timedelta(hours=6, minutes=1)).isoformat(), *inside, 5.0),  # just outside
    ]
    table, _ = build_model_table(hourly_frame(), detection_frame(rows))
    assert table.loc[60, "hotspot_records_n_50km_6h"] == 2
    assert table.loc[60, "hotspot_records_n_50km_24h"] == 3
    assert table.loc[60, "hotspot_records_n_50km_48h"] == 3
    # Moving the origin one hour forward drops what fell out of the window and admits the new hour.
    assert table.loc[61, "hotspot_records_n_50km_6h"] == 2
    assert table.loc[59, "hotspot_records_n_50km_48h"] == 2


def test_future_or_distant_detections_do_not_reach_the_origin() -> None:
    origin = HOURS[60]
    future_only = detection_frame(
        [((origin + pd.Timedelta(minutes=30)).isoformat(), *east_of_anchor(10.0), 9.0)]
    )
    table, _ = build_model_table(hourly_frame(), future_only)
    assert (
        table.loc[60, [f"hotspot_records_n_{r}km_{w}h" for r in RADII_KM for w in WINDOWS_HOURS]]
        == 0
    ).all()
    assert table.loc[60, "upwind_score"] == 0.0

    far = east_of_anchor(400.0)
    assert float(haversine_km(far[0], far[1], ANCHOR_LAT, ANCHOR_LON)) > 300.0
    table, _ = build_model_table(
        hourly_frame(), detection_frame([(HOURS[40].isoformat(), *far, 100.0)])
    )
    assert (
        table.loc[60, [f"hotspot_records_n_{r}km_{w}h" for r in RADII_KM for w in WINDOWS_HOURS]]
        == 0
    ).all()
    assert table.loc[60, "upwind_score"] == 0.0


def test_radii_are_cumulative_and_match_the_placed_distances() -> None:
    stamp = HOURS[40].isoformat()
    rows = [
        (stamp, *east_of_anchor(40.0), 3.0),
        (stamp, *east_of_anchor(70.0), 4.0),
        (stamp, *east_of_anchor(250.0), 5.0),
    ]
    table, _ = build_model_table(hourly_frame(), detection_frame(rows))
    assert table.loc[60, "hotspot_records_n_50km_24h"] == 1
    assert table.loc[60, "hotspot_records_n_100km_24h"] == 2
    assert table.loc[60, "hotspot_records_n_300km_24h"] == 3
    assert table.loc[60, "hotspot_frp_sum_mw_50km_24h"] == 3.0
    assert table.loc[60, "hotspot_frp_sum_mw_300km_24h"] == 12.0


def test_features_do_not_depend_on_the_stored_row_order_of_the_cache() -> None:
    # Several detections share a timestamp; the sums must not move when the cache is reordered,
    # or the table checksum would depend on how the parquet happened to be written.
    stamp = HOURS[40].isoformat()
    rows = [
        (stamp, *east_of_anchor(20.0), 4.0),
        (stamp, *east_of_anchor(30.0), 7.0),
        (stamp, *east_of_anchor(40.0), 1.0),
        ((HOURS[41]).isoformat(), *east_of_anchor(25.0), 2.0),
    ]
    ordered = detection_frame(rows)
    shuffled = ordered.sample(frac=1.0, random_state=7).reset_index(drop=True)
    assert not shuffled.equals(ordered)
    columns = ["upwind_score"] + [
        f"hotspot_records_n_{r}km_{w}h" for r in RADII_KM for w in WINDOWS_HOURS
    ]
    first = hotspot_features(hourly_frame(), ordered)[columns]
    second = hotspot_features(hourly_frame(), shuffled)[columns]
    pd.testing.assert_frame_equal(first, second, check_exact=True)


def test_null_frp_makes_the_sum_nan_and_never_zero() -> None:
    stamp = HOURS[40].isoformat()
    rows = [(stamp, *east_of_anchor(20.0), 4.0), (stamp, *east_of_anchor(30.0), np.nan)]
    table, _ = build_model_table(hourly_frame(), detection_frame(rows))
    assert table.loc[60, "hotspot_records_n_50km_24h"] == 2
    assert np.isnan(table.loc[60, "hotspot_frp_sum_mw_50km_24h"])

    known_only = detection_frame([(stamp, *east_of_anchor(20.0), 4.0)])
    table, _ = build_model_table(hourly_frame(), known_only)
    assert table.loc[60, "hotspot_frp_sum_mw_50km_24h"] == 4.0


def test_empty_window_is_a_true_zero_count_and_zero_sum() -> None:
    # No record inside the window is a real 0 for a count of records in this cache; the FRP sum of
    # an empty window is 0 too. Only a *null FRP value* inside a window forces NaN.
    table, _ = build_model_table(hourly_frame(), detection_frame([]))
    assert table["hotspot_records_n_300km_48h"].eq(0).all()
    assert table["hotspot_frp_sum_mw_300km_48h"].eq(0.0).all()
    assert table["upwind_score"].eq(0.0).all()


def test_eligibility_requires_the_whole_pm25_model_history() -> None:
    # One missing CAMS hour at t=100. It reaches that row through the rolling means and the change
    # term, later rows through the lags; every row that reads it leaves the sample while the table
    # keeps it visible.
    hours = pd.date_range("2024-01-01", periods=200, freq="h", tz="UTC")
    hourly = hourly_frame(hours)
    hourly.loc[100, "cams_pm25_ug_m3"] = np.nan
    table, metadata = build_model_table(hourly, detection_frame([]))

    assert not np.isnan(table.loc[100, "cams_pm25_lag48h"])  # the far lag alone looks complete
    assert not np.isnan(table.loc[100, TARGET])
    for row in (100, 105, 112, 123, 124, 148):  # t, mean6 edge, lag12, mean24 edge, lag24, lag48
        assert not table.loc[row, "eligible"], row
    for row in (48, 99, 125, 147, 149, 193):  # windows that never touch hour 100
        assert table.loc[row, "eligible"], row
    # The missing hour is also the target of t=94, which therefore has no label of its own.
    assert np.isnan(table.loc[94, TARGET]) and not table.loc[94, "eligible"]
    assert metadata["eligibility"] == {
        "rows": len(hours),
        "eligible": 119,  # 200 rows minus the warm-up, the tail and every row reading hour 100
        "excluded_missing_target": HORIZON_HOURS + 1,  # tail 194..199 plus t=94
        "excluded_incomplete_pm25_history": 48 + 26,  # warm-up plus t=100..124 and t=148
        "excluded_both": 0,
    }
    assert "every pm25_model feature" in metadata["eligible_rule"]


def test_eligible_rows_never_carry_a_missing_pm25_model_feature() -> None:
    hourly = hourly_frame()
    hourly.loc[[70, 100], "cams_pm25_ug_m3"] = np.nan
    table, _ = build_model_table(hourly, detection_frame([]))
    pm25_columns = [column for column in table.columns if column.startswith("cams_pm25")]
    assert table.loc[table["eligible"], pm25_columns].notna().all().all()


def test_unreadable_or_infinite_values_are_refused_not_coerced() -> None:
    # Text in a numeric column used to become NaN: an unreadable coordinate would have dropped a
    # detection silently, and an unreadable FRP would have looked like a missing measurement.
    as_text = hourly_frame()
    as_text["cams_pm25_ug_m3"] = as_text["cams_pm25_ug_m3"].astype(object)
    as_text.loc[10, "cams_pm25_ug_m3"] = "not-a-number"
    with pytest.raises(ValueError, match="neither a number nor missing"):
        build_model_table(as_text, detection_frame([]))

    infinite = hourly_frame()
    infinite.loc[10, "cams_pm25_ug_m3"] = np.inf
    with pytest.raises(ValueError, match="neither a number nor missing"):
        build_model_table(infinite, detection_frame([]))

    hotspots = detection_frame([(HOURS[40].isoformat(), *east_of_anchor(20.0), 4.0)])
    hotspots["frp_mw"] = hotspots["frp_mw"].astype(object)
    hotspots.loc[0, "frp_mw"] = "unknown"
    with pytest.raises(ValueError, match="hotspots: frp_mw"):
        hotspot_features(hourly_frame(), hotspots)


def test_absent_optional_input_is_excluded_and_recorded() -> None:
    table, metadata = build_model_table(
        hourly_frame().drop(columns="boundary_layer_height_m"), detection_frame([])
    )
    assert metadata["absent_optional_inputs"] == ["boundary_layer_height_m"]
    assert "boundary_layer_height_m" not in metadata["feature_groups"]["weather"]
    assert "boundary_layer_height_m" not in metadata["feature_columns"]
    assert "boundary_layer_height_m" not in table.columns


def test_hotspot_timestamps_must_be_utc() -> None:
    hotspots = detection_frame([(HOURS[40].isoformat(), *east_of_anchor(20.0), 4.0)])
    hotspots["acquired_at"] = hotspots["acquired_at"].dt.tz_convert("Asia/Jakarta")
    with pytest.raises(ValueError, match="timestamps must be UTC"):
        build_model_table(hourly_frame(), hotspots)


def test_detection_features_match_a_naive_reference_over_a_random_cache() -> None:
    # The searchsorted/prefix-sum path is only exercised on tiny hand-placed frames elsewhere in
    # this file, so compare it against a plain mask-and-sum reference here.
    rng = np.random.default_rng(20261015)
    rows = [
        (
            (HOURS[0] + pd.Timedelta(hours=float(rng.uniform(-2.0, 60.0)))).isoformat(),
            ANCHOR_LAT + float(rng.uniform(-3.0, 3.0)),
            ANCHOR_LON + float(rng.uniform(-3.0, 3.0)),
            float(rng.uniform(0.5, 60.0)),
        )
        for _ in range(400)
    ]
    hotspots = detection_frame(rows)
    hourly = hourly_frame()
    table, _ = build_model_table(hourly, hotspots)
    assert table["hotspot_records_n_300km_48h"].iloc[:60].sum() > 0  # not a vacuous comparison

    acquired = hotspots["acquired_at"].to_numpy()
    distance = haversine_km(
        hotspots["lat"].to_numpy(), hotspots["lon"].to_numpy(), ANCHOR_LAT, ANCHOR_LON
    )
    frp = hotspots["frp_mw"].to_numpy()
    for row in range(0, len(HOURS), 3):
        age = (HOURS[row] - acquired) / pd.Timedelta(hours=1)
        for radius in RADII_KM:
            for window in WINDOWS_HOURS:
                inside = (age >= 0) & (age <= window) & (distance <= radius)
                assert table.loc[row, f"hotspot_records_n_{radius}km_{window}h"] == int(
                    inside.sum()
                )
                assert table.loc[row, f"hotspot_frp_sum_mw_{radius}km_{window}h"] == pytest.approx(
                    float(frp[inside].sum()), rel=1e-9
                )

    sample = hourly.iloc[::40]
    reference = upwind_series(
        sample, hotspots, ANCHOR_LAT, ANCHOR_LON, window_hours=UPWIND_WINDOW_HOURS
    )
    np.testing.assert_allclose(
        table.loc[sample.index, "upwind_score"].to_numpy(),
        reference["upwind_score"].to_numpy(),
        rtol=1e-12,
        atol=1e-9,
    )


def test_build_model_table_does_not_mutate_its_inputs() -> None:
    hourly = hourly_frame()
    hotspots = detection_frame([(HOURS[40].isoformat(), *east_of_anchor(20.0), 4.0)])
    hourly_before = hourly.copy(deep=True)
    hotspots_before = hotspots.copy(deep=True)
    build_model_table(hourly, hotspots)
    pd.testing.assert_frame_equal(hourly, hourly_before)
    pd.testing.assert_frame_equal(hotspots, hotspots_before)


def test_missing_wind_direction_leaves_upwind_undefined_not_zero() -> None:
    origin = HOURS[60]
    rows = [(origin.isoformat(), *east_of_anchor(20.0), 50.0)]
    hourly = hourly_frame()
    hourly.loc[60, "wind_dir_from_deg"] = np.nan
    table, _ = build_model_table(hourly, detection_frame(rows))
    assert np.isnan(table.loc[60, "upwind_score"])
    assert table.loc[60, "hotspot_records_n_50km_6h"] == 1
    assert not np.isnan(table.loc[59, "upwind_score"])


def test_upwind_matches_the_existing_helper_for_a_controlled_case() -> None:
    origin = HOURS[60]
    west = (ANCHOR_LAT, ANCHOR_LON - 20.0 / KM_PER_DEGREE)
    far_west = (ANCHOR_LAT, ANCHOR_LON - 150.0 / KM_PER_DEGREE)
    east = (ANCHOR_LAT, ANCHOR_LON + 20.0 / KM_PER_DEGREE)
    older = HOURS[60] - pd.Timedelta(hours=UPWIND_WINDOW_HOURS + 1)
    rows = [
        ((origin - pd.Timedelta(hours=2)).isoformat(), *west, 12.0),
        ((origin - pd.Timedelta(hours=20)).isoformat(), *far_west, 30.0),
        ((origin - pd.Timedelta(hours=1)).isoformat(), *east, 25.0),
        (older.isoformat(), *west, 40.0),  # outside the 48 h window
    ]
    hotspots = detection_frame(rows)
    hourly = hourly_frame()
    table, metadata = build_model_table(hourly, hotspots)
    reference = upwind_series(
        hourly, hotspots, ANCHOR_LAT, ANCHOR_LON, window_hours=UPWIND_WINDOW_HOURS
    )
    # Same formula and same inputs; only the summation array is smaller here, so allow 1 ulp.
    np.testing.assert_allclose(
        table["upwind_score"].to_numpy(),
        reference["upwind_score"].to_numpy(),
        rtol=1e-12,
        atol=1e-9,
    )
    assert table.loc[60, "upwind_score"] > 0.0  # westerly wind, upwind detection
    assert metadata["upwind_params"] == {
        "lambda_km": 50.0,
        "tau_hours": 24.0,
        "max_distance_km": 300.0,
        "frp_fallback": 1.0,
    }


def test_hotspot_features_reject_a_frame_without_the_needed_columns() -> None:
    with pytest.raises(ValueError, match="hotspots: missing required columns"):
        hotspot_features(hourly_frame(), pd.DataFrame({"lat": [0.0], "lon": [0.0]}))
    with pytest.raises(ValueError, match="hourly: missing required columns"):
        hotspot_features(hourly_frame().drop(columns="wind_dir_from_deg"), detection_frame([]))


def test_warmup_and_tail_rows_stay_visible_but_not_eligible() -> None:
    table, metadata = build_model_table(hourly_frame(), detection_frame([]))
    assert len(table) == len(HOURS)
    assert int(table["eligible"].sum()) == len(HOURS) - 48 - HORIZON_HOURS
    assert not table.loc[:47, "eligible"].any()
    assert not table.loc[len(HOURS) - HORIZON_HOURS :, "eligible"].any()
    assert table.loc[48, "eligible"] and table.loc[113, "eligible"]
    assert metadata["eligibility"] == {
        "rows": len(HOURS),
        "eligible": len(HOURS) - 48 - HORIZON_HOURS,
        "excluded_missing_target": HORIZON_HOURS,
        "excluded_incomplete_pm25_history": 48,
        "excluded_both": 0,
    }


def test_metadata_records_the_model_target_and_research_status() -> None:
    table, metadata = build_model_table(hourly_frame(), detection_frame([]), inputs={"stub": 1})
    assert metadata["target_kind"] == "model"
    assert "not an observation" in metadata["target_statement"]
    assert metadata["target_valid_column"] == "target_valid_at"
    assert metadata["inputs"] == {"stub": 1}
    assert metadata["research_only"] is True
    assert metadata["operational_ready"] is False
    assert metadata["observation_validated"] is False
    assert metadata["limitations"]
    assert len(metadata["feature_code_sha256"]) == 64

    allowlists = metadata["feature_allowlists"]
    assert set(allowlists["C"]) < set(allowlists["D"]) < set(allowlists["E"])
    assert set(allowlists["E"]) == set(metadata["feature_columns"])
    for columns in allowlists.values():
        assert TARGET not in columns
        assert "target_valid_at" not in columns
        assert "eligible" not in columns
        assert (
            "cams_pm10_ug_m3" not in columns
        )  # available in the table, deliberately not a feature
        assert set(columns) <= set(table.columns)
    assert metadata["feature_groups"]["upwind"] == ["upwind_score"]
    assert len(metadata["feature_groups"]["detection"]) == len(RADII_KM) * len(WINDOWS_HOURS) * 2
    assert "t-W, t" in metadata["windows"]["detection"]
    assert metadata["windows"]["timezone"].startswith("All timestamps are UTC")
    assert set(metadata["feature_nan_counts_in_eligible"]) == set(allowlists["E"])


def test_fixture_station_and_incomplete_frames_are_refused() -> None:
    for column in ("is_demo", "pm25_ug_m3"):
        frame = hourly_frame()
        frame[column] = True if column == "is_demo" else 1.0
        with pytest.raises(ValueError, match="fixture or station frame"):
            build_model_table(frame, detection_frame([]))
    with pytest.raises(ValueError, match="Missing research inputs"):
        build_model_table(hourly_frame().drop(columns="temperature_c"), detection_frame([]))
    naive = hourly_frame()
    naive["valid_at"] = naive["valid_at"].dt.tz_localize(None)
    with pytest.raises(ValueError, match="explicit UTC timezone"):
        build_model_table(naive, detection_frame([]))
    duplicated = pd.concat([hourly_frame(), hourly_frame().iloc[[0]]])
    with pytest.raises(ValueError, match="duplicate timestamps"):
        build_model_table(duplicated, detection_frame([]))
    with pytest.raises(ValueError, match="horizon_hours must be positive"):
        build_model_table(hourly_frame(), detection_frame([]), horizon_hours=0)


def test_save_model_table_writes_a_checksum_of_what_it_wrote(tmp_path) -> None:
    table, metadata = build_model_table(hourly_frame(), detection_frame([]))
    saved = save_model_table(table, metadata, data_dir=tmp_path)
    table_path = tmp_path / "processed" / "model_table.parquet"
    metadata_path = tmp_path / "processed" / "model_table.metadata.json"
    assert saved["table_sha256"] == sha256(table_path)
    stored = json.loads(metadata_path.read_text())
    assert stored["table_sha256"] == sha256(table_path)
    assert stored["table_rows"] == len(table)
    assert stored["metadata_path"] == str(metadata_path)
    pd.testing.assert_frame_equal(pd.read_parquet(table_path), table)


def write_inputs(data_dir, hourly: pd.DataFrame, hotspots: pd.DataFrame) -> None:
    (data_dir / "interim").mkdir(parents=True, exist_ok=True)
    (data_dir / "processed").mkdir(parents=True, exist_ok=True)
    hourly_path = data_dir / "interim" / "hourly_aligned.parquet"
    hotspot_path = data_dir / "processed" / "hotspot_kalimantan.parquet"
    hourly.to_parquet(hourly_path, index=False)
    hotspots.to_parquet(hotspot_path, index=False)
    report = {
        "generated_at_utc": "2024-01-01T00:00:00+00:00",
        "target_kind": "model",
        "hourly_sha256": sha256(hourly_path),
        "source_sha256": {"hotspots": sha256(hotspot_path)},
        "limitations": ["synthetic"],
        "snapshot": {"revision": "test"},
    }
    (data_dir / "interim" / "audit_report.json").write_text(json.dumps(report))


def test_load_feature_inputs_verifies_both_checksums(tmp_path) -> None:
    write_inputs(
        tmp_path,
        hourly_frame(),
        detection_frame([(HOURS[0].isoformat(), ANCHOR_LAT, ANCHOR_LON, 1.0)]),
    )
    hourly, hotspots, inputs = load_feature_inputs(tmp_path)
    assert len(hourly) == len(HOURS) and len(hotspots) == 1
    assert inputs["hourly_aligned"]["sha256"] == sha256(
        tmp_path / "interim" / "hourly_aligned.parquet"
    )
    assert inputs["hotspots"]["sha256"] == sha256(
        tmp_path / "processed" / "hotspot_kalimantan.parquet"
    )
    assert inputs["snapshot"] == {"revision": "test"}

    # A byte that changed after the audit invalidates the run instead of quietly refitting.
    (tmp_path / "processed" / "hotspot_kalimantan.parquet").write_bytes(b"not parquet")
    with pytest.raises(ValueError, match="hotspot cache changed since the audit"):
        load_feature_inputs(tmp_path)

    write_inputs(tmp_path, hourly_frame(), detection_frame([]))
    interim = tmp_path / "interim" / "hourly_aligned.parquet"
    interim.write_bytes(interim.read_bytes() + b"x")
    with pytest.raises(ValueError, match="hourly_aligned.parquet changed since the audit"):
        load_feature_inputs(tmp_path)


def test_load_feature_inputs_refuses_a_non_model_report(tmp_path) -> None:
    write_inputs(tmp_path, hourly_frame(), detection_frame([]))
    report_path = tmp_path / "interim" / "audit_report.json"
    report = json.loads(report_path.read_text())
    report["target_kind"] = "observation"
    report_path.write_text(json.dumps(report))
    with pytest.raises(ValueError, match="expected 'model'"):
        load_feature_inputs(tmp_path)
    report_path.unlink()
    with pytest.raises(ValueError, match="Run notebook 02 first"):
        load_feature_inputs(tmp_path)
