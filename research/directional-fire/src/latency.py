"""Latency sensitivity (H4): key contrasts at each fire-data latency L, LOYO.

    uv run --project ../../ml python src/latency.py

Reads results/preds/loyo_L{L}_{h}h.parquet for L in 0, 3, 6, 12, 24 and writes
results/tables/latency.csv (pooled and per-season ΔAP with block-bootstrap CIs). Uses fewer
resamples than analyze.py (300 pooled, 150 per-season), which is enough for a sensitivity curve.
"""

import sys
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent))  # run with python -I
import analyze  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
LAGS = [0, 3, 6, 12, 24]
CONTRASTS = [("E", "D0"), ("Rshift", "D0"), ("E", "Rshift"), ("D0m", "D0"), ("E", "D0m"), ("D", "C")]
analyze.N_BOOT = 300


def main(suffix=""):
    rows = []
    for lag in LAGS:
        for h in (6, 24):
            path = ROOT / "results" / "preds" / f"loyo_L{lag}_{h}h{suffix}.parquet"
            if not path.exists():
                print("missing", path.name)
                continue
            df = pd.read_parquet(path)
            pairs = [c for c in CONTRASTS if c[0] in df and c[1] in df]
            pooled = analyze.bootstrap_deltas(df, pairs)
            season = analyze.season_deltas(df, pairs)
            for (_, p), (_, s) in zip(pooled.iterrows(), season.iterrows(), strict=True):
                rows.append({"lag_h": lag, "h": h, "contrast": p["contrast"],
                             "dAP": p["dAP"], "ci_lo": p["ci_lo"], "ci_hi": p["ci_hi"],
                             "dAP_season_mean": s["dAP_season_mean"],
                             "s_ci_lo": s["ci_lo"], "s_ci_hi": s["ci_hi"]})  # fmt: skip
            for m in ("C", "D", "D0", "E", "Rshift", "D0m"):
                if m in df:
                    rows.append({"lag_h": lag, "h": h, "contrast": f"AP {m}",
                                 "dAP": analyze.ap(df["y"].to_numpy(), df[m].to_numpy())})  # fmt: skip
            print(f"L={lag} h={h} done", flush=True)
    out = pd.DataFrame(rows)
    out.to_csv(analyze.TABLES / f"latency{suffix}.csv", index=False)
    print(out.round(4).to_string(index=False))


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "")  # "_ens" for seed-ensemble predictions
