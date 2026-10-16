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

## Ikon aplikasi

- `assets/favicon.png` adalah favicon aktif: maskot angin Pavana dari aset yang
  disediakan tim, disimpan 256 × 256 px dengan transparansi.
- Salinan favicon untuk web, landing, dan mobile ada di `apps/web/public/favicon.png`,
  `apps/landing/public/favicon.png`, dan `apps/mobile/assets/favicon.png`; pertahankan
  kesamaan dengan aset brand.
- `assets/icon-180.png` (apple-touch), `assets/icon-192.png`, dan `assets/icon-512.png`
  tetap menjadi ikon app/PWA yang terpisah (Track B). PWA `manifest.webmanifest` sendiri
  adalah scope Track B (B9), bukan di sini.

## Latar (backgrounds)

`assets/backgrounds/` — foto lanskap kabut yang disediakan tim untuk latar aplikasi:
`dusk` (tema gelap), `haze` (tema terang), `sunset` (cadangan untuk landing/splash).
Masing-masing ada versi penuh (1672 px) dan `-900` untuk layar ponsel. Dekoratif saja,
tidak membawa data. Impor via `@pavana/brand/backgrounds/<nama>.webp`.
