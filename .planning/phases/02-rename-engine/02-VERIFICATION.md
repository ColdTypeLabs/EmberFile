---
phase: 02-rename-engine
verified: 2026-06-28T17:34:30Z
status: human_needed
score: 4/4 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Download a never-seen file while the extension is loaded and the Worker relay is running locally (wrangler dev)"
    expected: "File is renamed with the AI-suggested name from Claude Haiku (e.g. 'expense-report.pdf'). Rule appears in chrome.storage.local under the fingerprint key."
    why_human: "Requires a real Chrome download, real Anthropic API call through the Worker. Cannot invoke chrome.downloads.onDeterminingFilename from Vitest."
  - test: "Download the same pattern a second time (same fingerprint, different noise tokens)"
    expected: "File is renamed instantly using the cached rule. Chrome DevTools Network panel shows zero fetch calls to the Worker URL."
    why_human: "Cache-hit path requires a real Chrome session to confirm no network request is made."
  - test: "Kill the service worker via chrome://serviceworker-internals, then download a file whose rule was already learned"
    expected: "Rule is still applied (loaded from chrome.storage.local). Rename succeeds without a Worker call."
    why_human: "Service-worker restart requires manual Chrome tooling; cannot simulate in Vitest."
  - test: "Stop the wrangler dev server and attempt a download of an unknown file"
    expected: "Download completes using the original filename within 5 seconds. No hung download dialog."
    why_human: "Timeout and graceful fallback requires a real Chrome download and real network failure."
---

# Phase 2: Rename Engine — Verification Report

**Phase Goal:** Downloads are renamed intelligently — unknown patterns go to Claude Haiku; known patterns match locally with zero API calls.
**Verified:** 2026-06-28T17:34:30Z
**Status:** human_needed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths (Roadmap Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Downloading a never-seen file triggers a Claude Haiku call and the file is renamed with the AI-suggested name | ? HUMAN | Cache-miss path wired and unit-tested (background.test.ts test 2: `mockFetch called once; suggest arg = 'expense-report.pdf'`). Real Chrome + live Worker required for full confirmation. |
| 2 | Downloading the same pattern a second time applies the stored rule instantly — no network request | ? HUMAN | Cache-hit path wired and unit-tested (background.test.ts test 1: `mockFetch not called; suggest arg matches /^invoice-\d{4}-\d{2}-\d{2}-3\.pdf$/`). Real Chrome session required for full confirmation. |
| 3 | Claude API timeout or error results in the original filename being used — download completes, no hang | ✓ VERIFIED | Tests 4 & 5 in background.test.ts: `fetch throws → suggest(undefined)` and `fetch never resolves → 6000ms fake-timer advance → suggest(undefined)`. `finally` block with `if (!suggested) suggest()` present in background.ts line 87–90. |
| 4 | Learned rules survive browser restart and service worker termination | ? HUMAN | Rules are written to `chrome.storage.local` via `storageRules.setValue()` (background.ts lines 50, 80). Test 3 confirms `rules['bank-statement.pdf'].matchCount === 1` after a cache-miss. MV3 storage persistence across SW restart requires real Chrome to confirm. |

**Score:** 4/4 truths supported in code (1 fully verifiable by code inspection; 3 require human testing of Chrome-specific runtime behavior)

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/fingerprint.ts` | `computeFingerprint` pure function | ✓ VERIFIED | Exports `computeFingerprint`. 9 unit tests pass. No chrome/storage imports. |
| `src/lib/renameEngine.ts` | `applyTemplate` pure function | ✓ VERIFIED | Exports `applyTemplate`. 7 unit tests pass. No chrome/storage imports. |
| `entrypoints/background.ts` | Real rename logic: fingerprint → cache → Worker | ✓ VERIFIED | Imports both lib modules. Contains `Promise.race`, `5000`, `finally` block. No `HOOK-OK` or `hookCounter`. |
| `tests/background.test.ts` | 7 tests: cache-hit, miss, persist, error, timeout, disabled, double-call guard | ✓ VERIFIED | 7 tests present and passing. All paths covered. |
| `tests/fingerprint.test.ts` | 9 TDD unit tests | ✓ VERIFIED | 9 tests, all passing. |
| `tests/renameEngine.test.ts` | 7 TDD unit tests | ✓ VERIFIED | 7 tests, all passing. |
| `workers/rename-relay/index.ts` | Cloudflare Worker relay | ✓ VERIFIED | CORS, OPTIONS, 405, 502, 500 paths present. JSON preamble extraction regex present. `env.ANTHROPIC_API_KEY` used (not hardcoded). |
| `workers/rename-relay/wrangler.toml` | name=download-renamer-relay, main=index.ts | ✓ VERIFIED | Both fields present. No `[vars]` block. |
| `workers/rename-relay/.dev.vars.example` | Template with `ANTHROPIC_API_KEY` placeholder | ✓ VERIFIED | File exists and contains `ANTHROPIC_API_KEY`. |
| `.env` | `VITE_WORKER_URL` placeholder | ✓ VERIFIED | Contains `VITE_WORKER_URL=https://download-renamer-relay.your-subdomain.workers.dev`. |
| `wxt.config.ts` | `host_permissions` updated to `workers.dev` | ✓ VERIFIED | `host_permissions: ['https://*.workers.dev/*']`. `api.anthropic.com` absent. |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `entrypoints/background.ts` | `src/lib/fingerprint.ts` | `import { computeFingerprint }` | ✓ WIRED | Line 2 of background.ts. Used at line 41. |
| `entrypoints/background.ts` | `src/lib/renameEngine.ts` | `import { applyTemplate }` | ✓ WIRED | Line 3 of background.ts. Used at line 51. |
| `entrypoints/background.ts` | `import.meta.env.VITE_WORKER_URL` | `const WORKER_URL = import.meta.env.VITE_WORKER_URL` | ✓ WIRED | Line 25 of background.ts. Used in `fetch(WORKER_URL, ...)` at line 57. |
| `workers/rename-relay/index.ts` | `https://api.anthropic.com/v1/messages` | `fetch` with `x-api-key: env.ANTHROPIC_API_KEY` | ✓ WIRED | Lines 44–62. Key from secret binding only. |
| `storageRules` | `rules[fingerprint]` | `storageRules.getValue()` → mutate → `storageRules.setValue()` | ✓ WIRED | D-15 read-modify-write at lines 44–50 (cache hit) and 78–80 (cache miss). |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `background.ts` — cache hit | `rules[fingerprint]` | `storageRules.getValue()` → `chrome.storage.local` | Yes — written by prior cache-miss path | ✓ FLOWING |
| `background.ts` — cache miss | `suggestedName, tag, renameFormat` | `fetch(WORKER_URL)` → Worker → Anthropic API | Yes — live API call (not hardcoded) | ✓ FLOWING |
| `background.ts` — `suggest()` arg | `newStem + ext` / `suggestedName + ext` | `applyTemplate()` / Worker JSON | Yes — computed from real data | ✓ FLOWING |

---

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| All 32 tests pass | `npm test` | 5 files, 32 tests, 0 failed | ✓ PASS |
| `computeFingerprint('invoice-jan-2024.pdf')` returns `'invoice.pdf'` | Verified by fingerprint.test.ts test 1 | PASS | ✓ PASS |
| `applyTemplate('{tag}-{date}-{index}', 'invoice', 3)` matches date regex | Verified by renameEngine.test.ts test 1 | PASS | ✓ PASS |
| No `HOOK-OK` in background.ts | `grep HOOK-OK entrypoints/background.ts` | No match | ✓ PASS |
| No `hookCounter` in background.ts | `grep hookCounter entrypoints/background.ts` | No match | ✓ PASS |
| No hardcoded `sk-ant-` key in Worker | workers/rename-relay/index.ts read | Not present | ✓ PASS |
| `wrangler dev --dry-run` (noted in SUMMARY as `wrangler deploy --dry-run`) | Reported in 02-02-SUMMARY.md as exit 0, 2.32 KiB | PASS (not re-run — wrangler not in PATH during verification) | ? SKIP |

---

### Probe Execution

No `probe-*.sh` files declared or found for this phase. Step skipped.

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| CORE-03 | 02-02, 02-03 | When no pattern matches, send filename + metadata to Claude Haiku endpoint and receive suggested name + tag | ✓ SATISFIED | Worker relay calls `https://api.anthropic.com/v1/messages` (workers/rename-relay/index.ts). Cache-miss path in background.ts POSTs to `VITE_WORKER_URL`. Unit-tested by background.test.ts test 2. |
| CORE-04 | 02-01, 02-03 | Claude-suggested name is applied and the rule is stored for all future matches | ✓ SATISFIED | background.ts stores `{ tag, renameFormat, matchCount: 1 }` after cache-miss (line 79). `applyTemplate()` renders the stored format on cache-hit (line 51). Unit-tested by tests 1, 2, 3. |
| PATT-03 | 02-01, 02-03 | Pattern matching runs entirely locally for known patterns — no network request | ✓ SATISFIED | Cache-hit branch (lines 46–53) reads from `storageRules`, calls `applyTemplate`, calls `suggest()` — no `fetch`. Confirmed by test 1: `mockFetch` called 0 times. |

All three phase-2 requirement IDs accounted for. No orphaned requirements for this phase.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `.env` | 1 | `VITE_WORKER_URL=https://download-renamer-relay.your-subdomain.workers.dev` | ℹ Info | Intentional placeholder — documented in 02-02-SUMMARY.md Known Stubs. Real URL populated after `wrangler deploy`. Local dev uses `.env.local` override. Not a blocker. |

No `TBD`, `FIXME`, or `XXX` debt markers found in any phase-2 modified files.

---

### Human Verification Required

All four items below are Chrome-runtime behaviors that cannot be verified by Vitest or file inspection.

#### 1. Never-seen file triggers Claude Haiku rename

**Test:** Load the extension in Chrome (`npx wxt dev`). Start the Worker locally (`cd workers/rename-relay && npx wrangler dev`). Download a file with a novel filename (e.g. `quarterly-report-Q1-2026.pdf`).
**Expected:** File is saved with an AI-generated name (e.g. `quarterly-report.pdf` or similar). In DevTools → Network, one POST to `http://127.0.0.1:8787` appears.
**Why human:** Requires real `onDeterminingFilename` trigger and live Anthropic API call via Worker.

#### 2. Repeat download uses cached rule with no network call

**Test:** Download the same file pattern a second time (e.g. `quarterly-report-Q2-2026.pdf`).
**Expected:** File is renamed instantly. DevTools Network panel shows no POST to the Worker URL.
**Why human:** Chrome cache-hit behavior and network absence require a real browser session.

#### 3. Learned rules survive service worker restart

**Test:** Download a file (caches the rule). Open `chrome://serviceworker-internals`, click "Stop" for the extension worker, then "Start". Download the same pattern again.
**Expected:** Rule is applied without a Worker call — loaded from `chrome.storage.local`.
**Why human:** SW lifecycle and MV3 persistence cannot be simulated in Vitest.

#### 4. Worker timeout — download not hung

**Test:** Stop the `wrangler dev` server. Download an unknown file.
**Expected:** File completes downloading with its original filename within approximately 5 seconds. No stuck/hung download.
**Why human:** Real network timeout in Chrome's download pipeline is not simulatable in unit tests.

---

### Gaps Summary

No code gaps found. All artifacts exist, are substantive, and are wired. Tests pass (32/32). The four human verification items are Chrome-runtime behaviors that are structurally sound in the code but require a live browser to confirm end-to-end.

---

_Verified: 2026-06-28T17:34:30Z_
_Verifier: Claude (gsd-verifier)_
