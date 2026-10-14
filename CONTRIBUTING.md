# Contributing to Pavana

## Setup

```bash
corepack enable          # pnpm 10
pnpm install
cp .env.example .env     # optional
pnpm dev
```

Python/ML: install [uv](https://docs.astral.sh/uv/), then `pnpm ml:setup`.

## Workflow

1. Branch from `main`: `feat/<area>-<thing>`, `fix/<area>-<thing>`, `docs/…`, `ml/…`.
2. Keep PRs small and focused on one area.
3. Before pushing: `pnpm check` (lint + typecheck + test). For ML: `pnpm ml:test` and
   `uv run --project ml ruff check ml`.
4. Fill in the PR template, including the **data honesty** checklist.

Commit messages: short imperative subject, e.g. `api: add open-meteo weather adapter`.
Prefix with the area: `web`, `landing`, `api`, `shared`, `brand`, `ml`, `docs`, `ci`, `fixtures`.

## Where things go

| I want to…                       | Go to                                                                                                                                    |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Add/change an API response shape | `packages/shared/src/schemas/api.ts` (then API + web follow the types)                                                                   |
| Add a data source                | `apps/api/src/providers/<name>/` implementing `providers/types.ts`, register in `providers/index.ts`, document in `docs/data-sources.md` |
| Add an API route                 | `apps/api/src/routes/index.ts` + a service in `apps/api/src/services/`, test in `apps/api/test/`                                         |
| Add a screen                     | `apps/web/src/features/<feature>/`, route in `apps/web/src/app/routes.tsx`, nav in `app/nav.ts`                                          |
| Add UI text                      | `apps/web/src/lib/i18n/id.ts` (no hard-coded strings in components)                                                                      |
| Add a UI primitive               | `apps/web/src/components/ui/` (shadcn style; `npx shadcn@latest add <x>` works from `apps/web`)                                          |
| Change colors/fonts              | `packages/brand/src/tokens.css` (semantic tokens only)                                                                                   |
| Change geo/wind/upwind math      | `packages/shared/src/math/` **and** `ml/src/pavana_ml/features/`, update `fixtures/test-vectors/geo-wind.json`                           |
| Experiment with ML               | `ml/notebooks/` + `ml/src/pavana_ml/` (strip outputs before committing)                                                                  |

## Code style

- TypeScript strict, ESM, Prettier (100 cols, single quotes). Python: ruff (100 cols).
- Use shared schemas at boundaries: providers normalize **into** them; routes `parse` responses with them.
- Units in names (`pm25UgM3`, `windSpeedMs`, `wind_dir_from_deg`). Timestamps are UTC ISO strings.
- UI: semantic Tailwind tokens (`bg-surface`, `text-ink-muted`, `bg-primary-strong`), never raw hex.
- Accessibility: never encode status by color alone; keep keyboard focus visible; label icons.

## Data honesty checklist (also in the PR template)

- [ ] New values carry `provenance` (provider, kind, validAt, isDemo).
- [ ] Missing data stays `null` and renders as "tidak diketahui", not 0/"Baik".
- [ ] Fixture/demo data is visibly labelled.
- [ ] No claims of fire arrival time, safety, causation, or official warnings.
- [ ] No ML metrics/SHAP/intervals without an evaluated, versioned artifact.
