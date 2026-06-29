---
phase: 04-freemium-store
plan: "01"
subsystem: freemium-gate
tags: [freemium, alarms, notifications, storage, background]
dependency_graph:
  requires: [03-05-SUMMARY.md]
  provides: [freemium-gate, monthly-alarm-reset, upgrade-notification]
  affects: [entrypoints/background.ts, src/lib/storage.ts, wxt.config.ts]
tech_stack:
  added: []
  patterns: [chrome.alarms monthly reset, chrome.notifications upgrade prompt, module-top-level MV3 listeners]
key_files:
  created: [tests/freemium-storage.test.ts]
  modified: [src/lib/storage.ts, wxt.config.ts, entrypoints/background.ts]
decisions:
  - UPGRADE_URL set to placeholder 'https://example.com/upgrade' — Trevor replaces before Web Store submission
  - Gate reads licenseKey + monthlyCount at top of try block before enabled check — gate fires even when extension disabled state doesn't matter
  - originalName computed before gate so it can be passed to suggest() on gate trigger
  - defineBackground() made async to allow await checkMissedReset() + setupAlarms() at startup
metrics:
  duration: "~3 minutes"
  completed: "2026-06-29"
  tasks_completed: 2
  files_changed: 3
---

# Phase 4 Plan 01: Freemium Gate + Alarm Reset + Upgrade Notification Summary

**One-liner:** Freemium enforcement gate (5 free/month) in service worker using storageLocalLicenseKey, chrome.alarms monthly reset, and Chrome notification upgrade prompt with button handler.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 (TDD) | Add storageLocalLicenseKey + notifications permission | 1334152 | src/lib/storage.ts, wxt.config.ts |
| 1 RED | Failing tests for storageLocalLicenseKey | 66b4346 | tests/freemium-storage.test.ts |
| 2 | Freemium gate + alarms + notification listener | 7990058 | entrypoints/background.ts |

## What Was Built

### src/lib/storage.ts
Added `storageLocalLicenseKey` as the final export — `storage.defineItem<string | null>('local:licenseKey', { fallback: null })`. Typed as `string | null` with null fallback. `isPremium` derived as `!!licenseKey` at call sites.

### wxt.config.ts
Added `'notifications'` to the manifest `permissions` array alongside `downloads`, `storage`, `alarms`.

### entrypoints/background.ts
Full freemium system wired in:

1. **`UPGRADE_URL`** const at module top level — placeholder, Trevor replaces pre-submission.
2. **`getFirstOfNextMonthMs()`** — returns Unix ms for the 1st of next month.
3. **`checkMissedReset()`** — reads `storageMonthlyResetDate`, resets counter + date if stored month is behind current month. Called on every service worker startup.
4. **`setupAlarms()`** — creates `monthlyReset` alarm (when: first of next month, periodInMinutes: 43200) only if not already registered.
5. **`chrome.notifications.onButtonClicked` listener** at module top level — button 0 opens UPGRADE_URL in new tab.
6. **`chrome.alarms.onAlarm` listener** at module top level — on `monthlyReset`, resets `storageMonthlyCount` to 0, updates `storageMonthlyResetDate`, reschedules to next month.
7. **Freemium gate** in `handleDeterminingFilename` — at top of try block, reads `licenseKey + isPremium + monthlyCount`. If `!isPremium && monthlyCount >= 5`: calls `suggest({ filename: originalName })`, sets `suggested = true`, fires `chrome.notifications.create('limitReached', ...)` with "Upgrade to Premium" button, returns early.
8. **`originalName` moved** to top of try block (before gate) — was previously after several storage reads; required for gate's suggest() call.
9. **`defineBackground()` made async** to allow `await checkMissedReset()` + `await setupAlarms()`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing] `suggest({ filename: originalName })` sets `suggested = true` before early return**

- **Found during:** Task 2 implementation review
- **Issue:** The plan spec included `suggested = true` in the gate block — correctly included in implementation. No deviation needed; included as written.
- **Fix:** N/A — plan was correct.

None — plan executed exactly as written.

## Verification Results

- `wxt build` exits 0, no TypeScript errors
- `storageLocalLicenseKey` appears in storage.ts at line 34 (defineItem export) and background.ts at lines 10 (import) + 87 (usage)
- `monthlyReset` appears in background.ts at lines 47, 49, 65, 71 (alarm creation + onAlarm listener)
- `chrome.notifications.create` appears in background.ts at line 94 (inside gate block)
- `notifications` appears in wxt.config.ts at line 12 (permissions array)
- All 68 tests pass (11 test files, including new freemium-storage.test.ts with 4 tests)

## Known Stubs

- `UPGRADE_URL = 'https://example.com/upgrade'` in `entrypoints/background.ts` line 20 — intentional placeholder; Trevor replaces with real premium upgrade page URL before Web Store submission (tracked in Phase 4 todos in STATE.md).

## Threat Flags

None — all trust boundary items were pre-assessed in the plan's threat model (T-04-01 through T-04-04), all accepted for v1.

## TDD Gate Compliance

- RED gate commit: `66b4346` — `test(04-01): add failing tests for storageLocalLicenseKey`
- GREEN gate commit: `1334152` — `feat(04-01): add storageLocalLicenseKey and notifications permission`
- Gate sequence valid.

## Self-Check: PASSED

All files exist. All commits verified present. No unexpected deletions detected.
