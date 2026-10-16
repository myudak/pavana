"""OpenAQ v3 station PM2.5 — CHECKED 2026-10-15: no coverage in Kalimantan.

Docs: https://api.openaq.org/docs  (header `X-API-Key`)

Verified with a registered key:

* `GET /v3/locations?bbox=108.5,-4.5,119.5,3.5` -> **0 locations**. The whole island of Borneo
  has no station in OpenAQ.
* `GET /v3/locations?iso=ID` -> 94 locations, all in Java/Sumatra/Bali and smaller islands.
  Providers are mostly low-cost networks (AirGradient 70, HabitatMap 9, Clean Air Catalyst 7);
  the one reference-grade network, SPARTAN, has a single site (ITB Bandung).
* `radius` is capped at 25000 m; every v3 path requires `X-API-Key` (401 without one).
* v1/v2 are retired (`410 Gone`).

So OpenAQ cannot supply the observed-PM2.5 target for this project. The target has to come from
BMKG (rolling ~24 h window) or KLHK/AQM (same limit), or from an official data request.
Observed PM2.5 at a station at t+h is the supervised TARGET — never a model forecast.
"""

import pandas as pd


def fetch_station_pm25(api_key: str, location_id: int, start: str, end: str) -> pd.DataFrame:
    raise NotImplementedError("OpenAQ fetch not implemented yet")
