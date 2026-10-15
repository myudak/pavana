# Pavana — bundle kode eksperimen (Colab/Kaggle)

Folder `code/` berisi paket Python yang menjalankan eksperimen retrospektif Pavana di runtime
cloud. Folder ini **hanya kode**: tanpa data, tanpa kredensial, tanpa venv/cache, tanpa artifact
lokal. Data diambil dari dataset yang sama pada revisi terpisah.

## Isi

| Path | Isi |
| --- | --- |
| `ml/pyproject.toml` | Metadata paket dan dependensi (`numpy`, `pandas`, `pyarrow`, `scikit-learn`, `lightgbm`, `requests`, `python-dotenv`, `matplotlib`) |
| `ml/src/pavana_ml/` | Modul audit/alignment, fitur, dan model |
| `ml/notebooks/00_cloud_setup.ipynb` | Notebook all-in-one: setup → data → fitur → training → artifact |
| `ml/notebooks/02–04` | Tahap yang sama secara terpisah (audit, fitur, eksperimen) |
| `code/CODE_MANIFEST.json` | SHA256 tiap berkas pada revisi tempat manifest ini dibaca |

## Cara pakai di Kaggle

1. Buka notebook baru, aktifkan **Internet** di panel Settings (dibutuhkan untuk memasang paket dan
   mengunduh data). GPU tidak diperlukan; eksperimen ini berjalan di CPU.
2. Jalankan `ml/notebooks/00_cloud_setup.ipynb` (bisa disalin ke Kaggle, atau dijalankan dari
   salinan lokal yang identik). Notebook itu melakukan seluruh alur.
3. Semua keluaran ditulis ke `/kaggle/working/pavana/` dan hilang ketika sesi berakhir — unduh
   `cloud_run.json`, `report.json`, `metrics.csv`, dan `test_predictions.parquet` sebelum sesi
   ditutup, atau salin ke Google Drive.

Alternatif manual, kalau lebih suka memasang sendiri:

```bash
pip install "huggingface_hub>=0.26"
python -c "from huggingface_hub import snapshot_download as d; \
  print(d('myudak/pavana', repo_type='dataset', revision='<REVISI_KODE>', \
  allow_patterns=['code/**'], local_dir='/kaggle/working/pavana-download'))"
pip install "/kaggle/working/pavana-download/code/ml[hub]"
```

Ambil notebook `00_cloud_setup.ipynb` dari revisi **head PR** (atau dari repo kode), bukan dari commit
terpin: salinan di dalam commit terpin `a9a0d6d98008e08e80d6e978d82cfc89f79282af` masih versi sebelum
pin dan menunjuk ref PR data (`refs/pr/5` → `aaa0d271…`), tempat folder `code/` tidak ada — jadi ia
gagal, bukan memasang revisi lain. Salinan di head memakai `RESOLVE_CODE_HEAD = False` dan memasang
tepat revisi terpin itu. Bundle pada revisi terpin tetap konsisten dengan `CODE_MANIFEST.json`-nya
sendiri.

## Batas yang harus disebut ulang di setiap laporan

- Target eksperimen adalah **medan model CAMS PM2.5 pada t+6 jam**, bukan PM2.5 observasi stasiun.
  Hasilnya bukan validasi stasiun dan bukan bukti kemampuan prakiraan operasional.
- ERA5 adalah **reanalysis**; timestamp valid tidak membuktikan data tersedia saat prediksi.
- Deteksi hotspot **bukan** kebakaran terkonfirmasi; jumlah deteksi bukan jumlah kejadian kebakaran.
- Snapshot publik ini tidak punya `issued_at`, jadi baseline *issue-time* CAMS tidak dapat dijalankan.
- Model tetap `research_only: true`, `operational_ready: false`, `observation_validated: false`.
- Revisi kode dan revisi data adalah dua pin terpisah. Catat keduanya pada output run; jangan
  menganggap manifest ini menentukan revisi data.

Kredensial provider (FIRMS/OpenAQ) **tidak** dibutuhkan untuk snapshot publik ini dan tidak boleh
ditulis di notebook.
