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
- Outfit (OFL 1.1, `@fontsource-variable/outfit`) tetap menjadi font display/headings dan
  tertinggal sebagai fallback dalam di tumpukan wordmark, tetapi **bukan lagi font interim
  wordmark**.

## Peran font

- Wordmark `pavana`: Comfortaa Bold (token `--pv-font-wordmark`, utilitas `font-wordmark`).
- Judul & angka besar: Plus Jakarta Sans semibold/bold (token `--pv-font-heading`,
  utilitas `font-heading`) — humanis, paling dekat referensi. Outfit (`font-display`)
  bukan untuk judul aplikasi.
- Isi/label/navigasi: Plus Jakarta Sans regular/medium (body default).

## Ikon aplikasi (turunan huruf "p")

- Format ikon persegi terlalu kecil untuk wordmark penuh, jadi dipakai satu huruf awal `p`
  sebagai turunan tipografis — **bukan simbol terpisah**.
- `assets/favicon.svg`: huruf `p` konstruksi geometris (batang + mangkuk lingkaran, ujung
  membulat) warna Mist `#F5F1EB` di atas kotak membulat ink `#1F2937`. Konstruksi vektor
  disengaja (bukan glif font) agar deterministik di semua perender.
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
