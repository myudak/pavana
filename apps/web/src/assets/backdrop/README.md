# Backdrop gambar layar pertama Beranda (Today)

Dipakai oleh `apps/web/src/features/today/DuskBackdrop.tsx` dan diimpor lewat Vite,
jadi hanya file tema aktif yang diunduh pengguna.

| Nama file            | Tema   | Dipakai untuk            | Ukuran saran |
| -------------------- | ------ | ------------------------ | ------------ |
| `backdrop-1280.webp` | gelap  | layar < 768px (ponsel)   | 1280 x 720   |
| `backdrop-2560.webp` | gelap  | layar >= 768px (desktop) | 2560 x 1440  |
| `dawn-1280.webp`     | terang | layar < 768px (ponsel)   | 1280 x 720   |
| `dawn-2560.webp`     | terang | layar >= 768px (desktop) | 2560 x 1440  |

Cara mengganti gambar:

1. Siapkan foto dengan rasio 16:9, format **WebP** (atau kirim JPG/PNG-nya, nanti
   dikonversi pakai Pillow: `uv run --with pillow python <script>`).
2. Timpa file di folder ini dengan **nama yang sama** — tidak perlu ubah kode.
3. Light mode: pilih foto yang **terang** karena teks hero berwarna gelap.
   Kalau fotonya terlalu gelap, naikkan persentase scrim `{!dark && ...}` di
   `DuskBackdrop.tsx`; kalau terlalu ramai di sisi kanan, sesuaikan
   `object-position` pada `<img>`.
4. Dark mode: foto aslinya ada di `design/references/background.jpeg`
   (versi HD `background-hd.webp`); optimasi web-nya adalah dua file
   `backdrop-*.webp` di folder ini.
5. Light mode: foto aslinya `design/references/background-light-mode.jpeg`
   (versi web: `dawn-2560.webp` untuk desktop, `dawn-1280.webp` untuk ponsel).
6. Catat sumber dan lisensi kedua foto di bagian bawah README ini.

## Sumber & lisensi

| File                                       | Sumber / lisensi   |
| ------------------------------------------ | ------------------ |
| `backdrop-1280.webp`, `backdrop-2560.webp` | diisi pemilik repo |
| `dawn-1280.webp`, `dawn-2560.webp`         | diisi pemilik repo |
