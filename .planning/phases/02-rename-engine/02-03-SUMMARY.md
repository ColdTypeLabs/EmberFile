---
phase: 02-rename-engine
plan: "03"
subsystem: background-rename-engine
tags: [rename-engine, chrome-downloads, fingerprint, worker-relay, tdd, cache]
dependency_graph:
  requires: [02-01, 02-02]
  provides: [handleDeterminingFilename-real-logic, background-tests]
  affects: [entrypoints/background.ts, tests/background.test.ts, tests/suggest-guard.test.ts]
tech_stack:
  patterns: [Promise.race-timeout, read-modify-write, tdd-red-green, fakeBrowser-storage-isolation]
key_files:
  modified:
    - entrypoints/background.ts
    - tests/suggest-guard.test.ts
  created:
    - tests/background.test.ts
decisions:
  - "Used unique filenames per test to avoid @wxt-dev/storage internal cache collisions between tests (fakeBrowser.reset() clears chrome.storage.local but not the storage library's in-memory cache)"
  - "vi.advanceTimersByTimeAsync() used instead of vi.advanceTimersByTime() + await promise for correct async timer advancement in timeout test"
  - "suggest-guard.test.ts retained with 3 updated tests covering error/disabled/double-call — HOOK-OK and hookCounter tests removed"
metrics:
  duration: "~20 minutes"
  completed: "2026-06-28"
  tasks_completed: 2
  files_modified: 3
  tests_passing: 32
---

# Phase 02 Plan 03: Rename Engine Integration Summary

**One-liner:** Replaced HOOK-OK stub with real fingerprint→cache→Worker relay logic in handleDeterminingFilename, with 7 unit tests covering all execution paths (cache hit, miss, persistence, error, timeout, disabled, double-call guard).

## What Was Built

### Task 1: TDD — background.test.ts (RED) + handleDeterminingFilename (GREEN)

**RED:** Created `tests/background.test.ts` with 7 test cases. All 6 behavior tests failed against the stub implementation (HOOK-OK prefix still present). One test (double-call guard on error path) coincidentally passed because the error path already called `suggest()` with no args.

**GREEN:** Rewrote `entrypoints/background.ts`:
- Removed `hookCounter`, `resetHookCounter` (module-level state violates MV3 constraint)
- Added imports: `computeFingerprint` from `../src/lib/fingerprint`, `applyTemplate` from `../src/lib/renameEngine`
- Added `const WORKER_URL = import.meta.env.VITE_WORKER_URL`
- Cache hit path: `storageRules.getValue()` → increment matchCount → `storageRules.setValue()` → `applyTemplate()` → `suggest({ filename: stem+ext, conflictAction: 'uniquify' })`
- Cache miss path: `Promise.race([fetch(WORKER_URL, ...), setTimeout(5000)]` → parse JSON → D-15 read-modify-write → `suggest({ filename: suggestedName+ext })`
- Error/timeout: caught by `catch` → `finally` calls `suggest()` with no args
- `suggest()` preserved in `finally` block per CLAUDE.md architecture constraint

### Task 2: Full Suite Green Gate + Build Verification

Updated `tests/suggest-guard.test.ts`:
- Removed `resetHookCounter` import and `beforeEach` call (function no longer exported)
- Removed `hookCounter increments across calls` test (hookCounter removed)
- Removed `[HOOK-OK-1]-` prefix assertions (stub removed)
- Added `fetch` stub in `beforeEach` to prevent cache-miss Worker calls hanging disabled/error tests

**Results:**
- `npm test`: 32/32 tests pass across 5 test files
- `npx wxt build`: exits 0, no TypeScript errors, 157KB bundle
- `manifest.json` host_permissions: `["https://*.workers.dev/*"]` — workers.dev present, api.anthropic.com absent

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Test isolation: @wxt-dev/storage internal cache not cleared by fakeBrowser.reset()**
- **Found during:** Task 1 GREEN — tests 2 and 3 both used `receipt-2024-03-15.pdf`, causing matchCount: 2 on the second run
- **Issue:** `@wxt-dev/storage`'s `defineItem` maintains an internal in-memory cache. `fakeBrowser.reset()` replaces the chrome.storage mock but does not invalidate the library's cache. Test 2's stored rule leaked into test 3.
- **Fix:** Changed test 3 to use a unique filename (`bank-statement-2024-12.pdf`) so it has a distinct fingerprint key (`bank-statement.pdf`) that never collides with test 2's `receipt.pdf`. Also added `await fakeBrowser.storage.local.clear()` to `beforeEach` for defensive isolation.
- **Files modified:** `tests/background.test.ts`

**2. [Rule 1 - Bug] Timeout test: vi.advanceTimersByTime() insufficient for async Promise.race**
- **Found during:** Task 1 GREEN — timeout test hit the 5-second (then 10-second) test timeout even with fake timers
- **Issue:** `vi.advanceTimersByTime(6000)` synchronously advances the clock but doesn't flush microtasks. The Promise.race rejection from setTimeout fires but the async chain doesn't resolve before the test assertion.
- **Fix:** Used `await vi.advanceTimersByTimeAsync(6000)` which advances timers AND flushes pending microtasks/promises. Set test timeout to 15000ms.
- **Files modified:** `tests/background.test.ts`

**3. [Rule 2 - Missing Critical Functionality] Added fetch stub to suggest-guard.test.ts beforeEach**
- **Found during:** Task 2 — suggest-guard tests without a fetch stub would call the real WORKER_URL (undefined) or hang on cache-miss path
- **Fix:** Added `vi.stubGlobal('fetch', vi.fn().mockRejectedValue(...))` to ensure suggest-guard tests never trigger network calls

## Known Stubs

None — all rename paths are fully wired. `VITE_WORKER_URL` is a build-time placeholder; the runtime assertion (`if (!WORKER_URL) throw`) ensures the error is visible in dev and caught gracefully (suggest() called with no args) in production before the Worker is deployed.

## Threat Flags

None — no new network endpoints or auth paths beyond what the plan's threat model covered.

## Self-Check

- [x] `tests/background.test.ts` exists — FOUND
- [x] `entrypoints/background.ts` modified — FOUND
- [x] `tests/suggest-guard.test.ts` updated — FOUND
- [x] No `HOOK-OK` in background.ts — CONFIRMED
- [x] No `hookCounter` in background.ts — CONFIRMED
- [x] `Promise.race` in background.ts — CONFIRMED
- [x] `5000` in background.ts — CONFIRMED
- [x] `finally` block with suggest() guard — CONFIRMED
- [x] All 32 tests pass — CONFIRMED
- [x] wxt build exits 0 — CONFIRMED

## Self-Check: PASSED
