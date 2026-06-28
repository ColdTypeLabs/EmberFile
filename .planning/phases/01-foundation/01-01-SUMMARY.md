---
phase: "01-foundation"
plan: "01"
subsystem: "scaffold"
tags: [wxt, storage-schema, vitest, manifest, typescript]
dependency_graph:
  requires: []
  provides:
    - WXT project scaffold with manifest permissions
    - Storage schema (storageEnabled, storageMonthlyCount, storageMonthlyResetDate, storageRules)
    - Vitest test infrastructure
  affects:
    - entrypoints/background.ts (Plan 02 will add download hook here)
tech_stack:
  added:
    - wxt@0.20.27
    - "@wxt-dev/module-react@^1.0.4"
    - "@wxt-dev/storage@^1.0.1"
    - react@18
    - vitest@3.2.6
  patterns:
    - storage.defineItem with 'local:' prefix for chrome.storage.local isolation
    - WxtVitest plugin for fake-browser test environment
    - Inline esbuild tsconfigRaw to work around vitest 3 + vite 8 tsconfck resolver on Windows
key_files:
  created:
    - package.json
    - wxt.config.ts
    - tsconfig.json
    - .gitignore
    - entrypoints/background.ts
    - entrypoints/popup/index.html
    - entrypoints/popup/main.tsx
    - entrypoints/popup/App.tsx
    - vitest.config.ts
    - tests/storage-schema.test.ts
  modified: []
decisions:
  - "Inlined tsconfig.json compilerOptions instead of extending .wxt/tsconfig.json — vitest 3.x bundles vite 8 which uses tsconfck with stricter Windows path resolution that fails on URL-encoded paths in extends chains"
metrics:
  duration_minutes: 5
  tasks_completed: 2
  tasks_total: 2
  files_created: 10
  files_modified: 0
  completed_date: "2026-06-28"
---

# Phase 01 Plan 01: WXT Scaffold + Storage Schema + Vitest Summary

**One-liner:** WXT 0.20.27 scaffold with locked MV3 permissions (downloads/storage/alarms + api.anthropic.com), four typed chrome.storage.local items via @wxt-dev/storage defineItem, and Vitest wired with all 6 storage schema tests passing.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Scaffold WXT project and configure manifest permissions | fe2622c | package.json, wxt.config.ts, tsconfig.json, .gitignore, entrypoints/popup/* |
| 2 | Define storage schema items and write storage-schema tests | 18a00a3 | entrypoints/background.ts, vitest.config.ts, tests/storage-schema.test.ts, tsconfig.json |

## Verification Results

- `npx wxt build` exits 0
- manifest.json permissions: `["downloads","storage","alarms"]`
- manifest.json host_permissions: `["https://api.anthropic.com/*"]`
- No "tabs" or "webRequest" in manifest
- `npx vitest run tests/storage-schema.test.ts` — 6/6 tests pass
- Storage key names confirmed final: `local:enabled`, `local:monthlyCount`, `local:monthlyResetDate`, `local:rules`
- No chrome.* API calls at module level in background.ts

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] tsconfig.json extends .wxt/tsconfig.json breaks vitest 3.x on Windows**
- **Found during:** Task 2 — first vitest run
- **Issue:** vitest 3.2.6 ships its own bundled vite 8.x. That vite uses `tsconfck` to resolve tsconfig extends chains, and on Windows it URL-encodes the path (spaces → `%20`). The resulting URL-encoded path fails `Cannot find module '.wxt/tsconfig.json'`.
- **Fix:** Replaced `{ "extends": ".wxt/tsconfig.json" }` with inlined compilerOptions copied from .wxt/tsconfig.json. Also added `esbuild: { tsconfigRaw: {...} }` to vitest.config.ts as a belt-and-suspenders guard.
- **Files modified:** tsconfig.json, vitest.config.ts
- **Commit:** 18a00a3

**2. [Rule 2 - Scaffold] WXT init is interactive-only — scaffolded manually**
- **Found during:** Task 1
- **Issue:** `npx wxt@latest init . --template react-ts` does not support `--yes` or non-interactive mode. The CLI exits with `CACError: Unknown option '--yes'` and a non-zero code.
- **Fix:** Created all required WXT files manually (package.json, wxt.config.ts, tsconfig.json, .gitignore, entrypoints/popup/{index.html,main.tsx,App.tsx}) matching the react-ts template structure.
- **Files created:** package.json, wxt.config.ts, tsconfig.json, .gitignore, entrypoints/popup/*
- **Commit:** fe2622c

## Known Stubs

- `entrypoints/popup/App.tsx` — renders placeholder "Auto-renaming downloads using AI." text. This is intentional; the popup UI is Plan 3 scope. No data source is missing for this plan's goal.
- `defineBackground(() => { /* Placeholder — download hook implemented in Plan 02 */ })` — intentional stub per plan spec.

## Threat Flags

None. Manifest permissions verified post-build. No new network endpoints or auth paths introduced beyond the declared `https://api.anthropic.com/*` host permission.

## Self-Check: PASSED

All created files confirmed on disk. Both task commits (fe2622c, 18a00a3) confirmed in git log. Build and tests verified green.
