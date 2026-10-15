---
license: other
language:
  - id
pretty_name: "Pavana — Titik Panas & Kualitas Udara Kalimantan (2024–2026)"
task_categories:
  - tabular-regression
  - time-series-forecasting
size_categories:
  - "1M<n<10M"
configs:
  - config_name: default
    data_files:
      - split: cams
        path: raw/open_meteo/cams_kubu_raya_sungai_raya_2024-01-01_2026-10-14.parquet
  - config_name: cams
    data_files:
      - split: cams
        path: raw/open_meteo/cams_kubu_raya_sungai_raya_2024-01-01_2026-10-14.parquet
  - config_name: weather
    data_files:
      - split: weather
        path: raw/open_meteo/weather_kubu_raya_sungai_raya_2024-01-01_2026-10-14.parquet
  - config_name: hotspots
    data_files:
      - split: hotspots
        path: processed/hotspot_kalimantan.parquet
  - config_name: bmkg_pm25
    data_files:
      - split: bmkg_pm25
        path: pm25/pm25_observasi_kalimantan.parquet
  - config_name: bmkg_weather
    data_files:
      - split: bmkg_weather
        path: prakiraan/prakiraan_cuaca_kalimantan.parquet
---

# Pavana — Titik Panas & Kualitas Udara Kalimantan (2024–2026)

Dataset pendamping riset offline **Pavana** tentang angin, titik panas, dan PM2.5 di Kalimantan. Isinya
gabungan lima tabel yang **berbeda jenis dan berbeda cakupan**, disajikan sebagai konfigurasi
terpisah — bukan satu tabel gabungan. Semua cap waktu kanonik dalam **UTC**.

Nama split (`cams`, `weather`, `hotspots`, `bmkg_pm25`, `bmkg_weather`) hanya penanda wadah agar
tiap berkas tidak tercampur. Tidak ada arti *train/eval/test* di dalamnya.

## Jenis data dan batas penggunaan

- **Titik panas adalah deteksi satelit, bukan kebakaran terkonfirmasi.** Satu kebakaran dapat
  menghasilkan banyak deteksi; tidak adanya deteksi **bukan** bukti tidak ada kebakaran.
- **Nilai CAMS adalah keluaran model, bukan observasi.** Kolom `pm25_ug_m3` dan `pm10_ug_m3`
  berasal dari medan model CAMS global, bukan pengukuran stasiun.
- **`weather` dan `cams` hanya mencakup satu sel grid**, bukan seluruh Kalimantan. Koordinat yang
  diminta (anchor Sungai Raya, Kubu Raya: `-0.0710660252, 109.3712469865`) **bukan** koordinat
  yang dikembalikan; kedua berkas menyimpan koordinat sel grid hasil layanan apa adanya.
- **Snapshot ini belum memiliki arsip PM2.5 observasi yang memadai.** Konfigurasi `bmkg_pm25` hanya snapshot
  ~21 jam dari 9 stasiun; itu tidak cukup untuk validasi stasiun jangka panjang.
- **Tidak ada metrik model di sini.** Dataset ini tidak menyertakan MAE/RMSE, skor, atau klaim
  kinerja apa pun. Tidak ada model terlatih yang diterbitkan bersama dataset ini.
- **Bukan prakiraan operasional.** `bmkg_weather` adalah snapshot prakiraan yang diambil sekali;
  jangan dipakai sebagai peringatan resmi. Ikuti kanal resmi BMKG.
- Pipeline Pavana saat ini menggunakan **eksperimen retrospektif bertarget CAMS**.
  Evaluasinya mengukur prediksi medan model CAMS; validasi terhadap observasi stasiun
  membutuhkan arsip pengukuran tambahan.
- Notebook `ml/notebooks/01_explore_demo_fixture.ipynb` di repositori kode adalah **demo** yang
  bekerja pada fixture sintetis, **bukan** pelatihan model dan bukan analisis dataset ini.

## Inventaris berkas

| Konfigurasi | Berkas | Baris | Kolom | Rentang waktu (UTC) | Cakupan ruang |
| --- | --- | ---: | ---: | --- | --- |
| `default`, `cams` | `raw/open_meteo/cams_kubu_raya_sungai_raya_2024-01-01_2026-10-14.parquet` | 24.432 | 5 | 2024-01-01 00:00 → 2026-10-14 23:00 (per jam) | 1 sel CAMS 0,4°: `-0.09999847, 109.399994` |
| `weather` | `raw/open_meteo/weather_kubu_raya_sungai_raya_2024-01-01_2026-10-14.parquet` | 24.432 | 12 | 2024-01-01 00:00 → 2026-10-14 23:00 (per jam) | 1 sel ERA5: `-0.10544816, 109.36087` |
| `hotspots` | `processed/hotspot_kalimantan.parquet` | 1.156.755 | 21 | 2024-01-01 → 2026-10-14 (`acq_date`) | banyak titik di bbox Kalimantan: lat −4,37116…4,49972; lon 108,0…119,49994 |
| `bmkg_pm25` | `pm25/pm25_observasi_kalimantan.parquet` | 189 | 15 | 2026-10-13 17:00 → 2026-10-14 13:00 (21 jam) | 9 stasiun BMKG |
| `bmkg_weather` | `prakiraan/prakiraan_cuaca_kalimantan.parquet` | 204 | 32 | valid 2026-10-14 15:00 → 2026-10-16 15:00 | 12 `adm4` |

Total 1.206.012 baris.

Berkas pendamping di repositori ini:

- `raw/firms/*.csv` — 5 batch mentah FIRMS dengan nama berkas asli
  (`firms_sp_kalimantan_2024-01-01_2026-07-31.csv`,
  `firms_raw_MODIS_NRT_2026-08-01_2026-10-14.csv`,
  `firms_raw_VIIRS_SNPP_NRT_2026-07-01_2026-10-14.csv`,
  `firms_raw_VIIRS_NOAA20_NRT_2026-07-01_2026-10-14.csv`,
  `firms_raw_VIIRS_NOAA21_NRT_2026-07-01_2026-10-14.csv`).
- `prakiraan/raw/*.json` — respons JSON mentah BMKG untuk 12 `adm4`.
- Berkas iklim bulanan BMKG Data Online (XLSX/PDF) yang sudah ada di repositori tetap
  dipertahankan; parameter iklim saja, tanpa PM2.5.

`manifest.json` di akar repositori memuat SHA256 tiap berkas, jumlah baris, dan rentang waktunya.
**Kartu ini sengaja tidak mencantumkan nilai hash mana pun** — verifikasi selalu terhadap
`manifest.json` pada revisi yang Anda unduh, jangan terhadap angka di kartu ini.

## Memuat data

```python
from huggingface_hub import hf_hub_download
import pandas as pd

REPO_ID = "myudak/pavana"
REVISION = "<revisi>"  # isi commit hash atau tag; jangan "main" bila butuh reproducible

cams_path = hf_hub_download(
    repo_id=REPO_ID,
    filename="raw/open_meteo/cams_kubu_raya_sungai_raya_2024-01-01_2026-10-14.parquet",
    repo_type="dataset",
    revision=REVISION,
)
cams = pd.read_parquet(cams_path)
print(cams.dtypes)
print(cams["valid_at"].min(), cams["valid_at"].max())

# untuk reproduksibilitas, cocokkan berkas dengan manifest pada revisi yang sama
manifest_path = hf_hub_download(
    repo_id=REPO_ID, filename="manifest.json", repo_type="dataset", revision=REVISION
)
```

Padanan `datasets`: `load_dataset(REPO_ID, "cams", split="cams")` (ganti nama konfigurasi sesuai
tabel di atas). Untuk konfigurasi `hotspots` dan `bmkg_pm25`/`bmkg_weather`, jangan menggabungkan
tabel — kunci waktunya berbeda dan cakupan ruangnya berbeda.

## Skema dan arti kolom

### `cams` — model CAMS, per jam, UTC

| Kolom | Satuan | Catatan |
| --- | --- | --- |
| `valid_at` | waktu UTC | cap waktu valid, per jam |
| `pm25_ug_m3` | µg/m³ | **keluaran model CAMS**, bukan observasi; 24.432/24.432 terisi |
| `pm10_ug_m3` | µg/m³ | **keluaran model CAMS**, bukan observasi |
| `lat`, `lon` | derajat | sel grid CAMS 0,4° yang dikembalikan layanan: `-0.09999847, 109.399994` |

**Tidak ada kolom `issued_at` dalam snapshot ini.** Baseline prakiraan yang diterbitkan pada
waktu tertentu tidak dapat direkonstruksi dari berkas ini. Jangan memasukkan CAMS pada t+6
sebagai fitur ketika nilai yang sama menjadi target. ERA5 dan CAMS di sini digunakan secara
retrospektif; ketersediaannya pada waktu prediksi operasional belum dibuktikan.

### `weather` — ERA5 reanalysis, per jam, UTC

| Kolom | Satuan | Catatan |
| --- | --- | --- |
| `valid_at` | waktu UTC | per jam, 24.432 baris |
| `temperature_c` | °C | suhu 2 m |
| `rh_pct` | % | kelembapan relatif |
| `precip_mm` | mm | total per jam |
| `wind_speed_ms`, `wind_gusts_ms` | m/s | angin 10 m |
| `wind_dir_from_deg` | derajat | arah **dari** (meteorologis), bukan arah menuju |
| `surface_pressure_hpa` | hPa | tekanan permukaan |
| `boundary_layer_height_m` | m | **4.368 dari 24.432 jam kosong** |
| `shortwave_radiation_wm2` | W/m² | radiasi gelombang pendek |
| `lat`, `lon` | derajat | sel ERA5 yang dikembalikan: `-0.10544816, 109.36087` |

ERA5 adalah **reanalysis**: keluaran model asimilasi, bukan pembacaan stasiun.

### `hotspots` — deteksi FIRMS (MODIS + VIIRS)

| Kolom | Satuan | Catatan |
| --- | --- | --- |
| `lat`, `lon` | derajat | titik pusat piksel deteksi |
| `acq_date` | tanggal UTC | `YYYY-MM-DD` |
| `acq_time` | HHMM UTC | bilangan bulat, mis. `214` = 02:14 |
| `acquired_at` | waktu UTC | gabungan tanggal + jam akuisisi |
| `satellite`, `instrument` | — | MODIS atau VIIRS (SNPP/NOAA-20/NOAA-21) |
| `version` | — | `61.03`/`6.1NRT` (MODIS), `2.0`/`2.0NRT` (VIIRS) |
| `processing` | — | `SP` (arsip) atau `NRT` (hampir waktu-nyata) |
| `brightness` | K | MODIS kanal 21/22 (~4 µm); kosong untuk VIIRS |
| `bright_t31_k` | K | MODIS kanal 31 (~11 µm); kosong untuk VIIRS |
| `bright_ti4_k`, `bright_ti5_k` | K | VIIRS I4 (~3,74 µm) dan I5 (~11,45 µm); kosong untuk MODIS |
| `scan`, `track` | km | ukuran piksel |
| `frp_mw` | MW | daya radiasi api (*fire radiative power*) |
| `daynight` | — | `D` atau `N` |
| `type` | kode | MODIS saja: `0` diduga kebakaran vegetasi, `2` sumber statis lain di darat, `3` lepas pantai; kosong untuk VIIRS |
| `confidence_pct` | % | MODIS saja; kosong untuk VIIRS |
| `confidence_class` | `l`/`n`/`h` | VIIRS saja; kosong untuk MODIS |
| `source_sensor` | — | mis. `VIIRS_NOAA20_NRT`, `MODIS_SP` |

Dua skala keyakinan (`confidence_pct` vs `confidence_class`) **sengaja tidak digabung** karena
satuannya berbeda. Baris `SP` dan `NRT` memuat deteksi yang sama dengan `acq_time` berbeda ~1
menit; pipeline menandai asalnya lewat `processing` dan memilih `SP` bila keduanya ada, sehingga
jumlah baris tidak boleh dijumlahkan mentah-mentah. Jendela `NRT` masih hidup: jumlah baris
beberapa hari terakhir tidak reproducible, yang reproducible adalah batch mentah di `raw/firms/`.

### `bmkg_pm25` — snapshot PM2.5 stasiun BMKG

| Kolom | Satuan | Catatan |
| --- | --- | --- |
| `stasiun_id`, `stasiun` | — | 9 stasiun: Banjarbaru, Kotabaru, Kubu Raya, Mempawah, Palangkaraya, Pangkalanbun, Samarinda, Sintang, Tanjung Harapan |
| `lat`, `lon` | derajat | lokasi stasiun versi BMKG |
| `tanggal`, `jam_sumber`, `zona_sumber` | — | waktu sumber di zona `WIB`, jam `0`–`20` |
| `valid_at_utc` | waktu UTC | hasil konversi ke UTC; rentang 21 jam |
| `pm25_ug_m3` | µg/m³ | **observasi stasiun**; 4 dari 189 nilai kosong |
| `kondisi_terkini` | teks | label kategori versi BMKG, ditampilkan apa adanya. Kartu ini **tidak** menghitung AQI |
| `provider`, `dataset`, `fetched_at_utc`, `sumber_url` | — | metadata penarikan per baris |
| `is_demo` | bool | `false` untuk semua baris; fixture sintetis aplikasi tidak disertakan |

Snapshot lokal ini hanya menyimpan satu hari tampilan BMKG. Belum ada backfill observasi
historis di dalam paket; pengumpulan maju atau permintaan arsip resmi menjadi pekerjaan terpisah.

### `bmkg_weather` — snapshot prakiraan BMKG

| Kolom | Satuan | Catatan |
| --- | --- | --- |
| `adm4` | kode wilayah | 12 wilayah, satu baris per waktu prakiraan |
| `provinsi`, `kotkab`, `kecamatan`, `desa` | — | nama wilayah |
| `lat`, `lon` | derajat | koordinat wilayah dari BMKG |
| `timezone` | — | `+0700` (WIB) atau `+0800` (WITA); pertahankan sebagai teks |
| `analysis_date` | waktu | **waktu terbit** prakiraan, `2026-10-14T12:00:00`, satu nilai |
| `fetched_at_utc` | waktu UTC | kapan data ditarik (`2026-10-14T15:02Z`), berbeda dari waktu terbit |
| `valid_at_utc`, `utc_datetime`, `local_datetime` | waktu | waktu valid; `local_datetime` di zona wilayah |
| `suhu_c`, `kelembapan_pct`, `tutup_awan_pct`, `hujan_mm`, `angin_kmh`, `angin_ms`, `jarak_pandang` | °C, %, %, mm, km/j, m/s, km | `jarak_pandang` dan `jarak_pandang_text` **kosong seluruhnya (204/204)** |
| `cuaca`, `cuaca_en` | teks | deskripsi cuaca BMKG (Indonesia dan Inggris) |
| `angin_dari_deg`, `angin_dari_arah` | derajat/teks | arah **dari** (meteorologis) |
| `angin_ke_deg`, `angin_ke_arah` | derajat/teks | arah **menuju** |
| `provider`, `dataset`, `sumber_url`, `is_demo` | — | provenance; `is_demo` `false` |

### Berkas lama (warisan, di luar pipeline saat ini)

`data_kualitas_udara.csv` di akar repositori adalah keluaran **model CAMS** dengan cap waktu
**WIB** dan tanpa provenance eksplisit. Berkas itu dipertahankan agar tautan lama tidak putus,
tetapi **jangan dipakai untuk analisis baru** — gunakan konfigurasi `cams` yang sudah UTC. Selain
itu `hotspot*_2024_terbaru.csv` dan CSV MODIS/VIIRS per-sensor juga masih ada untuk kompatibilitas
dan sudah tidak dipakai pipeline.

## Waktu: terbit vs. tarik vs. valid

- Semua `valid_at`/`acquired_at`/`valid_at_utc`/`fetched_at_utc` dalam **UTC**.
- `analysis_date` = waktu **terbit** prakiraan BMKG; `fetched_at_utc` = waktu **penarikan**.
  Keduanya bisa berbeda beberapa jam dan jangan saling menggantikan.
- `bmkg_pm25` menyimpan waktu sumber dalam **WIB** (`zona_sumber`, `jam_sumber`) di samping
  konversi UTC. Jangan mencampur keduanya dalam satu join.
- `cams` tidak punya waktu terbit sama sekali (lihat bagian `cams`).

## Nilai hilang

Nilai kosong dibiarkan `null`/`NaN` dan **tidak pernah diisi `0`**. Rincian yang diketahui:

- `weather.boundary_layer_height_m`: 4.368 dari 24.432 jam kosong. Celah ini nyata; jangan
  diinterpolasi diam-diam.
- `hotspots.confidence_pct` kosong untuk semua baris VIIRS, `hotspots.confidence_class` kosong
  untuk semua baris MODIS; kolom MODIS/VIIRS lainnya juga kosong secara bergantian.
- `bmkg_pm25.pm25_ug_m3`: 4 dari 189 kosong. Jangan memperlakukan stasiun tanpa nilai sebagai
  udara bersih.
- `bmkg_weather.jarak_pandang` dan `jarak_pandang_text`: kosong 204/204.

## Provenance dan atribusi

| Sumber | Dipakai untuk | Atribusi |
| --- | --- | --- |
| BMKG | `bmkg_pm25`, `bmkg_weather`, berkas iklim Data Online | Sumber: **Badan Meteorologi, Klimatologi, dan Geofisika (BMKG)** — <https://www.bmkg.go.id/> dan <https://data.bmkg.go.id/>. Rujuk syarat dan ketentuan BMKG untuk pemakaian ulang; kartu ini tidak menambahkan izin apa pun. |
| NASA FIRMS | `hotspots`, `raw/firms/*.csv` | Sumber: **NASA FIRMS** — <https://firms.modaps.eosdis.nasa.gov/>. Sertakan atribusi FIRMS/NASA pada turunan yang dipublikasikan. |
| Open-Meteo | `weather`, `cams` | Sumber: **Open-Meteo** — <https://open-meteo.com/>, dokumen <https://open-meteo.com/en/docs> dan <https://open-meteo.com/en/docs/air-quality-api>; ketentuan pemakaian di <https://open-meteo.com/en/terms>. |
| CAMS / ECMWF | nilai PM2.5 dan PM10 di konfigurasi `cams` | Medan model **Copernicus Atmosphere Monitoring Service (CAMS)** yang dilayani Open-Meteo — <https://atmosphere.copernicus.eu/> dan <https://www.ecmwf.int/>. Periksa ketentuan lisensi Copernicus/ECMWF yang berlaku. |

`license: other` dipakai justru karena **tidak ada satu lisensi tunggal** untuk dataset ini.
Kartu ini tidak melisensikan ulang data pihak ketiga dan tidak menggabungkan ketentuan mereka
menjadi satu. Setiap konfigurasi tunduk pada ketentuan penyedia asalnya masing-masing; bila
ketentuan itu tidak Anda setujui, jangan pakai konfigurasi tersebut. Untuk bagian yang disusun
oleh tim Pavana (pemilihan, pembersihan, penamaan kolom, penyelarasan UTC), atribusi ke sumber asal
tetap wajib disertakan.

## Rentang waktu dan keterbatasan yang harus disebut di turunan

1. `cams` dan `weather` hanya satu sel grid untuk satu titik di Kubu Raya — jangan digeneralisasi
   ke seluruh Kalimantan, dan jangan dipasangkan seolah mewakili setiap titik panas.
2. `bmkg_pm25` hanya ~21 jam: cukup untuk pemeriksaan silang, tidak cukup untuk validasi model.
3. `hotspots` mencampur MODIS dan VIIRS dengan skala keyakinan berbeda; agregasi harus memilih
   satu sensor atau mempertahankan `confidence_pct`/`confidence_class` secara terpisah.
4. Tidak adanya deteksi pada suatu jam bukan bukti tidak ada kebakaran.
5. Setiap turunan yang memakai CAMS sebagai target harus menyatakannya sebagai **eksperimen
   retrospektif bertarget CAMS**, bukan validasi stasiun dan bukan prakiraan operasional.

## Sitasi

- BMKG — <https://www.bmkg.go.id/> ; data terbuka: <https://data.bmkg.go.id/>
- NASA FIRMS — <https://firms.modaps.eosdis.nasa.gov/>
- Open-Meteo (dokumentasi cuaca dan kualitas udara) — <https://open-meteo.com/en/docs> ,
  <https://open-meteo.com/en/docs/air-quality-api>
- CAMS / ECMWF — <https://atmosphere.copernicus.eu/> , <https://www.ecmwf.int/>

Sertakan atribusi per sumber sesuai tabel di atas; jangan menggantinya dengan satu lisensi
tunggal.
