# Kerangka pitch Pavana (materi teks — bukan deck final)

> Disimpan sebagai teks karena belum ada aset deck di repository. Jangan membuat file `.pptx`
> palsu. Kerangka ini mengikuti kriteria E3 di `docs/PRD.md`: masalah, solusi, demo, inovasi
> (indikator upwind/ML), batasan, dampak — **tanpa klaim yang tidak dapat dibuktikan**.
> Fakta produk merujuk `docs/PAVANA_HANDOFF.md` dan `docs/modeling-methodology.md`.

## 1. Masalah

- Warga di sekitar hutan dan lahan gambut (contoh: Kubu Raya, Kalimantan Barat) kesulitan
  memantau titik panas lebih awal; informasi saat bencana sering terlambat dan tersebar di
  banyak situs lembaga (BMKG, SiPongi, BNPB, BPBD).
- Orang tidak ingin menafsirkan ratusan titik hotspot atau indeks teknis — mereka ingin tahu
  apakah **asap mungkin memengaruhi daerahnya** dan apa yang perlu diperhatikan.

## 2. Solusi

- **Pavana: aplikasi cuaca untuk kesadaran asap kebakaran di Indonesia.** Menerjemahkan sinyal
  satelit dan atmosfer yang tersebar menjadi wawasan kualitas udara yang jelas, berbasis lokasi,
  dan mudah dipahami dalam ±10 detik.
- Empat layar: **Hari Ini** (kondisi + tren 24 jam), **Peta** (titik panas + angin),
  **Insight** (faktor + metodologi terbuka), **Info** (tautan resmi + tentang).
- Setiap angka membawa provenance: sumber, jenis data (pengamatan/prakiraan/turunan/demo),
  dan waktu berlaku. Data kosong tampil sebagai "tidak diketahui" — tidak pernah hijau palsu.

## 3. Demo (ikuti `docs/demo-script.md`)

- Skenario berlabel Sungai Raya, Kubu Raya → Hari Ini → Peta (klik titik panas: waktu deteksi)
  → Insight (grafik + "Bagaimana ini dihitung?") → Info (tautan resmi).
- Tekankan banner "Mode Demo · Data ilustratif" bila memakai fixture.

## 4. Inovasi: indikator upwind + ML eksperimental

- **Indikator paparan upwind** (`docs/modeling-methodology.md`):
  `S(x,t) = Σ FRP · exp(-d/λ) · max(0, ŵ_to · ĥ) · exp(-umur/τ)` (λ = 50 km, τ = 24 jam,
  maks 300 km). Proxy fitur/pendukung — **bukan** probabilitas atau prediksi waktu tiba asap.
- **Pertanyaan riset ML:** apakah fitur sadar-angin memperbaiki prediksi PM2.5 t+6 jam dibanding
  persistence dan baseline CAMS? Desain ablasi A–E, split temporal, metrik MAE/RMSE.
- **Status ML, 16 Oktober 2026:** enam booster untuk hotspot, haze, estimasi CAMS PM2.5 dan
  angin stasiun sudah dilatih dan dievaluasi pada holdout temporal. SHAP menjelaskan output
  model. PM2.5 kalah dari persistence; hasil tetap ditampilkan sebagai eksperimen.
  [Handoff ML live](ML_LIVE_HANDOFF.md) memuat metrik, sumber, dan batas penerapannya.

## 5. Batasan (wajib disampaikan ke juri)

- Data provider mengikuti konektor yang tersedia dan label sumbernya. Mode demo memakai fixture;
  kartu ML menandai input langsung atau replay arsip nyata secara terpisah.
- Titik panas = deteksi satelit, bukan kebakaran terkonfirmasi; ketiadaan deteksi ≠ tidak ada api.
- PM2.5 berasal dari banyak sumber; kenaikan tidak otomatis disebabkan kebakaran tertentu.
- Pavana **bukan** aplikasi pertama soal kebakaran di Indonesia dan tidak mengklaim demikian.
- Bukan sumber peringatan resmi; tidak memprediksi penyebaran api; tidak memberi perintah evakuasi.
- ISPU Indonesia belum ditampilkan (breakpoint belum terverifikasi — lihat `docs/ispu-verification.md`).

## 6. Dampak

- **Kecepatan pemahaman:** satu jawaban lokasi-spesifik menggantikan navigasi multi-situs lembaga.
- **Kepercayaan:** keterbatasan dikomunikasikan eksplisit (data lama, data tidak cukup, demo).
- **Kesiapan komunitas:** mengarahkan ke informasi resmi BMKG/BPBD setempat saat kondisi memburuk.
- **Jalur teknis:** fondasi jujur untuk evaluasi ML yang kredibel bila data stasiun Kalbar memadai.

## Kebutuhan deck final (blocker, di luar repo)

- Keputusan template visual deck + siapa yang memegang file master.
- Tangkapan layar aplikasi asli 375 px & 1280 px (terang/gelap) setelah Track B selesai.
- Tanggal deadline submit & demo JOINTS 2026 (lihat PRD §11 — belum terisi).
