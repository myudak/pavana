"""Generate the public submission notebook (pavana_ml_submission.ipynb) for Kaggle.

    uv run --project ml python ml/kaggle/submission/build_notebook.py <commit>
    kaggle kernels push -p ml/kaggle/submission

The notebook installs `pavana_ml` from the public GitHub repo at <commit> and reads the output of
the `myudak/pavana-observed-data` kernel. It trains and evaluates the served hotspot and haze
models and plots ROC/PR curves, calibration and SHAP. Outputs are produced on Kaggle only.
"""

import json
import sys
from pathlib import Path

SHA = sys.argv[1] if len(sys.argv) > 1 else "main"
HERE = Path(__file__).resolve().parent


def md(s: str) -> dict:
    return {"cell_type": "markdown", "metadata": {}, "source": s.strip("\n")}


def code(s: str) -> dict:
    return {
        "cell_type": "code",
        "metadata": {},
        "execution_count": None,
        "outputs": [],
        "source": s.strip("\n"),
    }


INTRO = """
# Pavana — Machine Learning untuk Titik Panas & Kabut Asap

**Pavana** adalah aplikasi asap kebakaran hutan dan kualitas udara untuk Indonesia (JOINTS 2026).
Notebook ini melatih dan mengevaluasi dua model **LightGBM** yang dipakai *live* di aplikasi
(https://app.pavana.myudak.com), lengkap dengan penjelasan **SHAP**.

| Model | Pertanyaan | Target (pengamatan nyata) |
|---|---|---|
| Risiko titik panas | Besok ada deteksi titik panas di kotak grid ini? | ≥1 deteksi satelit Suomi NPP VIIRS di sel 0,25° Kalimantan pada hari d+1 |
| Kabut asap bandara | 6 / 24 jam lagi, asap menutup pandangan? | METAR: jarak pandang < 3 km dengan kode HZ/FU, tanpa hujan/kabut air |

**Prinsip:** target harus pengamatan nyata (bukan keluaran model lain), split berdasarkan waktu
(tanpa kebocoran), dan model wajib dibandingkan dengan baseline jujur.
Titik panas adalah *deteksi* satelit, bukan kebakaran yang terkonfirmasi.
Semua model berlabel **eksperimental** dan bukan peringatan resmi.
"""

SETUP_MD = """
## 1. Setup

Kode pipeline ada di repo publik [myudak/pavana](https://github.com/myudak/pavana) (folder `ml/`),
dipasang pada commit yang dipin supaya hasil bisa direproduksi. Data berasal dari output notebook
**pavana-observed-data** (FIRMS Suomi NPP, METAR IEM, cuaca Open-Meteo), terpasang sebagai input.
"""

SETUP = f"""
import subprocess, sys
COMMIT = "{SHA}"
subprocess.run([sys.executable, "-m", "pip", "install", "-q", "--no-deps",
                f"git+https://github.com/myudak/pavana@{{COMMIT}}#subdirectory=ml"], check=True)

import json
from pathlib import Path
import numpy as np, pandas as pd, matplotlib.pyplot as plt, lightgbm as lgb
from pavana_ml.pipelines import hotspot_risk, haze_nowcast
from pavana_ml.features import hotspot_grid, haze_station
from pavana_ml.evaluation import classification as cm

DATA = next(Path("/kaggle/input").rglob("snapshot.json")).parent
OUT = Path("/kaggle/working/models")
print("data:", DATA, "| lightgbm", lgb.__version__)
"""

DATA_CELLS = [
    md("## 2. Data"),
    code(
        """
snap = json.loads((DATA / "snapshot.json").read_text())
pd.DataFrame(snap["files"]).T[["rows"]]
"""
    ),
    code(
        """
firms = pd.read_parquet(DATA / "firms_snpp.parquet", columns=["lat", "lon", "acquired_at"])
k = firms[firms.lon.between(108.5, 119.5) & firms.lat.between(-4.5, 4.5)]
monthly = k.set_index("acquired_at").resample("MS").size()
fig, ax = plt.subplots(figsize=(12, 3.5))
monthly.plot(ax=ax, color="#E8743B")
ax.set_title("Deteksi titik panas Suomi NPP per bulan, Kalimantan")
ax.set_ylabel("deteksi")
plt.show()
"""
    ),
]

METHOD_MD = """
## 3. Fitur dan fungsi tujuan

**Titik panas** (per sel 0,25°, dibuat akhir hari *d*): deteksi di sel dan sekitarnya (1 & 6 hari),
hujan 1/7/30/60 hari, hari kering beruntun, kelembapan minimum, suhu, angin, VPD, hari dalam tahun,
dan frekuensi historis sel (dari data latih saja).

**Kabut asap** (per laporan METAR bandara): jarak pandang kini dan minimum 6/24 jam, porsi laporan
HZ/FU 24/72 jam, hujan, kelembapan, suhu, angin, jam lokal, musim, titik panas dalam 100/300 km, dan
skor *upwind* (titik panas di arah datangnya angin).

**Fungsi tujuan:** LightGBM biner meminimalkan *log-loss* (binary cross-entropy). Setiap pohon
menambah skor log-odds; sigmoid dari jumlahnya = peluang. *Early stopping* hanya memakai validasi.

**Split waktu:** titik panas latih 2015–2021, validasi 2022–2023, uji 2024–2025; kabut asap latih
2015–2020, validasi 2021–2022, uji 2023–2025 (mencakup musim El Niño 2023). Baseline dan frekuensi
historis dihitung dari data latih saja.
"""

TRAIN_CELLS = [
    code(
        """
print("Fitur titik panas:", list(hotspot_grid.FEATURES))
print("Fitur kabut asap :", list(haze_station.FEATURES))
"""
    ),
    md(
        "## 4. Latih & evaluasi\n\nKedua pipeline membangun tabel fitur, melatih LightGBM, "
        "menghitung baseline, dan mengekspor model JSON yang dipakai aplikasi (CPU, ±30 menit)."
    ),
    code(
        """
hot = hotspot_risk.run(DATA, OUT)
haze = haze_nowcast.run(DATA, OUT)
"""
    ),
    code(
        """
rows = []
def add(name, metrics):
    for method, m in metrics.items():
        rows.append({"model": name, "metode": method, "ROC-AUC": m["rocAuc"], "PR-AUC": m["prAuc"],
                     "Brier": m["brier"], "Brier skill": m["brierSkill"],
                     "n": m["n"], "kejadian": m["positives"]})
add("Titik panas (uji 2024–2025)", hot["metrics"]["test"])
for h in ("6h", "24h"):
    add(f"Kabut asap +{h} (uji 2023–2025)", haze["horizons"][h]["metrics"]["test"])
pd.DataFrame(rows).round(4)
"""
    ),
]

CURVES = [
    md(
        "## 5. Kurva ROC dan Precision-Recall\n\nDihitung dari prediksi uji. ROC-AUC: seberapa sering "
        "kejadian nyata diberi skor lebih tinggi dari non-kejadian (0,5 = acak). PR-AUC lebih jujur "
        "untuk kejadian langka (titik panas 3%, kabut asap 0,3%)."
    ),
    code(
        """
def curves(y, p):
    o = np.argsort(-p, kind="mergesort"); y, p = y[o], p[o]
    tp, fp = np.cumsum(y), np.cumsum(1 - y)
    last = np.r_[np.nonzero(np.diff(p))[0], len(p) - 1]
    tpr, fpr = tp[last] / tp[-1], fp[last] / fp[-1]
    prec = tp[last] / (last + 1)
    return np.r_[0, fpr], np.r_[0, tpr], np.r_[0, tpr], np.r_[1, prec]

sets = {
    "Titik panas": (pd.read_parquet(OUT / "hotspot-risk.predictions.parquet"), "y",
                    ["model", "recentActivity", "climatology", "persistence"]),
    "Kabut asap +6 jam": (pd.read_parquet(OUT / "haze-6h.predictions.parquet"), "y_6h",
                          ["model", "climatology", "persistence"]),
}
colors = {"model": "#E8743B", "recentActivity": "#2F6FA8", "climatology": "#9AA6B0",
          "persistence": "#16202A"}
fig, axes = plt.subplots(2, 2, figsize=(12, 11))
for col, (title, (df, ycol, methods)) in enumerate(sets.items()):
    y = df[ycol].to_numpy(float)
    for m in methods:
        p = df[m].to_numpy(float)
        fpr, tpr, rec, prec = curves(y, p)
        lw = 3 if m == "model" else 1.5
        axes[0, col].plot(fpr, tpr, color=colors[m], lw=lw, label=f"{m} (AUC {cm.roc_auc(y, p):.3f})")
        axes[1, col].plot(rec, prec, color=colors[m], lw=lw,
                          label=f"{m} (AP {cm.average_precision(y, p):.3f})")
    axes[0, col].plot([0, 1], [0, 1], "--", color="#B9B2A6")
    axes[0, col].set(title=f"ROC — {title}", xlabel="False positive rate", ylabel="True positive rate")
    axes[1, col].set(title=f"Precision-Recall — {title}", xlabel="Recall", ylabel="Precision")
    axes[0, col].legend(); axes[1, col].legend()
plt.tight_layout(); plt.show()
"""
    ),
    md("## 6. Kalibrasi\n\nJika model bilang 30%, apakah kejadiannya memang sekitar 30%?"),
    code(
        """
cals = [("Titik panas", hot["calibration"])] + [
    (f"Kabut asap +{h}", haze["horizons"][h]["calibration"]) for h in ("6h", "24h")]
fig, axes = plt.subplots(1, 3, figsize=(15, 4.5))
for ax, (title, bins) in zip(axes, cals):
    b = pd.DataFrame(bins)
    ax.plot([0, 1], [0, 1], "--", color="#B9B2A6")
    ax.plot(b.meanPredicted, b.observedRate, "o-", color="#E8743B")
    ax.set(title=title, xlabel="Peluang prediksi", ylabel="Proporsi kejadian nyata")
plt.tight_layout(); plt.show()
"""
    ),
]

SHAP = [
    md(
        "## 7. Penjelasan SHAP\n\nTreeSHAP (LightGBM `pred_contrib`) menguraikan skor log-odds tiap "
        "prediksi menjadi kontribusi fitur. Ini menjelaskan keluaran model, bukan bukti sebab-akibat. "
        "Di aplikasi, tiga faktor teratas ditampilkan sebagai kalimat sederhana."
    ),
    code(
        """
import shap
booster = lgb.Booster(model_file=str(OUT / "hotspot-risk.lgb.txt"))
table, _ = hotspot_risk.build_table(DATA)
feats = list(hotspot_grid.FEATURES)
test = table[table.issue_day > pd.Timestamp(hotspot_risk.VALID_END)].dropna(subset=feats)
sample = test.sample(5000, random_state=20261016)[feats]
contrib = booster.predict(sample, pred_contrib=True)
shap.summary_plot(contrib[:, :-1], sample, show=False)
plt.title("SHAP — model risiko titik panas (5.000 baris uji)"); plt.show()
"""
    ),
    code(
        """
imp = pd.DataFrame(haze["horizons"]["6h"]["globalImportance"]).head(10)
imp.plot.barh(x="feature", y="meanAbsShap", color="#2F6FA8", legend=False, figsize=(8, 5))
plt.gca().invert_yaxis(); plt.title("Rata-rata |SHAP| — kabut asap +6 jam"); plt.xlabel("log-odds")
plt.show()
"""
    ),
]

OUTRO = """
## 8. Dari notebook ke aplikasi

- Model diekspor sebagai JSON ringkas (`pavana-gbdt-v1`) di `/kaggle/working/models`.
- API Pavana mengevaluasi pohon dan TreeSHAP dengan **TypeScript murni**; vektor paritas memastikan
  hasilnya sama dengan LightGBM Python.
- Input live: file FIRMS 7 hari, METAR bandara, cuaca Open-Meteo. Input hilang → peluang *null*
  ("tidak tersedia"), tidak pernah dianggap risiko rendah.

## 9. Batasan

- Titik panas = deteksi satelit; tidak terdeteksi bukan berarti tidak ada api.
- Kabut asap hanya untuk 12 bandara; bukan prediksi di rumah pengguna.
- Model eksperimental, bukan peringatan resmi (rujuk BMKG/BNPB).
- NASA menghentikan produk Suomi NPP 1 November 2026, jadi model akan dilatih ulang dengan NOAA-20.
"""

cells = [md(INTRO), md(SETUP_MD), code(SETUP), *DATA_CELLS, md(METHOD_MD), *TRAIN_CELLS, *CURVES,
         *SHAP, md(OUTRO)]
for i, c in enumerate(cells):
    c["id"] = f"c{i:02d}"
nb = {
    "cells": cells,
    "metadata": {
        "kernelspec": {"display_name": "Python 3", "language": "python", "name": "python3"},
        "language_info": {"name": "python"},
    },
    "nbformat": 4,
    "nbformat_minor": 5,
}
out = HERE / "pavana_ml_submission.ipynb"
out.write_text(json.dumps(nb, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
print(out)
