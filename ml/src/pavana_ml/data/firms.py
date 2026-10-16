"""NASA FIRMS active-fire detections (MODIS + VIIRS).

Docs: https://firms.modaps.eosdis.nasa.gov/api/area/

Two processing streams exist and they are NOT interchangeable in time:

    SP  (standard processing) — the archive product, lags roughly 2–3 months
    NRT (near real time)      — published within hours, superseded by SP later

Verified 2026-10-15 over Kalimantan (`KALIMANTAN_BBOX`):

    MODIS_SP        2000-11-01 .. 2026-07-31    MODIS_NRT        2026-08-01 .. present
    VIIRS_SNPP_SP   2012-01-20 .. 2026-06-30    VIIRS_SNPP_NRT   2026-07-01 .. present
    VIIRS_NOAA20_SP 2018-04-01 .. 2026-06-30    VIIRS_NOAA20_NRT 2026-07-01 .. present
    VIIRS_NOAA21_SP 2023-03-01 .. 2026-06-30    VIIRS_NOAA21_NRT 2024-01-17 .. present

Consequence: the severe Aug–Oct 2026 smoke season has **no SP coverage at all** and must be
stitched from NRT. On the overlap period (probed 2026-06-01, VIIRS_NOAA21) SP and NRT return the
same detection set — identical row counts, identical coordinates and FRP — differing only by
about one minute in `acq_time`. Hence `combine_hotspots` de-duplicates on a time tolerance and
keeps a `processing` column, so a later SP backfill can supersede the NRT rows instead of
silently duplicating them.

A detection is not a confirmed fire, and absence of detections is not absence of fire.

One more cross-instrument trap: `confidence` means different things per instrument — MODIS sends a
percentage, VIIRS sends a class letter. `tidy_hotspots` keeps them in separate columns
(`confidence_pct`, `confidence_class`) instead of merging two incompatible scales.
"""

from __future__ import annotations

import io
import time
from collections.abc import Iterable
from pathlib import Path

import pandas as pd
import requests

AREA_URL = "https://firms.modaps.eosdis.nasa.gov/api/area/csv"
AVAILABILITY_URL = "https://firms.modaps.eosdis.nasa.gov/api/data_availability/csv"

SP_SOURCES = ("MODIS_SP", "VIIRS_SNPP_SP", "VIIRS_NOAA20_SP", "VIIRS_NOAA21_SP")
NRT_SOURCES = ("MODIS_NRT", "VIIRS_SNPP_NRT", "VIIRS_NOAA20_NRT", "VIIRS_NOAA21_NRT")

# (west, south, east, north) — the box the existing Kalimantan batches were fetched with.
KALIMANTAN_BBOX = (108.0, -4.5, 119.5, 4.5)

# FIRMS serves at most 5 days per request.
MAX_DAY_RANGE = 5

# Retries per 5-day window before the range is declared un-fetchable. Handing back the batches that
# did arrive would report a collection failure as an absence of detections, which is the one
# reading the hotspot rules forbid, so an exhausted window raises instead (see `fetch_range`).
FETCH_ATTEMPTS = 6


class FirmsFetchError(RuntimeError):
    """A window could not be fetched at all, so nothing is known about the detections inside it."""


_TIDY_COLUMNS = (
    "lat",
    "lon",
    "acquired_at",
    "frp_mw",
    "confidence_pct",
    "confidence_class",
    "satellite",
    "instrument",
    "source_sensor",
    "processing",
)


def _bbox_str(bbox: tuple[float, float, float, float]) -> str:
    return ",".join(f"{v:g}" for v in bbox)


def parse_area_csv(text: str, source: str) -> pd.DataFrame:
    """Parse one area-API CSV response.

    An empty response is a legitimate answer, not an error — it never means "no fire".
    """
    text = text.strip()
    if not text or "latitude" not in text.splitlines()[0]:
        return pd.DataFrame(columns=["source_sensor", "processing"])
    df = pd.read_csv(io.StringIO(text))
    df["source_sensor"] = source
    df["processing"] = "NRT" if source.endswith("_NRT") else "SP"
    return df


def fetch_availability(map_key: str, timeout: int = 90) -> pd.DataFrame:
    """Per-product `min_date` / `max_date`. Call this before stitching SP and NRT."""
    r = requests.get(f"{AVAILABILITY_URL}/{map_key}/all", timeout=timeout)
    r.raise_for_status()
    av = pd.read_csv(io.StringIO(r.text))
    av.columns = av.columns.str.strip()
    av["data_id"] = av["data_id"].astype(str).str.strip()
    for col in ("min_date", "max_date"):
        if col in av.columns:
            av[col] = pd.to_datetime(av[col], errors="coerce")
    return av


def fetch_area(
    map_key: str,
    source: str,
    bbox: tuple[float, float, float, float],
    day_range: int,
    date: str | None = None,
    session: requests.Session | None = None,
    timeout: int = 90,
) -> pd.DataFrame:
    """One area-API request: `date .. date + day_range - 1` (UTC), or the most recent days."""
    if not 1 <= day_range <= MAX_DAY_RANGE:
        raise ValueError(f"day_range must be 1..{MAX_DAY_RANGE}, got {day_range}")
    url = f"{AREA_URL}/{map_key}/{source}/{_bbox_str(bbox)}/{day_range}"
    if date:
        url += f"/{date}"
    sess = session or requests
    r = sess.get(url, timeout=timeout)
    r.raise_for_status()
    return parse_area_csv(r.text, source)


def fetch_range(
    map_key: str,
    source: str,
    bbox: tuple[float, float, float, float],
    start: str | pd.Timestamp,
    end: str | pd.Timestamp,
    session: requests.Session | None = None,
    delay_s: float = 1.0,
) -> pd.DataFrame:
    """Fetch `start .. end` inclusive in 5-day batches, tolerating the transaction limit.

    Every batch must arrive. A batch that fails all `FETCH_ATTEMPTS` raises `FirmsFetchError`
    instead of being skipped, because a returned frame is read as "this is what the range contains":
    a silently dropped window would turn an outage into a clean-looking gap in the detections.

    An empty *window* (`start > end`) is not a failure — there is nothing to ask for — and returns
    an empty frame. An empty *response* is also legitimate and is kept as such by `parse_area_csv`.
    """
    sess = session or requests.Session()
    cur, last = pd.Timestamp(start).normalize(), pd.Timestamp(end).normalize()
    frames: list[pd.DataFrame] = []
    while cur <= last:
        days = min(MAX_DAY_RANGE, (last - cur).days + 1)
        window = f"{cur:%Y-%m-%d}..{cur + pd.Timedelta(days=days - 1):%Y-%m-%d}"
        last_error: Exception | None = None
        for attempt in range(FETCH_ATTEMPTS):
            try:
                r = sess.get(
                    f"{AREA_URL}/{map_key}/{source}/{_bbox_str(bbox)}/{days}/{cur:%Y-%m-%d}",
                    timeout=90,
                )
                if "Exceeding allowed transaction limit" in r.text:
                    time.sleep(600)
                    continue
                r.raise_for_status()
            except requests.RequestException as exc:
                last_error = exc
                time.sleep(60 * (attempt + 1))
                continue
            frames.append(parse_area_csv(r.text, source))
            break
        else:
            raise FirmsFetchError(
                f"{source}: no usable response for {window} after {FETCH_ATTEMPTS} attempts; "
                f"the requested range is incomplete"
            ) from last_error
        cur += pd.Timedelta(days=days)
        time.sleep(delay_s)
    if not frames:
        return pd.DataFrame(columns=["source_sensor", "processing"])
    return pd.concat(frames, ignore_index=True)


def _to_utc(acq_date: pd.Series, acq_time: pd.Series) -> pd.Series:
    """`acq_date` (YYYY-MM-DD) + `acq_time` (HHMM) -> UTC timestamps."""
    hhmm = acq_time.astype("Int64").astype(str).str.zfill(4)
    stamp = acq_date.astype(str).str.strip() + " " + hhmm.str[:2] + ":" + hhmm.str[2:]
    return pd.to_datetime(stamp, format="%Y-%m-%d %H:%M", utc=True, errors="coerce")


# Fire products disagree on dtypes as well as on confidence scales: MODIS sends `version` as
# "61.03" and VIIRS as "2.0NRT", and `type` arrives as either a code or text. Left to pandas the
# concatenation infers a numeric column and then explodes on the first non-numeric value when
# writing parquet, so every tidy frame gets an explicit, deterministic schema.
_TEXT_COLUMNS = (
    "satellite",
    "instrument",
    "source_sensor",
    "processing",
    "daynight",
    "version",
    "acq_date",
)
_NUMERIC_COLUMNS = (
    "lat",
    "lon",
    "acq_time",
    "frp_mw",
    "confidence_pct",
    "brightness",
    "scan",
    "track",
    "bright_t31_k",
    "bright_ti4_k",
    "bright_ti5_k",
    "type",
)


def _apply_schema(df: pd.DataFrame) -> pd.DataFrame:
    for col in _TEXT_COLUMNS:
        if col in df.columns:
            df[col] = df[col].astype("string")
    for col in _NUMERIC_COLUMNS:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce")
    return df


def tidy_hotspots(df: pd.DataFrame) -> pd.DataFrame:
    """Rename to the repo's tidy convention (`lat`, `lon`, `acquired_at`, `frp_mw`).

    `confidence` is NOT comparable across instruments: MODIS reports a percentage (0-100) while
    VIIRS reports a class (`l`/`n`/`h`). They are therefore split into `confidence_pct` (numeric,
    MODIS) and `confidence_class` (string, VIIRS) rather than coerced into one column, which
    would both invent a mapping and break parquet typing. No mapping is applied — that decision
    belongs downstream and must be documented when taken.

    Re-applying it to an already-tidy frame is safe: an existing `confidence_pct` /
    `confidence_class` pair carries no `confidence` column, so it is left as it is instead of being
    split a second time (`combine_hotspots` and `stitch_streams` pass mixed inputs).
    """
    if df.empty:
        return pd.DataFrame(columns=list(_TIDY_COLUMNS))
    out = df.copy()
    out["acquired_at"] = _to_utc(out["acq_date"], out["acq_time"])
    out = out.rename(
        columns={
            "latitude": "lat",
            "longitude": "lon",
            "frp": "frp_mw",
            "bright_ti4": "bright_ti4_k",
            "bright_ti5": "bright_ti5_k",
            "bright_t31": "bright_t31_k",
        }
    )
    # Missing FRP stays NaN; the shared upwind math weights it as 1, never as zero heat.
    out["frp_mw"] = pd.to_numeric(out["frp_mw"], errors="coerce")

    if "confidence" in out.columns:
        raw_conf = out["confidence"].astype("string").str.strip()
        out["confidence_pct"] = pd.to_numeric(raw_conf, errors="coerce")
        out["confidence_class"] = raw_conf.where(out["confidence_pct"].isna())
        out = out.drop(columns=["confidence"])

    # Batches downloaded elsewhere (e.g. the Hugging Face archive) carry `source_sensor` but no
    # `processing`, so derive it from the sensor name instead of leaving those rows unlabelled.
    if "source_sensor" in out.columns:
        derived = (
            out["source_sensor"]
            .astype("string")
            .str.endswith("_NRT")
            .map({True: "NRT", False: "SP"})
            .astype("string")
        )
        if "processing" in out.columns:
            out["processing"] = out["processing"].fillna(derived)
        else:
            out["processing"] = derived
    return _apply_schema(out)


def combine_hotspots(*frames: pd.DataFrame, bucket_minutes: int = 2) -> pd.DataFrame:
    """Stitch SP and NRT batches into one table.

    SP and NRT disagree on `acq_time` by about a minute for the same detection, so de-duplication
    buckets acquisition time instead of matching it exactly. Pass SP frames first so that, where
    both streams describe one detection, the archive version is the one kept.

    Each frame is normalized on its own before they are joined. Tidying the concatenation instead
    would rename `latitude` on top of an already-tidy `lat` and leave duplicate columns, which is
    how `stitch_streams` combines a tidy SP batch with raw NRT responses.
    """
    usable = [f for f in frames if f is not None and not f.empty]
    if not usable:
        return tidy_hotspots(pd.DataFrame())
    merged = pd.concat([tidy_hotspots(f) for f in usable], ignore_index=True, sort=False)
    merged = merged.dropna(subset=["lat", "lon", "acquired_at"])

    key = pd.DataFrame(
        {
            "lat": merged["lat"].round(5),
            "lon": merged["lon"].round(5),
            "bucket": merged["acquired_at"].dt.floor(f"{max(bucket_minutes, 1)}min"),
            "satellite": merged["satellite"],
            "instrument": merged["instrument"],
        }
    )
    merged = merged.loc[~key.duplicated()].reset_index(drop=True)
    return merged.sort_values("acquired_at").reset_index(drop=True)


def stitch_streams(
    sp_frames: Iterable[pd.DataFrame],
    map_key: str,
    nrt_start: str | pd.Timestamp | None = None,
    nrt_end: str | pd.Timestamp | None = None,
    bbox: tuple[float, float, float, float] = KALIMANTAN_BBOX,
) -> pd.DataFrame:
    """Combine existing SP batches with freshly fetched NRT batches covering the SP gap."""
    sp = combine_hotspots(*sp_frames)
    if nrt_start is None:
        nrt_start = sp["acquired_at"].max().normalize() + pd.Timedelta(days=1)
    if nrt_end is None:
        nrt_end = pd.Timestamp.now(tz="UTC").normalize()
    nrt_frames = [fetch_range(map_key, src, bbox, nrt_start, nrt_end) for src in NRT_SOURCES]
    return combine_hotspots(sp, *nrt_frames)


def save_batches(df: pd.DataFrame, out_dir: Path, prefix: str = "firms") -> list[Path]:
    """Persist raw batches, one file per source, keeping the covered range in the name."""
    out_dir.mkdir(parents=True, exist_ok=True)
    written: list[Path] = []
    for source, group in df.groupby("source_sensor", sort=True):
        lo = group["acquired_at"].min().strftime("%Y-%m-%d")
        hi = group["acquired_at"].max().strftime("%Y-%m-%d")
        path = out_dir / f"{prefix}_{source}_{lo}_{hi}.csv"
        group.to_csv(path, index=False)
        written.append(path)
    return written
