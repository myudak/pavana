# @pavana/brand

Design tokens and logo assets shared by `apps/web` and `apps/landing`.

| Theme                   | Palette                                                              | Notes             |
| ----------------------- | -------------------------------------------------------------------- | ----------------- |
| light (default)         | **Ember / Mist** — `#F97316` `#FCA5A5` `#6B7280` `#F5F1EB` `#1F2937` | warm, human       |
| dark                    | **Dusk / Haze** — `#6366F1` `#F472B6` `#9CA3AF` `#EEF0F4` `#1F2937`  | serene, evening   |
| `data-palette="sky"`    | Sky / Breeze — `#3B82F6` `#14B8A6`                                   | alternative light |
| `data-palette="forest"` | Forest / Air — `#2E7D5B` `#CBBFA0`                                   | alternative light |

## Usage (Tailwind v4)

```css
@import 'tailwindcss';
@import '@pavana/brand/fonts.css';
@import '@pavana/brand/tokens.css';
@import '@pavana/brand/theme.css';
```

Then use semantic utilities: `bg-canvas`, `bg-surface`, `text-ink`, `text-ink-muted`,
`bg-primary-strong text-on-primary`, `text-aq-unhealthy`, `font-display`, `rounded-card`.

## Rules

- Use semantic tokens only; never hard-code hex in components.
- `--pv-primary` is a fill/accent color; use `--pv-primary-strong` for text and buttons (AA contrast).
- Air-quality colors must always be paired with a text label.

## Identitas logo: wordmark "pavana" saja

- **Logo utama = tulisan `pavana` lowercase** — tanpa simbol, maskot, atau ikon sebagai logo.
  Render: utilitas `font-wordmark` (token `--pv-font-wordmark`), tracking `-0.05em`,
  warna `text-ink`. Komponen: `Wordmark` di `apps/landing` (`Wordmark.astro`) dan
  `apps/web` (`Wordmark.tsx`, dipakai di header desktop + mobile via `AppShell`).
- Ikon generik (api, daun, gunung) atau penggantian huruf dengan simbol **tidak dipakai**.

## Font wordmark: Vernosa (pending) / Comfortaa (interim aktif)

- **Kandidat utama: Vernosa Variable Regular oleh Qiubare Studio (via MyFonts).**
  Status: **file font tidak tersedia di repository dan belum ada lisensi** (audit 2026-10-15:
  tidak ada file `*vernosa*` atau font lokal apa pun di repo; font hanya via paket fontsource).
  Vernosa **bukan** klaim font asli logo referensi — melainkan kandidat pilihan pemilik desain
  karena kemiripan visual (rounded, geometris, lowercase).
- **Yang dibutuhkan dari pemilik desain:** file variable WOFF2 + **lisensi Webfont MyFonts**
  yang mengizinkan pemakaian di website (lisensi Desktop saja tidak cukup; konfirmasi cakupan
  pageview/domain saat pembelian). Jangan mengunduh dari sumber tidak resmi.
- **Cara aktivasi setelah file ada:** simpan sebagai
  `packages/brand/assets/fonts/vernosa-variable.woff2`, aktifkan blok `@font-face` di
  `src/fonts.css`, sesuaikan rentang `font-weight` dengan axis file. Token wordmark sudah
  mencantumkan `'Vernosa'` pertama — komponen beralih otomatis tanpa perubahan kode.
- **Interim aktif (saat ini): Comfortaa Bold/700**, SIL OFL 1.1 via
  `@fontsource-variable/comfortaa` (rentang variable 300–700; dependensi paket ini).
  Comfortaa dipilih agar wordmark lebih bulat dan lembut; bobot 700 dipakai agar
  mendekati ketebalan referensi. **Tidak diklaim identik** dengan referensi maupun Vernosa.
- Outfit (OFL 1.1, `@fontsource-variable/outfit`) tidak lagi dipakai untuk antarmuka;
  tersisa hanya sebagai fallback terdalam di tumpukan wordmark.

## Peran font

- Wordmark `pavana`: Comfortaa Bold (token `--pv-font-wordmark`, utilitas `font-wordmark`).
  **Tidak** ikut beralih ke Inter — bentuk huruf wordmark dipertahankan.
- Seluruh antarmuka memakai **Inter** (`@fontsource-variable/inter`, OFL 1.1), satu keluarga
  untuk semua peran dengan hierarki bobot:
  - Judul halaman & pesan status utama: Inter Bold/700 (`font-bold`).
  - Isi & deskripsi: Inter Regular/400 (default body).
  - Label & navigasi: Inter Medium/500 (`font-medium`).
  - Angka & nilai AQI/PM2.5: Inter SemiBold/600 (`font-semibold`, `tabular-nums`).
    Token `--pv-font-display`, `--pv-font-heading`, dan `--pv-font-body` semuanya Inter
    (utilitas `font-display`, `font-heading`, `font-sans`).

## Ikon aplikasi (turunan huruf "p")

- Format ikon persegi terlalu kecil untuk wordmark penuh, jadi dipakai satu huruf awal `p`
  sebagai turunan tipografis — **bukan simbol terpisah**.
- `assets/favicon.svg`: huruf `p` **lowercase** (bukan `P`) yang diambil dari outline glyph
  **Comfortaa Variable wght 700** — bobot dan keluarga font yang sama dengan wordmark —
  warna Mist `#F5F1EB` di atas kotak membulat ink `#1F2937` (`rx` 16).
  Outline disimpan sebagai `<path>` (bukan `<text>`) agar bentuk huruf deterministik di
  semua perender tanpa bergantung pada font yang tersedia.
- Geometri ikon: tinggi huruf 46/64 unit, dipusatkan tepat di tengah kanvas (margin atas =
  bawah 8.5, kiri = kanan 15.36), dengan `stroke` 1 unit berwarna sama sebagai kompensasi
  optis supaya tetap terbaca pada ukuran tab 16 px.
- Cara menurunkan ulang outline: ekstrak glyph `p` (U+0070) dari
  `@fontsource-variable/comfortaa/files/comfortaa-latin-wght-normal.woff2` di instance
  `wght=700` memakai `fontkitten` (dependensi Astro yang sudah ada), lalu skala + pusatkan
  ke `viewBox 0 0 64 64`. Catat bahwa `getVariation()` fontkitten belum menerapkan `gvar`
  ke glyph WOFF2, jadi varian bold diambil dengan memanggil
  `_variationProcessor.transformPoints()` manual.
- `assets/icon-180.png` (apple-touch), `assets/icon-192.png`, `assets/icon-512.png` adalah
  render PNG dari `favicon.svg` untuk kebutuhan app-icon/PWA (dikonsumsi Track B).
  Regenerate dengan `sharp` bawaan repo, dari root (tidak perlu font tambahan karena
  favicon tidak memakai `<text>`):

  ```bash
  node --input-type=module -e "const p = 'file://' + process.cwd().replace(/\\/g,'/') + '/node_modules/.pnpm/sharp@0.34.5/node_modules/sharp/lib/index.js'; const { default: sharp } = await import(p); for (const s of [180,192,512]) { await sharp('packages/brand/assets/favicon.svg').resize(s,s).png().toFile('packages/brand/assets/icon-'+s+'.png'); }"
  ```

  (Versi `sharp` harus cocok dengan yang ter-pin di `pnpm-lock.yaml`.)
  PWA `manifest.webmanifest` sendiri adalah scope Track B (B9), bukan di sini.

- Salinan `favicon.svg` untuk serving: `apps/landing/public/favicon.svg`,
  `apps/web/public/favicon.svg` — jaga agar tetap sama dengan aset brand.
- Setelah Vernosa aktif, turunan huruf `p` dapat ditinjau ulang agar mengikuti bentuk `p`
  Vernosa — tanpa membuat simbol terpisah dari identitas tipografi.
- Wordmark memakai token `--pv-font-wordmark` (bukan `--pv-font-display`).

## Latar (backgrounds)

`assets/backgrounds/` — foto lanskap kabut yang disediakan tim untuk latar aplikasi:
`dusk` (tema gelap), `haze` (tema terang), `sunset` (cadangan untuk landing/splash).
Masing-masing ada versi penuh (1672 px) dan `-900` untuk layar ponsel. Dekoratif saja,
tidak membawa data. Impor via `@pavana/brand/backgrounds/<nama>.webp`.
