"""Bootstrap sensitivity to the block design (review round 1). LOYO, L = 3 h.

    uv run --project ../../ml python -I src/robustness.py

The main analysis resamples station x ISO-week blocks, so one haze episode at several airports
can be split across blocks. Here every block holds all stations together: ISO week, calendar
month, or calendar year (11 clusters; coarse). Writes results/tables/robust_blocks.csv.
"""

import sys
from pathlib import Path

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent))  # run with python -I
from analyze import TABLES, ap  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
N_BOOT = 500
CONTRASTS = [
    ("D", "C"), ("E", "D0"), ("E", "D"), ("D0", "D"), ("E", "Rshift"), ("D0m", "D0"), ("E", "D0m"), ("Ecat", "D0cat"),
    ("E", "Rperm1"), ("E", "Rshiftm168"), ("D0cat", "D0"), ("lgE", "lgD0"), ("lgE", "lgRperm1"),
    ("Ev", "D0v"), ("Ev", "Rshiftv"), ("lgE", "lgRshift"), ("lgEcat", "lgD0cat"),
]  # fmt: skip


def blocks(df, mode):
    t = df["issue_at"]
    if mode == "station-week":
        iso = t.dt.isocalendar()
        key = df["station"].astype(str) + "-" + iso["year"].astype(str) + "-" + iso["week"].astype(str)
    elif mode == "week":
        iso = t.dt.isocalendar()
        key = iso["year"].astype(str) + "-" + iso["week"].astype(str)
    elif mode == "month":
        key = t.dt.strftime("%Y-%m")
    else:
        key = t.dt.year.astype(str)
    return pd.factorize(key)[0]


def run(df, pairs, mode, seed=20261025):
    rng = np.random.default_rng(seed)
    b = blocks(df, mode)
    order = np.argsort(b, kind="stable")
    bounds = np.r_[0, np.flatnonzero(np.diff(b[order])) + 1, len(order)]
    idx = [order[bounds[i] : bounds[i + 1]] for i in range(len(bounds) - 1)]
    y = df["y"].to_numpy()
    models = sorted({m for p in pairs for m in p})
    pred = {m: df[m].to_numpy() for m in models}
    draws = {p: [] for p in pairs}
    for _ in range(N_BOOT):
        ix = np.concatenate([idx[i] for i in rng.integers(0, len(idx), len(idx))])
        yb = y[ix]
        if yb.sum() == 0:
            continue
        s = {m: ap(yb, pred[m][ix]) for m in models}
        for a, c in pairs:
            draws[(a, c)].append(s[a] - s[c])
    rows = []
    for a, c in pairs:
        d = np.array(draws[(a, c)])
        rows.append({"mode": mode, "blocks": len(idx), "contrast": f"{a} - {c}",
                     "dAP": ap(y, pred[a]) - ap(y, pred[c]), "ci_lo": np.percentile(d, 2.5),
                     "ci_hi": np.percentile(d, 97.5), "p_le_0": float(np.mean(d <= 0))})  # fmt: skip
    return rows


def main(suffix=""):
    rows = []
    for h in (24, 6):
        df = pd.read_parquet(ROOT / "results" / "preds" / f"loyo_L3_{h}h{suffix}.parquet")
        pairs = [p for p in CONTRASTS if p[0] in df and p[1] in df]
        for mode in ("station-week", "week", "month", "year"):
            for r in run(df, pairs, mode):
                rows.append({"h": h, **r})
            print(f"h={h} {mode} done", flush=True)
    out = pd.DataFrame(rows)
    out.to_csv(TABLES / f"robust_blocks{suffix}.csv", index=False)
    print(out.round(4).to_string(index=False))


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "")  # "_ens" for the seed-ensemble predictions
