---
phase: 04-freemium-store
plan: 06
subsystem: notifications
tags: [chrome.notifications, mv3, defensive-coding, vitest]

# Dependency graph
requires:
  - phase: 04-freemium-store
    provides: limitReached notification + onButtonClicked listener (04-01)
provides:
  - notifId-guarded onButtonClicked listener so only the 'limitReached' notification opens UPGRADE_URL
  - exported shouldOpenUpgradeUrl() pure function for direct unit testing
affects: [04-freemium-store, store-submission]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Extract listener guard conditions into small exported pure functions for unit testability, instead of mocking addListener or stubbing module-scope side effects"

key-files:
  created: []
  modified:
    - entrypoints/background.ts
    - tests/background.test.ts

key-decisions:
  - "Used the pure-function extraction approach (shouldOpenUpgradeUrl) recommended as the preferred path in the plan, rather than stubbing chrome.notifications.onButtonClicked.addListener at import time — avoids brittle module-mock-timing issues since background.ts is already imported by other tests in the same file."

patterns-established:
  - "Pattern: extract testable guard conditions from top-level MV3 listeners into small exported pure functions (mirrors existing handleDeterminingFilename export pattern)."

requirements-completed: [NOTIF-01]

# Metrics
duration: 6min
completed: 2026-06-30
---

# Phase 04 Plan 06: Notification Button-Click Guard Summary

**Guarded `chrome.notifications.onButtonClicked` on `notifId === 'limitReached'` (not just button index), closing the Codex cross-AI review MEDIUM finding, via an exported `shouldOpenUpgradeUrl()` pure function with 3 new regression tests.**

## Performance

- **Duration:** 6 min
- **Started:** 2026-06-30T05:34:22Z
- **Completed:** 2026-06-30T05:36:25Z
- **Tasks:** 1 completed
- **Files modified:** 2

## Accomplishments
- `entrypoints/background.ts` onButtonClicked listener now checks `notifId === 'limitReached' && btnIdx === 0` via the extracted `shouldOpenUpgradeUrl` helper
- `shouldOpenUpgradeUrl` exported for direct unit testing (same pattern as existing `handleDeterminingFilename`)
- 3 new regression tests cover matching case, non-matching notifId, and non-matching button index
- Full test suite (10 tests in tests/background.test.ts) passes; `npx wxt build` exits 0

## Task Commits

Each task was committed atomically:

1. **Task 1: Add notification ID guard to onButtonClicked listener** - `3352f3f` (fix)

**Plan metadata:** (this commit, to follow)

## Files Created/Modified
- `entrypoints/background.ts` - Listener condition changed from `btnIdx === 0` to a guarded `shouldOpenUpgradeUrl(notifId, btnIdx)` check; new exported pure function added
- `tests/background.test.ts` - Added `describe('shouldOpenUpgradeUrl — notification button-click guard', ...)` block with 3 test cases

## Decisions Made
- Chose the pure-function extraction approach over import-time `addListener` stubbing, per the plan's stated preference — avoids brittleness from background.ts already being imported earlier in the same test file (module-level `addListener` call would have already run).

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Codex review MEDIUM finding "notification button-click should guard on notification ID" is now closed
- Notification routing is unit-tested
- This was the final plan in Phase 4's wave 2; remaining Phase 4 work is the two human-action checkpoints (04-02 Cloudflare KV deploy, 04-05 GitHub Pages) and the store-asset/URL-placeholder todos tracked in STATE.md

---
*Phase: 04-freemium-store*
*Completed: 2026-06-30*

## Self-Check: PASSED

- FOUND: entrypoints/background.ts
- FOUND: tests/background.test.ts
- FOUND: .planning/phases/04-freemium-store/04-06-SUMMARY.md
- FOUND: 3352f3f (task commit)
