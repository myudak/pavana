# @pavana/video

The competition video (2:00 or less), built with [Remotion](https://www.remotion.dev) (React → MP4).

The storyboard, verified quotes and asset rights are in
[`docs/video/sources.md`](../../docs/video/sources.md).

```bash
pnpm --filter @pavana/video studio   # live preview at localhost:3000
pnpm --filter @pavana/video render   # → apps/video/out/pavana.mp4 (git-ignored)
```

## Scenes (2:00)

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
- **No audio yet.** Voice-over and music come later.
- **Remotion license:** free for individuals and teams of up to three people. Check
  [remotion.pro/license](https://www.remotion.pro/license) if that changes.
