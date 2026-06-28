# Synthesis: RENAME_EXTENSION_PROJECT_SCOPE_FINAL.md

Ingest date: 2026-06-28

---

## What This Doc Is

A complete, locked product scope document authored after a grilling session. It supersedes the initial scope captured in PROJECT.md and REQUIREMENTS.md. It is the authoritative source of truth for v1 until explicitly revised.

---

## What It Confirms (no change needed)

- Chrome extension, Manifest V3, React + TailwindCSS, IndexedDB
- Claude Haiku for unknown patterns, local rules for known patterns
- Freemium model: $2.99/month, 5 files/month free
- 3-week ship timeline
- Downloads folder only, no cross-device sync, no cloud backup
- No retroactive renaming
- No quality feedback tracking in MVP

---

## What It Changes (requires updates to existing artifacts)

1. API key model is now hosted (Trevor), not user-supplied. This is the single largest structural change. It invalidates SET-03 and QUAL-01 in REQUIREMENTS.md and changes Phase 3 settings UI scope significantly.

2. Toast notifications are in-scope for MVP (was excluded in REQUIREMENTS.md Out of Scope under "Real-time notifications per file"). This exclusion must be removed and the requirement added.

3. Rule editing (pencil icon, inline edit, forward-only) is in-scope for MVP. REQUIREMENTS.md had edit functionality deferred to v2 (RULE-01). Promote to v1.

4. Custom rule creation is in-scope for MVP. Same as above — was v2.

5. Conflict resolution (custom vs learned rule, one-time user choice remembered) is new and not mentioned anywhere in current artifacts. Needs new requirement entries.

---

## What It Adds (purely additive, no conflicts)

- Conflict resolution memory system (CONF-01 through 03)
- Popup dimensions (380x280px) and detailed popup layout
- Settings page "About" section
- Empty state strings
- Premium "bigger stat numbers" perk
- Server-side logging spec (pattern only, never filename, no user IDs)
- Risk table (Chrome Store delays, Claude rate limits, IndexedDB cap, free tier conversion)
- Post-launch feature list (Firefox, rule marketplace, bulk rename, dark mode, analytics)
- Success metrics by launch phase (Week 4, Month 2-3, Month 4+)

---

## Priority Actions

1. BLOCKER: Decide and lock the API key hosting model. Update PROJECT.md Key Decisions, remove SET-03 and QUAL-01 from REQUIREMENTS.md, add API-HOST-01.

2. WARNING: Resolve toast notification scope. Remove "Real-time notifications per file" from Out of Scope in REQUIREMENTS.md, add TOAST-01 through 04.

3. WARNING: Expand PATT-04/05 and promote v2 RULE-01 to v1. Add RULE-EDIT-01 through 03 and RULE-CREATE-01 through 03 to REQUIREMENTS.md.

4. INFO (batch): Add CONF-01 through 03, UI-01 through 05, PRIV-01 through 02 to REQUIREMENTS.md.

5. INFO: Promote all 9 decisions from intel/decisions.md into PROJECT.md Key Decisions table.

---

## Risk Flag

The API key hosting decision (BLOCKER-01) affects Phase 3 roadmap scope directly. If Phase 3 planning begins before this is locked, the settings UI will be built to the wrong spec. Recommend resolving BLOCKER-01 before any Phase 3 planning work starts.
