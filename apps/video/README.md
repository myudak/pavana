# @pavana/video

The competition video (2:00 or less), built with [Remotion](https://www.remotion.dev) (React → MP4).

The storyboard, verified quotes and asset rights are in
[`docs/video/sources.md`](../../docs/video/sources.md).

```bash
pnpm --filter @pavana/video studio   # live preview at localhost:3000
pnpm --filter @pavana/video render   # → apps/video/out/pavana.mp4 (git-ignored)
```

## Status

| Time      | Scene                                                         | File                  |
| --------- | ------------------------------------------------------------- | --------------------- |
| 0:00–0:11 | Cold open: Rani's quote typed out, then the haze rises        | `scenes/ColdOpen.tsx` |
| 0:11–0:30 | Problem: three resident quotes stack up, then the ISPA figure | `scenes/Problem.tsx`  |
| 0:30–2:00 | Not built yet: wind/guessing map, bridge, app demo, close     | —                     |

## Rules

- **Quotes** live in `src/data/quotes.ts`.
  - They are verbatim, kept in sync with `docs/video/sources.md`, and shortened only with "…".
  - Every quote and number shows its source on screen.
- **Backgrounds** are procedural (smoke, ash, grain), so no photo licenses are needed. Add
  third-party images only after their rights are cleared.
- **No audio yet.** Voice-over and music come later.
- **Remotion license:** free for individuals and teams of up to three people. Check
  [remotion.pro/license](https://www.remotion.pro/license) if that changes.
