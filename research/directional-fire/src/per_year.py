"""Per-test-year AP for every model in the seed-ensemble LOYO predictions.

    uv run --project ../../ml python -I src/per_year.py

Writes results/tables/per_year_ens.csv (one row per horizon x year, one column per model).
"""

import sys
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent))  # run with python -I
from analyze import TABLES, ap  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
SKIP = {"issue_at", "station", "country", "y", "current_event", "station_month_rate", "fold"}


def main():
    rows = []
    for h in (24, 6):
        d = pd.read_parquet(ROOT / "results" / "preds" / f"loyo_L3_{h}h_ens.parquet")
        models = [c for c in d.columns if c not in SKIP]
        for year, g in d.groupby(d["issue_at"].dt.year):
            y = g["y"].to_numpy()
            rows.append({"h": h, "year": year, "events": int(y.sum()),
                         **{m: ap(y, g[m].to_numpy()) for m in models}})  # fmt: skip
    out = pd.DataFrame(rows)
    out.to_csv(TABLES / "per_year_ens.csv", index=False)
    print(out.round(3).to_string(index=False))


if __name__ == "__main__":
    main()
