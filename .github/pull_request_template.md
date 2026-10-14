## What & why

<!-- One or two sentences. Link the issue if there is one. -->

## Area

- [ ] web
- [ ] landing
- [ ] api
- [ ] shared / brand
- [ ] ml
- [ ] docs / ci / fixtures

## How to test

<!-- Commands, URLs, screenshots for UI changes (375px + desktop, light + dark). -->

## Checklist

- [ ] `pnpm check` passes (and `pnpm ml:test` for ML changes)
- [ ] UI strings added to `apps/web/src/lib/i18n/id.ts`
- [ ] Docs updated if behavior, data sources, or API contracts changed

## Data honesty

- [ ] New values carry provenance (provider, kind, validAt, isDemo)
- [ ] Missing data stays `null` — never 0 / "Baik"
- [ ] Demo/fixture data is visibly labelled
- [ ] No fire-arrival times, "aman" claims, causation claims, or official-sounding warnings
- [ ] No ML metrics / SHAP / intervals without an evaluated, versioned artifact
