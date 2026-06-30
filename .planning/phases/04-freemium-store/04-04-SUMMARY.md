---
phase: 04-freemium-store
plan: 04
subsystem: ui
tags: [react, fetch, promise-race, vitest, testing-library, license-key]

requires:
  - phase: 04-freemium-store
    provides: storageLocalLicenseKey (04-01), /validate-key worker route (04-02), popup freemium UI verification (04-03)
provides:
  - 5-second Promise.race timeout on handleActivateKey's fetch call (closes T-04-16)
  - tests/popup-key-redemption.test.tsx — regression coverage for the Activate flow
affects: [04-05 (store submission readiness), future premium-tier work]

tech-stack:
  added: []
  patterns:
    - "All Worker fetch() calls wrapped in Promise.race with 5s setTimeout reject — consistent with entrypoints/background.ts"
    - "Timeout rejects with TypeError so existing 'is this a network error' branch (e instanceof TypeError) correctly routes timeouts to network-error copy, not invalid-key copy"

key-files:
  created:
    - tests/popup-key-redemption.test.tsx
  modified:
    - entrypoints/popup/App.tsx

key-decisions:
  - "Reconciliation plan, not new implementation — handleActivateKey, showKeyInput state, and SettingsScreen JSX were already shipped in a prior ad-hoc popup redesign; this plan verified them against must-haves rather than building from scratch"
  - "Closed one real gap found during verification: handleActivateKey's fetch had no timeout, unlike every other Worker call in the codebase — added the same Promise.race(fetch, 5000ms-reject) pattern used in background.ts"
  - "Cross-context staleness concern from Codex review is moot: there is only one extension UI surface (popup contains all three screens); options/App.tsx is an intentional 9-line stub directing users to the popup"

requirements-completed: [MON-02, MON-03]

duration: 18min
completed: 2026-06-30
---

# Phase 4 Plan 04: Key Redemption Flow Summary

**Closed a real DoS gap (no timeout on the license-key activation fetch) and added the first regression test suite for the Activate flow — 6 tests covering reveal/collapse, empty-input guard, success, invalid key, network error, and timeout.**

## Performance

- **Duration:** 18 min
- **Started:** 2026-06-30T05:49:00Z
- **Completed:** 2026-06-30T05:53:30Z
- **Tasks:** 1
- **Files modified:** 2

## Accomplishments
- Verified `handleActivateKey` in `entrypoints/popup/App.tsx` against all 5 must-have truths from the plan (POST shape, success path, invalid-key error, network-error distinction via `e instanceof TypeError`, disabled-button guard) — all confirmed correct by inspection
- Found and closed a real gap: the fetch call had no client-side timeout, unlike `entrypoints/background.ts`'s Worker calls (CLAUDE.md-mandated 5-second `Promise.race` pattern). A hung `/validate-key` request would have left `keyActivating` stuck `true` forever with no user-facing error
- Added `tests/popup-key-redemption.test.tsx` with 6 regression tests, the first automated coverage for this flow
- Confirmed `entrypoints/options/App.tsx`'s stub status is intentional — no work needed there

## Task Commits

Each task was committed atomically:

1. **Task 1: Verify popup key redemption flow against must-haves and write regression tests** - `2e2c16b` (feat)

## Files Created/Modified
- `entrypoints/popup/App.tsx` - Wrapped `handleActivateKey`'s fetch in `Promise.race([fetch(...), timeout-reject-TypeError-after-5000ms])`; also captures the prior ad-hoc popup-redesign diff that was uncommitted at session start (full 3-screen popup UI, key redemption JSX, isPremium wiring) since this file's freemium/key-redemption logic was explicitly in this plan's scope
- `tests/popup-key-redemption.test.tsx` - New file, 6 tests: reveal/collapse of "Have a key?" link, disabled-button guard on empty/whitespace input, successful activation (storage write + isPremium flip + badge update), invalid-key error copy, network-error copy on `fetch` rejection, and 5-second timeout behavior using `vi.useFakeTimers({ shouldAdvanceTime: false })` + `advanceTimersByTimeAsync`

## Decisions Made
- Followed the plan's explicit instruction to add the missing `Promise.race` timeout — this was flagged in the plan as a known, real gap (T-04-16 in the threat register), not a new discovery requiring a Rule 4 architectural check
- Test for the timeout case reveals the key-input UI under real timers first (via `findByText`/`findByPlaceholderText`, which use `setTimeout`-based polling internally), then switches to `vi.useFakeTimers` only after the input is visible — enabling fake timers any earlier stalled testing-library's own polling and caused a 15s test timeout during development; this ordering matches the working pattern already used in `tests/background.test.ts`

## Deviations from Plan

### Auto-fixed Issues

**1. [Plan-directed, not Rule 1-4] Added 5-second Promise.race timeout to handleActivateKey**
- **Found during:** Task 1 verification pass
- **Issue:** `handleActivateKey`'s `fetch()` call had no timeout — a hung Worker response would leave `keyActivating` `true` indefinitely with no error shown to the user. This violates the CLAUDE.md-documented pattern (all Worker calls use a 5-second `Promise.race` timeout) already applied in `entrypoints/background.ts`.
- **Fix:** Wrapped the fetch in `Promise.race([fetch(...), timeout-promise])`, rejecting with `new TypeError('timeout')` after 5000ms so the existing `e instanceof TypeError` branch correctly routes timeouts to the network-error copy.
- **Files modified:** `entrypoints/popup/App.tsx`
- **Verification:** New test "a hung fetch past 5 seconds times out with the network-error copy and resets keyActivating" passes; full suite green; `npx wxt build` exits 0.
- **Committed in:** `2e2c16b` (Task 1 commit)

---

**Total deviations:** 1 (plan-directed gap closure, explicitly called out in the plan text as T-04-16 — not an executor-discovered deviation under Rules 1-4)
**Impact on plan:** Necessary correctness/reliability fix, exactly as scoped by the plan. No scope creep.

## Issues Encountered
- Initial test for the 5-second timeout case timed out at the Vitest test-runner level (15s) because `vi.useFakeTimers()` was enabled before the `findByText`/`findByPlaceholderText` calls used to reveal the key-input UI — those calls rely on real-timer-based polling internally. Resolved by reordering: reveal the UI under real timers first, then enable fake timers only for the timeout-specific assertions.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Key redemption flow is verified, gap-closed, and test-covered. No outstanding work in this plan.
- Phase 4 still has two open human-action checkpoints from earlier plans (04-02 Cloudflare KV deploy, 04-05 GitHub Pages) that block store submission — unrelated to this plan's scope.
- `src/lib/constants.ts` still has placeholder `UPGRADE_URL` / `CHROME_STORE_URL` values pending Trevor's manual replacement before submission.

---
*Phase: 04-freemium-store*
*Completed: 2026-06-30*

## Self-Check: PASSED
- FOUND: entrypoints/popup/App.tsx
- FOUND: tests/popup-key-redemption.test.tsx
- FOUND: commit 2e2c16b
