# Rencana dan checkpoint pipeline ML Pavana

Tanggal checkpoint: **15 Oktober 2026**.

Dokumen ini menjadi panduan melanjutkan pekerjaan dari kondisi workspace saat ini.
Implementasi dihentikan atas permintaan pengguna untuk mendahulukan rencana ini.
Kotak selesai berarti ada bukti yang dicatat; kode yang baru ditulis tidak otomatis selesai.

## 1. Tujuan dan batas eksperimen

Tujuan produk semula adalah menguji apakah angin dan hotspot membantu memprediksi
**PM2.5 observasi stasiun pada t+6 jam**, dibanding persistence dan prakiraan CAMS.
Arsip observasi yang cukup untuk tujuan itu belum tersedia di workspace.

Pekerjaan berikutnya menggunakan tujuan sementara yang dapat dikerjakan dengan data sekarang:

> Menguji apakah fitur cuaca, deteksi hotspot, dan upwind menambah kemampuan memprediksi
> **medan model PM2.5 CAMS pada t+6 jam**, dalam eksperimen retrospektif satu lokasi.

Aturan untuk seluruh notebook, metadata, artifact, dan laporan:

- Target CAMS harus ditulis sebagai **model output**, bukan observasi stasiun.
- ERA5 adalah **reanalysis**. Timestamp valid tidak membuktikan data tersedia saat prediksi.
- Snapshot CAMS tidak memiliki `issued_at`; jangan mengarang waktu terbit dari `fetched_at`.
- Nilai CAMS pada t+6 tidak boleh menjadi fitur ketika nilai itu sendiri menjadi target.
- Hasil eksperimen ini tidak membuktikan kemampuan prakiraan operasional atau validasi stasiun.
- Deteksi hotspot bukan kebakaran terkonfirmasi; jumlah deteksi bukan jumlah kejadian kebakaran.
- Nilai hilang tetap `NaN`/`null`. Jangan mengisi target PM2.5 dengan nol atau interpolasi.
- Notebook `01` dan fixture sintetis tetap untuk demo/pemeriksaan alur, bukan sumber hasil riset.
- Training utama direncanakan pada **CPU Colab/Kaggle**. Verifikasi lokal cukup memakai smoke run
  kecil dan jelas dilabeli sebagai pemeriksaan eksekusi.

Baca `AGENTS.md` di root dan `ml/`, `CONTRIBUTING.md`, `ml/README.md`, serta
`docs/modeling-methodology.md` sebelum melanjutkan. Catatan di dokumen ini tidak menggantikan
aturan provenance, keamanan kredensial, dan parity matematika TS/Python.

## 2. Status nyata saat checkpoint

### Sudah selesai

- [x] Memeriksa dataset lokal dan provenance sumber utama.
- [x] Menambahkan panduan delegasi DSH ke `ml/AGENTS.md`.
- [x] Membuat `ml/huggingface/README.md` untuk skema, sumber, batasan, dan konfigurasi terpisah.
- [x] Membuat `ml/huggingface/manifest.json` berisi inventaris dan SHA256 data yang dipublikasikan.
- [x] Membuat `ml/scripts/publish_hf_dataset.py`; preview dan upload melalui PR berhasil.
- [x] Mengunggah 30 berkas data terpilih, README, dan manifest ke Hugging Face melalui PR #5.
- [x] Memperbarui judul dan deskripsi PR agar menjelaskan data dan keterbatasan eksperimen.
- [x] Menambahkan extra `hub` pada `ml/pyproject.toml` dan memperbarui `ml/uv.lock`.
- [x] Membuat `ml/notebooks/00_cloud_setup.ipynb`: runner all-in-one Colab/Kaggle (setup → data →
  fitur → eksperimen), dengan `ml/scripts/publish_hf_code.py` sebagai publisher bundle allowlist.
- [x] Mengunggah bundle kode ke Hugging Face melalui PR #6 (belum merge) dan memverifikasi isinya
  terhadap sumber lokal.
- [x] Menguji override `PAVANA_ML_DATA_DIR`/`PAVANA_ML_ARTIFACTS_DIR` di `paths.py` (CP4).

### Publikasi Hugging Face

| Item | Nilai terverifikasi |
| --- | --- |
| Dataset | <https://huggingface.co/datasets/myudak/pavana> |
| PR data #5 | <https://huggingface.co/datasets/myudak/pavana/discussions/5> — **merged** oleh `myudak` |
| `main` saat CP4 | `561c950e53753fe09e323ba5625ae3a4e3520496` |
| PR kode #6 | <https://huggingface.co/datasets/myudak/pavana/discussions/6> — **Open**, menunggu `myudak` |
| Ref PR kode | `refs/pr/6` (head `256cc955a4954095ec02fb0af80b1195aea1bab6`) |
| Commit kode yang di-pin notebook | `a9a0d6d98008e08e80d6e978d82cfc89f79282af` (C1, 30 berkas, ~218 KB) |
| Commit data yang dipakai eksperimen | `aaa0d2714102b7d3a7b3ad0beb2b1da1ce6a6dbe` (masih tersedia lewat `refs/pr/5`) |
| Akun CLI | `kemalfaza`; write langsung ke `main` tetap ditolak |

**Perubahan keputusan pengguna.** PR #5 sudah di-merge pemilik repo pada 15 Oktober 2026, jadi bundle
kode tidak bisa lagi ditambahkan ke PR itu. Atas persetujuan pengguna, bundle diunggah sebagai **PR
baru #6** khusus path `code/**`, tanpa merge. Isi `main` setelah merge diperiksa dan byte-nya sama
dengan bukti CP1/CP2 (`manifest.json` `8cf1a949…4787`, `hotspot_kalimantan.parquet` `3c415998…70a0`),
tetapi eksperimen tetap memakai commit `aaa0d271…` agar seluruh hash CP1–CP3 tetap berlaku.
Jangan merge PR #6; biarkan `myudak` yang memutuskan.

### Sudah dibuat, tetapi BELUM diverifikasi

| Berkas | Kondisi |
| --- | --- |
| — | Tidak ada. Override path cloud di `ml/src/pavana_ml/paths.py` sudah diuji pada CP4. |

`ml/src/pavana_ml/data/research.py` sudah direview, diuji, dan dijalankan terhadap data lokal pada
CP1, dan `ml/src/pavana_ml/features/model_table.py` sudah ditulis ulang, diuji, serta dijalankan
pada CP2 (lihat log di bagian 7), sehingga keduanya tidak lagi berstatus draft. Assignment `origin`
yang berulang pada draft sudah dihapus; konversi timestamp sekarang lewat satu helper
(`_nanoseconds`) yang memakai `.as_unit("ns")` secara eksplisit, karena parquet menyimpan
`datetime64[us, UTC]`. Override path cloud sudah diuji pada CP4 (dua tes di `ml/tests/test_cloud_paths.py`).

### Belum dikerjakan / belum tersedia

- [x] Penyesuaian notebook `02` dengan data lokal terbaru (CP1).
- [x] Penyesuaian notebook `03` dengan data lokal terbaru (CP2).
- [x] Penyesuaian notebook `04` dengan data lokal terbaru (CP3).
- [x] Notebook `00_cloud_setup.ipynb` (CP4).
- [x] `ml/src/pavana_ml/models/experiment.py` (CP3).
- [x] Tes regresi untuk `model_table.py` (`ml/tests/test_model_table.py`, 25 tes; CP2).
- [x] Tes regresi untuk `experiment.py` (`ml/tests/test_experiment.py`, 36 tes; CP3). Modul CP1 sudah
  punya tes (`ml/tests/test_research_data.py`, 32 tes).
- [x] EDA dan laporan audit tersimpan untuk tahap preprocessing (CP1).
- [x] Tabel model dan metadata tabel (CP2).
- [x] Smoke run training/evaluasi yang menggunakan pipeline baru (CP3).
- [x] Bundle kode/notebook untuk Colab/Kaggle di HF (PR #6, commit `a9a0d6d9…`; CP4).
- [x] Training utama **di Kaggle sungguhan**, evaluasi holdout, dan artifact model berversi
  (`muhamadkemalfaza/pavana`, bukti di blok "Eksekusi Kaggle live" pada CP4).
- [x] Verifikasi, dokumentasi, dan handoff (CP5); bukti di blok "CP5 selesai" pada bagian 7.

Delegasi DSH untuk notebook dihentikan dengan SIGINT (exit 130) ketika pengguna meminta rencana.
Pemeriksaan setelah penghentian memastikan notebook `02–04` masih versi scaffold dan notebook
cloud belum ada. Jangan menganggap rencana atau laporan penalaran DSH sebagai perubahan berkas.

## 3. Data yang dipakai

Path HF berikut relatif terhadap root dataset. Path lokal weather/CAMS/FIRMS sama di bawah
`ml/data/`; berkas BMKG lokal saat ini berada langsung di `ml/data/`, sedangkan versi HF
dikelompokkan ke `pm25/` dan `prakiraan/`.

| Data / path HF | Isi terverifikasi | Peran |
| --- | --- | --- |
| `raw/open_meteo/weather_kubu_raya_sungai_raya_2024-01-01_2026-10-14.parquet` | 24.432 jam ERA5, 12 kolom | Fitur cuaca retrospektif |
| `raw/open_meteo/cams_kubu_raya_sungai_raya_2024-01-01_2026-10-14.parquet` | 24.432 jam, PM2.5/PM10 lengkap | Seri target model CAMS |
| `processed/hotspot_kalimantan.parquet` | 1.156.755 baris, 21 kolom; MODIS dan VIIRS SP/NRT | Fitur deteksi hotspot |
| `raw/firms/*.csv` | Lima batch mentah yang menjadi sumber parquet hotspot | Audit dan rebuild; bukan kebutuhan unduh utama notebook |
| `pm25/pm25_observasi_kalimantan.parquet` | 189 baris, 9 stasiun, 21 jam; 4 nilai PM2.5 kosong | Konteks kualitas observasi; belum target training historis |
| `prakiraan/prakiraan_cuaca_kalimantan.parquet` | 204 baris, 12 wilayah, satu run BMKG | Konteks prakiraan; bukan arsip cuaca 2024–2026 |
| `data-online/*` | Iklim **bulanan**, XLSX/PDF | Konteks; jangan dijadikan angin per jam |

Weather dan CAMS sama-sama mencakup **2024-01-01 00:00 sampai 2026-10-14 23:00 UTC**:
24.432 timestamp cocok, tanpa timestamp duplikat. `boundary_layer_height_m` memiliki 4.368
nilai kosong; kolom itu boleh tetap `NaN` atau dikecualikan dalam eksperimen yang dicatat.

Lokasi anchor: **Sungai Raya, Kubu Raya**, `lat=-0.0710660252`, `lon=109.3712469865`.
Grid yang dikembalikan berbeda: ERA5 `(-0.10544816, 109.36087)` dan CAMS
`(-0.099998474, 109.399994)`. Pertahankan kedua koordinat, jangan menamainya lokasi stasiun.
Data model ini hanya mewakili satu grid per sumber, bukan seluruh Kalimantan.

Berkas lama di root HF seperti `data_kualitas_udara.csv` dan CSV hotspot lama tetap dipertahankan
untuk kompatibilitas, tetapi dikecualikan dari pipeline baru. Jangan mencampurkan salinan lama
dengan parquet baru atau menggeser lagi timestamp parquet UTC. CSV kualitas udara lama memakai WIB.

## 4. Urutan eksekusi dan checkpoint

Kerjakan CP1 sampai selesai, lalu CP2, dan seterusnya. Update checklist dan catatan bukti setelah
setiap checkpoint. Jangan membuat training bergantung pada variabel kernel notebook sebelumnya.

### CP0 — Pulihkan konteks dan tetapkan batas perubahan

- [x] Jalankan `git status --short` dan baca perubahan yang sudah ada.
- [x] Pastikan status aktual PR #5; catat bila ref PR sudah berpindah.
- [x] Pastikan hash sumber lokal cocok dengan manifest untuk berkas yang akan dipakai.
- [x] Baca draft `research.py` dan `model_table.py`; jangan mengimplementasikan ulang dari nol.

Workspace sudah memiliki perubahan pengguna pada loader FIRMS/Open-Meteo/OpenAQ, docs sumber,
handoff, dan berkas lain. Pertahankan perubahan itu. Jangan reset, checkout ulang, atau memasukkan
semua perubahan ke commit sebagai bagian dari pekerjaan ini. Commit/push Git belum diminta.

**Bukti CP0 (15 Oktober 2026).** `git status --short` menunjukkan perubahan pengguna pada
`docs/PAVANA_HANDOFF.md`, `docs/data-sources.md`, `ml/pyproject.toml`, tiga loader `ml/src/pavana_ml/data/`,
`ml/src/pavana_ml/paths.py`, `ml/uv.lock`, serta berkas baru `ml/AGENTS.md`, `ml/PLAN.md`,
`ml/huggingface/`, `ml/scripts/`, `ml/notebooks/pavana_bmkg_kalimantan.ipynb`,
`ml/src/pavana_ml/data/research.py`, `ml/src/pavana_ml/features/model_table.py`,
`ml/tests/test_data_loaders.py`. Tidak ada yang direset atau di-commit.

PR #5 masih **Open** dan ref-nya **tidak berpindah**: `refs/pr/5` = `aaa0d2714102b7d3a7b3ad0beb2b1da1ce6a6dbe`,
`main` = `408947b492ac7f093fb1f10cf8b48ed1bfac25eb`, 40 berkas. Tujuh berkas yang dipakai pipeline
cocok SHA256 dengan `manifest.json` pada revisi itu, dan `ml/huggingface/manifest.json` byte-identik
dengan manifest di HF (`8cf1a949…4787`). Daftar berkas yang akan diubah pada CP1: `research.py`,
`notebooks/02_data_sources.ipynb`, dan satu berkas tes baru.

**Selesai jika:** sumber data, target eksperimen, dan daftar berkas yang akan diubah jelas.

### CP1 — Selesaikan audit, preprocessing, dan notebook 02

Pemilik logika: `src/pavana_ml/data/research.py`.
Notebook: `notebooks/02_data_sources.ipynb` sebagai pemanggil dan penjelas hasil.

- [x] Review API draft: `download_snapshot`, `prepare_cached_data`, dan `save_prepared`.
- [x] Download HF menggunakan commit tetap, bukan `main`; periksa SHA256 sebelum dipakai.
- [x] Dukung cache lokal yang sudah ada, sehingga menjalankan notebook tidak otomatis refetch provider.
- [x] Konfirmasi provenance `kind=model` untuk CAMS dan `kind=reanalysis` untuk ERA5.
- [x] Validasi kolom wajib, timestamp UTC eksplisit, timestamp unik, serta interval jam penuh.
- [x] Urutkan dan reindex per jam sebelum shift/rolling; jam hilang harus menjadi `NaN`.
- [x] Align weather/CAMS pada periode yang beririsan dengan join satu-ke-satu.
- [x] Pertahankan koordinat grid per sumber dan identitas sumber; jangan gabungkan observasi BMKG
  dari stasiun berbeda ke seri anchor.
- [x] Validasi nilai mustahil, duplikasi, dan unit. Nilai ekstrem dicatat/diperiksa asalnya;
  jangan langsung dihapus, di-winsorize, atau dipangkas tanpa alasan dan dokumentasi.
- [x] Bedakan null karena skema MODIS/VIIRS dari null akibat pengumpulan gagal.
- [x] Tampilkan EDA: rentang/interval waktu, tabel null, distribusi dan plot PM2.5 CAMS,
  ringkasan bulanan, cakupan sensor/processing, serta potensi perubahan distribusi.
- [x] Jangan menyimpulkan jumlah deteksi nol sebagai bukti cakupan satelit lengkap.
- [x] Hapus konfigurasi contoh tahun 2023, panggilan FIRMS `day_range=10`, dan OpenAQ id `0`
  dari alur notebook yang dijalankan. Loader live tidak dibutuhkan untuk cache yang sudah tersedia.
- [x] Simpan laporan tanpa kredensial, dan checksum hasil interim.

Output:

```text
ml/data/interim/hourly_aligned.parquet
ml/data/interim/audit_report.json
```

Laporan audit minimal memuat inventaris, jumlah baris, periode UTC, missingness, asal dan jenis
data, koordinat grid, checksum input, revisi HF jika benar-benar diverifikasi, dan keterbatasan.
Jangan menempelkan revision HF pada data lokal yang hashnya tidak cocok.

**Selesai jika:** notebook 02 dari kernel bersih membaca data yang benar, menghasilkan output
di atas, mempertahankan 24.432 jam untuk snapshot ini, dan tidak mengarang/mengisi target.

**Bukti CP1 (15 Oktober 2026).** `prepare_cached_data` menolak kolom wajib yang hilang, `kind`
provenance yang salah, timestamp naive/duplikat/tidak bulat, nilai mustahil, hotspot key duplikat,
dan sumber yang mengembalikan lebih dari satu sel grid. Semua nilai ekstrem yang masih mungkin
dihitung di laporan dan **tidak** diubah. Notebook 02 dijalankan dari kernel bersih lewat
`jupyter nbconvert --execute`: 34 sel, 0 error, 24.432 jam dipertahankan, output ditulis ke
`ml/data/interim/` dengan `hourly_sha256`
`2e8505f010b1a316f01208e6d9a8e94b56f1e1f5378c05f97daaeebcfd874461`. `download_snapshot` diuji ke
direktori sementara pada commit tetap: 30 berkas terverifikasi, receipt ditulis, dan
`prepare_cached_data` pada hasil unduhan melaporkan `revision_verified: true` lewat
`download receipt`.

**Perbaikan setelah tinjauan (15 Oktober 2026).** Dua celah validasi ditemukan lewat probe dan
sudah ditutup; keduanya tidak mempengaruhi snapshot sekarang (semua temuan kosong pada data nyata):

1. `value_check` tidak menangkap `inf` pada rentang satu sisi (`pm25 = inf` lolos karena hanya
   `< 0` yang diuji), dan teks di kolom numerik diam-diam menjadi `NaN` lewat `errors="coerce"`.
   Sekarang nilai tak hingga dan nilai yang tidak bisa dijadikan angka **ditolak**; `NaN` tetap
   dipertahankan sebagai nilai hilang, bukan dianggap mustahil.
2. Koordinat tidak divalidasi sama sekali, sehingga `lat = 999` lolos. Sekarang `coordinate_check`
   menolak koordinat di luar WGS84 dan koordinat yang hilang untuk weather, CAMS, dan hotspot;
   koordinat di luar rentang studi Kalimantan dicatat sebagai temuan tanpa dibuang.
3. `hotspot_null_origin` menganggap setiap kolom yang kosong penuh dalam satu grup sebagai
   `schema_absent`. FRP yang hilang seluruhnya untuk satu sensor bisa jadi **kegagalan
   pengumpulan**, bukan perbedaan skema. Klasifikasi sekarang memakai kontrak kolom per keluarga
   sensor dan mode processing; hanya kolom eksklusif sensor lain yang boleh disebut
   `schema_absent`. Kolom lain yang kosong penuh menjadi `all_null_unexplained`, kolom yang kosong
   di seluruh berkas dicatat sekali sebagai `all_null_everywhere`, dan sensor tak dikenal tidak
   bisa menjelaskan null apa pun sebagai skema.

### CP2 — Selesaikan ekstraksi fitur dan notebook 03

Pemilik logika: `src/pavana_ml/features/model_table.py`.
Notebook: `notebooks/03_feature_engineering.ipynb`.

- [x] Notebook membaca hasil CP1 dari disk, bukan variabel kernel 02.
- [x] Verifikasi checksum input interim dan hotspot terhadap laporan audit.
- [x] Target bernama **`target_cams_pm25_ug_m3_t+6h`**, dipasangkan tepat ke timestamp t+6.
- [x] Simpan `target_valid_at` untuk membuktikan keselarasan horizon dan batas split.
- [x] Buat fitur pada tabel jam teratur sebagaimana spesifikasi di bawah.
- [x] Filter jarak dan precompute geometri hotspot sekali. Gunakan pencarian window pada timestamp
  terurut/prefix sums; jangan memindai 1,16 juta baris untuk masing-masing 24 ribu jam.
- [x] Panggil matematika geo/wind/upwind yang sudah ada; jangan mengubah formula/parity TS/Python
  hanya untuk mengoptimalkan pipeline.
- [x] Pastikan fitur pada t hanya memakai waktu input <= t dalam definisi retrospektifnya.
- [x] Pertahankan baris warm-up dan tail sebagai tidak eligible, supaya alasan kehilangan sampel jelas.
- [x] Simpan metadata kelompok fitur, horizon, parameter upwind, hash sumber, jenis target,
  keterbatasan, dan checksum tabel hasil.

Spesifikasi fitur awal:

| Kelompok | Isi |
| --- | --- |
| PM2.5 model | CAMS pada t; lag 1/3/6/12/24/48 jam; mean historis 6/24 jam; perubahan 3 jam |
| Cuaca | Suhu, kelembapan, hujan, kecepatan angin, gust, tekanan, mixing-height bila tersedia, radiasi |
| Arah angin | Komponen east/north memakai helper meteorologis FROM → flow TO |
| Waktu | Jam, bulan, serta sinus/kosinus jam dan day-of-year; dokumentasikan penggunaan UTC |
| Deteksi | Jumlah record dan jumlah FRP dalam radius 50/100/300 km, window 6/24/48 jam |
| Upwind | Skor dengan default lambda=50 km, tau=24 jam, radius maksimum 300 km, window 48 jam |

Window menggunakan **[t-W, t]**; rolling PM2.5 boleh mencakup t karena nilai itu menjadi input
retrospektif pada origin t. Hindari centered rolling dan interpolasi yang memakai masa depan.
Null FRP harus diperlakukan eksplisit: sum tidak boleh diam-diam mengubah semua nilai hilang
menjadi nol; upwind mengikuti fallback yang sudah terdokumentasi oleh helper existing.

Jumlah record nol boleh berarti **tidak ada record dalam cache/window**. Ketersediaan sensor
dan kegagalan pengumpulan adalah informasi berbeda. Periode tanpa deteksi suatu sensor belum
cukup untuk menyimpulkan pengunduhan gagal; periksa respons/log sebelum menandainya.

Output:

```text
ml/data/processed/model_table.parquet
ml/data/processed/model_table.metadata.json
```

Dengan seri sekarang dan warm-up 48 jam, diperkirakan ada **24.378** origin eligible sebelum
filter tambahan: 24.432 − 48 − 6. Ini pemeriksaan kewajaran, bukan alasan memaksa baris agar cocok.

**Selesai jika:** notebook 03 menghasilkan tabel data nyata dan metadata tanpa fixture sintetis;
tes membuktikan keselarasan t+6, lag pada jam hilang, serta penolakan input masa depan.

**Bukti CP2 (15 Oktober 2026).** `features/model_table.py` ditulis ulang dari draft: satu helper
`_nanoseconds` (`.as_unit("ns")`) menggantikan assignment `origin` ganda, `hotspot_features`
memakai `searchsorted` + prefix sums pada array waktu terurut, dan seluruh formula geo/wind/upwind
tetap dari helper existing. API: `load_feature_inputs` (baca interim + audit report, tolak bila
`hourly_sha256` atau `source_sha256["hotspots"]` tidak cocok, tolak `target_kind != "model"`),
`build_model_table`, `save_model_table`.

Notebook 03 dijalankan dari kernel bersih dengan `jupyter nbconvert --execute`: 6 sel kode, **0
error**, output nyata. Hasil pada data lokal:

- `model_table.parquet`: 24.432 baris, 55 kolom, `table_sha256`
  `e210ca6ac478a1200e01cd89d7b59fc0f73ddee9ac2d8e25b265d40aab2dba16`; **identik pada dua eksekusi
  berturut-turut** (sha tidak berubah sebelum/sesudah run kedua).
- Eligible **24.378**, tepat sama dengan 24.432 − 48 (warm-up) − 6 (ekor): 6 baris tanpa target t+6,
  48 baris tanpa riwayat 48 jam, 0 baris keduanya. Baris tidak eligible tetap tersimpan.
- `target_valid_at − valid_at` seragam `0 days 06:00:00`; seluruh kolom target sama dengan CAMS
  yang di-shift 6 jam (dicek di notebook dan dari parquet tersimpan).
- Allowlist C/D/E = 26/44/45 kolom; tidak ada yang memuat target, `target_valid_at`, `eligible`,
  atau `cams_pm10_ug_m3`. NaN pada baris eligible hanya `boundary_layer_height_m` (4.320).
- Input terverifikasi: interim `2e8505f0…4461`, hotspot `3c415998…70a0`, snapshot
  `aaa0d271…6dbe` (`revision_verified: true` dari laporan audit).

Verifikasi silang independen di luar tes: untuk 9 jam contoh, seluruh 18 kolom deteksi dihitung
ulang dengan brute force atas 1.156.755 baris (semua kombinasi radius × window) dan hasilnya sama;
`upwind_score` sama dengan `upwind_series` existing hingga 1 ulp (selisih maksimum 1,4e-14,
karena ukuran array penjumlahan berbeda, bukan karena formula berubah). Waktu build penuh 3,0 detik
untuk 24.432 jam, jadi tidak ada pemindaian 1,16 juta baris per jam.

**Temuan dan perbaikan saat CP2.** Uji kebocoran pada data nyata — bangun ulang tabel dari input
yang dipotong pada `t` saja, lalu bandingkan baris `t` — mula-mula menunjukkan `upwind_score`
berbeda 1 ulp (1,8e-15 absolut) pada satu origin meski seluruh 44 fitur lain sama. Sebabnya bukan
masa depan yang bocor: `sort_values("acquired_at")` memakai quicksort tidak stabil, sehingga
deteksi ber-timestamp sama dapat tersusun berbeda antar pemanggilan dan penjumlahan float bergeser.
Sort sekarang memakai kunci kanonik `["acquired_at", "lat", "lon", "frp_mw"]` (`kind="stable"`),
sehingga tabel invarian terhadap urutan baris cache. Setelah perbaikan, uji potong-input yang sama
memberi **nol fitur berbeda** pada tiga origin (2024-12-31, 2025-03-15, 2026-06-01) dan
`test_features_do_not_depend_on_the_stored_row_order_of_the_cache` mengunci sifat itu.

Tes: `ml/tests/test_model_table.py` (19 tes baru) menutup keselarasan t+6, jam hilang yang
direindex (lag tidak dibaca sebagai jam berurutan), ketidakberubahan fitur saat input setelah t
diubah, batas window `[t-W, t]`, radius kumulatif, FRP null → `NaN` bukan 0, upwind vs helper,
warm-up/ekor, penolakan frame fixture/stasiun, penolakan checksum, urutan baris cache yang tidak
mempengaruhi hasil, dan input yang tidak diubah in-place. Total `pytest ml/tests`: **78 lulus**
(59 sebelumnya).

Gate: `ruff check ml` 16 temuan, semuanya di `notebooks/pavana_bmkg_kalimantan.ipynb` (berkas
pengguna, tidak disentuh); `ruff format --check ml` menyisakan 2 berkas lama di luar scope
(`huggingface/README.md`, `scripts/publish_hf_dataset.py`); `nbstripout --verify` lulus;
`pnpm check` lulus (4 task) karena `node_modules` sudah terpasang saat sesi ini dimulai. Output notebook 02
yang tersimpan saat sesi dimulai (hasil eksekusi ulang 11:44, setelah log CP1) di-strip **atas
persetujuan pengguna**; kode notebook tidak diubah.

### CP3 — Implementasi baseline/evaluasi dan notebook 04

Berkas baru yang direncanakan: `src/pavana_ml/models/experiment.py`.
Gunakan helper metrics/splits existing bila kontraknya sesuai; hindari duplikasi tanpa kebutuhan.

- [x] Buat API `run_experiment` yang membaca tabel dan metadata CP2 serta menolak target/fixture
  yang tidak sesuai. Validasi checksum tabel yang tersimpan sebelum training.
- [x] Tetapkan feature allowlist untuk C/D/E; jangan otomatis memasukkan semua kolom numerik.
- [x] Pastikan target, target timestamp, dan nilai CAMS masa depan tidak ada di feature list.
- [x] Bentuk split kronologis berikut dengan gap minimal horizon di kedua batas.

| Split awal | Periode origin | Pemakaian |
| --- | --- | --- |
| Train | 2024, berakhir sebelum `2025-01-01 UTC − 6h` | Fit model/statistik preprocessing |
| Validasi | 2025, berakhir sebelum `2026-01-01 UTC − 6h` | Early stopping dan tuning |
| Test | Mulai 2026-01-01 UTC sampai target terakhir yang tersedia | Evaluasi akhir |

Pastikan `max(target_valid_at_train) < min(origin_validasi)` dan berlaku pula pada batas
validasi/test. Tolak split kosong; jangan memakai batas `2023-10-01` dari scaffold lama.

- [x] Baseline A: persistence `pred(t+6)=CAMS(t)`.
- [x] Baseline B eksperimen ini: rata-rata CAMS target menurut **bulan/jam, dipelajari dari train
  saja**, dengan fallback train-only untuk grup yang belum pernah terlihat.
- [x] C: LightGBM dengan CAMS historis + cuaca + waktu.
- [x] D: C + statistik deteksi hotspot.
- [x] E: D + upwind.
- [x] Nyatakan bahwa B ini berbeda dari baseline CAMS issue-time dalam metodologi produk awal.
  Baseline issue-time **tidak dijalankan**, karena snapshot belum menyediakannya.
- [x] Gunakan baris evaluasi identik untuk semua baseline/model agar perbandingan adil.
- [x] LightGBM dapat mempertahankan fitur `NaN`; scaling tidak wajib. Jika ada imputasi,
  encoding berbasis statistik, atau seleksi fitur, fit hanya pada train.
- [x] Gunakan seed dan jumlah thread eksplisit, early stopping pada validasi, dan CPU.
- [x] Jangan tuning atau memilih varian berdasarkan test. Tulis aturan pemilihan sebelum membuka
  hasil test; jika revisi model setelah melihatnya, laporkan bahwa holdout sudah dipakai.
- [x] Laporkan MAE/RMSE, jumlah sampel, dan baseline pada keseluruhan test serta periode kalender
  yang ditentukan sebelumnya. Jangan menyebut suatu bulan sebagai episode asap tanpa bukti.
- [x] Bila memakai metrik event, nyatakan cutoff dan maknanya; jangan menyamakannya otomatis
  dengan kategori kesehatan/AQI observasi stasiun.
- [x] Simpan parameter, fitur, versi paket, window split, data/code hash, prediksi holdout, dan metrik.
- [x] Pisahkan status **evaluated** dari **operational_ready**. Model penelitian tetap
  `research_only: true`, `operational_ready: false`, `observation_validated: false`.
- [x] Audit interaksi dengan `latest_evaluated_artifact`/notebook 05 agar artifact CAMS tidak
  otomatis dianggap model tervalidasi stasiun atau siap digunakan aplikasi.

Kontrak API yang sempat diberikan ke DSH, tetapi **belum diimplementasikan**:

```python
run_experiment(
    table,
    metadata,
    validation_start="2025-01-01",
    test_start="2026-01-01",
    max_rounds=500,
    output_dir=...,
) -> {
    "results": pandas.DataFrame,
    "test_predictions": pandas.DataFrame,
    "output_dir": pathlib.Path,
    "report": dict,
}
```

Jika kontrak disederhanakan, ubah notebook dan dokumentasi bersama-sama. Output per run:

```text
ml/artifacts/<versi-eksperimen>/
  report.json
  metrics.csv
  test_predictions.parquet
  C/model.txt + metadata.json
  D/model.txt + metadata.json
  E/model.txt + metadata.json
```

Tolak overwrite run existing atau gunakan versi baru yang jelas. Isi metrik hanya dari run nyata.

**Selesai jika:** notebook 04 tidak lagi bergantung pada kolom fiktif/tahun 2023, smoke run kecil
berhasil menyimpan hasil nyata dengan label penelitian, dan training utama siap dijalankan cloud.

### CP4 — Siapkan eksekusi Colab/Kaggle

- [x] Buat `00_cloud_setup.ipynb` opsional. Pengguna lokal dapat melewatinya setelah setup uv.
- [x] Gunakan direktori yang writable: `/content` pada Colab atau `/kaggle/working` pada Kaggle.
- [x] Install paket dari bundle **kode yang benar-benar sudah diunggah dan diverifikasi**.
  Jangan membuat bootstrap yang menunjuk `code/ml/` sebelum folder itu ada pada snapshot HF.
- [x] Set `PAVANA_ML_DATA_DIR` dan `PAVANA_ML_ARTIFACTS_DIR` sebelum import `pavana_ml`.
  Jelaskan restart kernel bila paket sudah terlanjur diimport.
- [x] Resolve revisi kode sekali, lalu download dengan SHA tersebut. Revisi kode dan revisi data
  boleh berbeda; rekam keduanya pada output.
- [x] Download data terkurasi dan sidecar dengan pin data; batch mentah FIRMS tidak perlu untuk
  training yang hanya memakai parquet terkurasi.
- [x] Notebook 02/03/04 harus bisa direstart dan memakai output disk masing-masing tahap.
- [x] Dokumentasikan Internet Kaggle untuk setup, penyimpanan persisten Drive/unduh artifact,
  dan bahwa runtime cloud dapat berakhir. Tidak perlu GPU atau provider API key untuk snapshot publik.
- [x] Jalankan minimal smoke alur install → import → load snapshot → fitur → train kecil pada
  lingkungan terisolasi. Bedakan pemeriksaan ini dari pengujian Colab/Kaggle yang benar-benar live.

Bundle di HF: `code/` berisi `README.md`, `CODE_MANIFEST.json`, dan `code/ml/` (`pyproject.toml`,
README, `src/pavana_ml/`, notebook `00`, `02`, `03`, `04`). Publisher memakai **allowlist** dan
menolak `.env`, cache, venv, artifact lokal, hasil tes, `data/`, `tests/`, serta apa pun di luar
`code/`. Bundle diunggah ke **PR #6** (bukan PR #5 yang sudah merged), tanpa merge; commit yang
di-pin notebook adalah `a9a0d6d98008e08e80d6e978d82cfc89f79282af`.

**Selesai jika:** ada instruksi cloud yang dapat dieksekusi, sumber kode pada revisi yang disebut
memang tersedia, dan semua batas verifikasi cloud dinyatakan dengan jujur.

### CP5 — Verifikasi, dokumentasi, dan handoff

- [x] Update `ml/README.md` dengan alur lokal/cloud dan output yang sesungguhnya.
- [x] Selaraskan dokumen metodologi: pertahankan pertanyaan produk awal dan tambahkan eksperimen
  CAMS sebagai jalur penelitian terpisah, bukan mengganti definisi observasi.
- [x] Perbaiki teks notebook 02 yang masih menyebut semua loader stub; beberapa loader sudah ada.
- [x] Pertahankan notebook 01 sebagai demo opsional. Notebook 05 menyusul setelah artifact relevan.
- [x] Run gate yang diwajibkan, periksa perubahan, dan strip output notebook sebelum handoff.
- [x] Perbarui deskripsi PR #6 (dan catatan rilis) sesuai hasil akhir yang benar-benar
  diverifikasi, tanpa atribusi AI. PR #5 sudah merged dan tidak bisa diubah lagi.
- [x] Catat checkpoint terakhir, perintah resume, dan keterbatasan yang tersisa di bagian log.

**Selesai jika:** pengguna dapat menjalankan langkah berurutan dari kernel bersih, output bisa
ditelusuri ke data dan kode, serta klaim yang belum diuji tidak ditandai selesai.

## 5. Tes yang melindungi risiko utama

Gunakan skill `test-audit` ketika menambah/mengubah tes. Fokus pada perilaku di batas modul,
bukan tes yang menyalin rumus internal atau mengecek isi string notebook.

- Alignment: timestamp duplikat/naive ditolak; jam hilang direindex dan tidak menyebabkan
  `shift(6)` salah dibaca sebagai 6 jam.
- Fitur temporal: mengubah input setelah t tidak mengubah fitur pada t; target tepat t+6.
- Hotspot: deteksi masa depan dan di luar radius tidak berkontribusi; current detection masuk
  sesuai batas window. Hasil upwind konsisten dengan helper existing untuk kasus terkontrol.
- Missingness: null target/fitur/FRP tidak diam-diam menjadi nol; warm-up/tail tidak ikut evaluasi.
- Split: label train/validasi tidak melewati origin split berikutnya; split kosong ditolak.
- Baseline: statistik seasonal/imputasi tidak berubah ketika nilai test diubah.
- Artifact: eksperimen menolak fixture/metadata salah dan merekam target model serta status penelitian.
- Smoke: alur file interim → tabel → metadata → train kecil → hasil tersimpan bekerja bersama.

Data buatan untuk unit test boleh dipakai menguji perilaku. Metrik dari data itu tidak boleh
dipublikasikan sebagai hasil eksperimen. Tes TS/Python parity existing tetap dijalankan; perubahan
formula lintas bahasa hanya dilakukan jika kebutuhan terpisah telah ditentukan.

Perintah gate dari root (ikuti juga `ml/AGENTS.md`):

```bash
uv sync --project ml --extra hub
uv run --project ml --extra hub ruff check ml
uv run --project ml --extra hub ruff format --check ml
uv run --project ml --extra hub pytest ml/tests
uv run --project ml --extra hub nbstripout --verify ml/notebooks/*.ipynb
pnpm check
```

`ruff format` tanpa `--check` juga dapat mengubah notebook. Batasi formatter pada berkas yang
sedang dikerjakan, periksa diff, dan jangan merapikan perubahan pengguna secara massal.
Jika `pnpm check` gagal karena dependensi JS belum terpasang, laporkan sebabnya. Pemasangan
dependensi atau perbaikan unrelated tidak menjadi alasan memperluas scope ML tanpa kebutuhan.

## 6. Penggunaan DSH saat melanjutkan

Pengguna mengizinkan skill `/home/kemal/.codex/skills/dsh-delegate/SKILL.md` untuk pekerjaan ML
yang dapat dibatasi. Baca skill, periksa profil efektif tanpa menampilkan kredensial, dan pastikan
DSH benar-benar mengeksekusi perintah. Profil yang diperiksa pada sesi ini:
`commandcode` / `deepseek/deepseek-v4.1-flash` / reasoning `max` / `zdr: false`.

Delegasikan satu checkpoint atau sekelompok file dengan kontrak jelas, misalnya notebook 02
setelah API preprocessing final. Tetapkan path yang boleh diedit, output, larangan network atau
training bila tidak diperlukan, batas eksplorasi, serta perintah verifikasi. Jangan memberikan
DSH seluruh riwayat, token HF, provider key, atau isi `.env`.

Codex tetap memeriksa diff dan temuan penting secara mandiri. Catatan dari audit DSH sebelumnya:
klaim bahwa kunci deduplikasi tidak menyimpan tanggal **tidak benar**; `.dt.floor("2min")` pada
timestamp penuh tetap mempertahankan tanggal. Jangan mengubah deduplikasi berdasarkan klaim itu.
Demikian pula, variasi nilai per jam tidak membantah bahwa data asal dapat diinterpolasi dari
resolusi lebih rendah. Periksa kontrak dan bukti sebelum menerima rekomendasi.

## 7. Log checkpoint dan cara melanjutkan

### CP0–CP1 selesai — 15 Oktober 2026

```text
Tanggal: 15 Oktober 2026
Checkpoint yang dikerjakan: CP0 (pulihkan konteks) dan CP1 (audit, preprocessing, notebook 02)
Berkas yang berubah:
  - ml/src/pavana_ml/data/research.py      (review + perbaikan; bukan tulis ulang dari nol)
  - ml/notebooks/02_data_sources.ipynb     (scaffold 2023 diganti pemanggil + EDA)
  - ml/tests/test_research_data.py         (baru, 17 tes)
  - ml/data/interim/hourly_aligned.parquet (gitignored)
  - ml/data/interim/audit_report.json      (gitignored)
Revisi data/kode dan hash artifact:
  - Data: myudak/pavana @ aaa0d2714102b7d3a7b3ad0beb2b1da1ce6a6dbe (refs/pr/5, belum merge)
  - manifest sha256: 8cf1a9494a1d8dffe3d2816b68909b5df79ab75eaf8cadbdfe880aef69af4787
  - hourly_aligned.parquet sha256: 2e8505f010b1a316f01208e6d9a8e94b56f1e1f5378c05f97daaeebcfd874461
  - weather c4d26482…, cams 0a9d4adb…, hotspot 3c415998… (semua cocok manifest)
Perintah yang benar-benar dijalankan:
  - git status --short
  - curl https://huggingface.co/api/datasets/myudak/pavana/discussions
  - uv run python -c "download_snapshot(Path('/tmp/pavana-snapshot-test'), DATASET_REVISION)"
  - uv run --extra hub ruff check / ruff format --check (berkas yang dikerjakan)
  - uv run --extra hub pytest            -> 47 passed
  - uv run --extra hub jupyter nbconvert --to notebook --execute notebooks/02_data_sources.ipynb
  - uv run --extra hub nbstripout notebooks/02_data_sources.ipynb && nbstripout --verify
  - uv run --extra hub pytest ml/tests -q ; uv run --extra hub ruff check ml
  - pnpm check
Hasil dan bukti:
  - PR #5 masih Open, ref tidak berpindah; main tetap 408947b4…; 40 berkas.
  - Notebook 02 dari kernel bersih: 34 sel, 0 error, 24.432 jam, 0 jam hilang.
  - boundary_layer_height_m tetap 4.368 NaN; tidak ada pengisian nilai atau target.
  - 59 tes lulus (30 existing + 29 CP1, termasuk 12 tes untuk temuan tinjauan); nbstripout lulus.
  - Tinjauan pasca-CP1 menemukan 2 celah validasi (P2); keduanya diperbaiki, lihat blok CP1.
  - Setelah perbaikan, hourly_sha256 tidak berubah: 2e8505f0…4461, jadi data nyata tidak terpengaruh.
  - ruff check ml tinggal 16 temuan, semuanya di notebooks/pavana_bmkg_kalimantan.ipynb
    (perubahan pengguna, tidak disentuh). Temuan ke-17 pada research.py sudah diperbaiki.
Pekerjaan belum selesai / alasan:
  - ruff format --check ml masih menandai 3 berkas lama/luar scope: ml/huggingface/README.md,
    ml/scripts/publish_hf_dataset.py, ml/src/pavana_ml/features/model_table.py (CP2). Tidak diubah.
  - pnpm check tetap gagal karena node_modules belum terpasang (turbo: command not found),
    sama seperti checkpoint sebelumnya. Dependensi JS tidak dipasang.
  - Penilaian "refs/pr/5 belum berpindah" berlaku untuk 15 Oktober 2026; periksa ulang sebelum
    mengandalkan commit itu.
  - Data hotspot tidak diverifikasi ulang terhadap batch mentah FIRMS di CP1.
Langkah berikutnya: CP2 — rapikan draft model_table.py (hapus assignment origin ganda, pakai
konversi nanodetik eksplisit), selaraskan notebook 03, lalu buat tabel model dan metadata.
```

### CP2 selesai — 15 Oktober 2026

```text
Tanggal: 15 Oktober 2026
Checkpoint yang dikerjakan: CP2 (ekstraksi fitur dan notebook 03)
Berkas yang berubah:
  - ml/src/pavana_ml/features/model_table.py      (ditulis ulang dari draft; bukan tambal sulam)
  - ml/notebooks/03_feature_engineering.ipynb     (scaffold fixture diganti pemanggil + pemeriksaan)
  - ml/tests/test_model_table.py                  (baru, 19 tes)
  - ml/notebooks/02_data_sources.ipynb            (hanya output di-strip, atas persetujuan pengguna)
  - ml/data/processed/model_table.parquet         (gitignored, output CP2)
  - ml/data/processed/model_table.metadata.json   (gitignored, output CP2)
Revisi data/kode dan hash artifact:
  - Data: myudak/pavana @ aaa0d2714102b7d3a7b3ad0beb2b1da1ce6a6dbe (refs/pr/5, belum merge)
  - Input interim: 2e8505f010b1a316f01208e6d9a8e94b56f1e1f5378c05f97daaeebcfd874461 (cocok
    laporan audit CP1)
  - Input hotspot: 3c415998e1d9e547ef4811dc27c8f1dbead738b9a66e33a088a637915e7b70a0
  - model_table.parquet sha256: e210ca6ac478a1200e01cd89d7b59fc0f73ddee9ac2d8e25b265d40aab2dba16
  - feature_code_sha256 (model_table.py saat build): b4b9a78550c1ec9c9573a04cdcbce88e052a96d4b03a298abb1f98fc4710049d
Perintah yang benar-benar dijalankan:
  - git status --short
  - uv run --extra hub python (periksa pandas 3.0.6, dtype hotspot datetime64[us, UTC], jarak)
  - uv run --extra hub pytest tests/test_model_table.py -q            -> 19 passed
  - uv run --extra hub pytest tests -q ; pytest ml/tests -q           -> 78 passed
  - uv run --extra hub ruff check --fix / ruff format (2 berkas CP2 + notebook 03)
  - uv run --extra hub jupyter nbconvert --to notebook --execute notebooks/03_feature_engineering.ipynb
  - uv run --extra hub nbstripout notebooks/02_data_sources.ipynb notebooks/03_feature_engineering.ipynb
  - uv run --extra hub nbstripout --verify ml/notebooks/*.ipynb
  - uv run --project ml --extra hub ruff check ml ; ruff format --check ml
  - pnpm check
  - skrip pemeriksaan di /tmp: brute force 18 kolom deteksi untuk 9 jam, perbandingan upwind_series,
    uji potong-input (bangun ulang dari data <= t pada 3 origin), dan pembacaan ulang parquet
Hasil dan bukti:
  - Notebook 03 dari kernel bersih: 6 sel kode, 0 error, 24.432 baris, 55 kolom.
  - Eligible 24.378 = 24.432 - 48 - 6; 6 baris tanpa target, 48 baris tanpa riwayat 48 jam.
  - target_valid_at - valid_at seragam 6 jam; kolom target = CAMS shift 6 jam untuk seluruh baris.
  - sha tabel stabil pada dua eksekusi notebook berturut-turut.
  - Brute force 1.156.755 baris untuk 9 jam contoh: 18 kolom deteksi identik; upwind sama dengan
    upwind_series hingga 1 ulp (1,4e-14 absolut); build penuh 3,0 detik untuk 24.432 jam.
  - Uji potong-input pada 3 origin: tidak ada fitur pada t yang berubah saat seluruh input setelah t
    dihapus, sementara target di run terpotong menjadi NaN. Menemukan 1 ulp perbedaan upwind karena
    urutan baris cache; diperbaiki dengan sort kanonik.
  - 19 tes baru menutup t+6, jam hilang, input masa depan, batas window, radius, FRP null,
    warm-up/ekor, frame fixture/stasiun, checksum, urutan baris cache, dan input yang tidak diubah
    in-place.
  - ruff check ml: 16 temuan, semua di notebooks/pavana_bmkg_kalimantan.ipynb (berkas pengguna).
  - ruff format --check ml: 2 berkas lama di luar scope; model_table.py sekarang lulus.
  - nbstripout --verify lulus; pnpm check lulus (4 task, node_modules sudah terpasang).
Pekerjaan belum selesai / alasan:
  - Notebook 03 membaca data nyata, tetapi belum ada training/evaluasi di atas tabelnya (CP3).
  - Cache hotspot tidak diverifikasi ulang terhadap batch mentah FIRMS; masih berlaku catatan CP1.
  - Override path cloud di paths.py belum diuji (CP4).
  - Angka 1.156.755 baris hotspot dan distribusinya tidak berubah sejak CP1; tidak ada unduhan baru.
Langkah berikutnya: CP3 — experiment.py (allowlist fitur C/D/E, split kronologis dengan gap 6 jam,
baseline A/B, LightGBM C/D/E, artifact berversi), lalu notebook 04. Tolak tabel atau metadata yang
checksum-nya tidak cocok; jangan menjalankan baseline issue-time.
```

**Perbaikan setelah tinjauan (15 Oktober 2026).** Tinjauan ulang CP2 menemukan empat hal; semuanya
ditutup tanpa mengubah satu nilai pun pada data nyata — `model_table.parquet` tetap
`e210ca6ac478a1200e01cd89d7b59fc0f73ddee9ac2d8e25b265d40aab2dba16`, dan notebook 03 dijalankan
ulang dari kernel bersih (6 sel, 0 error) untuk membuktikannya.

1. **Output notebook 03 di-strip.** Saat tinjauan, `nbstripout --verify ml/notebooks/*.ipynb`
   gagal karena notebook 03 masih menyimpan 6 output eksekusi, sehingga baris bukti "nbstripout
   lulus" di atas tidak lagi benar. Output di-strip setelah eksekusi ulang; `--verify` lulus lagi.
2. **Aturan `eligible` disamakan dengan kodenya.** Metadata menyebut "CAMS present at t, at t-48h
   and at t+6h", tetapi kode hanya memeriksa `lag48h` dan target, sehingga baris dengan CAMS `NaN`
   pada t — atau celah di tengah window — bisa ikut `eligible`. Sekarang `eligible` dibaca dari
   seluruh kolom `pm25_model` (CAMS pada t, lag 1/3/6/12/24/48, mean 6/24, perubahan 3 jam) plus
   target, dan kunci `excluded_incomplete_48h_history` berganti nama menjadi
   `excluded_incomplete_pm25_history`. Data nyata tidak punya jam hilang, jadi angkanya tidak
   berubah: 24.378 eligible, 6 tanpa target, 48 warm-up, 0 keduanya.
3. **Koersi senyap ditolak.** `_float_array` memakai `errors="coerce"`, sehingga teks di `lat`/
   `lon` menghapus deteksi tanpa jejak dan teks di `frp_mw` menjadi `NaN`. Sekarang nilai yang
   bukan angka dan `inf` ditolak dengan nama kolomnya; `NaN` tetap dipertahankan sebagai nilai
   hilang.
4. **Metadata tabel bisa menjelaskan dirinya sendiri.** Ditambahkan `built_at_utc`,
   `package_versions` (python/pandas/numpy/pyarrow), dan `feature_module_sha256` untuk lima modul
   yang matematikanya menentukan isi tabel (`model_table`, `upwind`, `wind`, `geo`, `research`);
   `feature_code_sha256` hanya menutup satu berkas. Nilainya sekarang
   `c4e1957332ccfb56a86628e1e2283deca43cb3d8eab21b3b04bd4919b8463a10`.

Tes bertambah dari 19 menjadi 25 di `ml/tests/test_model_table.py` (84 total `pytest ml/tests`):
eligibility pada jam hilang di tengah window, invarian "baris eligible tidak pernah kehilangan
fitur `pm25_model`", penolakan teks/`inf`, input opsional yang absen, timestamp hotspot non-UTC,
dan perbandingan 400 deteksi acak terhadap referensi brute force (count persis, sum FRP rel 1e-9).
Gate setelah perbaikan: `pytest ml/tests` 84 lulus; `ruff check ml` 16 temuan, semuanya di
`notebooks/pavana_bmkg_kalimantan.ipynb` (berkas pengguna); `ruff format --check ml` 2 berkas lama
di luar scope; `nbstripout --verify` lulus; `pnpm check` lulus (4 task, cache turbo).

### CP3 selesai — 15 Oktober 2026

```text
Tanggal: 15 Oktober 2026
Checkpoint yang dikerjakan: CP3 (baseline, evaluasi holdout, notebook 04)
Berkas yang berubah:
  - ml/src/pavana_ml/models/experiment.py         (baru: verifikasi tabel, split, baseline A/B, C/D/E, artifact)
  - ml/src/pavana_ml/models/lgbm.py               (early stopping pada validasi; field status artifact;
                                                   gate is_app_ready/latest_app_ready_artifact)
  - ml/tests/test_experiment.py                   (baru, 28 tes)
  - ml/notebooks/04_baselines_and_lightgbm.ipynb  (scaffold 2023 diganti pemanggil + penjelasan)
  - ml/artifacts/cams-t6h-retro-v1/               (gitignored: report.json, metrics.csv,
                                                   test_predictions.parquet, C|D|E model.txt+metadata.json)
Revisi data/kode dan hash artifact:
  - Data: myudak/pavana @ aaa0d2714102b7d3a7b3ad0beb2b1da1ce6a6dbe (refs/pr/5, belum merge)
  - model_table.parquet sha256: e210ca6ac478a1200e01cd89d7b59fc0f73ddee9ac2d8e25b265d40aab2dba16 (sama CP2)
  - model_table.metadata.json sha256: f75d9d59866ee465b4f23fe80933588284bc7390006b2d6b722b91bd03ca5697
  - experiment.py b88b75a8b9dd6ce8e6cd4bcba85a13f1a60fdd83a3e7ccc1f453e2075c94188f
  - lgbm.py 73ca1bdba7825067d9ae444bcf2b0d72b246a5c9882d31948bc6f516d8b8fdbc
  - test_experiment.py 0fc8a35f652519c22d599530cca8932fce407c6ecfc800314d0ad95ec34623c3
  - notebook 04 ef15a028deae9c4124a9634a24a60be20ba9348d7a0b5b2c4c5389f52136c15d
  - report.json a54b46dff486f9304e223d686e5fa3e3d0389f63020809a6d979bcc622ee2035 (created_at 08:15:01Z;
    dibangun ulang setelah perbaikan P2 putaran kedua, lihat blok di bawah)
  - metrics.csv 261b6e4562e4b16f6c1a924269a461153295b5cfa8762113d64acb3ec0543e34
  - C/model.txt sha256 bcfbe5c8587048b946066a92b01870ea04232574a3a30baf7cb1a2d3e208b607
Perintah yang benar-benar dijalankan:
  - git status --short
  - uv run --extra hub python (run_experiment ke direktori sementara; distribusi target per tahun)
  - uv run --extra hub pytest tests/test_experiment.py -q        -> 27 passed
  - uv run --extra hub pytest tests -q ; pytest ml/tests -q      -> 111 passed
  - uv run --extra hub ruff check --fix / ruff format (berkas CP3 + notebook 04)
  - uv run --extra hub jupyter nbconvert --to notebook --execute notebooks/04_baselines_and_lightgbm.ipynb
  - uv run --extra hub nbstripout notebooks/04... && nbstripout --verify ml/notebooks/*.ipynb
  - uv run --project ml --extra hub ruff check ml ; ruff format --check ml
  - pnpm check
Hasil dan bukti:
  - Split dari metadata: train 8.730 origin (2024-01-03 .. 2024-12-31 17:00), validasi 8.754 (2025),
    test 6.882 (2026-01-01 .. 2026-10-14 17:00); 6 origin eligible dibuang di tiap gap 6 jam dan
    54 baris ineligible tetap di luar split. max(target_valid_at) tiap split < origin pertama split
    berikutnya, ditegakkan di kode dan diuji.
  - Baseline A = CAMS pada t. Baseline B = rata-rata target per (bulan, jam) dari train saja, dengan
    fallback rata-rata bulan lalu rata-rata train; B bukan baseline issue-time dan baseline issue-time
    tidak dijalankan karena snapshot tidak punya issued_at (dicatat di report["baselines"]).
  - Metrik test pada 6.882 baris identik untuk semua varian, MAE µg/m³: A 14,39; B 25,42; C 21,58;
    D 20,75; E 20,89. RMSE: A 28,38; B 47,09; C 43,48; D 42,26; E 42,45. D−C −0,83; E−D +0,14.
    Hasilnya jelas: pada holdout ini persistence mengalahkan seluruh varian LightGBM, dan kelompok
    fitur deteksi/upwind tidak menunjukkan tambahan yang berarti. Dilaporkan apa adanya.
  - Penyebab yang terlihat dan tidak disembunyikan: level target 2026 (p50 17,2; max 430,3) jauh di
    atas rentang latih 2024 (p50 10,1; max 66,4), sedangkan pohon tidak dapat memprediksi di luar
    rentang latih dan nilai daunnya jauh di bawah nilai ekstrem. Angka ini ada di
    report["splits"]["target_distribution_ug_m3"] dan di batasan.
  - Rentang prediksi test memperkuat pembacaan itu (dihitung ulang dari test_predictions.parquet):
    prediksi C/D/E maksimum hanya 33,2 / 33,2 / 30,7 µg/m³ (p99 28–29), sementara target mencapai
    430,3 dan 533 jam berada ≥ 100 µg/m³ (rata-rata target di jam itu 148,5). Persistence membawa
    level tersebut (rata-rata 113,3 pada jam yang sama), sehingga ia menang pada MAE keseluruhan.
  - Metrik event 55,5 µg/m³ (batas bawah US AQI 151 "Unhealthy", breakpoint 24 jam): 1.358 jam test.
    A presisi 0,73 / recall 0,73; B–E tidak pernah memprediksi ≥ ambang sehingga presisi null dan
    recall 0. Cutoff dan maknanya ditulis di report, bukan disamakan dengan AQI stasiun.
  - Pemilihan varian memakai MAE validasi sebelum test dibaca: D 4,332 < E 4,347 < C 4,377. Metrik
    test semua varian tetap ditulis, jadi pilihan itu tidak menyembunyikan varian yang kalah.
  - Notebook 04 dari kernel bersih: 11 sel, 0 error; run nyata disimpan di ml/artifacts/cams-t6h-retro-v1
    (9 berkas) dengan research_only=true, operational_ready=false, observation_validated=false.
  - Reproduksibilitas: empat build penuh yang berdiri sendiri (direktori run dihapus dan dibangun
    ulang dari kode yang berbeda secara format/pengaman/redaksi) memberi metrik, best_iteration, dan
    C/model.txt byte-identik (sha256 bcfbe5c8…b607). Seed, jumlah thread, dan flag deterministik
    direkam di report["lightgbm"]["params"].
  - Audit artifact: direktori run menyimpan model di C/D/E sehingga latest_evaluated_artifact() tetap
    None; gate is_app_ready()/latest_app_ready_artifact() menolak artifact CAMS karena flag statusnya
    dan karena target_kind-nya "model", bukan "observation" (diuji). Notebook 05 tetap gated;
    pembaruannya ada di CP5.
  - Smoke run terpisah: max_rounds=30 ke direktori sementara, sekitar 2 detik, 9 berkas tersimpan dan
    berlabel penelitian - ini pemeriksaan eksekusi, bukan hasil yang dilaporkan.
  - Waktu run penuh di mesin ini 8,8-9,3 detik pada dua pengukuran berbeda; bukan angka cloud.
  - Gate: pytest ml/tests 112 lulus; ruff check ml 16 temuan, semuanya di
    notebooks/pavana_bmkg_kalimantan.ipynb (berkas pengguna); ruff format --check ml 2 berkas lama di
    luar scope; nbstripout --verify lulus; pnpm check lulus (4 task).
Pekerjaan belum selesai / alasan:
  - Eksekusi Colab/Kaggle (CP4) belum ada; run penuh 8,8 detik di atas berjalan lokal, jadi angka itu
    bukan hasil cloud dan belum pernah diuji di lingkungan cloud.
  - Bundle kode ke HF belum diunggah, dan bootstrap code/ml belum boleh menunjuk folder yang belum ada.
  - Override path cloud di paths.py masih belum diuji (CP4).
  - Cache hotspot belum diverifikasi ulang terhadap batch mentah FIRMS; catatan CP1 masih berlaku.
  - Notebook 05 belum diperbarui untuk menemukan artifact bersarang (CP5).
Langkah berikutnya: CP4 — notebook 00_cloud_setup, bundle code/ml ke HF pada revisi yang benar dan
terverifikasi, lalu jalankan alur install -> import -> snapshot -> fitur -> training kecil di
lingkungan terisolasi.
```

**Verifikasi independen dan perbaikan setelah tinjauan (15 Oktober 2026).** Satu agen pemeriksa
terpisah menguji ulang CP3 dengan perhitungan sendiri di `/tmp` (repo tidak disentuh) terhadap
keadaan yang dibekukan, `report.json` `a746b48f…f80e`. Yang dikonfirmasi:

1. **Split.** 24.432 baris terbagi tepat satu kali: train 8.730, validasi 8.754, test 6.882, dua gap
   6+6 baris, 54 ineligible; tidak ada tumpang tindih; label terakhir tiap split < origin pertama
   split berikutnya; `target_valid_at == valid_at + 6 h` untuk seluruh baris.
2. **Tanpa kebocoran test.** Tiga build ulang dengan fitur test diubah (dan satu varian juga
   mengubah target test) memberi `model.txt` C/D/E byte-identik, 10/10 baris metrik train+validasi
   sama persis, sementara baris metrik test berubah; `selected_variant` tetap D dengan
   `validation_mae` identik. Target yang bukan CAMS pada `target_valid_at` ditolak.
3. **Baseline A.** `pred_A` sama persis dengan CAMS pada origin untuk 6.882 baris; 390 nilai metrik
   (5 varian × 3 split × period all + 10 bulan) dihitung ulang: 0 ketidakcocokan; prediksi C/D/E
   yang dibangkitkan ulang dari `model.txt` + `best_iteration` identik bit-per-bit dengan parquet.
4. **Baseline B.** Sama persis dengan rata-rata (bulan, jam) train-only yang dihitung ulang, dan
   tidak sama dengan rata-rata seluruh baris. Tidak ada `issued_at` di mana pun pada snapshot.
5. **Status artifact dan angka PLAN** cocok dengan berkas tersimpan; gate merekomendasikan ulang
   hash kode dan cocok dengan berkas di disk.

Tiga hal ditemukan lewat tinjauan itu dan sudah ditutup; tidak satu pun mengubah data, split, fitur,
atau angka:

1. **Gate aplikasi kurang satu syarat.** `is_app_ready` hanya memeriksa tiga flag, sehingga
   `metadata.json` yang disunting tangan (dua flag dinyalakan) lolos walau `target_kind` = `"model"`.
   Sekarang gate juga mensyaratkan `target_kind in {"observation"}` (fail-closed: kind tak dikenal
   ditolak), dan `test_flipping_only_the_status_flags_cannot_make_a_model_field_app_ready` mengunci
   kasus itu.
2. **Reuse bisa bergeser 1 ulp.** `_load_finished_run` membaca `metrics.csv` dengan parser default
   pandas, yang dapat menggeser float sebesar 1 ulp; run yang di-reuse bisa berbeda tipis dari berkas
   tersimpan. Sekarang dibaca dengan `float_precision="round_trip"` dan tes reuse memakai
   `check_exact=True`.
3. **Redaksi pemilihan varian.** `SELECTION_RULE` dan docstring modul menyebut pemilihan "sebelum
   test dibaca", padahal yang benar-benar berlaku dan teruji adalah tidak ada nilai test yang
   mempengaruhi pilihan (dibuktikan lewat perturbasi). Kalimatnya diperbaiki; teks notebook tentang
   reuse juga menyebut settings, bukan hanya tabel dan kode.

Setelah perbaikan, run dibangun ulang dan diperiksa sendiri: metrik test, `best_iteration`, dan
`C/model.txt` tetap byte-identik dengan run sebelumnya, dan hash kode di `report.json` cocok dengan
berkas di disk. Yang tidak dapat diverifikasi ulang dari repo: eksekusi notebook dari kernel bersih
(output di-strip sesuai kebijakan, jadi buktinya ada di transkrip sesi, bukan di berkas) dan durasi
smoke run. Gate setelah perbaikan: `pytest ml/tests` 112 lulus; `ruff check ml` 16 temuan, semuanya
di `notebooks/pavana_bmkg_kalimantan.ipynb` (berkas pengguna); `ruff format --check ml` 2 berkas lama
di luar scope; `nbstripout --verify` lulus; `pnpm check` lulus.

**Perbaikan temuan P2 lanjutan (15 Oktober 2026).** Tiga temuan P2 pada reuse dan provenance
diverifikasi ulang lebih dulu — ketiganya **tereproduksi** pada kode saat itu — lalu ditutup di
`experiment.py`. Tidak ada angka eksperimen yang berubah.

1. **Reuse mengabaikan perubahan allowlist fitur.** Menghapus `temperature_c` dari allowlist C
   (25 fitur) tetap mengembalikan run lama dengan 26 fitur. `_recorded_settings` sekarang ikut
   membandingkan `target`, `target_valid_column`, `horizon_hours`, `feature_allowlists`, dan
   `frame_sha256`, bukan hanya batas split, jumlah ronde, dan `params`.
2. **Frame training bisa menyimpang dari checksum yang dicatat.** Mengganti seluruh `temperature_c`
   dengan `1000` tetap menghasilkan run yang mencatat checksum parquet asli. `frame_fingerprint`
   (nilai + urutan kolom + dtype) dan `_verified_frame_fingerprint` menolak frame yang bukan parquet
   yang disebut metadata; report kini mencatat `data.frame_sha256` dan `data.frame_source_verified`.
3. **Reuse menerima run tidak lengkap dan metrik yang tidak konsisten.** Menghapus `C/model.txt` atau
   menulis MAE test C `999` di `metrics.csv` tetap lolos. `_verify_finished_run` mewajibkan
   `report.json` + `metrics.csv` + `test_predictions.parquet` + `C/D/E/model.txt` + `metadata.json`,
   menyamakan `metrics.csv` dengan `report.json`, mereproduksi mae/rmse dari parquet prediksi
   bit-for-bit, dan mencocokkan metadata tiap model dengan report.

Bukti penolakan setelah perbaikan (tiap skenario dijalankan pada salinan run di luar repo):

| Skenario | Pesan yang keluar |
| --- | --- |
| allowlist C jadi 25 fitur | `was run with different settings: {'feature_allowlists': ...}` |
| frame `temperature_c = 1000` | `the frame passed to run_experiment is not the audited table at ...` |
| `C/model.txt` dihapus | `is not a complete run: missing ['C/model.txt']` |
| MAE csv C ditulis `999` | `contradicts itself on C test mae: 999.0 vs 21.575856132237085` |
| `pred_D` digeser `+1` | `test_predictions.parquet does not reproduce the mae that metrics.csv claims for D` |

Tes dan gate: `ml/tests/test_experiment.py` 28 → **33 tes** (lima tes regresi baru);
`pytest ml/tests` 112 → **117 lulus**; `ruff check ml` 16 temuan, semuanya di
`notebooks/pavana_bmkg_kalimantan.ipynb` (berkas pengguna); `ruff format --check ml` 2 berkas lama
di luar scope; `nbstripout --verify` lulus; `pnpm check` 4 task lulus (lewat cache turbo).

Run dibangun ulang di tempat: `ml/artifacts/cams-t6h-retro-v1` dihapus lalu dibuat lagi oleh notebook
04 dari kernel bersih (6 sel kode, 0 error). `metrics.csv` `261b6e45…` dan `C/D/E/model.txt`
`bcfbe5c8…` / `09a6b27d…` / `9ab28cc6…` tetap **byte-identik**, jadi seluruh angka pada blok CP3 di
atas berlaku apa adanya; yang berubah hanya `report.json` (`240f6200…` → `248e8a36…`, created_at
08:01:43Z) karena memuat hash kode baru, `data.frame_sha256 328c2c5b…`, dan
`data.frame_source_verified: true`. Salinan report lama disimpan di luar repo
(`/tmp/cp3-fix/v1-backup/`). Reuse pada artifact lama ditolak dengan pesan
`was produced by different experiment code` — perilaku yang memang diinginkan; setelah rebuild,
reuse berhasil kembali dan artifact lolos `_verify_finished_run`.

Belum ditutup (bukan bagian perbaikan ini): `num_threads` masih ikut dibandingkan pada reuse,
sehingga artifact yang sama tidak bisa di-reuse di mesin dengan jumlah core berbeda (relevan untuk
CP4); `metrics.csv` menulis presisi event `NaN` sebagai sel kosong; `n`, `feature_n`, dan
`event_support` di `report.metrics.test` tertulis sebagai float.

**Perbaikan temuan P2 putaran kedua (15 Oktober 2026).** Dua celah lanjutan diverifikasi ulang —
keduanya **tereproduksi** — lalu ditutup. Lagi-lagi tidak ada angka eksperimen yang berubah.

1. **Checksum parquet tidak dicocokkan dengan metadata sebelum training.** Bila frame **dan** berkas
   parquet diubah bersama sementara metadata lama tetap dipakai, pemeriksaan sebelumnya lolos:
   `frame_source_verified` menjadi `true` padahal checksum di report (`e210ca6a…`) bukan checksum
   berkas sebenarnya (`e7ee0a26…`). `_verified_frame_fingerprint` sekarang menghitung
   `sha256(source)` dan menolaknya bila tidak sama dengan `metadata["table_sha256"]` — dan menolak
   pula bila metadata menyebut path tanpa checksum.
2. **Isi berkas model tidak pernah diperiksa saat reuse.** Mengganti `C/model.txt` dengan teks 29
   byte yang bukan model LightGBM tetap menghasilkan reuse sukses berstatus `evaluated: true`.
   `save_artifact` kini menulis `model_sha256` ke `metadata.json` tiap varian, run report mencatat
   `artifacts.<varian>.model_sha256`, dan `_verify_finished_run` membandingkan berkas ↔ report ↔
   metadata varian.

| Skenario | Pesan yang keluar |
| --- | --- |
| frame + parquet bergerak bersama, metadata lama | `no longer matches the checksum in its metadata: e7ee0a26… != e210ca6a…` |
| `C/model.txt` diganti teks tak valid | `model.txt does not match the checksum the report records (19073c1f… != 393fb190…)` |
| report run menyebut tabel lain | `was built from table '0000…', not from the metadata given` |

Tes dan gate: `ml/tests/test_experiment.py` 33 → **36 tes**; `pytest ml/tests` 117 → **120 lulus**.
Tes lama yang memakai metadata ber-checksum salah kini ditangkap penjaga baru yang lebih awal
(`no longer matches the checksum in its metadata`), dan cakupan penjaga reuse-nya dipindahkan ke tes
baru yang menyunting `report.json`. Gate lain tidak berubah: `ruff check ml` 16 temuan (notebook
pengguna), `ruff format --check ml` 2 berkas lama di luar scope, `nbstripout --verify` lulus,
`pnpm check` 4 task lulus (cache turbo).

Run dibangun ulang lagi di tempat lewat notebook 04 dari kernel bersih (6 sel kode, 0 error).
`metrics.csv` `261b6e45…` dan `C/D/E/model.txt` `bcfbe5c8…` / `09a6b27d…` / `9ab28cc6…` tetap
**byte-identik**; `report.json` `248e8a36…` → `a54b46df…` (created_at 08:15:01Z) karena memuat hash
kode baru dan blok `artifacts`. Salinan report putaran pertama ada di `/tmp/cp3-fix/v1-backup/`
(`240f6200…`) dan putaran kedua di `/tmp/cp3-fix/v1-backup-2/` (`248e8a36…`). Reuse pada run
hasil rebuild berhasil kembali dan lolos `_verify_finished_run`.

Docstring `lgbm.py` yang sebelumnya menyebut "all three flags" sudah diperbaiki pada putaran ini
(`is_app_ready` juga mensyaratkan `target_kind`).

### CP4 selesai — 15 Oktober 2026

```text
Tanggal: 15 Oktober 2026
Checkpoint yang dikerjakan: CP4 (persiapan eksekusi Colab/Kaggle)
Berkas yang berubah:
  - ml/notebooks/00_cloud_setup.ipynb          (baru: runner all-in-one cloud, 13 sel)
  - ml/scripts/publish_hf_code.py              (baru: publisher bundle dengan allowlist)
  - ml/huggingface/code/README.md              (baru: cara pakai bundle di Kaggle/Colab)
  - ml/huggingface/code/CODE_MANIFEST.json     (generated; salinan lokal untuk revisi PR head)
  - ml/src/pavana_ml/data/research.py          (download_snapshot: parameter `include`)
  - ml/tests/test_cloud_paths.py               (baru: 2 tes override path cloud)
  - ml/tests/test_publish_code.py              (baru: 4 tes allowlist bundle)
  - ml/tests/test_research_data.py             (+3 tes cakupan unduhan terkurasi)
  - ml/PLAN.md                                 (status PR, checklist CP4, blok bukti ini)
Revisi data/kode dan hash artifact:
  - Kode: PR #6, commit yang di-pin notebook a9a0d6d98008e08e80d6e978d82cfc89f79282af (30 berkas,
    217.547 byte); head PR setelah catatan notebook + hasil Kaggle
    256cc955a4954095ec02fb0af80b1195aea1bab6
  - Data: myudak/pavana @ aaa0d2714102b7d3a7b3ad0beb2b1da1ce6a6dbe (main 561c950e… byte-identik)
  - interim hourly_aligned.parquet 2e8505f010b1a316f01208e6d9a8e94b56f1e1f5378c05f97daaeebcfd874461
  - model_table.parquet e210ca6ac478a1200e01cd89d7b59fc0f73ddee9ac2d8e25b265d40aab2dba16
  - metrics.csv 261b6e4562e4b16f…, C/D/E model.txt bcfbe5c8… / 09a6b27d… / 9ab28cc6…
Perintah yang benar-benar dijalankan:
  - curl https://huggingface.co/api/datasets/myudak/pavana(/discussions|/tree/...|/revision/...)
  - curl resolve/main/manifest.json + processed/hotspot_kalimantan.parquet lalu sha256sum
  - uv run --extra hub python ml/scripts/publish_hf_code.py            (preview + --upload)
  - snapshot_download(code/**) pada commit terpin + perbandingan sha256 dengan repo lokal
  - uv venv /tmp/cp4-venv --seed ; uv pip install nbconvert ipykernel
  - /tmp/cp4-venv/bin/python -m nbconvert --execute 00_cloud_setup.ipynb  (smoke, penuh, root bersih)
  - idem dengan /tmp/cp4-venv2 (pandas 2.2.3) untuk smoke kompatibilitas versi
  - PAVANA_ML_DATA_DIR=... python -c "run_experiment(..., if_exists='reuse')"
  - uv run --extra hub pytest tests -q ; pytest ml/tests -q ; ruff check ml ; ruff format --check ml
  - uv run --extra hub nbstripout notebooks/*.ipynb && nbstripout --verify notebooks/*.ipynb
  - pnpm check
Hasil dan bukti:
  - PR #5 sudah di-merge myudak; main 561c950e. PR baru #6 berisi 39 path, semuanya di bawah code/
    (tidak ada berkas data yang berubah, tidak ada path dihapus); status Open, tidak di-merge.
  - Revisi terpin diverifikasi ulang dari HF: 29 berkas manifest cocok byte dengan repo lokal,
    kecuali salinan code/ml/notebooks/00_cloud_setup.ipynb yang memang versi sebelum pin.
  - Cakupan unduhan cloud: download_snapshot(include=MANIFEST_PATHS.values()) mengunduh 7 berkas
    terkurasi (batch mentah FIRMS dan berkas konteks tetap di Hub) dan mencatat requested_paths
    pada receipt. Default tanpa include tetap mengunduh seluruh manifest (perilaku CP1).
  - Smoke di lingkungan terisolasi (venv baru, paket dipasang dari bundle HF, root /tmp):
    24.432 baris; interim 2e8505f0…4461; tabel 24.432 x 55 kolom, 24.378 eligible, e210ca6a…ba16.
    Dua hash itu sama persis dengan bukti CP1/CP2.
  - Run penuh 500 ronde dijalankan dari cwd di luar repo dengan instalasi dari HF: metrics.csv,
    test_predictions.parquet, dan C/D/E model.txt byte-identik dengan run lokal CP3; MAE test
    A 14,388942 / B 25,421927 / C 21,575856 / D 20,745541 / E 20,885664; selected D dengan
    validation MAE 4,332374112382325; best_iteration C 306 / D 246 / E 144. module_sha256 dan
    table_sha256 di report.json juga sama dengan CP3.
  - Runtime non-repo: report mencatat git_commit null, dan `git rev-parse` mencetak empat baris
    "fatal: not a git repository". Perilaku ini dijelaskan di notebook; tidak mempengaruhi angka.
  - Restart: notebook melewati unduhan yang sudah ada, membangun ulang fitur dari disk, dan
    run_experiment(if_exists="reuse") membaca kembali run penuh di instalasi terisolasi dengan
    metrik yang sama.
  - Kompatibilitas versi: dengan pandas 2.2.3 alur penuh sampai smoke tetap jalan dan nilai tabel
    identik (selisih numerik maksimum 0,0; jumlah NaN sama), tetapi table_sha256 berbeda
    (f6f02fe3…) karena valid_at/target_valid_at ditulis datetime64[ns], bukan [us]. Catatan ini
    ditambahkan ke notebook; hash CP2 hanya berlaku untuk build pandas yang sama.
  - Batas yang dinyatakan jujur: sesi Kaggle/Colab live belum dijalankan, jadi durasi, kuota
    Internet, dan perilaku Kaggle sebenarnya belum terukur. Verifikasi di atas adalah pemeriksaan
    eksekusi di mesin lokal, bukan hasil cloud.
  - Seluruh sel kode pada notebook yang dieksekusi identik dengan berkas akhir, dan identik
    baris-per-baris dengan sumber yang benar-benar dijalankan di Kaggle
    (`.virtual_documents/__notebook_source__.ipynb`, 239 baris kode); sesudah run hanya butir
    markdown yang ditambahkan (ringkasan verifikasi, catatan hash parquet vs versi pandas,
    catatan "fatal: not a git repository", dan hasil run Kaggle).
  - Gate: pytest ml/tests 129 lulus (120 -> 129); ruff check ml 16 temuan, semuanya di
    notebooks/pavana_bmkg_kalimantan.ipynb (berkas pengguna); ruff format --check ml 2 berkas lama
    di luar scope (huggingface/README.md, scripts/publish_hf_dataset.py); nbstripout --verify lulus;
    pnpm check 4 task lulus.
Pekerjaan belum selesai / alasan:
  - Eksekusi Kaggle/Colab yang benar-benar live belum dilakukan; itu langkah pengguna.
  - PR #6 belum di-merge (memang tidak boleh di-merge dari sisi ini).
  - Reuse masih membandingkan num_threads, jadi artifact cloud dari mesin dengan jumlah core
    berbeda akan ditolak dengan pesan yang jelas; notebook menyuruh memakai RUN_VERSION baru.
  - Cache hotspot tetap belum diverifikasi ulang terhadap batch mentah FIRMS (catatan CP1).
Langkah berikutnya: CP5 — rapikan ml/README.md dengan alur lokal/cloud, selaraskan
docs/modeling-methodology.md, perbarui deskripsi PR sesuai hasil yang sudah diverifikasi, lalu
jalankan gate penutup dan strip output notebook.
```

**Eksekusi Kaggle live (15 Oktober 2026).** Pengguna menjalankan `00_cloud_setup.ipynb` di Kaggle
(kernel `muhamadkemalfaza/pavana`); output diunduh dengan `kaggle kernels output` dan diperiksa.

```text
Runtime dan pin:
  - python 3.13.15, platform Linux-6.18.48+-x86_64, cpu_count 4 (lokal: 18)
  - pandas 2.3.3, numpy 2.1.3, pyarrow 23.0.1, lightgbm 4.6.0, scikit-learn 1.6.1,
    huggingface-hub 1.29.0
  - revisi kode yang dipasang a9a0d6d98008e08e80d6e978d82cfc89f79282af (sama dengan pin)
  - revisi data aaa0d271…, manifest 8cf1a949…4787, 7 berkas terkurasi terverifikasi
  - run cams-t6h-retro-kaggle-v1, max_rounds 500, smoke false, cloud_run.json 09:14:11Z
Hash berkas Kaggle (byte memang berbeda dari lokal karena stack berbeda):
  - hourly_aligned.parquet 326182cf…, model_table.parquet 6473a245…,
    metrics.csv 7d25b44e…, test_predictions.parquet ca371ed0…,
    C/D/E model.txt 914d9aa7… / 3510a708… / 4bd08eb4…
Perbandingan nilai terhadap run lokal CP3:
  - pred_A..pred_E pada 6.882 baris test: identik bit-per-bit (selisih maksimum 0,0)
  - RMSE seluruh 65 baris metrik identik; MAE identik kecuali 1 ulp (selisih maksimum 2,2e-16)
  - split train/validasi/test 8.730/8.754/6.882 sama; eligible 24.378 sama
  - selected_variant D, validation_mae identik, best_iteration C 306 / D 246 / E 144 sama
  - module_sha256 sama; event_metric dan status artifact sama
  - model_table: 51 dari 52 kolom numerik identik; hanya upwind_score berbeda <= 3,6e-12
    (relatif 3,6e-16, sekitar 1-2 ulp, efek urutan penjumlahan float pada numpy/BLAS berbeda);
    NaN per kolom sama, kolom sama
  - hourly_aligned identik secara nilai (selisih 0,0); dtype cap waktu pandas 2.3.3 adalah
    datetime64[ns, UTC], lokal [us, UTC], jadi sha berkas berbeda (lihat catatan notebook)
  - git_commit null di Kaggle (bukan checkout git), num_threads 4 vs 18 di lokal; karena itu
    run lokal tidak bisa di-reuse di mesin ini dan sebaliknya, sesuai perilaku yang terdokumentasi
  - zip artifact (9 berkas) byte-identik dengan direktori run di output Kaggle
Sesi Kaggle (dari panel Logs dan timestamp artifact):
  - Accelerator None, Environment "Latest Container Image", Output 33,67 MB
    (29 MB data + 2,3 MB artifact, termasuk zip)
  - "Successfully ran in 10.1s" pada log hanya menutup tahap finalisasi: isinya cuma
    SyntaxWarning dari mistune/nbconvert milik Kaggle dan penulisan __results__.html (348.198 byte),
    tanpa satu pun keluaran sel pipeline. Angka itu bukan durasi pipeline, karena alur yang
    terekam saja sudah 33 detik sebelum finalisasi.
  - Durasi sisi Kaggle yang benar-benar terekam pada artifact: unduh data selesai 09:13:38 ->
    tabel fitur 09:14:01 (23 detik) -> training 500 ronde selesai 09:14:10 (9 detik) ->
    cloud_run.json 09:14:11. Jadi 33 detik dari data siap sampai seluruh artifact tersimpan.
  - Durasi end-to-end (termasuk pip install dan unduh bundle kode) tidak terekam di mana pun;
    notebook tidak mencetak waktu, jadi angka itu tidak diklaim.
Kesimpulan: angka riset yang dilaporkan tidak berubah di cloud, dan tidak ada metrik baru yang
diklaim. Batas tetap: target adalah medan model CAMS, bukan observasi stasiun.
```

### CP5 selesai — 15 Oktober 2026

```text
Tanggal: 15 Oktober 2026
Checkpoint yang dikerjakan: CP5 (verifikasi, dokumentasi, handoff)
Berkas yang berubah:
  - ml/README.md                              (ditulis ulang: dua jalur riset, alur lokal/cloud,
                                               output nyata, gate)
  - docs/modeling-methodology.md              (jalur CAMS ditambahkan sebagai jalur terpisah;
                                               pertanyaan produk dan target observasi tidak diubah)
  - ml/notebooks/02_data_sources.ipynb        (satu sel markdown: status loader; tidak ada kode)
  - ml/scripts/publish_hf_code.py             (DEFAULT_DESCRIPTION = deskripsi PR final)
  - ml/huggingface/code/README.md             (catatan: notebook 00 harus diambil dari head, bukan
                                               dari commit terpin)
  - ml/huggingface/code/CODE_MANIFEST.json    (dibuat ulang publisher; 29 berkas)
  - ml/AGENTS.md                              (satu paragraf: `evaluated` != servable)
  - README.md                                 (dua baris: status `ml/` dan prioritas ground truth)
  - ml/PLAN.md                                (checklist CP5 + blok bukti ini + prompt resume)
  - ml/artifacts/cams-t6h-retro-v1/           (gitignored; dibangun ulang dari nol, lihat bawah)
Revisi data/kode dan hash artifact:
  - Kode: PR #6 head 3430982365663d68a8522e867d855c6158ba4df9 (lima komit: 499ee579…, 53ae1349…,
    53deb650…, 0ee28569…, 34309823…; sebelumnya 256cc955…); pin notebook tetap
    a9a0d6d98008e08e80d6e978d82cfc89f79282af dan masih bisa di-resolve
  - Data: aaa0d2714102b7d3a7b3ad0beb2b1da1ce6a6dbe (tidak berubah)
  - interim hourly_aligned.parquet 2e8505f0…4461 (sama CP1)
  - model_table.parquet e210ca6a…ba16 (byte-identik dengan CP2 meski dibangun ulang)
  - model_table.metadata.json ad4eea2c… (berubah dari f75d9d59…: built_at_utc baru; isi tabel sama)
  - metrics.csv 261b6e45…, C/D/E model.txt bcfbe5c8… / 09a6b27d… / 9ab28cc6…,
    test_predictions.parquet 29caf25e… — semuanya byte-identik setelah build ulang penuh
  - report.json a54b46df… -> f0b4b945… (created_at 2026-10-15T09:52:21Z; lihat diff di bawah)
Perintah yang benar-benar dijalankan:
  - uv sync --project ml --extra hub
  - uv run --project ml --extra hub ruff check ml ; ruff format --check ml
  - uv run --project ml --extra hub pytest ml/tests -q                -> 129 passed
  - uv run --project ml --extra hub nbstripout --verify ml/notebooks/*.ipynb
  - pnpm check
  - uv run --project ml --extra hub jupyter nbconvert --to notebook --execute
      --output-dir /tmp/cp5-run ml/notebooks/{01,02,03,04,05}*.ipynb   (kernel bersih per notebook)
  - rm -rf ml/artifacts/cams-t6h-retro-v1  (salinan CP3/CP4 ada di /tmp/cp5-backup) lalu
    notebook 03 dan 04 dijalankan ulang -> build penuh; notebook 04 dijalankan sekali lagi -> reuse
  - sha256sum / cmp pada artifact baru vs /tmp/cp5-backup
  - uv run --project ml --extra hub python ml/scripts/publish_hf_code.py            (preview)
  - uv run --project ml --extra hub python ml/scripts/publish_hf_code.py --upload --revision refs/pr/6
    (lima kali, tiap kali setelah dokumentasi disunting lagi: 499ee579…, 53ae1349…, 53deb650…,
    0ee28569…, 34309823…)
  - snapshot_download(code/**) pada tiap head + perbandingan sha256 byte-per-byte dengan repo
  - HfApi.edit_discussion_comment untuk deskripsi PR #6
Hasil dan bukti:
  - Dokumentasi: ml/README.md kini memisahkan jalur produk (target observasi, masih terblokir)
    dari eksperimen retrospektif CAMS, mencatat alur lokal 02->03->04 dan alur cloud 00 beserta
    path output sebenarnya, dan memuat tabel metrik holdout. docs/modeling-methodology.md
    mempertahankan definisi target observasi untuk jalur produk dan menambahkan jalur CAMS
    sebagai jalur terpisah dengan baseline B yang berbeda (bukan issue-time).
  - Teks "loader stub": yang tersisa ada di ml/README.md ("fetch skeletons (TODO)" dan
    "firms/open_meteo/openaq are stubs") dan sudah diperbaiki. Notebook 02 di working tree (hasil
    tulis ulang CP1) tidak memuatnya; yang masih memuat adalah scaffold di git HEAD
    (`git show HEAD:ml/notebooks/02_data_sources.ipynb` -> "# 02 · Data sources (skeleton)" dan
    "Loaders in `pavana_ml.data.*` are **stubs**"), karena seluruh pekerjaan CP1–CP5 memang belum
    di-commit. CP5 menambahkan satu paragraf status loader yang benar ke notebook 02:
    firms/open_meteo punya implementasi dan parser teruji, `openaq.fetch_station_pm25` belum
    diimplementasikan dan tidak dipakai di jalur ini.
  - Alur berurutan dari kernel bersih (repo tidak ditulis; eksekusi ke /tmp/cp5-run, 0 error):
    01 demo fixture 4 sel (3 kode), 02 audit 34 sel (19 kode, 24.432 jam, interim 2e8505f0…4461),
    03 fitur 10 sel (6 kode, 24.432x55, eligible 24.378, tabel e210ca6a…ba16),
    04 eksperimen 11 sel (6 kode), 05 tetap gated dan mencetak "No evaluated model artifact".
    Seluruh sel kode+markdown pada salinan yang dieksekusi identik dengan berkas di repo, dan
    tidak ada notebook di repo yang menyimpan output (nbstripout --verify lulus).
  - Reproduksibilitas penuh: setelah direktori run dihapus, notebook 04 membangun ulang artifact
    dan metrics.csv, C/D/E model.txt, serta test_predictions.parquet tetap byte-identik dengan
    salinan CP3/CP4. Diff report.json hanya pada empat field yang memang bergerak:
    created_at_utc (08:15:01Z -> 09:52:21Z), data.table_built_at_utc, data.metadata_sha256
    (f75d9d59… -> ad4eea2c…), dan data.feature_module_sha256.pavana_ml.data.research
    (dbb1da15… -> 4d9b74ae…, yaitu berkas research.py yang berubah di CP4 saat parameter
    `include` ditambahkan; experiment.py dan lgbm.py tetap b88b75a8… dan 73ca1bdb…).
    `C/D/E/metadata.json` juga tidak byte-identik: masing-masing hanya berubah di `created_at`.
    Eksekusi kedua notebook 04 tidak mengubah hash report.json (tetap f0b4b945…), jadi run dibaca
    ulang lewat reuse dan tidak dibangun lagi.
  - Angka holdout dihitung ulang langsung dari test_predictions.parquet sebelum ditulis ke
    dokumentasi: 6.882 baris, selisih target-valid seragam 6 jam, MAE A 14,388942 / B 25,421927 /
    C 21,575856 / D 20,745541 / E 20,885664; RMSE A 28,377043 / B 47,094647 / C 43,476426 /
    D 42,257006 / E 42,449022; target max 430,3 dengan 533 jam >= 100 dan 1.358 jam >= 55,5;
    prediksi >= 55,5 hanya dari A (1.352 baris), B–E nol.
  - HF: bundle diperbarui ke PR #6 (bukan PR #5, bukan main) lewat lima komit, sampai head
    34309823…; PR tetap Open dan tidak di-merge. Pada head terakhir, 29 berkas
    manifest cocok byte dengan repo lokal, tidak ada berkas di luar code/, revisi terpin
    a9a0d6d9… masih resolve, dan bundle pada revisi terpin lolos verifikasi terhadap
    CODE_MANIFEST.json-nya sendiri. Deskripsi PR #6 diperbarui di Hub dan di DEFAULT_DESCRIPTION
    publisher; isinya menyatakan sesi Kaggle sudah dijalankan, Colab belum, dan angka holdout apa
    adanya. Tidak ada atribusi AI di mana pun (diperiksa pada teks yang live).
  - Temuan saat verifikasi: notebook 00 di dalam commit terpin masih versi pra-pin
    (`CODE_REF = "refs/pr/5"`, `CODE_REVISION = "PINNED_CODE_SHA"`, `RESOLVE_CODE_HEAD = True`),
    jadi menjalankan notebook dari commit terpin menunjuk `refs/pr/5` -> `aaa0d271…`, tempat `code/`
    tidak ada, sehingga gagal alih-alih memasang revisi lain (diperiksa: `code/` ada di a9a0d6d9… dan
    commit head, tidak ada di aaa0d271… maupun main). Salinan di head (dan di repo) memakai
    `RESOLVE_CODE_HEAD = False` dan pin `a9a0d6d9…`. Perilaku itu sudah tercatat di blok CP4;
    sekarang diperingatkan juga di ml/README.md dan code/README.md, dan kedua berkas itu ikut
    diunggah ke PR #6.
  - Gate: pytest ml/tests 129 lulus; ruff check ml 16 temuan, semuanya di
    notebooks/pavana_bmkg_kalimantan.ipynb (berkas pengguna, tidak disentuh); ruff format --check ml
    2 berkas lama di luar scope (huggingface/README.md, scripts/publish_hf_dataset.py);
    nbstripout --verify lulus; pnpm check 4 task lulus (run pertama datang dari cache turbo;
    `pnpm check --force` juga 4 task lulus tanpa cache).
  - Verifikasi independen oleh agen pemeriksa terpisah (read-only, di luar repo): seluruh angka
    metrik dihitung ulang dari test_predictions.parquet dan dari tabel model + batas split; hash
    artifact dan modul dicocokkan; klaim kode diperiksa (app tidak memakai ML, `is_app_ready`
    menolak target model, `openaq.fetch_station_pm25` NotImplementedError,
    `latest_evaluated_artifact()` None, layout dan skrip pnpm ada, override path cloud); gate
    diulang. Temuan yang sudah ditutup: klaim "29 berkas cocok byte" sempat ditulis untuk head yang
    lebih awal, klaim "stub hanya di README" tidak berlaku untuk scaffold di git HEAD (lihat di
    atas), kutipan output notebook 05 di ml/README.md kurang lengkap, dan `C/D/E/metadata.json`
    ikut berubah di `created_at`. Yang tidak dapat diverifikasi dari workspace ini: reproduksi
    Kaggle (tidak ada artifact Kaggle di disk; buktinya ada di blok CP4).
Pekerjaan belum selesai / alasan:
  - Colab belum pernah dijalankan; hanya Kaggle. Pernyataan itu ikut ditulis di deskripsi PR #6.
  - PR #6 masih Open; merge adalah keputusan `myudak`.
  - Notebook 05 belum diarahkan ke artifact bersarang C/D/E: itu memang disengaja (`latest_evaluated_artifact`
    hanya membaca `*/metadata.json`), dan SHAP baru relevan setelah ada artifact bertarget observasi.
  - Reuse masih membandingkan num_threads, jadi artifact cloud tidak bisa di-reuse di mesin dengan
    jumlah core berbeda; pakai RUN_VERSION baru.
  - Cache hotspot tetap belum diverifikasi ulang terhadap batch mentah FIRMS; catatan CP1 berlaku.
  - report.json dan model_table.metadata.json mengandung waktu build, jadi hash keduanya berubah
    setiap kali dibangun ulang meski isi risetnya sama. Yang stabil dan bisa dibandingkan adalah
    model_table.parquet, metrics.csv, C/D/E model.txt dan test_predictions.parquet.
  - Sesi ini tidak menjalankan `ruff format` (hanya `--check`) dan tidak menyentuh berkas pengguna.
Langkah berikutnya: tidak ada checkpoint tersisa di rencana ini. Pekerjaan lanjutan yang nyata:
kumpulkan arsip PM2.5 observasi (jalur produk) atau jalankan baseline issue-time setelah ada
snapshot ber-`issued_at`; lalu perbarui notebook 05 saat artifact bertarget observasi sudah ada.
```

**Perbaikan loader FIRMS pasca-tinjauan (15 Oktober 2026).** Dua temuan P1 dari tinjauan eksternal
direproduksi lebih dulu pada kode saat itu — keduanya **tereproduksi** — lalu ditutup di
`ml/src/pavana_ml/data/firms.py`. Tidak ada angka riset, tabel, atau artifact yang berubah:
`fetch_range` hanya dipakai untuk menarik batch baru, sedangkan pipeline eksperimen membaca cache
parquet yang sudah ada.

1. **Kegagalan unduhan menjadi data kosong/parsial.** `fetch_range` mencoba 6 kali per jendela 5 hari
   lalu diam-diam lanjut ke tanggal berikutnya. Enam `ConnectionError` mengembalikan DataFrame kosong,
   dan kegagalan pada batch kedua mengembalikan rentang parsial tanpa sinyal apa pun — persis
   pembacaan "tidak ada deteksi" yang dilarang aturan hotspot. Sekarang jendela yang habis percobaan
   **melempar `FirmsFetchError`** yang menyebut sumber dan rentang tanggalnya (`for ... else`), jadi
   tidak ada hasil parsial yang bisa disalahartikan. Jendela kosong (`start > end`, mis. arsip SP sudah
   mencapai hari ini) tetap mengembalikan frame kosong tanpa error, dan respons kosong yang sah tetap
   bukan error. `open_meteo._get` sudah berperilaku begini, jadi FIRMS adalah pengecualiannya.
2. **Normalisasi ganda SP–NRT.** `combine_hotspots` men-tidy hasil `pd.concat`, sehingga batch SP yang
   sudah tidy menyumbang `lat`/`lon` sementara respons NRT mentah menyumbang `latitude`/`longitude`;
   rename lalu membuat kolom `lat` duplikat dan `stitch_streams` gagal dengan
   `TypeError: arg must be a list, tuple, 1-d array, or Series`. Sekarang `combine_hotspots`
   men-normalisasi **tiap frame sekali** sebelum concat, dan `tidy_hotspots` tidak lagi membelah
   `confidence` bila kolomnya memang tidak ada (idempoten untuk frame yang sudah tidy).

Bukti reproduksi sebelum perbaikan (skrip di `/tmp`, bukan bagian repo):

| Skenario | Kode lama | Kode sekarang |
| --- | --- | --- |
| Enam `ConnectionError` untuk satu jendela | `DataFrame(0, 2)`, tanpa error | `FirmsFetchError`, menyebut `2024-01-01..2024-01-03` |
| Batch ke-2 gagal, batch ke-1 berhasil | 1 baris dikembalikan sebagai rentang 7 hari | `FirmsFetchError`, menyebut `2024-01-06..2024-01-07` |
| `combine_hotspots(sp_tidy, nrt_raw)` | `TypeError` | 2 baris, tanpa kolom duplikat |
| `stitch_streams(...)` (firms.py:290) | `TypeError` | 2 baris, `MODIS_SP` + `VIIRS_SNPP_NRT` |

Tes: `ml/tests/test_data_loaders.py` 11 → **18 tes** (7 regresi baru: exception saat semua percobaan
habis, kegagalan batch kedua tidak mengembalikan rentang parsial, transaction limit yang tidak pernah
pulih, jendela kosong bukan kegagalan, `tidy_hotspots` idempoten, `combine_hotspots` menerima frame
tidy di samping frame mentah, `stitch_streams` menormalisasi tiap stream sekali).
`pytest ml/tests` 129 → **136 lulus**.

Gate setelah perbaikan: `ruff check ml` 16 temuan, semuanya di
`notebooks/pavana_bmkg_kalimantan.ipynb` (berkas pengguna); `ruff format --check ml` 2 berkas lama di
luar scope (`huggingface/README.md`, `scripts/publish_hf_dataset.py`), sedangkan `firms.py` dan
`test_data_loaders.py` lulus; `nbstripout --verify` lulus; `git diff --check` lulus; `pnpm check`
4 task lulus. `prettier --check .` semula menandai 3 berkas Markdown; `README.md` (root) diperbaiki
karena suntingan CP5 membuat tabelnya tidak rapi, sehingga tersisa 2 berkas **milik pengguna**
(`docs/data-sources.md`, `docs/PAVANA_Konsep_Produk.md`) yang sengaja tidak diformat massal.

Belum ditutup: bundle kode HF di PR #6 (head `34309823…`) kini **menyimpang** dari repo untuk
`code/ml/src/pavana_ml/data/firms.py`; unggahan ulang belum dilakukan.

**Commit dan PR (15 Oktober 2026).** Pekerjaan CP0–CP5 beserta perbaikan loader di-commit di cabang
`ml/cams-t6h-retro-pipeline` (basis `origin/main` `d7323c5`) sebagai tiga commit terpisah —
pipeline, tooling cloud/publikasi, lalu dokumentasi — dan dibuka sebagai
<https://github.com/myudak/pavana/pull/1> (32 berkas, +9.586/−244, belum di-merge). CI pada commit
tersebut lulus seluruhnya: JS/TS (lint, typecheck, test, build) 45 detik dan Python ML (ruff,
pytest, nbstripout) 20 detik, plus dua deployment Vercel *preview*.

Dua berkas yang sebelumnya "di luar scope" ikut diformat karena ikut dikirim dan CI memeriksanya —
`ml/huggingface/README.md` dan `ml/scripts/publish_hf_dataset.py` (`ruff format`), serta
`docs/data-sources.md` dan `README.md` (prettier). Tidak ada lagi temuan ruff/format pada berkas yang
di-commit; 16 temuan ruff yang tersisa berasal dari `ml/notebooks/pavana_bmkg_kalimantan.ipynb` yang
**tidak** ikut dikirim.

Sengaja tidak di-commit (pekerjaan pengguna, bukan bagian pipeline ML):
`ml/notebooks/pavana_bmkg_kalimantan.ipynb`, `docs/PAVANA_Konsep_Produk.{md,pdf}`,
`ml/Pavana-Pembagian-Kerja.{md,pdf}`, dan perubahan `docs/PAVANA_HANDOFF.md`. Berkas-berkas itu tetap
ada di working tree, belum tersentuh.

### Checkpoint saat dokumen dibuat

Bagian di bawah adalah potret kondisi **saat dokumen ini pertama ditulis**; status terkini ada pada
checklist dan blok CP0–CP5 di atas.

- Publikasi data/README: **tersedia di PR #5**, belum di `main`.
- Kode `research.py`, `model_table.py`, override paths: **draft, belum tervalidasi**.
- Notebook `02–04`: **masih scaffold**; notebook cloud dan modul eksperimen belum ada.
- Delegasi notebook: **dihentikan**, exit 130; bukan kegagalan yang harus diretry otomatis.
- Hasil gate terakhir untuk checkpoint ini dicatat di bawah setelah pemeriksaan dokumen.

Pemeriksaan pada 15 Oktober 2026, setelah implementasi dihentikan (**sebelum** CP0/CP1 di atas;
baris ruff dan pytest sudah tidak berlaku lagi):

| Perintah / pemeriksaan | Hasil |
| --- | --- |
| `uv run --extra hub ruff check . --output-format=json` dari `ml/` | Gagal: 17 temuan; 16 pada notebook BMKG existing, 1 pada draft `data/research.py` |
| `uv run --extra hub ruff format --check .` dari `ml/` | Gagal: 4 berkas membutuhkan format; tidak diubah otomatis |
| `uv run --extra hub pytest` dari `ml/` | **30 tes existing lulus**; belum ada cakupan untuk draft pipeline baru |
| `uv run --extra hub nbstripout --verify notebooks/*.ipynb` dari `ml/` | Lulus; output notebook tersimpan tetap kosong |
| `pnpm check` | Terhenti: `turbo` tidak ditemukan, `node_modules` belum terpasang |
| `git diff --check` | Lulus |
| Struktur dokumen rencana | CP0–CP5 tersedia, blok kode berpasangan, status kode parsial dicatat |

Hasil tes existing bukan bukti bahwa draft pipeline sudah benar. Mulai sesi berikutnya dari
review CP0/CP1; rapikan draft dan tutup kekurangan tes yang disebut dalam rencana sebelum
menandai preprocessing atau feature engineering selesai. Deskripsi PR #5 sudah diselaraskan
dengan status ini: data/README terunggah, notebook/bundle training belum selesai dan belum diunggah.

Format update untuk setiap sesi berikutnya:

```text
Tanggal:
Checkpoint yang dikerjakan:
Berkas yang berubah:
Revisi data/kode dan hash artifact:
Perintah yang benar-benar dijalankan:
Hasil dan bukti:
Pekerjaan belum selesai / alasan:
Langkah berikutnya:
```

Prompt resume yang dapat langsung dipakai:

> Baca ml/PLAN.md, AGENTS.md root dan ml/AGENTS.md. **CP0–CP5 sudah selesai; tidak ada checkpoint
> yang tersisa di rencana ini.** Eksperimen memakai snapshot data
> `aaa0d2714102b7d3a7b3ad0beb2b1da1ce6a6dbe` dan revisi kode
> `a9a0d6d98008e08e80d6e978d82cfc89f79282af` (PR HF #6, head `34309823…` — jangan di-merge).
> Untuk mengulang alur dari nol: notebook `02 → 03 → 04` dari kernel bersih secara berurutan, atau
> `00_cloud_setup.ipynb` di Colab/Kaggle; jalankan gate pada bagian 5 sebelum menutup pekerjaan dan
> strip output notebook. Yang belum tertutup: Colab belum pernah dijalankan (Kaggle sudah), notebook
> 05 menunggu artifact bertarget observasi, cache hotspot belum diverifikasi ulang terhadap batch
> mentah FIRMS, dan arsip PM2.5 observasi masih menjadi penghalang jalur produk. Jangan menimpa
> perubahan pengguna, jangan merge PR HF #6, dan jangan mengubah definisi target observasi di
> `docs/modeling-methodology.md`. Update bukti serta status checkpoint di PLAN.md.
