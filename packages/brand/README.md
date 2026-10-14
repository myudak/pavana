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
- `assets/mark.svg` is a **provisional** wind-flow mark (monochrome, `currentColor`).
  Concept boards in `design/references/` are AI-generated explorations, not final assets.
- Wordmark = the text `pavana` in Outfit 500, tracking `-0.05em`.
