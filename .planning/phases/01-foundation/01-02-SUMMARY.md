---
phase: 01-foundation
plan: "02"
subsystem: downloads
tags: [chrome-mv3, onDeterminingFilename, suggest, vitest, wxt, service-worker]

requires:
  - phase: 01-01
    provides: "storage schema (storageEnabled, storageMonthlyCount, storageMonthlyResetDate, storageRules) and WXT scaffold"

provides:
  - "handleDeterminingFilename exported function with suggest() finally-guard"
  - "resetHookCounter export for test isolation"
  - "onDeterminingFilename listener wired inside defineBackground()"
  - "5 unit tests proving suggest() is always called in all code paths"

affects:
  - 01-03
  - phase-02-rename-engine

tech-stack:
  added: []
  patterns:
    - "try/catch/finally with suggested boolean guard — prevents double-call and hang on error"
    - "Extract listener to named export for unit testability (handleDeterminingFilename)"
    - "Module-level hookCounter resets on SW restart (intentional D-02 behavior)"

key-files:
  created:
    - tests/suggest-guard.test.ts
  modified:
    - entrypoints/background.ts

key-decisions:
  - "Added catch block in addition to finally block — @wxt-dev/storage errors propagate through the Promise chain, causing the test to see a rejected promise rather than calling suggest(). Catching errors inline ensures the function always resolves and suggest() fires."
  - "hookCounter is module-level (not chrome.storage) — intentional per D-02. Counter is ephemeral debug data that resets on SW restart; persistence would require storage reads on every download."

patterns-established:
  - "suggest() in finally: always call suggest() in a finally block to guarantee downloads never hang"
  - "suggested boolean guard: prevents double-call when try block calls suggest() before the finally runs"
  - "Export handler separately from defineBackground: enables Vitest unit testing without Chrome environment"

requirements-completed:
  - CORE-01
  - CORE-05
  - QUAL-02

duration: 10min
completed: 2026-06-28
---

# Phase 01 Plan 02: Download Hook Summary

**onDeterminingFilename listener with catch/finally suggest() guard proven by 11 unit tests (TDD RED/GREEN)**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-06-28T16:04:00Z
- **Completed:** 2026-06-28T16:05:30Z
- **Tasks:** 1 (Task 2 auto-approved per config)
- **Files modified:** 2

## Accomplishments

- Implemented `handleDeterminingFilename` with `[HOOK-OK-{n}]-` prefix and suggest() finally-guard
- Exported `resetHookCounter` for clean test isolation between runs
- Wired listener inside `defineBackground()` per MV3 constraints
- TDD RED/GREEN cycle: tests failed first, then implementation made them pass
- All 11 tests pass (6 storage-schema + 5 suggest-guard), exit code 0

## Task Commits

1. **Task 1: Write suggest-guard tests (RED), then implement the hook (GREEN)** - `9902481` (feat)

**Plan metadata commit:** (pending — created with SUMMARY)

## Files Created/Modified

- `tests/suggest-guard.test.ts` - 5 unit tests: prefix format, disabled fallback, storage error, double-call guard, counter increment
- `entrypoints/background.ts` - Added `handleDeterminingFilename`, `resetHookCounter`, wired `onDeterminingFilename.addListener`

## Decisions Made

- Added explicit `catch {}` block between `try` and `finally` — the `@wxt-dev/storage` `getValue()` call rejects the Promise on storage errors, which propagates past the `finally` and causes the test's `await` to throw. Catching inline lets `finally` run and the function resolve normally, matching Chrome's actual behavior (errors should not hang downloads).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Added catch block to prevent storage errors from propagating**
- **Found during:** Task 1 GREEN phase (running tests after initial implementation)
- **Issue:** Test 3 ("calls suggest exactly once when storage read throws") failed with `Error: storage failure` propagating through the Promise. The `finally` block executed but the function rejected, causing `await handleDeterminingFilename(...)` in the test to throw rather than resolve.
- **Fix:** Added explicit `catch {}` block before `finally` to swallow storage errors, matching intended behavior: errors must not hang downloads.
- **Files modified:** `entrypoints/background.ts`
- **Verification:** All 11 tests pass including the storage-error test.
- **Committed in:** `9902481` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - bug in error propagation)
**Impact on plan:** Essential correctness fix — the plan's intent was always "suggest() called even on error." The catch block implements that intent correctly.

## Issues Encountered

None beyond the auto-fixed deviation above.

## Human Verification Required (Task 2 — Auto-approved)

Task 2 is a `checkpoint:human-verify` for manual Chrome load testing. Per `auto_advance: true` config, this is auto-approved. The verification steps below must be performed manually before Phase 2 work begins:

**Build:** `npx wxt build` from repo root — confirm `.output/chrome-mv3/` exists.

**Chrome load test:**
1. `chrome://extensions` → Developer mode → Load unpacked → select `.output/chrome-mv3/`
2. Download any file → confirm it is renamed `[HOOK-OK-1]-{original}`
3. Second download → `[HOOK-OK-2]-{original}`
4. Set `enabled=false` via DevTools console → download saves with original name, does not hang
5. Check DevTools console for no CSP violations

**Status:** Pending manual verification — not blocking plan completion.

## Next Phase Readiness

- `handleDeterminingFilename` is unit-tested and hook is wired — Phase 2 rename engine can replace the `[HOOK-OK-{n}]-` stub with real Claude Haiku rename logic
- `hookCounter` will be removed in Phase 2 (D-01: debug prefix stripped when real rename is live)
- All storage schema exports from Plan 01 preserved — no regressions

---
*Phase: 01-foundation*
*Completed: 2026-06-28*
