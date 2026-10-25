"""Seed sensitivity of the 2015 leave-one-year-out fold (review round 1, post hoc).

    uv run --project ../../ml python -I src/seed_check.py

Under LOYO, almost all pooled differences between LightGBM variants come from the 2015 fold, where
variants fall into two groups (AP ~0.52 or ~0.59) that do not follow feature content. This refits
that fold with five LightGBM seeds per variant (24 h, L = 3 h; everything else as in
run_experiments.py, but 4 threads) to see how much of the gap is seed-to-seed variation.
Writes results/tables/seed_check_2015.csv.
"""

import sys
from pathlib import Path

import lightgbm as lgb
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent))  # run with python -I
from analyze import ap  # noqa: E402
from run_experiments import CACHE, PARAMS, ROUNDS, VARIANTS, add_climatology, folds  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
MODELS = ["D0", "E", "D0cat", "Ecat"]
SEEDS = [20261016, 1, 2, 3, 4]
FOLDS = ["2015"]
OUT = "seed_check_2015.csv"
if len(sys.argv) > 1:  # e.g. seed_check.py 2018,2019,2023 D0,E 1,2,3 out.csv
    FOLDS, MODELS = sys.argv[1].split(","), sys.argv[2].split(",")
    SEEDS, OUT = [int(x) for x in sys.argv[3].split(",")], sys.argv[4]


def main():
    table = pd.read_parquet(CACHE / "table_L3.parquet")
    table["iso_masked_72h"] = table["iso_72h"].where(table["wind_dir_sin"].notna())
    table = pd.concat([table, pd.read_parquet(CACHE / "review_L3.parquet")], axis=1)
    df = table[table["y_24h"].notna()].reset_index(drop=True)
    rows = []
    for name, tr_mask, te_mask in folds(df, "loyo"):
        if name not in FOLDS:
            continue
        tr, te = add_climatology(df[tr_mask], df[te_mask])
        ytr, yte = tr["y_24h"].to_numpy(), te["y_24h"].to_numpy()
        for seed in SEEDS:
            for m in MODELS:
                p = {**PARAMS, "seed": seed, "num_threads": 4}
                model = lgb.train(p, lgb.Dataset(tr[VARIANTS[m]], ytr), num_boost_round=ROUNDS)
                rows.append({"fold": name, "seed": seed, "model": m, "AP": ap(yte, model.predict(te[VARIANTS[m]]))})
                print(rows[-1], flush=True)
    out = pd.DataFrame(rows)
    out.to_csv(ROOT / "results" / "tables" / OUT, index=False)
    print(out.pivot_table(index=["fold", "seed"], columns="model", values="AP").round(3))


if __name__ == "__main__":
    main()
