"""NASA FIRMS active-fire detections — NOT IMPLEMENTED (scaffold).

Docs: https://firms.modaps.eosdis.nasa.gov/api/area/
  /api/area/csv/{MAP_KEY}/{SOURCE}/{west,south,east,north}/{DAY_RANGE}/{YYYY-MM-DD}

Notes for the implementer:
- Use the *standard/archive* products for historical training, NRT for live.
- Build `acquired_at` (UTC) from `acq_date` + `acq_time` (HHMM).
- Keep `frp`, `confidence`, `satellite`, `instrument`, `daynight`.
- Save raw CSVs under ml/data/raw/firms/ with the request params in the filename.
"""

import pandas as pd


def fetch_area(
    map_key: str,
    source: str,
    bbox: tuple[float, float, float, float],
    day_range: int,
    date: str | None = None,
) -> pd.DataFrame:
    raise NotImplementedError("FIRMS fetch not implemented yet")
