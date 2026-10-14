"""OpenAQ v3 station PM2.5 (candidate ground truth) — NOT IMPLEMENTED (scaffold).

Docs: https://api.openaq.org/docs  (header `X-API-Key`)
Coverage in Kalimantan is sparse; document station ids, operators, and gaps.
Observed PM2.5 at a station at t+h is the supervised TARGET — never a model forecast.
"""

import pandas as pd


def fetch_station_pm25(api_key: str, location_id: int, start: str, end: str) -> pd.DataFrame:
    raise NotImplementedError("OpenAQ fetch not implemented yet")
