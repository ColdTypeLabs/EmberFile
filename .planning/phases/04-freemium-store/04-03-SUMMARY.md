---
phase: 04-freemium-store
plan: 03
subsystem: ui
tags: [react, testing-library, jsdom, vitest, freemium, popup]

# Dependency graph
requires:
  - phase: 04-freemium-store (plan 01)
    provides: storageLocalLicenseKey, storageMonthlyCount storage items used to derive isPremium and gate the banner
provides:
  - Verified confirmation that entrypoints/popup/App.tsx already implements isPremium wiring, the at-limit upgrade banner, and the FREE/PREMIUM footer badge per 04-UI-SPEC.md D-08/D-09/D-10
  - Automated regression test suite (tests/popup-freemium.test.tsx) covering banner visibility, premium bypass, and upgrade click behavior — previously untested
  - jsdom + @testing-library/react test infrastructure now available project-wide for any future component tests
affects: [04-04, 04-store-submission]

# Tech tracking
tech-stack:
  added: [jsdom, "@testing-library/react", "@testing-library/jest-dom"]
  patterns: ["React component tests render via @testing-library/react against fakeBrowser-backed chrome.storage.local, mirroring the existing tests/background.test.ts fakeBrowser pattern"]

key-files:
  created: [tests/popup-freemium.test.tsx]
  modified: [vitest.config.ts, package.json, package-lock.json]

key-decisions:
  - "No production code changes to entrypoints/popup/App.tsx were needed — all 5 must-have truths from the plan's goal-backward verification already matched the shipped implementation exactly"
  - "Installed jsdom + @testing-library/react + @testing-library/jest-dom as devDependencies — plan's <interfaces> block assumed these were already present (referencing tests/background.test.ts), but they were not in package.json or node_modules; verified package legitimacy via npm registry (jsdom v29.1.1, @testing-library/react v16.3.2) before installing per Rule 3"
  - "Set vitest test.environment to 'jsdom' in vitest.config.ts — required for React component rendering; prior config had no environment set (background.test.ts didn't need DOM since it tests a pure function, not a component)"

patterns-established:
  - "Component-level freemium UI tests stub chrome.tabs.create manually via vi.fn() since fakeBrowser does not implement the tabs API"

requirements-completed: [MON-02]

# Metrics
duration: 12min
completed: 2026-06-30
---

# Phase 04 Plan 03: Popup Freemium UI Reconciliation Summary

**Verified the already-shipped popup freemium UI (isPremium wiring, at-limit upgrade banner, FREE/PREMIUM badge) against 04-UI-SPEC.md and added the missing regression test suite — no production code changes required, but jsdom/testing-library had to be installed since they weren't actually present despite the plan's assumption.**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-06-30T05:42:00Z
- **Completed:** 2026-06-30T05:54:00Z
- **Tasks:** 1
- **Files modified:** 4 (1 created, 3 modified)

## Accomplishments
- Confirmed by direct inspection that `entrypoints/popup/App.tsx` already satisfies all 5 must-have truths: `showUpgradeBanner = !isPremium && count >= 5` gate, amber banner styling (`#FFFBEB`/`#FDE68A` = amber-50/amber-200 hex literals, intentionally not renamed), `PREMIUM ✓` / `FREE` + `Upgrade →` footer badge, both upgrade buttons calling `chrome.tabs.create({ url: UPGRADE_URL })`, and `isPremium` derived from `storageLocalLicenseKey.getValue()` in the mount `Promise.all`
- Created `tests/popup-freemium.test.tsx` with 4 regression tests covering banner-at-limit, premium-bypasses-banner, banner-hidden-under-limit, and upgrade-button-click-opens-tab
- Discovered and fixed a blocking gap: `@testing-library/react`, `@testing-library/jest-dom`, and `jsdom` were referenced by the plan as "already a devDependency" but were absent from `package.json`/`node_modules` — installed all three after verifying legitimacy on the npm registry
- Set `test.environment: 'jsdom'` in `vitest.config.ts` (previously unset — only needed once a component-rendering test existed)
- Confirmed full test suite (43 tests across 7 files) and `npx wxt build` both pass with no regressions

## Task Commits

1. **Task 1: Verify popup freemium UI against must-haves and write regression tests** - `93bd818` (test)

**Plan metadata:** (this commit, to follow)

## Files Created/Modified
- `tests/popup-freemium.test.tsx` - New regression suite for popup freemium UI (banner visibility, badge state, upgrade click)
- `vitest.config.ts` - Added `test.environment: 'jsdom'` to support React component rendering
- `package.json` / `package-lock.json` - Added jsdom, @testing-library/react, @testing-library/jest-dom as devDependencies

## Decisions Made
- Did not modify `entrypoints/popup/App.tsx` — all must-have truths verified to already match the UI-SPEC contract exactly; per plan instructions, no "fix" was applied to the amber color hex literals since they are functionally equivalent to the named Tailwind utility classes
- Treated the missing jsdom/testing-library packages as a Rule 3 blocking-issue fix (not a Rule 4 architectural change) since they are pure dev/test tooling additions with no production code or API surface impact; verified both packages exist legitimately on the npm registry before installing, per the package-manager-install safety exclusion

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Installed missing jsdom/testing-library devDependencies**
- **Found during:** Task 1 (writing tests/popup-freemium.test.tsx)
- **Issue:** The plan's `<action>` block instructed using `@testing-library/react` and stated it was "already a devDependency — confirm via `cat package.json` if uncertain." Checking `package.json` and `node_modules` showed neither `@testing-library/react` nor `jsdom` was actually installed (the plan's threat register entry T-04-SC also incorrectly assumed "No new packages"). `@webext-core/fake-browser` was present only as a hoisted transitive dependency.
- **Fix:** Verified `jsdom`, `@testing-library/react`, and `@testing-library/jest-dom` are legitimate, well-established packages via `npm view <pkg> version` against the public registry, then ran `npm install --save-dev jsdom @testing-library/react @testing-library/jest-dom`. Also added `test.environment: 'jsdom'` to `vitest.config.ts` since no environment was previously configured.
- **Files modified:** package.json, package-lock.json, vitest.config.ts
- **Verification:** `npx vitest run tests/popup-freemium.test.tsx` passes 4/4; full suite `npx vitest run` passes 43/43; `npx wxt build` exits 0
- **Committed in:** 93bd818 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking — missing test dependencies)
**Impact on plan:** Necessary correction to a faulty plan assumption about existing devDependencies. No scope creep — only test infrastructure, no production code or new runtime dependencies.

## Issues Encountered
- Initial test run failed with `ReferenceError: React is not defined` because the project's esbuild tsconfig in `vitest.config.ts` does not set `jsx: 'automatic'`. Fixed by adding an explicit `import React from 'react'` to the test file (Rule 1 — straightforward bug fix, no plan or config change needed beyond the test file itself).
- `entrypoints/popup/App.tsx`, `entrypoints/options/App.tsx`, `src/assets/tailwind.css`, `PRIVACY.md`, `STORE-LISTING.md`, and `docs/privacy.html` showed as modified in `git status` at session start — these are pre-existing uncommitted changes from prior work (the ad-hoc popup UI redesign and 04-05/04-06 work referenced in STATE.md), not changes made by this plan. Left untouched and unstaged; out of scope for this task per the scope boundary rule.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Phase 4 plan 04-04 (key redemption flow) can now proceed; both 04-03 and 04-04 touch `entrypoints/popup/App.tsx` per the orchestrator's sequential dispatch note, and 04-03 made no changes to that file, so there is no conflict for 04-04 to rebase against.
- Test infrastructure (jsdom, @testing-library/react) is now available project-wide; 04-04's planned `tests/popup-key-redemption.test.tsx` can use the same pattern established here.
- Pre-existing uncommitted changes to `entrypoints/popup/App.tsx` and related files remain pending — these belong to other in-flight work (ad-hoc UI redesign / 04-05 / 04-06) and should be reconciled by whichever plan owns them, not by 04-03.

---
*Phase: 04-freemium-store*
*Completed: 2026-06-30*
