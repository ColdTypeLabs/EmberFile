---
phase: 03-settings-ui
fixed_at: 2026-06-29T01:12:00Z
review_path: .planning/phases/03-settings-ui/03-REVIEW.md
iteration: 1
findings_in_scope: 9
fixed: 9
skipped: 0
status: all_fixed
---

# Phase 03: Code Review Fix Report

**Fixed at:** 2026-06-29T01:12:00Z
**Source review:** `.planning/phases/03-settings-ui/03-REVIEW.md`
**Iteration:** 1

**Summary:**
- Findings in scope: 9
- Fixed: 9
- Skipped: 0

---

## Fixed Issues

### CR-01: ConflictModal handlePickCustom — stale read-modify-write race

**Files modified:** `entrypoints/options/App.tsx`
**Commit:** `487dda4`
**Applied fix:** Replaced all four read-modify-write patterns with a fresh `getValue()` call immediately before each `setValue()`. Applied to: `ConflictModal.handlePickCustom`, `RuleRow` save handler, `RuleRow` delete handler, and `CustomRuleRow` delete handler. Each now performs a fresh read and mutates only the targeted key.

---

### CR-02: wxt.config.ts — missing host permission for api.anthropic.com

**Files modified:** `wxt.config.ts`
**Commit:** `60eaade`
**Applied fix:** Expanded `host_permissions` from a single string to an array adding `'https://api.anthropic.com/*'` per the CLAUDE.md architecture spec.

---

### CR-03: background.ts — missing response.ok check and shape validation

**Files modified:** `entrypoints/background.ts`, `tests/background.test.ts`
**Commit:** `96f1431`
**Applied fix:** Added `if (!response.ok) throw new Error(...)` before `response.json()`. Changed the cast to allow optional fields and added a shape guard (`if (!body.suggestedName || !body.tag || !body.renameFormat) throw`). Updated both cache-miss test mocks to include `ok: true` so they pass the new guard.

---

### CR-04: CustomRuleModal — no length validation or prototype-pollution key rejection

**Files modified:** `entrypoints/options/App.tsx`
**Commit:** `3b80134`
**Applied fix:** Added validation at the top of `handleSubmit` before the storage write: 200-character max on both `matchText` and `renameFormat`, and an explicit rejection of `__proto__`, `constructor`, and `prototype` keys. Refactored the save path to use the pre-trimmed `trimmedMatch` / `trimmedFormat` variables rather than re-trimming on every call.

---

### WR-01: popup/App.tsx handleToggle — unhandled rejection on storage error

**Files modified:** `entrypoints/popup/App.tsx`
**Commit:** `c40e70b`
**Applied fix:** Wrapped the `storageEnabled.setValue()` call and subsequent `setState` in a `try/catch`. On error the catch block is empty (UI keeps current state) but the rejection is handled — no unhandled promise in DevTools.

---

### WR-02: popup/App.tsx useEffect — no .catch() on storage load

**Files modified:** `entrypoints/popup/App.tsx`
**Commit:** `ee46a68`
**Applied fix:** Chained `.catch(() => setState({ enabled: true, count: 0, loaded: true }))` onto the `Promise.all`. Storage failure now sets `loaded: true` with safe defaults so the popup escapes `LoadingSkeleton` instead of hanging forever.

---

### WR-03: options/App.tsx — multi-null isLoading guard has a false-negative blind spot

**Files modified:** `entrypoints/options/App.tsx`
**Commit:** `b1edab9`
**Applied fix:** Added `const [loaded, setLoaded] = useState(false)` state. Set `setLoaded(true)` inside the `.then()` after all four state setters. Changed `isLoading` from `rules === null && monthlyCount === null && customRules === null && !loadError` to `!loaded && !loadError`. The single boolean is now the definitive gate, matching the popup pattern.

---

### WR-04: background.ts — storageMonthlyCount never incremented after successful rename

**Files modified:** `entrypoints/background.ts`
**Commit:** `73d1204`
**Applied fix:** Added `const currentCount = await storageMonthlyCount.getValue(); await storageMonthlyCount.setValue(currentCount + 1);` after `suggested = true` in both the cache-hit branch and the cache-miss branch. `storageMonthlyCount` was already imported; no import changes required.

---

### WR-05: renameEngine.ts — String.replace only replaces first occurrence of each slot

**Files modified:** `src/lib/renameEngine.ts`
**Commit:** `a11de07`
**Applied fix:** Changed all three `.replace('{slot}', value)` calls to `.replaceAll('{slot}', value)` so repeated slots like `{tag}-{tag}-{date}` are fully substituted.

---

## Skipped Issues

None.

---

**Test result after all fixes:** 32/32 tests pass (`npm test`)

_Fixed: 2026-06-29T01:12:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
