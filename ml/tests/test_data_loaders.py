"""Offline tests for the FIRMS and Open-Meteo loaders.

CI has no network, so every test runs against small recorded responses. The payload shapes are
copied from live probes made on 2026-10-15 (see the module docstrings for captured facts).
"""

import pandas as pd
import pytest
import requests

from pavana_ml.data import firms
from pavana_ml.data.firms import (
    FETCH_ATTEMPTS,
    FirmsFetchError,
    combine_hotspots,
    fetch_range,
    parse_area_csv,
    stitch_streams,
    tidy_hotspots,
)
from pavana_ml.data.open_meteo import parse_hourly


class _Response:
    """Minimal `requests.Response` stand-in: `fetch_range` reads `.text` and `raise_for_status`."""

    def __init__(self, text: str):
        self.text = text

    def raise_for_status(self) -> None:
        return None


class _ScriptedSession:
    """Serve the scripted responses in order; every call past the end is a connection failure."""

    def __init__(self, *responses: _Response):
        self._responses = list(responses)
        self.calls = 0

    def get(self, *args, **kwargs) -> _Response:
        self.calls += 1
        if not self._responses:
            raise requests.ConnectionError("connection refused")
        return self._responses.pop(0)


# FIRMS sends different attribute columns per instrument, so the union is ragged on purpose.
_VIIRS_FIELDS = (
    "latitude,longitude,bright_ti4,scan,track,acq_date,acq_time,"
    "satellite,instrument,confidence,version,bright_ti5,frp,daynight,type"
)
_MODIS_FIELDS = (
    "latitude,longitude,brightness,scan,track,acq_date,acq_time,"
    "satellite,instrument,confidence,version,bright_t31,frp,daynight,type"
)


def viirs_csv(
    acq_time: int, frp: str = "5.43", frp_second: str = "2.55", version: str = "2"
) -> str:
    """Two VIIRS detections recorded at 2026-06-01; `acq_time` is HHMM UTC."""
    rows = [
        f"-2.68626,118.78583,340.27,0.54,0.42,2026-06-01,{acq_time},"
        f"N20,VIIRS,n,{version},292.15,{frp},D,0",
        f"-2.6797,119.17534,341.1,0.55,0.43,2026-06-01,{acq_time},"
        f"N20,VIIRS,n,{version},293.4,{frp_second},D,0",
    ]
    return "\n".join([_VIIRS_FIELDS, *rows]) + "\n"


def modis_csv() -> str:
    row = "-3.2651,114.9702,311.4,1.0,1.0,2026-06-01,214,Terra,MODIS,59,61.03,285.7,6.9,D,0"
    return f"{_MODIS_FIELDS}\n{row}\n"


WEATHER_PAYLOAD = {
    "latitude": -0.07107,
    "longitude": 109.37125,
    "hourly": {
        "time": ["2026-08-01T00:00", "2026-08-01T01:00", "2026-08-01T02:00"],
        "temperature_2m": [24.1, 23.8, None],
        "relative_humidity_2m": [98, 97, 95],
        "precipitation": [0.0, 0.1, 0.0],
        "wind_speed_10m": [0.86, 1.13, 1.29],
        "wind_direction_10m": [109, 121, 130],
    },
}

AIR_QUALITY_PAYLOAD = {
    "latitude": -1.0,
    "longitude": 114.0,
    "hourly": {"time": ["2026-09-01T00:00", "2026-09-01T01:00"], "pm2_5": [287.8, 248.7]},
}


def test_parse_area_csv_keeps_instrument_specific_columns():
    viirs = parse_area_csv(viirs_csv(552), "VIIRS_NOAA20_NRT")
    modis = parse_area_csv(modis_csv(), "MODIS_SP")
    assert len(viirs) == 2 and len(modis) == 1
    assert viirs["processing"].unique().tolist() == ["NRT"]
    assert modis["processing"].unique().tolist() == ["SP"]
    assert "bright_ti4" in viirs.columns and "brightness" in modis.columns


def test_parse_area_csv_empty_response_is_not_an_error():
    """An empty FIRMS response is a valid answer, and never means "no fire"."""
    empty = parse_area_csv(_VIIRS_FIELDS + "\n", "VIIRS_SNPP_SP")
    assert empty.empty
    assert combine_hotspots(empty).empty


def test_tidy_hotspots_builds_utc_acquired_at_and_renames_frp():
    tidy = tidy_hotspots(parse_area_csv(viirs_csv(552), "VIIRS_NOAA20_SP"))
    assert str(tidy["acquired_at"].dt.tz) == "UTC"
    assert tidy["acquired_at"].iloc[0] == pd.Timestamp("2026-06-01 05:52", tz="UTC")
    assert tidy["frp_mw"].iloc[0] == pytest.approx(5.43)
    assert {"lat", "lon"}.issubset(tidy.columns)


def test_combine_hotspots_dedupes_sp_against_nrt_across_a_one_minute_offset():
    """SP and NRT describe the same detection but disagree on acq_time by ~1 minute."""
    sp = parse_area_csv(viirs_csv(552), "VIIRS_NOAA20_SP")
    nrt = parse_area_csv(viirs_csv(553), "VIIRS_NOAA20_NRT")
    assert len(sp) == len(nrt) == 2
    merged = combine_hotspots(sp, nrt)
    assert len(merged) == 2, "the same detections must not be counted twice"
    assert set(merged["processing"]) == {"SP"}, "SP should win over NRT on the overlap"


def test_combine_hotspots_keeps_distinct_detections_and_sorts_by_time():
    merged = combine_hotspots(
        parse_area_csv(modis_csv(), "MODIS_SP"), parse_area_csv(viirs_csv(552), "VIIRS_NOAA20_NRT")
    )
    assert len(merged) == 3
    assert merged["acquired_at"].is_monotonic_increasing
    assert merged["frp_mw"].notna().all()


def test_missing_frp_stays_nan_and_is_never_zero():
    tidy = tidy_hotspots(parse_area_csv(viirs_csv(552, frp="", frp_second=""), "VIIRS_NOAA20_SP"))
    assert tidy["frp_mw"].isna().all()
    assert not (tidy["frp_mw"] == 0).any()


def test_confidence_is_split_because_modis_and_viirs_use_different_scales():
    """MODIS sends a percentage, VIIRS a class letter — merging them would invent a mapping."""
    viirs = tidy_hotspots(parse_area_csv(viirs_csv(552), "VIIRS_NOAA20_SP"))
    assert viirs["confidence_class"].tolist() == ["n", "n"]
    assert viirs["confidence_pct"].isna().all()

    modis = tidy_hotspots(parse_area_csv(modis_csv(), "MODIS_SP"))
    assert modis["confidence_pct"].iloc[0] == pytest.approx(59.0)
    assert pd.isna(modis["confidence_class"].iloc[0])


def test_combined_frame_survives_a_parquet_round_trip(tmp_path):
    """MODIS `version` is "61.03", VIIRS NRT is "2.0NRT".

    Left to pandas the concatenation infers a numeric column and then fails on write, which is
    exactly how the first real build broke. The explicit schema in `tidy_hotspots` must keep this
    writing cleanly.
    """
    merged = combine_hotspots(
        parse_area_csv(modis_csv(), "MODIS_SP"),
        parse_area_csv(viirs_csv(553, version="2.0NRT"), "VIIRS_SNPP_NRT"),
    )
    assert set(merged["version"]) == {"61.03", "2.0NRT"}
    path = tmp_path / "hotspot.parquet"
    merged.to_parquet(path, index=False)
    back = pd.read_parquet(path)
    assert len(back) == 3
    assert set(back["version"]) == {"61.03", "2.0NRT"}
    assert set(back["processing"]) == {"SP", "NRT"}


def test_processing_is_derived_when_a_batch_carries_only_source_sensor():
    """The Hugging Face SP archive has `source_sensor` but no `processing` column."""
    raw = parse_area_csv(modis_csv(), "MODIS_SP").drop(columns=["processing"])
    assert "processing" not in raw.columns
    tidy = tidy_hotspots(raw)
    assert tidy["processing"].unique().tolist() == ["SP"]


def test_fetch_range_raises_instead_of_returning_an_empty_frame(monkeypatch):
    """A dead connection must not look like a window with no detections."""
    monkeypatch.setattr(firms.time, "sleep", lambda *_: None)
    session = _ScriptedSession()

    with pytest.raises(FirmsFetchError, match=r"MODIS_NRT.*2026-06-01\.\.2026-06-03") as excinfo:
        fetch_range("KEY", "MODIS_NRT", firms.KALIMANTAN_BBOX, "2026-06-01", "2026-06-03", session)

    assert isinstance(excinfo.value.__cause__, requests.ConnectionError)
    assert session.calls == FETCH_ATTEMPTS, "the retry budget must actually be spent"


def test_fetch_range_raises_rather_than_returning_a_partial_range(monkeypatch):
    """The first batch arriving does not make the requested range complete."""
    monkeypatch.setattr(firms.time, "sleep", lambda *_: None)
    session = _ScriptedSession(_Response(modis_csv()))

    with pytest.raises(FirmsFetchError, match=r"2026-06-06\.\.2026-06-07"):
        fetch_range("KEY", "MODIS_SP", firms.KALIMANTAN_BBOX, "2026-06-01", "2026-06-07", session)


def test_fetch_range_raises_when_the_transaction_limit_never_clears(monkeypatch):
    """Throttling is a failure to collect, not an empty response."""
    monkeypatch.setattr(firms.time, "sleep", lambda *_: None)
    throttled = [_Response("Exceeding allowed transaction limit") for _ in range(FETCH_ATTEMPTS)]

    with pytest.raises(FirmsFetchError, match="incomplete"):
        fetch_range(
            "KEY",
            "MODIS_SP",
            firms.KALIMANTAN_BBOX,
            "2026-06-01",
            "2026-06-01",
            _ScriptedSession(*throttled),
        )


def test_an_empty_requested_window_is_not_a_failure():
    """`stitch_streams` asks for nothing when the archive already reaches the present day."""
    session = _ScriptedSession()
    out = fetch_range("KEY", "MODIS_SP", firms.KALIMANTAN_BBOX, "2026-06-05", "2026-06-01", session)
    assert out.empty
    assert session.calls == 0


def test_tidy_hotspots_is_idempotent():
    """`stitch_streams` hands a tidy SP frame back through `combine_hotspots`."""
    once = tidy_hotspots(parse_area_csv(modis_csv(), "MODIS_SP"))
    pd.testing.assert_frame_equal(tidy_hotspots(once), once)


def test_combine_hotspots_accepts_a_tidy_frame_beside_a_raw_one():
    """Tidying the concatenation renamed `latitude` on top of an existing `lat` -> TypeError."""
    sp_tidy = tidy_hotspots(parse_area_csv(modis_csv(), "MODIS_SP"))
    raw_nrt = parse_area_csv(viirs_csv(553), "VIIRS_SNPP_NRT")

    merged = combine_hotspots(sp_tidy, raw_nrt)

    assert not merged.columns.duplicated().any(), "the join must not duplicate `lat`/`lon`"
    assert len(merged) == 3
    assert set(merged["processing"]) == {"SP", "NRT"}
    assert merged["confidence_pct"].notna().sum() == 1, "MODIS keeps its percentage"
    assert merged.loc[merged["processing"] == "NRT", "confidence_class"].eq("n").all()


def test_stitch_streams_normalizes_sp_and_nrt_exactly_once(monkeypatch):
    """The SP archive is already tidy; the NRT responses are raw. Both must end up tidy, once."""
    raw_nrt = parse_area_csv(viirs_csv(553), "VIIRS_SNPP_NRT")
    fetched: list[str] = []

    def fake_fetch(map_key, source, bbox, start, end, **kwargs):
        fetched.append(source)
        return raw_nrt

    monkeypatch.setattr(firms, "fetch_range", fake_fetch)
    merged = stitch_streams(
        [parse_area_csv(modis_csv(), "MODIS_SP")],
        "KEY",
        nrt_start="2026-06-01",
        nrt_end="2026-06-02",
    )

    assert fetched == list(firms.NRT_SOURCES)
    assert not merged.columns.duplicated().any()
    assert len(merged) == 3
    assert merged["acquired_at"].is_monotonic_increasing
    assert str(merged["acquired_at"].dt.tz) == "UTC"


def test_parse_hourly_weather_is_utc_and_renames_to_unit_columns():
    from pavana_ml.data.open_meteo import _WEATHER_RENAME

    df = parse_hourly(WEATHER_PAYLOAD, _WEATHER_RENAME)
    assert str(df["valid_at"].dt.tz) == "UTC"
    assert df["valid_at"].iloc[0] == pd.Timestamp("2026-08-01T00:00", tz="UTC")
    assert df["wind_speed_ms"].iloc[1] == pytest.approx(1.13)
    assert df["rh_pct"].iloc[0] == 98
    # A missing reanalysis hour stays NaN rather than becoming 0 °C.
    assert pd.isna(df["temperature_c"].iloc[2])


def test_parse_hourly_air_quality_keeps_cams_values_named_as_pm25():
    from pavana_ml.data.open_meteo import _AIR_QUALITY_RENAME

    df = parse_hourly(AIR_QUALITY_PAYLOAD, _AIR_QUALITY_RENAME)
    assert df["pm25_ug_m3"].iloc[0] == pytest.approx(287.8)
    assert df["valid_at"].iloc[0] == pd.Timestamp("2026-09-01T00:00", tz="UTC")
