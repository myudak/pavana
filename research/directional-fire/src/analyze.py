"""Metrics and paired block-bootstrap comparisons for saved predictions (PROTOCOL.md).

    uv run --project ../../ml python src/analyze.py results/preds/loyo_L3_24h.parquet [...]

Prints and writes results/tables/<stem>_metrics.csv and <stem>_deltas.csv.
"""

import sys
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.metrics import average_precision_score, roc_auc_score

ROOT = Path(__file__).resolve().parent.parent
TABLES = ROOT / "results" / "tables"
TABLES.mkdir(parents=True, exist_ok=True)
MODELS = [
    "persistence",
    "climatology",
    "logistic",
    "C",
    "D",
    "D0",
    "E",
    "R180",
    "R90",
    "Rshift",
    "Eserved",
    "Ep",
    "Rp180",
    "Rpshift",
    "D0m",
    "lgC",
    "lgD0",
    "lgE",
    "lgRshift",
    "lgEp",
    "lgRpshift",
    "D0cat",
    "Ecat",
    "Rperm1",
    "Rperm2",
    "Rperm3",
    "Rshiftm168",
    "Rshift72",
    "Rshift336",
    "Rshift720",
    "D0v",
    "Ev",
    "Rshiftv",
    "D0mv",
    "lgD0cat",
    "lgEcat",
    "lgRperm1",
]
CONTRASTS = [
    ("D", "C"), ("D0", "D"), ("E", "D0"), ("Rshift", "D0"), ("E", "Rshift"),
    ("R180", "D0"), ("R90", "D0"), ("E", "R180"), ("Eserved", "D"),
    ("Ep", "D0"), ("Rpshift", "D0"), ("Ep", "Rpshift"), ("Ep", "E"), ("D0m", "D0"), ("E", "D0m"),
    ("lgD0", "lgC"), ("lgE", "lgD0"), ("lgE", "lgRshift"), ("lgEp", "lgD0"), ("lgEp", "lgRpshift"),
    # Review round 1 (2026-10-25)
    ("D0cat", "D0"), ("Ecat", "D0cat"), ("E", "Rperm1"), ("E", "Rperm2"), ("E", "Rperm3"),
    ("E", "Rshiftm168"), ("E", "Rshift72"), ("E", "Rshift336"), ("E", "Rshift720"),
    ("Ev", "D0v"), ("Ev", "Rshiftv"), ("D0mv", "D0v"), ("Ev", "D0mv"),
    ("lgEcat", "lgD0cat"), ("lgE", "lgRperm1"),
]  # fmt: skip
N_BOOT = 1000
ALERT_RATE = 0.02
SEASONS = {2015, 2019, 2023}


def ap(y, p):
    """Average precision (same step-wise definition as sklearn), vectorised."""
    order = np.argsort(-p, kind="stable")
    ys, ps = y[order], p[order]
    tp = np.cumsum(ys)
    fp = np.cumsum(1 - ys)
    last = np.r_[np.flatnonzero(np.diff(ps)), len(ps) - 1]
    tp, fp = tp[last], fp[last]
    npos = tp[-1]
    if npos == 0:
        return np.nan
    prec = tp / (tp + fp)
    rec = tp / npos
    return float(np.sum(np.diff(np.r_[0.0, rec]) * prec))


def brier_skill(y, p, clim):
    bs = np.mean((p - y) ** 2)
    ref = np.mean((clim - y) ** 2)
    return 1 - bs / ref


def hit_at_rate(y, p, rate=ALERT_RATE):
    """Share of events caught when alerting on the top `rate` of hours."""
    k = max(1, int(round(rate * len(p))))
    # Exactly k alerts; ties (e.g. binary persistence) are broken at random, not all included.
    tie = np.random.default_rng(0).random(len(p))
    top = np.lexsort((tie, p))[-k:]
    return float(y[top].sum() / max(1, y.sum()))


def metrics(df: pd.DataFrame, models):
    y = df["y"].to_numpy()
    clim = df["climatology"].to_numpy()
    rows = []
    for m in models:
        p = df[m].to_numpy()
        rows.append(
            {
                "model": m,
                "n": len(y),
                "events": int(y.sum()),
                "AP": average_precision_score(y, p),
                "ROC_AUC": roc_auc_score(y, p),
                "BSS": brier_skill(y, p, clim),
                f"hit@{int(ALERT_RATE * 100)}%": hit_at_rate(y, p),
            }
        )
    return pd.DataFrame(rows)


def block_ids(df: pd.DataFrame) -> np.ndarray:
    iso = df["issue_at"].dt.isocalendar()
    key = df["station"].astype(str) + "-" + iso["year"].astype(str) + "-" + iso["week"].astype(str)
    return pd.factorize(key)[0]


def bootstrap_deltas(df: pd.DataFrame, contrasts, seed=20261017):
    """Paired block bootstrap of ΔAP over station×ISO-week blocks (blocks resampled whole)."""
    rng = np.random.default_rng(seed)
    blocks = block_ids(df)
    order = np.argsort(blocks, kind="stable")
    bounds = np.r_[0, np.flatnonzero(np.diff(blocks[order])) + 1, len(order)]
    idx_of = [order[bounds[i] : bounds[i + 1]] for i in range(len(bounds) - 1)]
    y = df["y"].to_numpy()
    preds = {m: df[m].to_numpy() for pair in contrasts for m in pair}
    point = {pair: ap(y, preds[pair[0]]) - ap(y, preds[pair[1]]) for pair in contrasts}
    draws = {pair: [] for pair in contrasts}
    nb = len(idx_of)
    for _ in range(N_BOOT):
        pick = rng.integers(0, nb, nb)
        ix = np.concatenate([idx_of[i] for i in pick])
        yb = y[ix]
        if yb.sum() == 0:
            continue
        cache = {}
        for a, b in contrasts:
            for m in (a, b):
                if m not in cache:
                    cache[m] = ap(yb, preds[m][ix])
            draws[(a, b)].append(cache[a] - cache[b])
    rows = []
    for pair in contrasts:
        d = np.array(draws[pair])
        rows.append(
            {
                "contrast": f"{pair[0]} - {pair[1]}",
                "dAP": point[pair],
                "ci_lo": np.percentile(d, 2.5),
                "ci_hi": np.percentile(d, 97.5),
                "p_le_0": float(np.mean(d <= 0)),
            }
        )
    return pd.DataFrame(rows)


def season_deltas(df, contrasts, min_events=100, seed=20261018):
    """Mean over folds (years with >= min_events) of within-fold ΔAP; block bootstrap per fold."""
    rng = np.random.default_rng(seed)
    yrs = [y for y, g in df.groupby(df["issue_at"].dt.year) if g["y"].sum() >= min_events]
    per = {}
    for yv in yrs:
        g = df[df["issue_at"].dt.year == yv]
        blocks = block_ids(g)
        order = np.argsort(blocks, kind="stable")
        bounds = np.r_[0, np.flatnonzero(np.diff(blocks[order])) + 1, len(order)]
        per[yv] = (g, [order[bounds[i] : bounds[i + 1]] for i in range(len(bounds) - 1)])
    rows = []
    for a, b in contrasts:
        point = np.mean(
            [ap(g["y"].to_numpy(), g[a].to_numpy()) - ap(g["y"].to_numpy(), g[b].to_numpy()) for g, _ in per.values()]
        )
        draws = []
        for _ in range(N_BOOT // 2):
            ds = []
            for g, idx_of in per.values():
                pick = rng.integers(0, len(idx_of), len(idx_of))
                ix = np.concatenate([idx_of[i] for i in pick])
                yb = g["y"].to_numpy()[ix]
                if yb.sum() == 0:
                    continue
                ds.append(ap(yb, g[a].to_numpy()[ix]) - ap(yb, g[b].to_numpy()[ix]))
            draws.append(np.mean(ds))
        d = np.array(draws)
        rows.append(
            {
                "contrast": f"{a} - {b}",
                "years": len(per),
                "dAP_season_mean": point,
                "ci_lo": np.percentile(d, 2.5),
                "ci_hi": np.percentile(d, 97.5),
                "p_le_0": float(np.mean(d <= 0)),
            }
        )
    return pd.DataFrame(rows)


def main(paths):
    pd.set_option("display.width", 200)
    for p in paths:
        p = Path(p)
        df = pd.read_parquet(p)
        models = [m for m in MODELS if m in df.columns]
        contrasts = [c for c in CONTRASTS if c[0] in df.columns and c[1] in df.columns]
        met = metrics(df, models)
        met.to_csv(TABLES / f"{p.stem}_metrics.csv", index=False)
        print(f"\n== {p.stem}  (n={len(df):,}, events={int(df['y'].sum())})")
        print(met.round(4).to_string(index=False))
        dl = bootstrap_deltas(df, contrasts)
        dl.to_csv(TABLES / f"{p.stem}_deltas.csv", index=False)
        print(dl.round(4).to_string(index=False))
        if p.stem.startswith("loyo"):
            sd = season_deltas(df, contrasts)
            sd.to_csv(TABLES / f"{p.stem}_season_deltas.csv", index=False)
            print(sd.round(4).to_string(index=False))
        # Breakdowns: season vs non-season years, per country, per station (E vs D0).
        if "fold" in df.columns and df["fold"].str.len().eq(4).all():
            yr = df["issue_at"].dt.year
            rows = []
            for label, mask in (
                ("haze seasons 2015/2019/2023", yr.isin(SEASONS)),
                ("other years", ~yr.isin(SEASONS)),
                ("Indonesia (FU coding)", df["country"] == "ID"),
                ("Malaysia (HZ coding)", df["country"] == "MY"),
                *((f"year {y}", yr == y) for y in sorted(yr.unique())),
                *((f"station {s}", df["station"] == s) for s in sorted(df["station"].unique())),
            ):
                sub = df[mask]
                if sub["y"].sum() < 5:
                    continue
                ys = sub["y"].to_numpy()
                r = {"subset": label, "n": len(sub), "events": int(ys.sum())}
                for m in (
                    "D0",
                    "D0m",
                    "E",
                    "Rshift",
                    "Ep",
                    "Rpshift",
                    "lgD0",
                    "lgE",
                    "D0cat",
                    "Ecat",
                    "Rperm1",
                    "D0v",
                    "Ev",
                ):
                    if m in sub:
                        r[f"AP_{m}"] = average_precision_score(ys, sub[m])
                if "E" in sub and "D0" in sub:
                    r["dAP_E_D0"] = r["AP_E"] - r["AP_D0"]
                rows.append(r)
            br = pd.DataFrame(rows)
            br.to_csv(TABLES / f"{p.stem}_breakdown.csv", index=False)
            print(br.round(4).to_string(index=False))


if __name__ == "__main__":
    main(sys.argv[1:])
