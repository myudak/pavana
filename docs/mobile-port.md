# Expo mobile port handoff

Branch: `codex/expo-mobile`. Work is isolated in the managed `pavana-expo-mobile`
worktree; the original checkout and Claude's ongoing work were not modified.
Base: `d7323c5` (existing scaffold/deployment commit).

App source and run/build instructions: [apps/mobile/README.md](../apps/mobile/README.md).

## Integration surface

The port adds `apps/mobile`. The only edits outside that folder are:

- root `package.json`: `dev:mobile` convenience command
- root ESLint config: mobile hooks/globals and generated Expo-folder ignore
- `packages/brand`: a native token export and semantic palette/font definitions
- `apps/web/src/lib/i18n/id.ts`: additive `mobile` copy namespace
- root README, this handoff, and the pnpm lockfile

The app reads existing pure API fixture providers/services and shared schemas
directly. It does not import Fastify's application/server/config entry points.
It reads the existing web formatting helpers and Indonesian dictionary; React,
DOM components, and browser-only state are not shared.

When integrating with Claude's branch, merge the additive dictionary/export/script
changes and preserve Claude's changes. If the workspace dependencies have diverged,
regenerate the lockfile with pnpm rather than replacing the other branch's lockfile.
Keep native React at Expo's supported version; do not apply a workspace-wide React
override to make the web and mobile package versions match.

## Build validation

Source-level validation passed: `pnpm check` (lint, typecheck, 55 tests including
9 mobile data/chart tests) and `expo install --check` (SDK-compatible dependencies).
Android Metro/Hermes export also passed. The first signed Android preview APK
finished successfully on EAS Cloud:

- Project: `@myudak/pavana`
- Build: `65aea725-78c3-4e42-83e2-3abd049816ff`
- Source commit: `f4102c8`
- Version: `0.1.0`, Android version code `1`
- [Build details and artifact](https://expo.dev/accounts/myudak/projects/pavana/builds/65aea725-78c3-4e42-83e2-3abd049816ff)

The Android preview shows a labelled coordinate-only fallback when no restricted
Google Maps key is configured. This avoids mounting a native Google Map without
the required API-key metadata. iOS continues to use Apple Maps.

## Deferred

Physical-device testing, iOS binary compilation/signing, and store submission.
Android standalone map rendering requires the restricted platform key described
in the app README. No push/background location services were added.
Live provider support and model evaluation remain dependent on the existing API work.
