"""Build the observed-data snapshot for the served models (runs in the Kaggle data kernel).

Every input is keyless and public:

* NASA FIRMS Suomi NPP yearly country archives (Indonesia, Malaysia) 2015–2025
* the pinned Hugging Face snapshot (`myudak/pavana`) for Suomi NPP SP + NRT in 2026
* Iowa Environmental Mesonet METAR for the airports in `pavana_ml.data.iem.AIRPORTS`
* Natural Earth land mask and a validated, locally cached Open-Meteo 2° daily weather grid
* pinned Hugging Face CAMS PM2.5 history (a model field, not station observations)

Outputs go to `out_dir` as parquet plus `snapshot.json` (row counts, ranges, sha256). The training
kernel consumes this directory read-only, so a re-train never refetches and other people can start
from the published data kernel output.
"""

from __future__ import annotations

import json
from datetime import UTC, datetime
from pathlib import Path

import numpy as np
import pandas as pd
import requests

from ..data import firms_archive, iem, weather_daily
from ..data.live_snapshot import frame_audit, pinned_cams, pinned_hf_file, weather_audit
from ..data.research import DATASET_REVISION, sha256
from ..features import hotspot_grid as g

HF_HOTSPOTS = "processed/hotspot_kalimantan.parquet"
ARCHIVE_YEARS = range(2015, 2026)
COUNTRIES = ("Indonesia", "Malaysia")
DATA_START = "2015-01-01"


def build_firms(out_dir: Path, cache_dir: Path, end: str) -> Path:
    """Suomi NPP detections 2015 → `end` over `REGION_BBOX`, one table."""
    frames = []
    for year in ARCHIVE_YEARS:
        for country in COUNTRIES:
            df = firms_archive.fetch_country_year(year, country, cache_dir)
            df["source"] = f"country-archive:{country}"
            frames.append(df)
            print(f"firms {year} {country}: {len(df):,}", flush=True)
    # 2026: not yet in the yearly archive. Use the pinned snapshot (SP to 2026-06-30, then NRT).
    hf_path = pinned_hf_file(HF_HOTSPOTS, cache_dir / "hf")
    hf = pd.read_parquet(hf_path)
    snpp = hf[hf["source_sensor"].astype(str).str.startswith("VIIRS_SNPP")]
    snpp = snpp[snpp["acquired_at"] >= pd.Timestamp("2026-01-01", tz="UTC")]
    frames.append(
        pd.DataFrame(
            {
                "lat": snpp["lat"].to_numpy(float),
                "lon": snpp["lon"].to_numpy(float),
                "acquired_at": snpp["acquired_at"],
                "frp_mw": snpp["frp_mw"].to_numpy(float),
                "confidence_class": snpp["confidence_class"].astype("string").str[:1],
                "fire_type": np.nan,
                "daynight": snpp.get("daynight", pd.Series(pd.NA, index=snpp.index)).astype(
                    "string"
                ),
                "source": "hf:" + snpp["source_sensor"].astype(str),
            }
        )
    )
    print(f"firms 2026 (HF snapshot, SNPP): {len(snpp):,}", flush=True)
    df = pd.concat(frames, ignore_index=True)
    df = df[df["acquired_at"] < pd.Timestamp(end, tz="UTC") + pd.Timedelta(days=1)]
    df = df.drop_duplicates(["lat", "lon", "acquired_at"]).sort_values("acquired_at")
    path = out_dir / "firms_snpp.parquet"
    df.reset_index(drop=True).to_parquet(path, index=False)
    return path


NE_LAND = "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_land.geojson"


def build_land(out_dir: Path, cache_dir: Path) -> Path:
    """Grid cells with land: any of five sample points per cell inside Natural Earth 10m land.

    One file download instead of thousands of elevation API calls (shared cloud IPs get
    rate-limited by Open-Meteo).
    """
    from matplotlib.path import Path as MplPath

    cache_dir.mkdir(parents=True, exist_ok=True)
    geo = cache_dir / "ne_10m_land.geojson"
    if not geo.exists():
        r = requests.get(NE_LAND, timeout=300)
        r.raise_for_status()
        geo.write_bytes(r.content)
    w, s, e, n = g.GRID_BBOX
    rings = []
    for feat in json.loads(geo.read_text(encoding="utf-8"))["features"]:
        gm = feat["geometry"]
        polys = gm["coordinates"] if gm["type"] == "MultiPolygon" else [gm["coordinates"]]
        for poly in polys:
            ring = np.asarray(poly[0], dtype=float)  # outer ring; lakes ignored on purpose
            if (
                ring[:, 0].max() < w
                or ring[:, 0].min() > e
                or ring[:, 1].max() < s
                or ring[:, 1].min() > n
            ):
                continue
            rings.append(MplPath(ring))
    cells = np.arange(g.N_ROWS * g.N_COLS)
    lat, lon = g.cell_center(cells)
    offsets = [(0.0, 0.0), (-0.08, -0.08), (-0.08, 0.08), (0.08, -0.08), (0.08, 0.08)]
    land_points = np.zeros(len(cells), dtype=int)
    for dy, dx in offsets:
        pts = np.column_stack([lon + dx, lat + dy])
        inside = np.zeros(len(cells), dtype=bool)
        for ring in rings:
            inside |= ring.contains_points(pts)
        land_points += inside
    df = pd.DataFrame({"cell": cells, "lat": lat, "lon": lon, "land_points": land_points})
    path = out_dir / "grid_land.parquet"
    df.to_parquet(path, index=False)
    print(
        f"land cells: {(df.land_points > 0).sum()} of {len(df)} ({len(rings)} polygons)", flush=True
    )
    return path


def weather_points(land: pd.DataFrame) -> list[tuple[float, float]]:
    cells = land.loc[land["land_points"] > 0, "cell"].to_numpy()
    lat, lon = g.weather_point(*g.cell_center(cells))
    return sorted({(float(a), float(b)) for a, b in zip(lat, lon, strict=True)})


def build_weather(out_dir: Path, cache_dir: Path, land_path: Path, end: str) -> Path:
    points = weather_points(pd.read_parquet(land_path))
    print(f"weather points: {len(points)}", flush=True)
    df = weather_daily.fetch_daily_points(points, DATA_START, end, cache_dir)
    path = out_dir / "weather_daily.parquet"
    df.to_parquet(path, index=False)
    return path


def build_metar(out_dir: Path, cache_dir: Path, end: str) -> Path:
    frames = []
    for a in iem.AIRPORTS:
        df = iem.fetch_station(a.icao, DATA_START, end, cache_dir)
        print(f"metar {a.icao}: {len(df):,}", flush=True)
        frames.append(df)
    path = out_dir / "metar.parquet"
    pd.concat(frames, ignore_index=True).sort_values("valid_at").drop_duplicates(
        ["station", "valid_at"], keep="last"
    ).to_parquet(path, index=False)
    return path


def run(
    out_dir: Path, cache_dir: Path, end: str | None = None, weather_cache: Path | None = None
) -> dict:
    """Fetch everything and write `snapshot.json`. `end` defaults to yesterday (UTC).

    `weather_cache` = the validated Kaggle dataset `myudak/pavana-weather-cache` (land mask +
    daily historical blend, fetched once by `ml/scripts/fetch_weather_cache.py`). It is required;
    this pipeline never fetches historical weather from shared cloud IPs.
    """
    import shutil

    end = end or (datetime.now(UTC).date() - pd.Timedelta(days=1)).isoformat()
    out_dir.mkdir(parents=True, exist_ok=True)
    cache_dir.mkdir(parents=True, exist_ok=True)
    if weather_cache is None:
        raise ValueError("Validated weather cache required before any downloads")
    weather_audit(
        weather_cache, weather_points(pd.read_parquet(weather_cache / "grid_land.parquet"))
    )
    paths = {
        "firms": build_firms(out_dir, cache_dir / "firms", end),
        "metar": build_metar(out_dir, cache_dir / "iem", end),
    }
    if weather_cache is not None:
        audit = weather_audit(
            weather_cache, weather_points(pd.read_parquet(weather_cache / "grid_land.parquet"))
        )
        for name in ("grid_land.parquet", "weather_daily.parquet"):
            shutil.copy(weather_cache / name, out_dir / name)
        paths["land"] = out_dir / "grid_land.parquet"
        paths["weather"] = out_dir / "weather_daily.parquet"
        # Weather ends where the cache ends; the hotspot table is cut to the shorter range.
        end = min(end, audit["effectiveEnd"])
    else:
        raise ValueError(
            "Validated weather cache required; never fetch history in the cloud kernel"
        )
    paths["cams"], cams_provenance = pinned_cams(out_dir, cache_dir / "hf")
    files = {}
    for name, p in paths.items():
        df = pd.read_parquet(p)
        files[name] = {
            "path": p.name,
            "rows": len(df),
            "sha256": sha256(p),
            "columns": list(df.columns),
            **frame_audit(df, name),
        }
    snapshot = {
        "built_at_utc": datetime.now(UTC).isoformat(timespec="seconds"),
        "data_start": DATA_START,
        "data_end": end,
        "hf_dataset_revision": DATASET_REVISION,
        "weather_audit": audit,
        "cams_provenance": cams_provenance,
        "files": files,
        "notes": [
            "FIRMS = Suomi NPP only; detections are not confirmed fires.",
            "Weather = Open-Meteo historical archive default blend; feature only, not a station.",
            "CAMS = pinned model field, not observed PM2.5.",
            "METAR = airport observations from IEM; vsby converted miles -> km.",
        ],
    }
    (out_dir / "snapshot.json").write_text(json.dumps(snapshot, indent=2), encoding="utf-8")
    return snapshot
