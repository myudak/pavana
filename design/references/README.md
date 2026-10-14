# Design references

**AI-generated concept boards.** Use them for visual hierarchy and mood only.

- They contain **placeholder US cities and invented readings** (Portland AQI 158, Boulder AQI 106).
  These are not data and not the product's localization.
- Some labels in the boards are wrong for their standard (e.g. AQI 158 is "Unhealthy" under US AQI,
  not "Unhealthy for sensitive groups"). Follow `packages/shared`, not the boards.
- Animated smoke plumes in the boards are illustrative; Pavana does not render smoke overlays
  without a genuine smoke-transport forecast.
- The icon in the boards is a raster concept. The provisional production mark is the hand-made SVG
  in `packages/brand/assets/mark.svg`.

| File                           | Shows                                                                                   |
| ------------------------------ | --------------------------------------------------------------------------------------- |
| `brand-moodboard.webp`         | Wordmark, 6 icon directions, 4 palettes (Sky/Breeze, Ember/Mist, Forest/Air, Dusk/Haze) |
| `ember-mist-app-showcase.webp` | Light theme direction (Ember/Mist): Today, Map, Alerts                                  |
| `dusk-haze-app-showcase.webp`  | Dark theme direction (Dusk/Haze): Home, Map, Forecast                                   |

Chosen: **Ember/Mist = light**, **Dusk/Haze = dark**. Mascot (air spirit) is exploratory and not
yet in the UI.
