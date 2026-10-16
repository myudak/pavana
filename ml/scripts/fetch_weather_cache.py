"""Fetch the ERA5 daily weather the hotspot model needs ONCE, paced under Open-Meteo's free
limits (≈312 weighted calls per point for 2015→2026; 5,000/hour), and stage it as a Kaggle
dataset so the Kaggle kernels never call Open-Meteo for history. Resumable (per-point cache).

    uv run --project ml python ml/scripts/fetch_weather_cache.py [--upload]
"""

import json
import subprocess
import sys
from datetime import UTC, datetime
from pathlib import Path

import pandas as pd

from pavana_ml.data.research import sha256
from pavana_ml.data.weather_daily import ARCHIVE_URL, DAILY_VARIABLES, fetch_daily_points
from pavana_ml.paths import DATA_DIR
from pavana_ml.pipelines.observed_data import DATA_START, build_land, weather_points

END = "2026-10-15"
OUT = DATA_DIR / "processed" / "kaggle-weather"
OUT.mkdir(parents=True, exist_ok=True)
land = build_land(OUT, DATA_DIR / "raw" / "land")
points = weather_points(pd.read_parquet(land))
print(f"{len(points)} weather points", flush=True)
df = fetch_daily_points(points, DATA_START, END, DATA_DIR / "raw" / "weather", batch=1, pause_s=230)
path = OUT / "weather_daily.parquet"
df.to_parquet(path, index=False)
manifest = {
    "source": ARCHIVE_URL,
    "params": {"daily": list(DAILY_VARIABLES), "timezone": "GMT", "wind_speed_unit": "ms",
               "start_date": DATA_START, "end_date": END},
    "kind": "reanalysis (ERA5 via Open-Meteo) — feature only, not an observation",
    "fetched_at_utc": datetime.now(UTC).isoformat(timespec="seconds"),
    "points": len(points),
    "files": {p.name: sha256(p) for p in (path, land)},
}
(OUT / "manifest.json").write_text(json.dumps(manifest, indent=2))
(OUT / "dataset-metadata.json").write_text(json.dumps(
    {"title": "Pavana weather cache", "id": "myudak/pavana-weather-cache",
     "licenses": [{"name": "CC-BY-4.0"}]}, indent=2))
print(manifest, flush=True)
if "--upload" in sys.argv:
    subprocess.run(["kaggle", "datasets", "create", "-p", str(OUT)], check=True)
