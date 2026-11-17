# Do wind-directional fire features improve haze-visibility forecasts?

Research paper built on Pavana's haze model. It tests whether wind-directional satellite fire
features improve 6 h and 24 h forecasts of haze-limited visibility at twelve airports in Borneo
and Sumatra (2015–2025), against matched non-directional controls and placebos.

**[Read the research paper (PDF)](paper/directional-fire.pdf)** · [LaTeX manuscript](paper/main.tex) · [Build workflow](../../.github/workflows/build-directional-fire-paper.yml)

[![DOI](https://zenodo.org/badge/DOI/10.5281/zenodo.24321120.svg)](https://doi.org/10.5281/zenodo.24321120)
Preprint on Zenodo. Cite as: Ananda, M. Y. T. (2026). _Do Wind-Directional Fire Features Improve
Haze-Visibility Forecasts? A Multi-Season Evaluation in Borneo and Sumatra_ (v1). Zenodo.
https://doi.org/10.5281/zenodo.24321120

- [PROTOCOL.md](PROTOCOL.md): the protocol frozen before any result, plus a log of later changes.
- [notes/](notes/): related-work notes and the response to reviewer comments.
- `src/`: data audit, feature building, experiments, statistics, figures, `paper/numbers.tex`.
- `results/tables`, `results/audit`: the CSVs every number in the paper comes from.
- `paper/`: LaTeX manuscript (`main.tex`). Figures in `paper/figures/`.
- `data/`, `results/preds`, `results/cache`: large and git-ignored. `data/raw/data/` is the
  output of the Kaggle kernel `myudak/pavana-observed-data` (v4); checksums in its
  `snapshot.json`.

The scripts use the repo's own `ml/` package (`pavana_ml`). From this folder:

```bash
uv run --project ../../ml python -I src/build_features.py 3        # table for latency L = 3 h
uv run --project ../../ml python -I src/run_experiments.py --lag 3 --split loyo
uv run --project ../../ml python -I src/analyze.py results/preds/loyo_L3_24h.parquet
uv run --project ../../ml python -I src/make_numbers.py
uv run --project ../../ml python -I src/figures.py results
tectonic paper/main.tex --outdir paper/build
```

This is offline research. Nothing here is wired into the API or the web app.
