# Pavana — Pembagian Kerja dan Task Plan

> Sumber: Dokumen *Pavana — Pembagian Kerja*, 14 Oktober 2026. Dokumen sumber berisi pembagian track dan daftar pekerjaan, bukan PRD produk formal.

## 1. Status Proyek

Scaffold sudah berjalan end-to-end dengan data demo. Sisa pekerjaan dibagi ke enam track yang dapat berjalan paralel.

Jalur kritis:
- Data live Open-Meteo (A1–A2).
- Data PM2.5 nyata untuk ML (D1).
- Demo dan pitch (E2–E3).

Kerjakan F1 (menjadikan branch scaffold sebagai `main`) paling awal.

## 2. Pembagian Tim yang Disarankan

Saran untuk tim beranggotakan 4 orang. Jika ada 5 orang, Track E dapat dipegang orang tersendiri. Isi PIC setiap task dengan nama anggota yang mengambil tugas; kolom PIC pada dokumen sumber masih kosong.

| Peran | Track | Fokus utama | Skill yang cocok |
|---|---|---|---|
| Backend / Data | A, F | Mengganti data demo dengan data live dan deploy API | TypeScript, Node, membaca dokumentasi API |
| Frontend | B | Memoles empat layar aplikasi, peta, dan state data | React, Tailwind, MapLibre |
| ML / Data Science | D | Data PM2.5 nyata, baseline, LightGBM | Python, pandas, Jupyter |
| Design & Pitch | C, E | Logo final, landing page, konten, deck, video demo | Figma, copywriting, presentasi |

## 3. Aturan Kerja

- Satu task = satu branch (contoh: `feat/api-open-meteo`) = satu PR kecil.
- Sebelum membuat PR, `pnpm check` harus berhasil. Untuk ML, jalankan `pnpm ml:test`. CI akan memeriksa kembali.
- Jika mengubah bentuk data API, mulai dari `packages/shared/src/schemas`, kemudian API dan web.
- Semua teks UI masuk ke `apps/web/src/lib/i18n/id.ts`.
- Checklist kejujuran data pada template PR wajib dicentang.
- Panduan lengkap tersedia di `CONTRIBUTING.md` dan `AGENTS.md` pada repository.

## 4. Track A — Backend & Data

**Tujuan:** `PAVANA_MODE=live` menampilkan data nyata untuk Kubu Raya, bukan HTTP 501. Semua adapter mengikuti interface di `apps/api/src/providers/types.ts`.

| ID | Task | Prioritas | Status sumber | Lokasi | Kriteria selesai |
|---|---|---|---|---|---|
| A1 | Adapter Open-Meteo Weather (angin, RH, hujan, suhu) | P0 — wajib demo | Belum | `apps/api/src/providers/open-meteo` | Mode live mengembalikan cuaca per jam dalam m/s dan derajat FROM; test menggunakan respons rekaman. |
| A2 | Adapter Open-Meteo Air Quality (PM2.5 CAMS) | P0 — wajib demo | Belum | `apps/api/src/providers/open-meteo` | PM2.5 untuk 24 jam ke depan tersedia, dengan `issuedAt` dan `spatialResolutionKm` terisi. |
| A3 | Adapter NASA FIRMS (titik panas VIIRS) | P1 — kalau sempat | Belum | `apps/api/src/providers/firms` | Deteksi 48 jam terakhir muncul di Peta; `FIRMS_MAP_KEY` hanya berada di server; bounding box dibatasi. |
| A4 | Cache, timeout, dan retry untuk semua provider | P1 — kalau sempat | Belum | `apps/api/src/providers` | Request yang sama dalam 10 menit tidak memanggil upstream lagi; upstream lambat tidak membuat API menggantung. |
| A5 | Pencarian lokasi live (kabupaten/kecamatan Kalbar) | P1 — kalau sempat | Belum | `apps/api/src/providers/index.ts` | Pencarian “Pontianak” atau “Rasau Jaya” berhasil; zona WIB/WITA/WIT benar. |
| A6 | State data yang jujur pada mode live (stale/error) | P1 — kalau sempat | Belum | `apps/api/src/services` | Data lama ditampilkan sebagai “Data lama”; upstream mati menampilkan error; tidak pernah menampilkan angka palsu. |

Mulai dari A1 dan A2 karena keduanya tidak membutuhkan API key.

## 5. Track B — Frontend App

**Tujuan:** Empat layar aplikasi di `apps/web` terasa seperti aplikasi cuaca dan siap direkam untuk demo pada lebar 375 px dan 1280 px, dalam tema terang maupun gelap.

| ID | Task | Prioritas | Status sumber | Lokasi | Kriteria selesai |
|---|---|---|---|---|---|
| B1 | Memoles layar Hari Ini sesuai mockup Ember/Mist (kartu hero bergradasi, sparkline, chip tren) | P0 — wajib demo | Belum | `features/today` | Layar Hari Ini dapat dipahami dalam 10 detik; satuan dan sumber tetap terlihat. |
| B2 | Peta: panah angin, warna titik panas berdasarkan umur deteksi, legenda | P0 — wajib demo | Belum | `features/map` | Panah mengikuti arah TO menggunakan `windFromToFlowBearing`; klik titik panas menampilkan waktu deteksi. |
| B3 | Memilih penyedia tile peta (MapTiler / Protomaps / OSM) dan atribusi | P0 — wajib demo | Belum | `VITE_MAP_STYLE_URL`, `HotspotMap.tsx` | Peta tampil detail di Kalbar; atribusi sesuai lisensi; fallback daftar tetap berjalan. |
| B4 | Desain state kosong, data lama, data tidak cukup, dan error di semua layar | P0 — wajib demo | Belum | `components/`, `features/*` | Setiap state memiliki tampilan sendiri; tidak ada label “Baik” saat data kosong. |
| B5 | Insight: garis “sekarang”, pita kategori di grafik, tooltip jam WIB | P1 — kalau sempat | Belum | `features/insights` | Grafik terbaca tanpa legenda tambahan; nilai `null` tampil sebagai celah. |
| B6 | Lokasi: UX picker, izin geolokasi, simpan beberapa tempat | P1 — kalau sempat | Belum | `features/location` | Lokasi hanya disimpan secara lokal dan dibulatkan sekitar 1 km; izin lokasi hanya diminta saat pengguna mengklik. |
| B7 | Aksesibilitas dan responsif: keyboard, fokus, kontras AA | P1 — kalau sempat | Belum | Seluruh `apps/web` | Navigasi penuh dapat menggunakan keyboard; status tidak dibedakan hanya melalui warna. |
| B8 | Test UI tambahan untuk Peta, Insight, dan state data | P1 — kalau sempat | Belum | `apps/web/src/**/*.test.tsx` | Setiap layar memiliki minimal satu render test. |
| B9 | PWA installable dan ikon | P2 — nanti | Belum | `apps/web` | Bisa menggunakan “Add to Home Screen” di Android. |
| B10 | Bahasa Inggris (kamus `en.ts`) | P2 — nanti | Belum | `lib/i18n` | Pengguna bisa mengganti bahasa melalui halaman Info. |

**Ketergantungan:** B3 sebaiknya diputuskan cepat karena B2 bergantung padanya.

## 6. Track C — Landing, Brand & Design

**Tujuan:** Menyelesaikan identitas Pavana dan landing page di `apps/landing` agar dapat meyakinkan juri dalam 30 detik.

| ID | Task | Prioritas | Status sumber | Lokasi | Kriteria selesai |
|---|---|---|---|---|---|
| C1 | Logo/ikon wind-flow final dalam SVG, favicon, dan ikon aplikasi | P0 — wajib demo | Belum | `packages/brand/assets` | SVG bersih, terbaca pada ukuran 16 px, dan tersedia versi monokrom. |
| C2 | Mockup final Hari Ini, Peta, dan Insight di Figma, mengikuti struktur scaffold | P0 — wajib demo | Belum | Figma → `design/` | Track B memiliki acuan per layar untuk tema terang dan gelap. |
| C3 | Landing page: screenshot/video aplikasi asli, cerita masalah karhutla Kalbar, tim, dan JOINTS | P0 — wajib demo | Belum | `apps/landing/src` | Tidak ada angka yang dibuat-buat; semua data contoh diberi label ilustratif. |
| C4 | Gambar OG dan meta untuk berbagi tautan | P1 — kalau sempat | Belum | `apps/landing/public` | Preview terlihat rapi saat tautan dibagikan di WhatsApp. |
| C5 | Memeriksa nama/merek dan domain “pavana” | P1 — kalau sempat | Belum | — | Domain dipilih dan konfigurasi site di `astro.config.mjs` diganti dari `pavana.example`. |
| C6 | Maskot air spirit untuk empty state/onboarding | P2 — nanti | Belum | `packages/brand` | Digunakan secukupnya dan tidak menutupi informasi risiko. |

## 7. Track D — ML / Data Science

**Tujuan:** Menjawab pertanyaan: “Apakah fitur angin dan titik panas memperbaiki prediksi PM2.5 t+6 jam dibanding persistence dan CAMS?” Hasil negatif tetap sah; angka yang dibuat-buat tidak boleh digunakan. Semua pekerjaan berada di `ml/` (lihat `ml/README.md`).

| ID | Task | Prioritas | Status sumber | Lokasi | Kriteria selesai |
|---|---|---|---|---|---|
| D1 | Mencari data PM2.5 stasiun di Kalbar (OpenAQ, BMKG): lokasi, periode, dan celah data | P0 — wajib demo | Belum | `docs/data-sources.md` | Ada daftar stasiun dan periode yang cukup untuk training, atau keputusan tertulis bahwa data tidak cukup. |
| D2 | Implementasi loader FIRMS, Open-Meteo (historis dan issue-time), serta OpenAQ | P0 — wajib demo | Belum | `ml/src/pavana_ml/data` | Data mentah tersimpan di `ml/data/raw/` dengan provenance dan tersedia test. |
| D3 | Memilih episode historis (misalnya musim kemarau 2019 atau 2023; data harus diperiksa) dan membangun tabel model | P1 — kalau sempat | Belum | Notebook 02–03 | `ml/data/processed/model_table.parquet` terbentuk tanpa kebocoran waktu. |
| D4 | Mengevaluasi baseline A (persistence) dan B (CAMS) pada holdout temporal | P1 — kalau sempat | Belum | Notebook 04 | MAE/RMSE baseline dicatat dalam metadata, bukan di UI. |
| D5 | LightGBM ablation C/D/E | P1 — kalau sempat | Belum | Notebook 04, `models/lgbm.py` | Artifact memiliki versi dan `evaluated: true`, serta tersedia tabel perbandingan dengan A/B. |
| D6 | Fixture demo dari episode historis nyata sebagai pelengkap skenario sintetis | P1 — kalau sempat | Belum | `fixtures/` | Sumber, tanggal unduh, dan lisensi ditulis di `fixtures/README.md`. |
| D7 | Tuning λ dan τ indikator upwind secara empiris | P2 — nanti | Belum | `features/upwind.py` dan `packages/shared` | Nilai baru diperbarui dalam kedua bahasa dan test vector diperbarui. |
| D8 | SHAP dan interval ketidakpastian | P2 — nanti | Belum | Notebook 05 | Dikerjakan hanya jika D5 menghasilkan model tervalidasi. |

**Ketergantungan penting:** D1 adalah penentu. Jika data stasiun di Kalbar tidak cukup, ML tetap menjadi eksperimen dan demo menggunakan baseline CAMS serta indikator, sesuai handoff §6.6.

## 8. Track E — Riset, Konten & Pitch

**Tujuan:** Memastikan isi akurat dan cerita produk kuat untuk juri JOINTS 2026.

| ID | Task | Prioritas | Status sumber | Lokasi | Kriteria selesai |
|---|---|---|---|---|---|
| E1 | Memverifikasi breakpoint ISPU PM2.5 terhadap PermenLHK P.14/2020 | P0 — wajib demo | Belum | `packages/shared/src/aq/ispu.ts` | Breakpoint cocok dengan teks regulasi; `ISPU_VERIFIED = true`; ISPU ditampilkan di aplikasi. |
| E2 | Skenario demo dan naskah video 2–3 menit | P0 — wajib demo | Belum | `docs/` | Alur demo Kubu Raya tertulis langkah demi langkah dan dapat diulang. |
| E3 | Pitch deck: masalah, solusi, demo, inovasi (indikator upwind/ML), batasan, dampak | P0 — wajib demo | Belum | — | Tidak mengklaim sebagai “aplikasi pertama”; batasan produk disebutkan secara jujur. |
| E4 | Saran kesehatan per kategori dengan sumber | P1 — kalau sempat | Belum | `apps/web/src/lib/i18n/id.ts` | Setiap saran memiliki rujukan; tidak memberikan diagnosis atau perintah evakuasi. |
| E5 | Memverifikasi tautan resmi dan menambahkan BPBD Kalbar | P1 — kalau sempat | Belum | `apps/api/src/data/official-links.ts` | Semua tautan terbuka dan benar pada tanggal pemeriksaan. |
| E6 | Uji pemahaman dengan 5 orang (apakah layar Hari Ini dipahami dalam <10 detik?) | P1 — kalau sempat | Belum | `docs/` | Hasil dan perbaikan tercatat serta siap dikutip di pitch. |
| E7 | Memeriksa lisensi dan atribusi setiap sumber data dan tile peta | P1 — kalau sempat | Belum | `docs/data-sources.md` | Kolom lisensi terisi dan atribusi tampil di aplikasi. |

## 9. Track F — Deploy & DevOps

**Tujuan:** Semua anggota bekerja dari `main` yang sama dan juri dapat membuka tautan demo.

| ID | Task | Prioritas | Status sumber | Lokasi | Kriteria selesai |
|---|---|---|---|---|---|
| F1 | Menjadikan branch scaffold sebagai `main` (repository sumber belum memiliki `main`) | P0 — wajib demo | Belum | GitHub | `main` berisi scaffold dan semua anggota membuat branch dari sana. |
| F2 | Deploy web dan landing (misalnya Vercel) | P0 — wajib demo | Belum | `apps/web`, `apps/landing` | Tersedia dua URL publik; `VITE_API_BASE_URL` dan `PUBLIC_APP_URL` terisi. |
| F3 | Deploy API (container: Render/Fly/Railway) dan secrets | P0 — wajib demo | Belum | `apps/api` | Endpoint `/health` publik; key hanya disimpan di secrets; CORS hanya mengizinkan domain sendiri. |
| F4 | Proteksi branch `main`: PR wajib dan CI harus hijau | P1 — kalau sempat | Belum | Pengaturan GitHub | Push langsung ke `main` ditolak. |

**Ketergantungan penting:** F1 harus dikerjakan paling awal. Sebelum itu, PR anggota lain tidak memiliki target branch.

## 10. Urutan Kerja dan Ketergantungan

- Enam track dapat berjalan sendiri-sendiri secara paralel.
- B2 menunggu B3.
- D3 menunggu D1.
- Demo E2 menunggu A1–A2 serta F2–F3.
- Task prioritas P2 (B9, B10, C6, D7, D8) dikerjakan setelah Tahap 3 jika masih ada waktu.

## 11. Pertanyaan Terbuka dari Dokumen Sumber

1. Berapa orang anggota tim dan siapa yang memegang setiap track?
2. Kapan deadline submit dan tanggal demo JOINTS 2026? Tanggal ini menentukan batas tiap tahap.
3. Tile peta: apakah cukup menggunakan free tier MapTiler atau perlu Protomaps self-host?
4. Jika data stasiun Kalbar tidak cukup (D1), apakah ML tetap dimasukkan ke pitch sebagai eksperimen?
5. Apakah lokasi demo tetap Sungai Raya, Kubu Raya, atau ditambah kabupaten lain?

## 12. Catatan untuk AI Coding Assistant

- Gunakan task ID (A1–F4) untuk mengidentifikasi pekerjaan yang sedang dikerjakan.
- Jangan menganggap PIC sudah ditentukan; dokumen sumber belum mengisi nama penanggung jawab.
- Status “Belum” dan prioritas di atas mengikuti dokumen sumber per 14 Oktober 2026; perbarui jika tim sudah melakukan perubahan.
- Jangan mengarang angka, data, hasil model, atau klaim produk. Ikuti kriteria selesai pada setiap task.
- Untuk requirement produk dan batasan yang lebih lengkap, rujuk dokumen handoff proyek jika tersedia di repository.
