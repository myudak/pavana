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

## Other open items

- **AI forecast (LightGBM):** offline in `ml/`, not evaluated and not wired into the API. The UI says "Dalam pengembangan". See `docs/modeling-methodology.md`.
- **Live data in production:** the code is done. Production stays on `PAVANA_MODE=demo` until `FIRMS_MAP_KEY` and `OPENAQ_API_KEY` are added in Vercel. Remove the app's `noindex` only after live data is verified.
