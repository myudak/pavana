# @pavana/video

The competition video (2:00 or less), built with [Remotion](https://www.remotion.dev) (React → MP4).

The storyboard, verified quotes and asset rights are in
[`docs/video/sources.md`](../../docs/video/sources.md).

```bash
pnpm --filter @pavana/video studio   # live preview at localhost:3000
pnpm --filter @pavana/video render   # → apps/video/out/pavana.mp4 (git-ignored, v2)
```

## v2: motion design + voice-over (`PavanaV2`, default)

Every screen is rebuilt as animated components (`src/v2/`), not screenshots. Copy and numbers
come from the demo fixtures and from the real model outputs (`src/data/model-demo.json`).

- **Script:** `src/v2/script.ts` holds one line per scene; it is also the burned-in subtitle.
  The readable version for recording is [`docs/video/vo-script.md`](../../docs/video/vo-script.md).
- **Voice-over:** put `public/vo/vo-01.wav` … `vo-11.wav` (or `.mp3`) and re-render. Each scene
  stretches to its recording plus 0.6 s (`calculateV2Metadata` in `src/v2/PavanaV2.tsx`).
- **Map scenes:** `public/map/*.jpg` are CARTO Dark Matter captures
  (`node scripts/capture-basemap.mjs`); overlays are projected with Web Mercator in
  `src/v2/map/projection.ts`. Credit: © OpenStreetMap contributors © CARTO.
- **Model scene:** `src/data/model-demo.json` is the served boosters (apps/api/src/models) evaluated on their archived
  demo inputs (hotspot risk 14 Sep 2026, haze 5 Sep 2023). Regenerate it with `node scripts/build-model-demo.ts` when the models change.
- **Sound effects:** each scene's `sfx` field marks where they go; music and SFX come later.

| Scene | Planned | What happens                                                         |
| ----- | ------- | -------------------------------------------------------------------- |
| 01    | 12 s    | ISPA count-up out of the haze, Rani's question typed                 |
| 02    | 16 s    | Borneo map: demo detections pop in, wind guessed, Reddit bubbles     |
| 03    | 8 s     | Smoke wipe, Pavi pops, wordmark assembles                            |
| 04    | 12 s    | Three 3D data layers stack and collapse into the answer card         |
| 05    | 10 s    | Recreated Beranda builds itself, with callouts                       |
| 06    | 12 s    | Fly-in to Kubu Raya: detections by age, wind particles, smoke trails |
| 07    | 12 s    | Model risk grid fills Kalimantan; one cell explained with SHAP       |
| 08    | 13 s    | Tanya Pavi: question, tool checks, answer                            |
| 09    | 8 s     | Alert on the lock screen, web + Android beta                         |
| 10    | 9 s     | Three honesty principles stamp in                                    |
| 11    | 8 s     | Closing line, Pavi, wordmark, URL, credits                           |

## v1 scenes (2:00, composition `Pavana`)

| Time      | Scene                                                                   | File                    |
| --------- | ----------------------------------------------------------------------- | ----------------------- |
| 0:00–0:08 | Cold open: Rani's quote typed out, then the haze rises                  | `scenes/ColdOpen.tsx`   |
| 0:08–0:27 | Problem: three resident quotes stack up, then the ISPA figure           | `scenes/Problem.tsx`    |
| 0:27–0:42 | Guessing: illustrative Borneo map, erratic wind, r/indonesia comments   | `scenes/GuessMap.tsx`   |
| 0:42–0:50 | Bridge: BMKG on lingering PM2.5, "Bagaimana kalau tidak perlu menebak?" | `scenes/Bridge.tsx`     |
| 0:50–1:34 | Demo: Beranda, Peta, Prakiraan, Tanya Pavi, Peringatan in a phone       | `scenes/Demo.tsx`       |
| 1:34–1:46 | Principles: hotspots are detections, missing data is not safe, sources  | `scenes/Principles.tsx` |
| 1:46–2:00 | Close: Pavi, wordmark, URL, credits                                     | `scenes/Close.tsx`      |

## Demo screens

`public/demo/` is captured from the real app in demo mode, dark theme, at 390×844 (2×). To
recapture after UI changes, start the app (`pnpm dev:app`) and run:

```bash
pnpm --filter @pavana/video capture   # optional: pass another base URL after --
```

The chat reply is recorded with the CDP screencast, and `chat.json` stores each frame's time so
the video replays it at real speed.

## Rules

- **Quotes** live in `src/data/quotes.ts`.
  - They are verbatim, kept in sync with `docs/video/sources.md`, and shortened only with "…".
  - Every quote and number shows its source on screen.
- **Backgrounds** are procedural (smoke, ash, grain), so no photo licenses are needed. Add
  third-party images only after their rights are cleared.
- **Audio:** v2 plays recorded voice-over from `public/vo/` when present; music comes later.
- **Remotion license:** free for individuals and teams of up to three people. Check
  [remotion.pro/license](https://www.remotion.pro/license) if that changes.
