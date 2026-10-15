# Verifikasi breakpoint ISPU PM2.5 (E1)

> Kriteria PRD: breakpoint cocok dengan teks regulasi → `ISPU_VERIFIED = true` → ISPU
> ditampilkan di aplikasi. **Status saat ini: BELUM TERVERIFIKASI** (`ISPU_VERIFIED = false`
> di `packages/shared/src/aq/ispu.ts`). Dokumen ini mencatat tabel draft dan protokol
> verifikasinya. Jangan mengubah angka tanpa mencocokkan teks regulasi.

## Tabel draft (belum terverifikasi)

Sumber: transkripsi draft PermenLHK No. P.14/MENLHK/SETJEN/KUM.1/7/2020
(`packages/shared/src/aq/ispu.ts`, `PM25_BREAKPOINTS_DRAFT`).

| PM2.5 (µg/m³) | ISPU  | Kategori           |
| ------------- | ----- | ------------------ |
| 0–15,5        | 0–50  | Baik               |
| 15,5–55,4     | 50–100 | Sedang            |
| 55,4–150,4    | 100–200 | Tidak sehat      |
| 150,4–250,4   | 200–300 | Sangat tidak sehat |
| 250,4–500     | 300–500 | Berbahaya        |

Fungsi `pm25ToIspuDraft()` diberi label draft dan **tidak ditampilkan di UI** selama
`ISPU_VERIFIED` bernilai `false`. UI menampilkan PM2.5 (µg/m³) + kategori indikatif US AQI.

## Protokol verifikasi (untuk pemegang task)

1. Dapatkan teks resmi PermenLHK P.14/2020 beserta **Lampiran** (kategori & angka ISPU PM2.5).
2. Cocokkan kelima rentang konsentrasi dan rentang indeks di atas dengan lampiran, baris per baris.
3. Periksa aturan batas (inklusif/eksklusif) dan pembulatan yang dipakai regulasi.
4. Bila cocok: set `ISPU_VERIFIED = true`, hapus label draft, tambah test di
   `packages/shared/test/`, lalu tampilkan ISPU di aplikasi (butuh Track B untuk UI).
5. Bila tidak cocok: perbaiki angka sesuai regulasi + catat sumber halaman/pasal di file ini.
6. Catat tanggal verifikasi dan nama pemeriksa di sini.

## Blocker

- Teks regulasi (Lampiran P.14/2020) tidak tersedia di repository dan tidak dapat diakses
  dari lingkungan kerja ini. Verifikasi membutuhkan anggota tim yang memegang salinan regulasi.

## Riwayat

- 2026-10-15: audit — draft cocok secara struktur dengan 5 kategori ISPU standar, tetapi
  **belum dicocokkan ke teks regulasi**; flag tetap `false`.
