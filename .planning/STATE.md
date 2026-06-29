# Project State: Download Renamer Web Extension

**Last updated:** 2026-06-28
**Status:** Phase 3 complete — ready for Phase 4 planning

---

## Project Reference

**Core value:** New downloads get smart, consistent names automatically — Claude once per pattern, local rules forever after.

**Current focus:** Phase 3 complete — Settings UI (popup, options page, rule management, custom rules, conflict resolution)

---

## Current Position

**Milestone:** v1 — Chrome Web Store Launch
**Current phase:** Phase 4 — Freemium + Store Submission
**Current plan:** —
**Status:** Phase 3 complete — ready to plan Phase 4

```
Progress: [x] Phase 1  [x] Phase 2  [x] Phase 3  [ ] Phase 4
          25%          50%          75%                   100%
```

---

## Performance Metrics

| Metric | Value |
|--------|-------|
| Phases total | 4 |
| Phases complete | 3 |
| Requirements mapped | 27/27 |
| Plans complete | 13 |

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
| Tailwind v4 via `@tailwindcss/vite` | WXT plugin dropped — use Vite plugin directly in wxt.config.ts vite() |
| Storage consolidated to `src/lib/storage.ts` | Single source of truth; background.ts + all UI pages import from here |
| ConflictModal has no dismiss | User must pick one side — per D-23 in CONTEXT.md |
| `isPremium` hardcoded false in Phase 3 | Phase 4 adds real freemium gate; Phase 3 UI is structural only |

### Architecture Constraints (must not violate)

- All event listeners registered synchronously at module top level (never inside async functions)
- Every state mutation written to `chrome.storage.local` immediately — no in-memory cache
- `suggest()` always called in `finally` block — download must never hang
- 5-second `Promise.race` timeout on all Claude API calls
- Permissions: `downloads`, `storage`, `alarms` only + host_permissions for `https://*.workers.dev/*`
- Storage items exported exclusively from `src/lib/storage.ts` — never redefined elsewhere

### Open Questions (for Phase 4)

- Premium tier verification: client-side `isPremium` flag vs. lightweight license key via serverless function?
- Monthly counter reset: `chrome.alarms` already scaffolded in background.ts — wire to counter in Phase 4
- Store listing copy, icon assets, and privacy policy URL needed for submission

### Todos (Phase 4)

- [ ] Implement freemium gate in service worker (5 free renames/month)
- [ ] Wire `chrome.alarms` monthly reset to `storageMonthlyCount`
- [ ] Upgrade prompt toast/notification on 6th download for free users
- [ ] Replace placeholder `isPremium = false` with real tier check
- [ ] Create store assets: 128×128 icon, 440×280 promo tile, store listing copy
- [ ] Set real premium upgrade URL in AccountSection

### Blockers

*(none)*

---

## Session Continuity

Next action: `/gsd:plan-phase 4` — Freemium + Store Submission

Phase 3 complete. Manual Chrome load test recommended before Phase 4 — load the extension and verify popup, options page, and rule management flow work end-to-end in the browser.

---

*State initialized: 2026-06-28*
*Phase 3 complete: 2026-06-28 — 5/5 plans, 4 waves, 32/32 tests, build clean*
