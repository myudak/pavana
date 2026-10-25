"""Writes paper/numbers.tex: every number quoted in the text, read from results/tables.

    uv run --project ../../ml python src/make_numbers.py

The manuscript uses \\pv{key} instead of typed-in values, so text and tables cannot drift apart.
Keys: <stem>.AP.<model>, <stem>.AUC.<model>, <stem>.BSS.<model>, <stem>.hit.<model>,
<stem>.d.<A-B> (pooled ΔAP), <stem>.ci.<A-B> ("[lo, hi]"), <stem>.p.<A-B>,
<stem>.sd.<A-B> / .sci.<A-B> (per-season mean), lat.L<L>.<h>.<A-B> (latency), data.* (audit).
"""

from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
TABLES = ROOT / "results" / "tables"
AUDIT = ROOT / "results" / "audit"
OUT = ROOT / "paper" / "numbers.tex"
STEMS = {
    "loyo_L3_24h": "loyo24",
    "loyo_L3_6h": "loyo6",
    "operational_L3_24h": "op24",
    "operational_L3_6h": "op6",
    "loyo_L3_24h_ens": "ens24",
    "loyo_L3_6h_ens": "ens6",
    "operational_L3_24h_ens": "eop24",
    "operational_L3_6h_ens": "eop6",
}


def f3(x):
    if pd.isna(x):
        return "--"
    x = round(float(x), 3) + 0.0  # no "-0.000"
    return f"$-${abs(x):.3f}" if x < 0 else f"{x:.3f}"


def sgn(x):
    if pd.isna(x):
        return "--"
    x = round(float(x), 3) + 0.0
    return f"$-${abs(x):.3f}" if x < 0 else (f"+{x:.3f}" if x > 0 else "0.000")


def ci(lo, hi):
    return f"[{f3(lo)}, {f3(hi)}]"


def main():
    vals = {}
    for stem, key in STEMS.items():
        met = TABLES / f"{stem}_metrics.csv"
        if met.exists():
            m = pd.read_csv(met)
            vals[f"{key}.n"] = f"{int(m['n'].iloc[0]):,}".replace(",", "{,}")
            vals[f"{key}.events"] = f"{int(m['events'].iloc[0]):,}".replace(",", "{,}")
            for _, r in m.iterrows():
                vals[f"{key}.AP.{r['model']}"] = f3(r["AP"])
                vals[f"{key}.AUC.{r['model']}"] = f3(r["ROC_AUC"])
                vals[f"{key}.BSS.{r['model']}"] = f3(r["BSS"])
                vals[f"{key}.hit.{r['model']}"] = f"{100 * r['hit@2%']:.1f}"
        for kind, dcol, lo, hi, pre in (("deltas", "dAP", "ci_lo", "ci_hi", ""),
                                        ("season_deltas", "dAP_season_mean", "ci_lo", "ci_hi", "s")):  # fmt: skip
            path = TABLES / f"{stem}_{kind}.csv"
            if not path.exists():
                continue
            for _, r in pd.read_csv(path).iterrows():
                c = r["contrast"].replace(" ", "")
                vals[f"{key}.{pre}d.{c}"] = sgn(r[dcol])
                vals[f"{key}.{pre}ci.{c}"] = ci(r[lo], r[hi])
                vals[f"{key}.{pre}p.{c}"] = f"{r['p_le_0']:.3f}"
        br = TABLES / f"{stem}_breakdown.csv"
        if br.exists():
            for _, r in pd.read_csv(br).iterrows():
                s = r["subset"]
                lab = {"haze seasons 2015/2019/2023": "season", "other years": "other",
                       "Indonesia (FU coding)": "ID", "Malaysia (HZ coding)": "MY"}.get(s)  # fmt: skip
                lab = lab or s.replace("year ", "y").replace("station ", "")
                vals[f"{key}.br.{lab}.events"] = f"{int(r['events']):,}".replace(",", "{,}")
                for col in r.index:
                    if col.startswith("AP_"):
                        vals[f"{key}.br.{lab}.{col[3:]}"] = f3(r[col])
                for m in ("E", "Rshift", "D0m"):
                    if f"AP_{m}" in r.index and not pd.isna(r[f"AP_{m}"]):
                        vals[f"{key}.br.{lab}.d{m}"] = sgn(r[f"AP_{m}"] - r["AP_D0"])
    for lat, lpre in ((TABLES / "latency.csv", "lat"), (TABLES / "latency_ens.csv", "elat")):
        if not lat.exists():
            continue
        for _, r in pd.read_csv(lat).iterrows():
            c = r["contrast"].replace(" ", "")
            base = f"{lpre}.L{r['lag_h']}.{r['h']}.{c}"
            vals[base] = sgn(r["dAP"]) if not c.startswith("AP") else f3(r["dAP"])
            if "ci_lo" in r and not pd.isna(r.get("ci_lo")):
                vals[base + ".ci"] = ci(r["ci_lo"], r["ci_hi"])
                vals[base + ".s"] = sgn(r["dAP_season_mean"])
                vals[base + ".sci"] = ci(r["s_ci_lo"], r["s_ci_hi"])
    ta = TABLES / "target_audit.csv"
    if ta.exists():
        names = {"calm_pct": "calm", "vrb_pct": "vrb", "wmiss_pct": "wmiss", "cor_pct": "cor",
                 "auto_pct": "auto", "multi_report_hours_pct": "multi", "event_calm_pct": "event_calm",
                 "event_vrb_pct": "event_vrb", "event_jul_nov_pct": "event_jul_nov",
                 "event_fire300_pct": "event_fire300", "nonevent_fire300_pct": "nonevent_fire300",
                 "event_fu_pct": "event_fu"}  # fmt: skip
        for _, r in pd.read_csv(ta).iterrows():
            for col, short in names.items():
                if not pd.isna(r[col]):
                    vals[f"audit.{r['station']}.{short}"] = f"{r[col]:.1f}"
    ft = AUDIT / "firms_types.csv"
    if ft.exists():
        for _, r in pd.read_csv(ft).iterrows():
            vals[f"audit.veg.{r['station']}"] = f"{r['nonveg_weighted_pct']:.0f}"
    sdg = TABLES / "shift_diagnostics.csv"
    if sdg.exists():
        g = pd.read_csv(sdg).groupby("shift")[["mean_cos", "mask_agree"]].mean()
        for k, r in g.iterrows():
            vals[f"shiftdiag.{k}.cos"] = f"{r['mean_cos']:.2f}"
            vals[f"shiftdiag.{k}.mask"] = f"{100 * r['mask_agree']:.0f}"
    for suffix, pre in (("", "rb"), ("_ens", "erb")):
        rb = TABLES / f"robust_blocks{suffix}.csv"
        if not rb.exists():
            continue
        for _, r in pd.read_csv(rb).iterrows():
            c = r["contrast"].replace(" ", "")
            vals[f"{pre}.{r['h']}.{r['mode']}.{c}"] = sgn(r["dAP"])
            vals[f"{pre}.{r['h']}.{r['mode']}.{c}.ci"] = ci(r["ci_lo"], r["ci_hi"])
    py = TABLES / "per_year_ens.csv"
    if py.exists():
        for _, r in pd.read_csv(py).iterrows():
            for m in r.index.drop(["h", "year", "events"]):
                vals[f"py.{int(r['h'])}.{int(r['year'])}.{m}"] = f3(r[m])
    for name in ("seed_check_2015", "seed_check_other"):
        sc = TABLES / f"{name}.csv"
        if sc.exists():
            g = pd.read_csv(sc).groupby(["fold", "model"])["AP"]
            for (fold, m), v in g:
                vals[f"seed.{fold}.{m}.min"] = f3(v.min())
                vals[f"seed.{fold}.{m}.max"] = f3(v.max())
    st = pd.read_csv(AUDIT / "stations.csv")
    yr = pd.read_csv(AUDIT / "station_years.csv")
    yr = yr[yr["year"] <= 2025]
    vals["data.stations"] = str(len(st))
    vals["data.events"] = f"{int(yr['events'].sum()):,}".replace(",", "{,}")
    fy = pd.read_csv(AUDIT / "firms_years.csv")
    fy = fy[fy["year"] <= 2025]
    vals["data.detections"] = f"{fy.filter(like='country-archive').sum().sum() / 1e6:.2f}"

    lines = ["% Generated by src/make_numbers.py from results/tables. Do not edit by hand.",
             "\\makeatletter",
             "\\newcommand{\\pv}[1]{\\@ifundefined{pv@#1}{\\textbf{??#1}}{\\@nameuse{pv@#1}}}"]  # fmt: skip
    lines += [f"\\@namedef{{pv@{k}}}{{{v}}}" for k, v in sorted(vals.items())]
    lines.append("\\makeatother")
    OUT.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"wrote {OUT} ({len(vals)} values)")


if __name__ == "__main__":
    main()
