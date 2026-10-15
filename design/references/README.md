# Design references

**AI-generated concept boards.** Use them for visual hierarchy and mood only.

- They contain **placeholder US cities and invented readings** (Portland AQI 158, Boulder AQI 106).
  These are not data and not the product's localization.
- Some labels in the boards are wrong for their standard (e.g. AQI 158 is "Unhealthy" under US AQI,
  not "Unhealthy for sensitive groups"). Follow `packages/shared`, not the boards.
- Animated smoke plumes in the boards are illustrative; Pavana does not render smoke overlays
  without a genuine smoke-transport forecast.
- Logo concept boards are raster explorations only. The production identity is the
  **wordmark "pavana"** (Comfortaa Bold interim; Vernosa pending) — see
  `packages/brand/README.md`. There is no logo mark;
  the former `assets/mark.svg` wind-flow symbol has been removed.

| File                           | Shows                                                                                   |
| ------------------------------ | --------------------------------------------------------------------------------------- |
| `brand-moodboard.webp`         | Wordmark, 6 icon directions, 4 palettes (Sky/Breeze, Ember/Mist, Forest/Air, Dusk/Haze) |
| `ember-mist-app-showcase.webp` | Light theme direction (Ember/Mist): Today, Map, Alerts                                  |
| `dusk-haze-app-showcase.webp`  | Dark theme direction (Dusk/Haze): Home, Map, Forecast                                   |

## background.jpeg — aset produksi nyata (bukan concept board)

Tidak seperti file `*.webp` di atas, `background.jpeg` (1600×900) adalah foto
lanskap senja produksi yang dipakai sebagai latar layar pertama halaman Today
(tema gelap). Versi yang ditingkatkan (resampling Lanczos 2560×1440, bukan
super-resolusi) ada di `background-hd.webp`. Salinan teroptimasi untuk web ada
di `apps/web/src/assets/backdrop/` (`backdrop-2560.webp`, `backdrop-1280.webp`,
diimpor lewat Vite sehingga dapat hash).

Sumber dan lisensi foto: diisi pemilik repo.

### background-light-mode.jpeg — aset produksi tema terang

Foto lanskap pagi berkabut (1600×900) yang dipakai sebagai latar layar pertama
halaman Today pada **tema terang**. Salinan teroptimasi untuk web ada di
`apps/web/src/assets/backdrop/`: `dawn-2560.webp` (2560×1440, resampling Lanczos)
dan `dawn-1280.webp` (1280×720). Lapisan scrim di `DuskBackdrop.tsx` menjaga
kontras teks hero (terukur: 6,53:1 untuk lead dan 4,78:1 untuk sub di desktop,
6,56:1 / 4,81:1 di mobile).

Sumber dan lisensi foto: diisi pemilik repo.

Chosen: **Ember/Mist = light**, **Dusk/Haze = dark**. Mascot (air spirit) is exploratory and not
yet in the UI.
