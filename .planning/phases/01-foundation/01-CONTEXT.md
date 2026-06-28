# Phase 1: Foundation - Context

**Gathered:** 2026-06-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Prove the critical MV3 mechanics: WXT scaffold loads in Chrome, `onDeterminingFilename` fires on every download, `suggest()` is always called (including on failure), and the storage schema survives service worker termination. No real rename logic — this phase is infrastructure proof only.

</domain>

<decisions>
## Implementation Decisions

### Verification Signal
- **D-01:** Phase 1 renames files with the prefix `[HOOK-OK-{n}]-` (where `n` is a per-session in-memory counter) so the hook firing is unmistakably visible in the filesystem without opening DevTools.
- **D-02:** The counter is in-memory only (not persisted) — it proves sequential downloads all fire the hook, but resets on service worker restart by design.
- **D-03:** This prefix is stripped entirely in Phase 2 when real rename logic takes over.

### Storage Schema
- **D-04:** All state lives in `chrome.storage.local`. No IndexedDB in Phase 1 (deferred to Phase 2+ if scale requires it).
- **D-05:** Top-level schema:
  ```ts
  {
    enabled: boolean,          // default: true
    monthlyCount: number,      // default: 0
    monthlyResetDate: string,  // ISO date string 'YYYY-MM-01'
    rules: {
      [fingerprint: string]: {
        tag: string,
        renameFormat: string,
        matchCount: number
      }
    }
  }
  ```
- **D-06:** `rules` object is initialized as `{}` in Phase 1. Phase 2 writes real entries.
- **D-07:** Key names are final and must not change across phases — downstream UI and logic depend on them.

### Privacy Policy
- **D-08:** Privacy policy lives as `PRIVACY.md` at the repo root. Must be hosted before Phase 4 Web Store submission.
- **D-09:** Policy covers the full two-hop data flow: extension → Trevor's hosted endpoint → Claude Haiku → suggested name returned. No file contents, no user identifiers transmitted.
- **D-10:** Policy explicitly states Trevor holds the API key; users supply nothing.
- **D-11:** Server logs only the anonymized pattern (e.g., "invoice + .pdf"), tag, rename format, and timestamp — never actual filenames.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Architecture Constraints (locked — do not deviate)
- `.planning/REQUIREMENTS.md` — Full v1 requirement list with phase traceability
- `.planning/ROADMAP.md` — Phase 1 success criteria (5 criteria that must be TRUE)
- `CLAUDE.md` (project root) — Critical architecture constraints section: `onDeterminingFilename` + `suggest()` pattern, storage-first state, WXT framework, Tailwind restriction, freemium gating location

### Stack
- WXT framework (Vite-based, MV3-native): https://wxt.dev — no Plasmo, no CRXJS
- `@wxt-dev/storage` for `chrome.storage.local` access
- React 18 + TailwindCSS (PostCSS plugin only — CDN blocked by MV3 CSP)
- Permissions: `downloads`, `storage`, `alarms` + host: `https://api.anthropic.com/*`

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- None — greenfield project. No existing components or utilities.

### Established Patterns
- None yet — Phase 1 establishes the foundational patterns all later phases inherit.

### Integration Points
- `entrypoints/background.ts` — service worker; all download hook logic lives here
- `chrome.storage.local` — single source of truth for all mutable state

</code_context>

<specifics>
## Specific Ideas

- The `[HOOK-OK-{n}]-` prefix format was explicitly chosen over console-only logging for Phase 1 debugging visibility.
- Storage key names (`enabled`, `monthlyCount`, `monthlyResetDate`, `rules`) are intentionally short and final.

</specifics>

<deferred>
## Deferred Ideas

- IndexedDB for pattern rules — STATE.md floated this for scale. Deferred: Phase 1 uses `chrome.storage.local` for simplicity; revisit in Phase 2 if needed.
- Hosting the privacy policy — draft in `PRIVACY.md` now; must be deployed to a public URL before Phase 4 store submission.

</deferred>

---

*Phase: 1-Foundation*
*Context gathered: 2026-06-28*
