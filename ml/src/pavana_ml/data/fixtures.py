"""Load the SYNTHETIC demo scenario used by the app. Good for wiring/plots, useless for metrics."""

import json
from pathlib import Path
from typing import Any

import pandas as pd

from ..paths import KUBU_RAYA_SCENARIO


def load_scenario(path: Path = KUBU_RAYA_SCENARIO) -> dict[str, Any]:
    with path.open(encoding="utf-8") as f:
        scenario = json.load(f)
    assert scenario["meta"]["isDemo"] is True, "fixtures must be labelled demo"
    return scenario


def scenario_frames(scenario: dict[str, Any]) -> tuple[pd.DataFrame, pd.DataFrame]:
    """Return (hourly, hotspots) frames. Missing values stay NaN — never filled with 0."""
    hourly = pd.DataFrame(
        {
            "valid_at": pd.to_datetime([h["validAt"] for h in scenario["hours"]], utc=True),
            "pm25_ug_m3": [h["airQuality"]["pm25UgM3"] for h in scenario["hours"]],
            "wind_speed_ms": [h["weather"]["windSpeedMs"] for h in scenario["hours"]],
            "wind_dir_from_deg": [h["weather"]["windDirectionFromDeg"] for h in scenario["hours"]],
            "temperature_c": [h["weather"]["temperatureC"] for h in scenario["hours"]],
            "rh_pct": [h["weather"]["relativeHumidityPct"] for h in scenario["hours"]],
            "precip_mm": [h["weather"]["precipitationMm"] for h in scenario["hours"]],
        }
    )
    hourly["is_demo"] = True

    hotspots = pd.DataFrame(
        {
            "id": [h["id"] for h in scenario["hotspots"]],
            "lat": [h["lat"] for h in scenario["hotspots"]],
            "lon": [h["lon"] for h in scenario["hotspots"]],
            "acquired_at": pd.to_datetime(
                [h["acquiredAt"] for h in scenario["hotspots"]], utc=True
            ),
            "frp_mw": [h["frpMw"] for h in scenario["hotspots"]],
            "confidence": [h["confidence"] for h in scenario["hotspots"]],
            "satellite": [h["satellite"] for h in scenario["hotspots"]],
        }
    )
    hotspots["is_demo"] = True
    return hourly, hotspots
