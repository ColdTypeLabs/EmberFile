# Project Research Summary

**Project:** Download Renamer Web Extension
**Domain:** Chrome MV3 Extension -- AI-powered download file renaming with local pattern learning
**Researched:** 2026-06-28
**Confidence:** HIGH (architecture + pitfalls verified against official Chrome docs; stack HIGH; features MEDIUM)

---

## Executive Summary

This is a Chrome Manifest V3 extension with a clear competitive angle: use Claude Haiku to name files on first encounter, then serve every subsequent identical pattern from a local rule cache at zero API cost. The core mechanics are well-understood -- `chrome.downloads.onDeterminingFilename` is the correct and only rename surface in MV3, and the `suggest()` callback pattern is straightforward once you accept it operates asynchronously (return `true` to signal async completion). The closest competitor, Cantrips.ai, always calls an API; this product's differentiator is that it stops calling the API after the first encounter. That pattern cache is the core IP and must be treated as first-class infrastructure, not an afterthought.

The recommended build approach is: WXT (Vite-based extension framework) + React + Tailwind for the UI, `chrome.storage.local` for all state (counters, settings, enabled flag), and IndexedDB for the pattern rules. Claude Haiku is called via native `fetch()` directly from the service worker. The entire stack is deliberately minimal, which is correct for a 3-week ship target and aligns with Chrome Web Store minimal-permissions policy.

The critical risk is service worker lifecycle mismanagement. MV3 service workers die after 30 seconds of idle -- any state not written to `chrome.storage.local` before termination is gone. This destroys the freemium counter (reset mid-month = broken revenue model). The storage-first pattern must be established in Phase 1 before any feature code is written. The second major risk is Chrome Web Store review timeline: the 3-week ship target does not account for the 2-4 week review window for new developer accounts.

---

## Key Findings

### Recommended Stack

WXT (0.20.x) is the correct build framework. Plasmo is in maintenance mode, CRXJS development has stalled, and raw Vite requires hand-wiring MV3-specific concerns that WXT handles automatically. React 18 in production mode is safe under MV3 CSP. Tailwind must be used as a PostCSS build plugin -- never the CDN script.

**Core technologies:**
- **WXT 0.20.x**: Extension build framework -- Vite-based, MV3-native, actively maintained, HMR-safe
- **React 18**: Popup and options page UI -- `@wxt-dev/module-react` provides first-class integration
- **TailwindCSS 3.x**: Styling -- PostCSS plugin only; never CDN script (MV3 rejects remotely-hosted code)
- **`chrome.storage.local` via `@wxt-dev/storage`**: All mutable state -- survives SW restarts, accessible from all extension contexts
- **IndexedDB**: Pattern rule store -- object store with indexes on extension, useCount, lastUsed
- **Native `fetch()`**: Claude Haiku API calls from service worker -- XMLHttpRequest does not exist in MV3 service workers
- **`zod` 3.x**: Validate Claude API JSON responses before writing to storage -- prevents corrupt rules
- **`chrome.alarms`**: Monthly usage counter reset -- only timer that survives service worker termination
- **Vitest 2.x**: Unit tests for rename logic, pattern matching, zod schema validation
- **Playwright 1.4x**: E2E tests with real Chromium -- deferred to Phase 3

### Expected Features

**Must have -- table stakes (v1 or users leave):**
- Automatic rename on download with zero manual steps
- Enable/disable toggle -- background automation feels invasive without an off switch
- Settings panel with API key input (masked after entry)
- Graceful degradation when Claude API fails -- file must still download with original name
- Windows + macOS filename sanitization -- colon, question mark, asterisk, slash break on Windows
- Privacy policy explicitly stating only filenames (not file contents) are sent to Claude
- Freemium gate: 5 files/month free, upgrade prompt when limit reached
- Error surfacing in popup -- API key invalid must be visible

**Should have -- differentiators:**
- Pattern learning (local rule cache in IndexedDB) -- the core IP; no competitor does this
- Rename history log (before/after/timestamp ring buffer) -- builds trust in silent automation
- Files renamed counter with upgrade CTA -- makes the value visible
- Badge count on extension icon -- passive feedback without opening popup
- Rule viewer in settings -- power users want to see and correct learned rules

**Defer to v2+:**
- One-click undo last rename -- depends on history log; adds complexity
- Per-filetype naming styles -- adds rule engine complexity
- Confidence indicator (learned vs AI)

**Explicit anti-features (never build):**
- Reading file contents -- severe privacy violation; users will uninstall
- tabs or history permissions -- triggers Chrome browsing-history warning; kills installs
- Folder organization / routing -- scope creep
- Per-file OS notifications -- the top complaint in download manager reviews

### Architecture Approach

The service worker is the sole authority for all state mutations, API calls, and business logic. The popup and options page are read/write UIs that communicate exclusively through `chrome.runtime.sendMessage`. No content scripts needed. All event listeners must be registered synchronously at module top level (never inside async functions) because a restarted service worker must be ready to handle events immediately on wake.

**Major components:**
1. **Service Worker**: Download listener, rule engine, Claude API client, freemium gate, storage state owner -- all business logic lives here
2. **Rule Engine**: IndexedDB read on every invocation (no in-memory cache -- lost on SW termination); filters by extension then domain then regex pattern
3. **Claude API Client**: `fetch()` with 5-second hard timeout; always calls `suggest()` in `finally` -- either AI name or original filename fallback; validates response with zod
4. **Freemium Gate**: Reads monthlyCount / monthlyLimit from `chrome.storage.local`; increments only on actual API calls; monthly reset via `chrome.alarms`
5. **Popup UI (React)**: Stats display, toggle, upgrade prompt -- reads state via sendMessage, never mutates directly
6. **Options Page (React)**: API key input, rule viewer -- delegates all writes through service worker messages

### Critical Pitfalls

1. **Wrong rename API** -- `chrome.downloads.rename()` does not exist. Use `onDeterminingFilename` + `suggest()` only. Return `true` from the listener to signal async completion.

2. **Service worker state loss** -- Module-level variables vanish on SW termination (30s idle). Freemium counter in memory resets, breaking revenue model. Write every state mutation to `chrome.storage.local` immediately. Use `chrome.alarms` for periodic work, never `setInterval`.

3. **`suggest()` never called on API failure** -- If Claude times out or errors and `suggest()` is never called, Chrome uses the original filename silently. Wrap API call in try/catch with `finally { suggest(fallback) }`. Hard 5-second timeout via `Promise.race`.

4. **React/Tailwind breaks MV3 CSP** -- React dev mode uses eval(). Tailwind CDN script is remotely-hosted code. Both cause store rejection. Use WXT production build mode; configure Tailwind as PostCSS plugin.

5. **Web Store review timeline** -- New developer accounts face 2-4 week review windows. The 3-week ship target needs padding. Privacy policy must be ready before submission.

---

## Implications for Roadmap

### Phase 1: Foundation (MV3 Infrastructure)

**Rationale:** Every subsequent phase depends on the event hook, build pipeline, and storage contract being correct. Errors here require architectural rewrites.

**Delivers:** Loadable extension with `onDeterminingFilename` listener firing, WXT build pipeline with no CSP violations, `chrome.storage.local` state schema defined, IndexedDB schema with correct indexes, privacy policy draft.

**Addresses:** Enable/disable toggle (storage flag), base manifest with correct permissions (`downloads`, `storage`, `alarms`, host_permissions for api.anthropic.com).

**Avoids pitfalls:** Wrong rename API, service worker state loss, React/Tailwind CSP violations, IndexedDB schema migration problems.

**Research flag:** Standard patterns -- no research phase needed.

---

### Phase 2: Core Logic (Rename Engine + Claude Integration)

**Rationale:** Rule engine + Claude client + freemium gate form an inseparable vertical slice. They share the IndexedDB schema and the `suggest()` call path and must be tested together.

**Delivers:** End-to-end rename flow: new file triggers Claude call, rule written to IndexedDB, `suggest()` called with AI name. Subsequent identical patterns served from cache with no API call. Freemium counter increments only on API calls. Hard 5-second timeout with original-name fallback.

**Addresses:** Automatic rename on download, pattern learning (core IP), freemium gate, graceful API failure degradation, filename sanitization.

**Avoids pitfalls:** `suggest()` never uncalled (always in `finally`), counter manipulation (checksum alongside count), service worker killed mid-API call (reset idle timer at handler start).

**Research flag:** Freemium enforcement without backend and pattern fingerprint schema both need design decisions before coding. See Open Questions.

---

### Phase 3: UI Layer (Popup + Options Page)

**Rationale:** UI depends on stable storage schema (Phase 1) and correct rename logic (Phase 2). Building UI first produces throwaway work.

**Delivers:** Popup with stats, enable/disable toggle, upgrade CTA. Options page with masked API key input, rename history log, rule viewer. Badge count on icon.

**Addresses:** Settings panel, rename counter, upgrade prompt, history log, privacy transparency.

**Avoids pitfalls:** API key displayed carelessly, privacy perception destroying reviews, gating logic incorrectly placed in popup.

**Research flag:** Standard React + Tailwind patterns -- no research phase needed.

---

### Phase 4: Polish + Store Submission

**Rationale:** Store submission has a 2-4 week review queue. Submit as early as possible.

**Delivers:** Privacy policy (plain-English, linked from popup), store listing copy, permission audit, E2E tests (Playwright), extension icon assets.

**Avoids pitfalls:** Store rejection for excessive permissions, missing privacy policy, review timeline surprise.

**Research flag:** Well-documented submission process -- no research phase needed.

---

### Phase Ordering Rationale

- Phases 1-2 form a testable vertical slice: rename works with hard-coded rules before Claude is wired. Validate the core mechanic before adding external API complexity.
- IndexedDB schema must be finalized in Phase 1 -- schema version migrations are a known failure mode if you change structure mid-development.
- Freemium gate is Phase 2 (not Phase 3) because the counter schema is tightly coupled to the rename flow, not the UI.
- UI is deliberately Phase 3 because it depends on stable storage contracts. Building it earlier produces rework.
- Submit to Web Store end of Phase 3 / start of Phase 4 to absorb the review queue into the timeline.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 2 (Freemium):** How to make the counter tamper-resistant without a backend. Decide acceptable bypass risk vs. server infrastructure cost before building.
- **Phase 2 (Pattern Fingerprinting):** Defining what counts as the same pattern across similar filenames is non-trivial. Claude prompt engineering for fingerprint extraction needs iteration.

Phases with standard patterns (skip research-phase):
- **Phase 1, Phase 3, Phase 4:** Well-documented, established patterns.

---

## Open Questions

Must be resolved before or during Phase 2 planning.

| Question | Stakes | Recommended Resolution |
|----------|--------|----------------------|
| **Freemium enforcement without backend** | Revenue model integrity. Counter is trivially bypassable via DevTools. | Accept bypass risk in v1 with checksum mitigation. Make $2.99/mo an impulse buy. Server enforcement is v2. |
| **`onDeterminingFilename` timeout behavior** | Unclear whether Chrome hangs the download if `suggest()` is never called. | Test empirically in Phase 1. Implement 5-second `Promise.race` timeout regardless. |
| **Pattern fingerprint schema** | Too broad = wrong rule applied. Too narrow = cache misses. | Design Claude prompt to return both tag and regex pattern for future matching. Test with realistic filename sets. |
| **Premium tier verification** | `tier: 'premium'` in storage is settable by any user. No backend = no verification. | Decide: (a) accept in v1, (b) lightweight license key via serverless function, or (c) defer premium until backend exists. Must decide before Phase 2. |
| **`alarms` manifest permission** | ARCHITECTURE.md requires it; STACK.md manifest snippet omits it. | Add `"alarms"` to manifest in Phase 1. |

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | WXT, React, Tailwind verified. Chrome API surface verified against official docs via Context7. |
| Features | MEDIUM | Competitive landscape based on Chrome Web Store listings and HN thread. User behavior inferred, not validated. |
| Architecture | HIGH | `onDeterminingFilename` pattern, service worker lifecycle, storage-first state all verified against official Chrome docs. |
| Pitfalls | HIGH | Top pitfalls derived from official MV3 migration docs and real extension developer post-mortems. |

**Overall confidence:** HIGH for technical decisions. MEDIUM for product/market assumptions.

### Gaps to Address

- **Conversion rate assumption:** The $2.99/mo freemium model is plausible but unvalidated. The 5-file limit is deliberately aggressive -- may frustrate users before they see value. Consider 10 files if early reviews skew negative.
- **Claude prompt design:** ARCHITECTURE.md defines the output schema but the prompt itself is undesigned. Draft JSON schema and few-shot examples before Phase 2 coding begins.
- **LRU eviction threshold:** ARCHITECTURE.md suggests 500 patterns as the prune threshold for the 10MB cap. Validate against realistic rule sizes before the cap causes unexpected data loss.

---

## Sources

### Primary (HIGH confidence)
- Chrome for Developers: `chrome.downloads` API -- `onDeterminingFilename`, `suggest()` behavior
- Chrome for Developers: Extension Service Worker Lifecycle -- 30-second termination, event listener rules
- Chrome for Developers: `chrome.storage` API -- local vs session vs sync tradeoffs
- Chrome for Developers: MV3 Content Security Policy -- eval() restrictions, remote code ban
- Chrome Web Store: Program Policies and MV3 Requirements -- rejection triggers, privacy policy requirements
- Playwright Docs: Chrome Extension Testing -- `--load-extension` E2E approach
- WXT Official Docs: Framework comparison, React module, storage wrapper

### Secondary (MEDIUM confidence)
- Chrome Extension Framework Comparison 2025 (devkit.best, redreamality.com) -- WXT vs Plasmo vs CRXJS
- MV3 Migration Pitfalls -- 17 Extensions (dev.to) -- real-world failure modes
- Freemium Bypass via Client-Side Controls (OnSecurity) -- counter manipulation risk
- Chrome Web Store Rejection Reasons (ExtensionRadar) -- common review failure patterns

### Tertiary (LOW confidence)
- Cantrips.ai Chrome Web Store listing -- user count (623) and feature set inferred from store page
- HN: Show HN -- Auto rename downloads by AI -- user sentiment and feature requests

---

*Research completed: 2026-06-28*
*Ready for roadmap: yes*
