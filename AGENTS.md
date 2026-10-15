# AGENTS.md — guidance for coding agents (Codex, Claude Code, etc.)

Read [`docs/PAVANA_HANDOFF.md`](docs/PAVANA_HANDOFF.md) for the product brief and
[`CONTRIBUTING.md`](CONTRIBUTING.md) for where code goes.
Demo-only and unbuilt features (e.g. real push notifications) are tracked with context in
[`docs/backlog.md`](docs/backlog.md).

## Commands

```bash
pnpm install
pnpm dev                 # web :5173, api :8787, landing :4321
pnpm check               # lint + typecheck + test (run before finishing)
pnpm build
pnpm --filter @pavana/api test
uv run --project ml pytest ml/tests
uv run --project ml ruff check ml
uv run --project ml nbstripout --verify ml/notebooks/*.ipynb
```

## Architecture in one breath

`packages/shared` (zod schemas + pure math) → `apps/api` (Fastify; providers normalize into
shared schemas; services compute deterministic insights; routes validate in/out) → `apps/web`
(React; typed fetch parses responses with the same schemas). `apps/landing` is static Astro.
`ml/` is an offline Python research workspace, not wired into the API. `apps/video` is the
competition video (Remotion); not deployed.

Demo mode (default) serves `fixtures/scenario-kubu-raya.json` and pins "now" to its reference time.

## Hard rules

- Do not invent data, fires, official alerts, evacuation advice, AQI values or model metrics.
- Preserve provenance; distinguish observation / forecast / derived / fixture.
- `null` for missing data. Never coerce to 0. Never show a "good" state on missing data.
- Hotspots are detections, not confirmed fires; absence of detections is not absence of fire.
- Wind direction is meteorological FROM. Use `windFromToFlowBearing` / `wind_from_to_flow_bearing`.
- US AQI 151–200 is "Unhealthy" (not "Unhealthy for Sensitive Groups").
- Provider keys stay server-side (`.env`, never `VITE_*`).
- Keep TS and Python math in sync via `fixtures/test-vectors/geo-wind.json`.
- Mark unfinished connectors/models as such in code, docs and UI.
- Indonesian is the default UI language; all strings live in `apps/web/src/lib/i18n/id.ts`.
