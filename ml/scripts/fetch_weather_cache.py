"""Resumable, paced weather cache; publishing never requires repeating the download.

--source-stage PATH --upload-only reuses the completed Claude fetch without starting a fetcher.
Use --upload for automatic create/version, or --version to explicitly publish a new version.
"""

import argparse
import json
import shutil
import subprocess
from datetime import UTC, datetime
from pathlib import Path

import pandas as pd

from pavana_ml.data.live_snapshot import weather_audit
from pavana_ml.data.research import sha256
from pavana_ml.data.weather_daily import ARCHIVE_URL, DAILY_VARIABLES, fetch_daily_points
from pavana_ml.paths import DATA_DIR
from pavana_ml.pipelines.contract import write_json
from pavana_ml.pipelines.observed_data import DATA_START, build_land, weather_points

DATASET = "myudak/pavana-weather-cache"


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--upload", action="store_true")
    parser.add_argument("--version", action="store_true")
    parser.add_argument("--upload-only", action="store_true")
    parser.add_argument("--source-stage", type=Path)
    parser.add_argument("--end", default="2026-10-15")
    parser.add_argument("--output", type=Path, default=DATA_DIR / "processed" / "kaggle-weather")
    parser.add_argument("--raw-cache", type=Path, default=DATA_DIR / "raw" / "weather")
    parser.add_argument("--land", type=Path)
    args = parser.parse_args()
    out = args.output
    out.mkdir(parents=True, exist_ok=True)
    if args.source_stage:
        for name in ("grid_land.parquet", "weather_daily.parquet", "manifest.json"):
            shutil.copyfile(args.source_stage / name, out / name)
    if args.upload_only:
        if not (out / "manifest.json").exists():
            raise ValueError("No completed cache to publish")
        manifest = json.loads((out / "manifest.json").read_text())
    else:
        if args.land:
            land = out / "grid_land.parquet"
            shutil.copyfile(args.land, land)
        else:
            land = build_land(out, DATA_DIR / "raw" / "land")
        points = weather_points(pd.read_parquet(land))
        frame = fetch_daily_points(
            points, DATA_START, args.end, args.raw_cache, batch=1, pause_s=230
        )
        path = out / "weather_daily.parquet"
        frame.to_parquet(path, index=False)
        manifest = {
            "source": ARCHIVE_URL,
            "params": {
                "daily": list(DAILY_VARIABLES),
                "timezone": "GMT",
                "wind_speed_unit": "ms",
                "start_date": DATA_START,
                "end_date": args.end,
            },
            "fetched_at_utc": datetime.now(UTC).isoformat(timespec="seconds"),
            "points": len(points),
            "files": {p.name: sha256(p) for p in (path, land)},
        }
    manifest["kind"] = (
        "Historical weather model blend via Open-Meteo; models unspecified; feature only"
    )
    write_json(out / "manifest.json", manifest)
    audit = weather_audit(out, weather_points(pd.read_parquet(out / "grid_land.parquet")))
    write_json(out / "audit.json", audit)
    write_json(
        out / "dataset-metadata.json",
        {"title": "Pavana weather cache", "id": DATASET, "licenses": [{"name": "CC-BY-4.0"}]},
    )
    print(json.dumps(audit, indent=2), flush=True)
    if args.upload or args.version:
        existing = (
            subprocess.run(["kaggle", "datasets", "files", DATASET], capture_output=True).returncode
            == 0
        )
        command = [
            "kaggle",
            "datasets",
            "version" if args.version or existing else "create",
            "-p",
            str(out),
        ]
        if args.version or existing:
            command += [
                "-m",
                "Validated weather cache; same downloaded bytes, audited coverage and provenance",
            ]
        subprocess.run(command, check=True)


if __name__ == "__main__":
    main()
