"""Open-Meteo weather + air-quality (CAMS) — NOT IMPLEMENTED (scaffold).

Weather:     https://open-meteo.com/en/docs  (historical: archive-api / historical-forecast-api)
Air quality: https://open-meteo.com/en/docs/air-quality-api

LEAKAGE WARNING: for a fair "CAMS baseline" you need the forecast *as issued* before the
target time (issue-time archive), not a later re-analysis. Record `issued_at` for every value.
Request `timezone=GMT` and `wind_speed_unit=ms`.
"""

import pandas as pd


def fetch_weather_hourly(lat: float, lon: float, start: str, end: str) -> pd.DataFrame:
    raise NotImplementedError("Open-Meteo weather fetch not implemented yet")


def fetch_air_quality_hourly(lat: float, lon: float, start: str, end: str) -> pd.DataFrame:
    raise NotImplementedError("Open-Meteo air-quality fetch not implemented yet")
