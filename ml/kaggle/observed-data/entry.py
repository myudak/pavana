# Pavana — observed-data kernel. Fetches keyless public sources into /kaggle/working/data.
# Generated from ml/kaggle/observed-data/entry.py by ml/kaggle/build.py; do not edit run.py.
from pathlib import Path

from pavana_ml.pipelines import observed_data

OUT = Path("/kaggle/working/data")
WEATHER = next(Path("/kaggle/input").rglob("weather_daily.parquet"), None)
print("weather cache:", WEATHER)
snapshot = observed_data.run(
    OUT, Path("/kaggle/tmp/cache"), weather_cache=WEATHER.parent if WEATHER else None
)
snapshot["code"] = CODE_INFO  # noqa: F821  (injected by build.py)
(OUT / "snapshot.json").write_text(__import__("json").dumps(snapshot, indent=2))
print(snapshot)
