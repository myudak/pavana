# @pavana/video

The competition video (2:00 or less), built with [Remotion](https://www.remotion.dev) (React → MP4).

The storyboard, verified quotes and asset rights are in
[`docs/video/sources.md`](../../docs/video/sources.md).

```bash
pnpm --filter @pavana/video studio   # live preview at localhost:3000
pnpm --filter @pavana/video render   # → apps/video/out/pavana.mp4 (git-ignored, v2)
```

## v2 (v3 script): motion design + voice-over (`PavanaV2`, default)

Every screen is rebuilt as animated components (`src/v2/`), not screenshots. The script focuses on
monitoring titik api around forests and peatland early (JOINTS 2026 Sustainability subtheme);
smoke is the impact.

- **Script:** `src/v2/script.ts`, one line per scene; it is also the burned-in subtitle text.
  Readable version for recording: [`docs/video/vo-script.md`](../../docs/video/vo-script.md).
- **Voice-over:** one take at `public/audio/vo.m4a` (not committed). Scenes and subtitles are
  timed to it word by word through `src/v2/vo-timing.json`. After a new take:
  1. Transcribe with word timestamps (we used faster-whisper `medium`, language `id`) into a
     list of `{w, s, e}`.
  2. `python scripts/align-vo.py <words.json>` rewrites `vo-timing.json`.
- **Music:** `public/audio/music.mp3` (not committed; "Cinematic Tension Cello" by Soundridemusic,
  credited on screen). It is ducked under speech and fades in and out.
- **Sound effects:** `public/audio/sfx/*.wav` are synthesised by `node scripts/make-sfx.mjs`
  (no samples). Cues are listed in `SFX` in `src/v2/PavanaV2.tsx`.
- **Visual effects:** `src/v2/fx.tsx` holds embers, light-leak flashes on cuts, grain, vignette
  and camera shake.
- **Map scenes:** `public/map/*.jpg` are CARTO Dark Matter captures
  (`node scripts/capture-basemap.mjs`), with overlays projected in `src/v2/map/projection.ts`.
- **Model scene:** `src/data/model-demo.json` holds the served boosters (`apps/api/src/models`)
  evaluated on their archived demo inputs. Regenerate it with
  `node scripts/build-model-demo.ts`.
- **Render time** is about 4–6 minutes on 8 threads (`remotion.config.ts`).

| Scene      | VO (s)      | What happens                                                              |
| ---------- | ----------- | ------------------------------------------------------------------------- |
| hook       | 1.3–15.1    | 32.896,67 ha count-up (BNPB), then a peat cross-section with embers       |
| problem    | 15.4–30.8   | Reddit bubbles, detections appear day by day, "sulit dipantau sejak dini" |
| reveal     | 31.1–37.1   | Smoke wipe, Pavi, wordmark                                                |
| peta       | 37.3–50.8   | Fly-in to Kubu Raya, detections by age, new fires pulse, wind, trails     |
| model      | 50.8–64.4   | Hotspot-risk grid; one cell explained with SHAP                           |
| beranda    | 65.4–76.7   | Layers stack into the answer, Beranda builds                              |
| chat       | 76.7–84.3   | Tanya Pavi (demo replies)                                                 |
| alerts     | 84.3–91.4   | Lock-screen alert, web + Android                                          |
| principles | 92.5–100.8  | Honesty cards stamp in                                                    |
| close      | 101.8–110.6 | Closing lines, Pavi, wordmark, URL, credits                               |

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
