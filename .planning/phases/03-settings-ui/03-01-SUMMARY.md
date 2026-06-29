---
phase: 03-settings-ui
plan: 01
subsystem: ui
tags: [tailwindcss, react, chrome-extension, storage, wxt]

# Dependency graph
requires:
  - phase: 02-rename-engine
    provides: background.ts with storageRules, handleDeterminingFilename, and rename logic
provides:
  - Tailwind CSS v4 compiled and available across all entrypoints
  - lucide-react importable for icons
  - src/lib/storage.ts as single source of truth for all 6 storage items
  - storageCustomRules (local:customRules) and storageConflict (local:pendingConflict) storage items
  - Conflict detection in handleDeterminingFilename cache-hit path
  - Options page scaffold building to options.html
affects:
  - 03-02 (popup UI — imports storage items from src/lib/storage)
  - 03-03 (options page rule viewer — replaces App.tsx placeholder)
  - 03-04 (custom rules and conflict modal — reads storageConflict on mount)
  - 03-05 (freemium gate — imports storageMonthlyCount from src/lib/storage)

# Tech tracking
tech-stack:
  added:
    - tailwindcss@4.3.1 (devDep)
    - "@tailwindcss/vite@4.3.1" (devDep)
    - lucide-react@1.22.0 (dep)
  patterns:
    - Tailwind v4 CSS-first config — single @import "tailwindcss" in src/assets/tailwind.css, no config file
    - Storage items centralized in src/lib/storage.ts, imported by all consumers
    - Options page scaffolded as WXT entrypoint under entrypoints/options/

key-files:
  created:
    - src/assets/tailwind.css
    - src/lib/storage.ts
    - entrypoints/options/index.html
    - entrypoints/options/main.tsx
    - entrypoints/options/App.tsx
  modified:
    - wxt.config.ts
    - package.json
    - entrypoints/background.ts
    - entrypoints/popup/main.tsx
    - tests/background.test.ts
    - tests/storage-schema.test.ts

key-decisions:
  - "Tailwind v4 CSS-first: @import 'tailwindcss' is the complete config — no tailwind.config.js, no content array"
  - "@tailwindcss/vite placed in devDependencies, lucide-react in dependencies"
  - "storage.ts exports via named exports; background.ts drops its own defineItem calls and re-exports nothing (tests updated to import from storage.ts directly)"
  - "Conflict detection: first-conflict-wins (D-22) — storageConflict.setValue only when existing value is null"

patterns-established:
  - "Storage pattern: all chrome.storage.local items live in src/lib/storage.ts; no defineItem calls elsewhere"
  - "Tailwind pattern: import tailwind.css as first import in every entrypoint main.tsx"
  - "Options page pattern: WXT entrypoint under entrypoints/options/ mirrors popup structure"

requirements-completed: [PATT-07, PATT-08, NOTIF-02]

# Metrics
duration: 4min
completed: 2026-06-29
---

# Phase 3 Plan 01: Tailwind + Storage Centralization + Options Scaffold Summary

**Tailwind v4 wired via @tailwindcss/vite plugin, all storage items moved to src/lib/storage.ts with conflict detection in the rename cache-hit path, and options page scaffold building to options.html**

## Performance

- **Duration:** 4 min
- **Started:** 2026-06-29T05:00:16Z
- **Completed:** 2026-06-29T05:02:36Z
- **Tasks:** 3
- **Files modified:** 10

## Accomplishments
- Tailwind CSS v4 installed and compiling — popup CSS bundle 15.33 kB; no config file required
- All 6 storage items consolidated in src/lib/storage.ts (4 moved, 2 new: customRules and pendingConflict)
- Conflict detection wired in handleDeterminingFilename cache-hit branch with first-conflict-wins semantics
- Options page scaffold builds to .output/chrome-mv3/options.html; all 32 unit tests pass

## Task Commits

Each task was committed atomically:

1. **Task 1: Install Tailwind CSS v4 and lucide-react; wire Tailwind into WXT build** - `6cdc85b` (feat)
2. **Task 2: Extract storage items to src/lib/storage.ts and add customRules + pendingConflict** - `b7c6802` (feat)
3. **Task 3: Add conflict detection to handleDeterminingFilename and scaffold options page** - `89cebc7` (feat)

## Files Created/Modified
- `src/assets/tailwind.css` - Single @import "tailwindcss" (Tailwind v4 CSS-first config)
- `src/lib/storage.ts` - All 6 storage items: storageEnabled, storageMonthlyCount, storageMonthlyResetDate, storageRules, storageCustomRules, storageConflict
- `wxt.config.ts` - Added @tailwindcss/vite plugin in vite.plugins
- `package.json` - Added tailwindcss@4.3.1, @tailwindcss/vite@4.3.1 (devDeps), lucide-react (dep)
- `entrypoints/background.ts` - Removed 4 defineItem calls; added storageCustomRules/storageConflict import; added conflict detection in cache-hit branch
- `entrypoints/popup/main.tsx` - Added tailwind.css as first import
- `entrypoints/options/index.html` - Minimal HTML with id="app" and script src="./main.tsx"
- `entrypoints/options/main.tsx` - React entry mirroring popup/main.tsx
- `entrypoints/options/App.tsx` - Placeholder with "Download Renamer — Options" heading
- `tests/background.test.ts` - Updated storageRules import to src/lib/storage (Rule 1 fix)
- `tests/storage-schema.test.ts` - Updated all storage imports to src/lib/storage (Rule 1 fix)

## Decisions Made
- Tailwind v4 CSS-first config chosen (no tailwind.config.js) — v4's @tailwindcss/vite plugin auto-scans source files
- @tailwindcss/vite and tailwindcss moved to devDependencies to match plan acceptance criteria
- storageConflict uses `fallback: null` (matches @wxt-dev/storage pattern for nullable types)
- Options entrypoint mirrors popup structure exactly for consistency

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed broken test imports after storage item extraction**
- **Found during:** Task 2 (Extract storage items to src/lib/storage.ts)
- **Issue:** tests/background.test.ts and tests/storage-schema.test.ts imported storageRules and other items from entrypoints/background.ts. After removing defineItem calls from background.ts, those imports resolved to undefined, causing 7 test failures.
- **Fix:** Updated both test files to import storage items from src/lib/storage instead of entrypoints/background.ts. handleDeterminingFilename continues to be imported from background.ts.
- **Files modified:** tests/background.test.ts, tests/storage-schema.test.ts
- **Verification:** npm test — 32/32 tests pass
- **Committed in:** b7c6802 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 — broken imports from storage extraction)
**Impact on plan:** Necessary correctness fix. No scope creep.

## Issues Encountered
- None beyond the Rule 1 auto-fix above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Tailwind utility classes are available in popup and options entrypoints
- lucide-react is importable for icon use in all subsequent UI plans
- src/lib/storage.ts is ready for popup and options page consumers to import from
- storageConflict is written by background.ts; options page (plan 03-04) reads on mount to show conflict modal
- Options page App.tsx placeholder is ready for replacement in plan 03-03

---
*Phase: 03-settings-ui*
*Completed: 2026-06-29*
