# Backlog

Work that is shipped as a demo or not started, with enough context to pick it up
later. Keep each item honest about what exists today.

## Smart alerts: real push notifications

**Status: demo.** Shipped as in-app and browser notifications that only work while
Pavana is open in that browser. Nothing is sent from the server.

### What exists (demo)

| Piece            | File                                                                       | What it does                                                                                                                                                                                                                |
| ---------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Alert rules      | `apps/web/src/features/insights/insight-derive.ts` (`deriveNotifications`) | Deterministic: `combined` (PM2.5 rising + hotspots in the wind's arrival direction), `pm25-rise`, `hotspots`, `data-stale`, `data-insufficient`. Same rules as the Prakiraan notifications panel.                           |
| Alert feed       | `apps/web/src/features/notifications/use-smart-alerts.ts`                  | Runs those rules on `/api/conditions` + `/api/insights` for the active location; drops the `official` links entry.                                                                                                          |
| Header bell      | `.../notifications/NotificationBell.tsx`                                   | Sheet with the current alerts, a dot when one needs attention, and the opt-in switch.                                                                                                                                       |
| Opt-in + sending | `apps/web/src/lib/notifications.tsx`, `apps/web/public/notify-sw.js`       | Asks for browser permission and stores the opt-in in `localStorage` (`pavana:notify`). Shows notifications through a minimal service worker; Android Chrome only allows that path. The worker has no fetch or push handler. |
| Auto notify      | `.../notifications/AlertNotifier.tsx`                                      | While the tab is open, fires one system notification per new `attention` alert, deduped by `location.id:rule:validAt` in `localStorage` (`pavana:notify:last`).                                                             |
| Settings UI      | `.../notifications/NotificationSettings.tsx`                               | Used in the bell sheet and in Info → Peringatan pintar. Includes "Kirim contoh notifikasi".                                                                                                                                 |

Limits of the demo:

- No notifications when the tab or browser is closed.
- Only the location currently selected in the app; no saved locations.
- In demo mode the alerts come from the fixture scenario and say "Data demo".

### To build (real implementation)

1. **Web Push transport**
   - Generate VAPID keys and keep them server-side (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`). Never use `VITE_*` for the private key; the public key can be served from an API route.
   - Add a `push` handler and a `notificationclick` deep link to `notify-sw.js`.
   - Client: `registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey })`.
   - Server: send with the `web-push` library or an equivalent.
2. **Subscriptions API** (in `apps/api`, schemas in `packages/shared`)
   - `POST /api/push/subscribe` takes `{ subscription, locations: [{ lat, lon, name, timezone }], quietHours? }`. `DELETE /api/push/subscribe` unsubscribes.
   - Storage: the app currently has no database. Pick one that fits Vercel (Upstash Redis / Vercel KV or Neon Postgres).
   - Privacy: store coordinates rounded to 0.05° and no account or identity. Delete subscriptions that return 404/410.
3. **Evaluator job**
   - A Vercel Cron, hourly. It groups subscriptions by rounded location, calls the existing services (conditions, exposure, insights) once per location, and runs `deriveNotifications`. Move that function to `packages/shared` so the server and client use the same rule.
   - Send only on a state change to `attention` (hysteresis), with at most one push per location every 6 h, quiet hours respected, and data time included in the dedupe key.
   - Never notify on `stale` or `insufficient` data as if it were safe. Never word a push as an official warning; link to SiPongi / BMKG instead.
   - Live data only. The demo fixture must never trigger a real push.
4. **Saved locations UI**: let users save 1–3 locations and pick which ones notify.
5. **Platform notes**
   - iOS Safari supports Web Push only for a PWA added to the Home Screen (iOS 16.4+), so this needs a web app manifest and install guidance.
   - Firefox and desktop Chrome work from the tab.
6. **Copy and docs**
   - All strings live in `apps/web/src/lib/i18n/id.ts` (`alerts`).
   - Update the landing feature status (`id.landing` → `alerts`) from `building` to `available` only after real push is verified end-to-end.
7. **Tests**
   - Rule tests already exist (`insight-derive.test.ts`). Add tests for dedupe and hysteresis, a mocked `web-push` send, and subscription schema validation.

## Tanya Pavi: real LLM backend

**Status: beta, live.** `POST /api/chat` (`apps/api/src/services/chat.ts`) calls an LLM through
OpenRouter (`OPENROUTER_API_KEY`, server-side; default model `google/gemini-2.5-flash`). Each request
is grounded in a JSON snapshot of the selected location's conditions, insights and experimental
model outputs; missing data stays null. Demo mode keeps the scripted conversation below.
Remaining: per-IP rate-limit tuning, an evaluation set of questions with forbidden claims, and a
privacy note in the UI.

### What exists (demo)

| Piece        | File                                                                                                   | What it does                                                                                                                                                                                  |
| ------------ | ------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Mascot poses | `apps/web/src/assets/mascot/pavi-*.webp`, `apps/web/scripts/build-mascot.mjs`, `components/Mascot.tsx` | Twelve poses sliced from `source-sheet.webp`. To regenerate, run `node apps/web/scripts/build-mascot.mjs`.                                                                                    |
| Mood → pose  | `features/chat/mascot-mood.ts`                                                                         | Examples: `concerned` → surprised, `advice` → hug-leaves, `thinking` → calm.                                                                                                                  |
| Chat UI      | `features/chat/ChatPage.tsx`                                                                           | Built on assistant-ui primitives (`@assistant-ui/react`, pinned): thread, composer, suggestion chips, a typing state, and Pavi's avatar whose pose follows the reply's mood.                  |
| Tool cards   | `features/chat/ToolCards.tsx`                                                                          | `cek_kualitas_udara`, `cek_titik_panas`, `cek_angin`, `apakah_asap_sampai`, `saran_kesehatan`. Each card shows running → done, a "Lihat detail" toggle with the args and source, and caveats. |
| Script       | `features/chat/demo-script.ts`                                                                         | Keyword intents. Every number comes from the demo fixture, and `demo-script.test.ts` checks the key ones (PM2.5, wind, peak).                                                                 |
| Runtime      | `features/chat/demo-adapter.ts`                                                                        | `ChatModelAdapter` for `useLocalRuntime`. It streams text and plays the tool calls. **This is the swap point.**                                                                               |

### To build

1. **`POST /api/chat`** in `apps/api`
   - Streams in the AI SDK UI-message format.
   - The LLM provider key stays server-side (`.env`, never `VITE_*`).
   - Pick a model with tool calling; default to the latest Claude.
2. **Server-side tools** with the **same names** as the demo tool cards, so the UI needs no
   changes.
   - Each tool calls the existing services (`conditions`, `exposure`, `insights`, `hotspots`)
     for the user's selected location.
   - Results are validated with zod schemas in `packages/shared` and carry provenance
     (`kind`, `isDemo`, `validAt`).
   - In demo mode, tools read the fixture bundle (`?demo=1`).
3. **System prompt enforcing the AGENTS.md hard rules**
   - Never invent numbers; only state what tools returned.
   - `null` means unknown, never safe.
   - Hotspots are detections, not fires.
   - No official warnings or evacuation advice; link SiPongi / BMKG instead.
   - Answer in Indonesian.
   - The reply mood (`metadata.custom.mood`) comes from tool results, not from the model's
     wording.
4. **Client swap**
   - Replace `useLocalRuntime(createDemoAdapter(...))` with
     `useChatRuntime({ api: '/api/chat' })` from `@assistant-ui/react-ai-sdk`.
   - Send the selected location and the demo flag in the request body.
   - Keep `TOOL_UIS` as they are.
5. **Safety and cost**
   - Per-IP rate limit, a maximum message length, and conversation history capped to the last
     N turns.
   - No storage of conversations by default, and a clear privacy note in the UI.
6. **Evaluation**
   - Build a small set of questions with expected tool calls and forbidden claims (e.g.
     "aman" on missing data, fire confirmation).
   - Run it in CI against a recorded model, or manually before releases.
7. **Copy**
   - When this ships, change `chat.status` / `chat.footer` and the landing status for `chat`.
   - Keep "bukan saran medis atau peringatan resmi".

## Other open items

- **ML models:** six evaluated, experimental LightGBM boosters are served through `/api/model/*`
  (hotspot risk, haze 6/24 h, wind; PM2.5 stays research-only in `/lab-ml`). Next: observed PM2.5
  archive (forward collection), calibration review, retraining cadence. See `docs/ML_LIVE_HANDOFF.md`.
- **Live data in production:** done. Production runs `PAVANA_MODE=live` and `/api/sources`
  reports Open-Meteo, CAMS, NASA FIRMS, OpenAQ and BMKG as ok (checked 16 Oct 2026). Still open:
  the app keeps `noindex` (`apps/web/index.html`); remove it when the team wants the app indexed.
