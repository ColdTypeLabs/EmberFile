# Project State: Download Renamer Web Extension

**Last updated:** 2026-06-28
**Status:** Phase 1 complete — ready for Phase 2 planning

---

## Project Reference

**Core value:** New downloads get smart, consistent names automatically — Claude once per pattern, local rules forever after.

**Current focus:** Phase 1 — Foundation (MV3 infrastructure, build pipeline, storage schema)

---

## Current Position

**Milestone:** v1 — Chrome Web Store Launch
**Current phase:** Phase 2 — Rename Engine (next)
**Current plan:** —
**Status:** Phase 1 complete

```
Progress: [x] Phase 1  [ ] Phase 2  [ ] Phase 3  [ ] Phase 4
          25%                                              100%
```

---

## Performance Metrics

| Metric | Value |
|--------|-------|
| Phases total | 4 |
| Phases complete | 1 |
| Requirements mapped | 19/19 |
| Plans complete | 3 |

---

## Accumulated Context

### Key Decisions

| Decision | Rationale |
|----------|-----------|
| WXT 0.20.x (not Plasmo/CRXJS) | Plasmo is maintenance mode; CRXJS stalled; WXT is actively maintained and MV3-native |
| `chrome.storage.local` for all mutable state | Survives service worker termination; module-level vars do not |
| IndexedDB for pattern rules | Separate concern from volatile state; 10MB cap with LRU eviction at 500 rules |
| `onDeterminingFilename` + `suggest()` only | `chrome.downloads.rename()` does not exist in MV3 |
| Freemium bypass accepted in v1 | $2.99/mo impulse-buy price; backend enforcement deferred to v2 |
| Tailwind as PostCSS plugin only | CDN script is remotely-hosted code — rejected by MV3 CSP |

### Architecture Constraints (must not violate)

- All event listeners registered synchronously at module top level (never inside async functions)
- Every state mutation written to `chrome.storage.local` immediately — no in-memory cache
- `suggest()` always called in `finally` block — download must never hang
- 5-second `Promise.race` timeout on all Claude API calls
- Permissions: `downloads`, `storage`, `alarms` only + host_permissions for `https://api.anthropic.com/*`

### Open Questions (resolve before Phase 2 planning)

- Pattern fingerprint schema: how broad/narrow? Design Claude prompt to return tag + regex pattern.
- Premium tier verification: accept client-side flag in v1 or lightweight license key via serverless function?
- `onDeterminingFilename` timeout behavior: does Chrome hang the download if `suggest()` is never called? Test empirically in Phase 1.

### Todos

- [ ] Draft Claude prompt with few-shot examples before Phase 2 coding begins
- [ ] Validate LRU eviction threshold (500 patterns at ~20KB each = ~10MB cap)
- [ ] Decide premium verification approach before Phase 2

### Blockers

*(none)*

---

## Session Continuity

Next action: `/gsd:discuss-phase 2` — Claude integration, pattern learning, local cache

Phase 1 complete. Manual Chrome load test still pending (see 01-02-SUMMARY.md) — do this before starting Phase 2 to confirm the hook fires visibly.

---

*State initialized: 2026-06-28*
