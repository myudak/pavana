"""Paper figures (PDF + PNG) into paper/figures/.

uv run --project ../../ml python src/figures.py data      # map + coverage (no results needed)
uv run --project ../../ml python src/figures.py results   # ablation, latency, reliability, episode
"""

import sys
from pathlib import Path

import matplotlib
import matplotlib.ticker

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from pavana_ml.data.iem import AIRPORTS

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data" / "raw" / "data"
TABLES = ROOT / "results" / "tables"
PREDS = ROOT / "results" / "preds"
FIG = ROOT / "paper" / "figures"
FIG.mkdir(parents=True, exist_ok=True)

plt.rcParams.update(
    {
        "font.family": "serif",
        "font.size": 9,
        "axes.spines.top": False,
        "axes.spines.right": False,
        "savefig.dpi": 300,
        "savefig.bbox": "tight",
    }
)
INK = "#1f2937"
BLUE = "#2F6FA8"
ORANGE = "#D9822B"
GREY = "#9CA3AF"


def save(fig, name):
    for ext in ("pdf", "png"):
        fig.savefig(FIG / f"{name}.{ext}")
    plt.close(fig)
    print("wrote", name)


def fig_map():
    firms = pd.read_parquet(DATA / "firms_snpp.parquet", columns=["lat", "lon", "acquired_at"])
    firms = firms[firms["acquired_at"].dt.year <= 2025]
    land = pd.read_parquet(DATA / "grid_land.parquet") if (DATA / "grid_land.parquet").exists() else None
    fig, ax = plt.subplots(figsize=(6.8, 3.6))
    hb = ax.hexbin(
        firms["lon"], firms["lat"], gridsize=(150, 60), bins="log", cmap="YlOrRd",
        extent=(95, 122, -6.5, 7.5), mincnt=1, linewidths=0,
    )  # fmt: skip
    for a in AIRPORTS:
        ax.plot(a.lon, a.lat, marker="^", ms=6, mec="white", mew=0.8, color=BLUE)
        ax.text(a.lon + 0.25, a.lat + 0.2, a.icao, fontsize=7, color=INK)
        ax.add_patch(plt.Circle((a.lon, a.lat), 300 / 111, fill=False, lw=0.4, color=BLUE, alpha=0.35))
    ax.set(xlim=(95, 122), ylim=(-6.5, 7.5), xlabel="Longitude (°E)", ylabel="Latitude (°N)")
    ax.set_aspect("equal")
    cb = fig.colorbar(hb, ax=ax, shrink=0.75, pad=0.01)
    cb.set_label("VIIRS S-NPP detections 2015–2025 (log count)")
    if land is not None:
        pass
    save(fig, "fig1_map")


def fig_coverage():
    yr = pd.read_csv(ROOT / "results" / "audit" / "station_years.csv")
    yr = yr[yr["year"] <= 2025]
    ev = yr.pivot(index="station", columns="year", values="events").fillna(0)
    cov = yr.pivot(index="station", columns="year", values="reported_pct")
    order = [a.icao for a in AIRPORTS]
    ev, cov = ev.loc[order], cov.loc[order]
    fig, axes = plt.subplots(1, 2, figsize=(7.0, 3.0), sharey=True)
    im0 = axes[0].imshow(cov.to_numpy(), aspect="auto", cmap="Blues", vmin=0, vmax=100)
    im1 = axes[1].imshow(np.log10(ev.to_numpy() + 1), aspect="auto", cmap="Oranges")
    for ax, title in zip(axes, ("Hours with a METAR report (%)", "Haze-event hours (log10 n+1)"), strict=True):
        ax.set_xticks(range(len(cov.columns)), [str(c)[2:] for c in cov.columns])
        ax.set_title(title, fontsize=9)
    axes[0].set_yticks(range(len(order)), order)
    for (i, j), v in np.ndenumerate(ev.to_numpy()):
        if v >= 100:
            axes[1].text(j, i, int(v), ha="center", va="center", fontsize=5.5, color=INK)
    fig.colorbar(im0, ax=axes[0], shrink=0.8)
    fig.colorbar(im1, ax=axes[1], shrink=0.8)
    save(fig, "fig2_coverage")


FOREST = [
    ("D - C", "fire counts (D$-$C)"),
    ("D0 - D", "non-directional exposure (D0$-$D)"),
    ("E - D0", "directional exposure (E$-$D0)"),
    ("E - D", "directional exposure (E$-$D)"),
    ("E - Rshift", "vs shifted-wind placebo (E$-$Rshift)"),
    ("E - Rperm1", "vs permuted-wind placebo (E$-$Rperm1)"),
    ("E - D0m", "vs missingness control (E$-$D0m)"),
    ("Ecat - D0cat", "vs category control (Ecat$-$D0cat)"),
    ("Ev - D0v", "vegetation fires only (Ev$-$D0v)"),
    ("lgE - lgD0", "logistic: E$-$D0"),
    ("lgE - lgRperm1", "logistic: E$-$Rperm1"),
]
SUF = "_ens"  # main results: 5-seed LightGBM ensembles


def fig_forest():
    rb = pd.read_csv(TABLES / f"robust_blocks{SUF}.csv")
    panels = [("station-week", "Station × week blocks"), ("month", "All-station month blocks"),
              (None, "Mean within-season ΔAP")]  # fmt: skip
    fig, axes = plt.subplots(1, 3, figsize=(7.2, 3.6), sharey=True)
    ys = np.arange(len(FOREST))[::-1]
    for ax, (mode, title) in zip(axes, panels, strict=True):
        for h, color, off in ((24, BLUE, 0.15), (6, ORANGE, -0.15)):
            if mode is None:
                t = pd.read_csv(TABLES / f"loyo_L3_{h}h{SUF}_season_deltas.csv").rename(
                    columns={"dAP_season_mean": "dAP"}
                )
            else:
                t = rb[(rb["h"] == h) & (rb["mode"] == mode)]
            t = t.set_index("contrast")
            for y, (c, _) in zip(ys, FOREST, strict=True):
                if c not in t.index:
                    continue
                r = t.loc[c]
                ax.errorbar(r["dAP"], y + off, xerr=[[r["dAP"] - r["ci_lo"]], [r["ci_hi"] - r["dAP"]]],
                            fmt="o", ms=3, color=color, lw=1, capsize=0,
                            label=f"{h} h" if y == ys[0] else None)  # fmt: skip
        ax.axvline(0, color=GREY, lw=0.8)
        ax.xaxis.set_major_locator(matplotlib.ticker.MaxNLocator(4))
        ax.set_title(title, fontsize=8.5)
        ax.set_xlabel("ΔAP (95% CI)", fontsize=8)
    axes[0].set_yticks(ys, [lab for _, lab in FOREST], fontsize=8)
    axes[0].legend(frameon=False, fontsize=7.5, loc="lower left")
    save(fig, "fig3_ablation")


def fig_seeds():
    d = pd.concat([pd.read_csv(TABLES / "seed_check_2015.csv"), pd.read_csv(TABLES / "seed_check_other.csv")])
    folds_ = sorted(d["fold"].unique())
    models = ["D0", "E", "D0cat", "Ecat"]
    colors = {"D0": GREY, "E": BLUE, "D0cat": ORANGE, "Ecat": INK}
    fig, ax = plt.subplots(figsize=(7.0, 2.4))
    for i, f in enumerate(folds_):
        for j, m in enumerate(models):
            v = d[(d["fold"] == f) & (d["model"] == m)]["AP"]
            if v.empty:
                continue
            x = i + (j - 1.5) * 0.16
            ax.plot(np.full(len(v), x), v, "o", ms=3.5, color=colors[m], alpha=0.85,
                    label=m if i == 0 else None)  # fmt: skip
    ax.set_xticks(range(len(folds_)), [f"test year {f}" for f in folds_])
    ax.set_ylabel("AP, single fit (24 h)")
    ax.legend(frameon=False, fontsize=7.5, ncol=4, loc="lower center", bbox_to_anchor=(0.5, 1.0))
    save(fig, "fig7_seeds")


def fig_years():
    br = pd.read_csv(TABLES / f"loyo_L3_24h{SUF}_breakdown.csv")
    br = br[br["subset"].str.startswith("year ")].copy()
    br["year"] = br["subset"].str[5:].astype(int)
    fig, ax = plt.subplots(figsize=(7.0, 2.6))
    x = np.arange(len(br))
    series = [("E", "E", BLUE), ("Rshift", "Rshift", GREY), ("Rperm1", "Rperm1", "#6B7280"),
              ("D0m", "D0m", ORANGE)]  # fmt: skip
    w = 0.2
    for i, (m, lab, color) in enumerate(series):
        if f"AP_{m}" in br:
            ax.bar(x + (i - 1.5) * w, br[f"AP_{m}"] - br["AP_D0"], w, color=color, label=lab)
    ax.axhline(0, color=INK, lw=0.6)
    ax.set_xticks(x, [f"{y}\n(n={e})" for y, e in zip(br["year"], br["events"], strict=True)], fontsize=7)
    ax.set_ylabel("ΔAP vs D0 (24 h)")
    ax.legend(frameon=False, fontsize=8, ncol=4)
    save(fig, "fig4_years")


def fig_latency():
    t = pd.read_csv(TABLES / f"latency{SUF}.csv")
    fig, ax = plt.subplots(figsize=(4.2, 2.6))
    for c, lab, color in (("E - D0", "E$-$D0", BLUE), ("E - Rshift", "E$-$Rshift", INK)):
        s_ = t[(t["h"] == 24) & (t["contrast"] == c)].sort_values("lag_h")
        if s_.empty:
            continue
        ax.plot(s_["lag_h"], s_["dAP"], marker="o", ms=3.5, color=color, label=lab)
        ax.fill_between(s_["lag_h"], s_["ci_lo"], s_["ci_hi"], color=color, alpha=0.15, lw=0)
    ax.axhline(0, color=GREY, lw=0.8)
    ax.set_xticks([0, 3, 6, 12, 24])
    ax.set(xlabel="Fire-data latency L (h)", ylabel="Pooled ΔAP (LOYO, 24 h)")
    ax.legend(frameon=False, fontsize=8)
    save(fig, "fig5_latency")


def fig_models():
    models = [("persistence", "Persistence"), ("climatology", "Climatology"), ("C", "GBM C"),
              ("D", "GBM D"), ("E", "GBM E"), ("lgC", "Logit C"), ("lgD0", "Logit D0"),
              ("lgE", "Logit E")]  # fmt: skip
    setups = [("loyo_L3_24h", "LOYO 24 h"), ("loyo_L3_6h", "LOYO 6 h"),
              ("operational_L3_24h", "Oper. 24 h"), ("operational_L3_6h", "Oper. 6 h")]  # fmt: skip
    fig, ax = plt.subplots(figsize=(7.0, 2.6))
    w = 0.8 / len(models)
    cmap = plt.get_cmap("Greys")
    for i, (m, lab) in enumerate(models):
        vals = []
        for stem, _ in setups:
            t = pd.read_csv(TABLES / f"{stem}{SUF}_metrics.csv").set_index("model")
            vals.append(t.loc[m, "AP"] if m in t.index else np.nan)
        color = BLUE if m.startswith("lg") else (ORANGE if m in ("C", "D", "E") else cmap(0.35 + 0.2 * i))
        alpha = {"C": 0.45, "lgC": 0.45, "D": 0.7, "lgD0": 0.7}.get(m, 1.0)
        ax.bar(np.arange(len(setups)) + (i - len(models) / 2 + 0.5) * w, vals, w, color=color, alpha=alpha,
               label=lab)  # fmt: skip
    ax.set_xticks(range(len(setups)), [s for _, s in setups])
    ax.set_ylabel("Average precision")
    ax.set_ylim(0, 0.8)
    ax.legend(frameon=False, fontsize=7, ncol=4, loc="upper right")
    save(fig, "fig6_models")


if __name__ == "__main__":
    what = sys.argv[1] if len(sys.argv) > 1 else "data"
    if what == "data":
        fig_map()
        fig_coverage()
    if what == "results":
        for f in (fig_forest, fig_seeds, fig_years, fig_models, fig_latency):
            try:
                f()
            except FileNotFoundError as e:
                print("skip", f.__name__, e)
