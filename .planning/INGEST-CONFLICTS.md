## Conflict Detection Report

Source: RENAME_EXTENSION_PROJECT_SCOPE_FINAL.md
Compared against: PROJECT.md, REQUIREMENTS.md, ROADMAP.md
Date: 2026-06-28

---

### BLOCKERS (1)

BLOCKER-01: API key model has been inverted.

REQUIREMENTS.md SET-03 requires an API key input field in the options page, and QUAL-01 requires the API key be stored in chrome.storage.local with a security note advising users to use a low-spend-limit key. The FINAL doc explicitly states Trevor hosts the key and users never see it. These two models cannot coexist. The existing requirements assume a user-supplied key; FINAL assumes a developer-hosted key. This changes the entire settings page, eliminates SET-03 and QUAL-01 as written, removes the need for chrome.storage.local key storage, and changes the threat model (rate limiting, abuse surface, cost exposure). A decision must be locked before Phase 3 begins.

---

### WARNINGS (2)

WARNING-01: "Real-time notifications per file" is explicitly Out of Scope in REQUIREMENTS.md, but FINAL designates toast notifications (success, error, info, limit reached) as an in-scope MVP requirement.

The existing Out of Scope entry reads: "Real-time notifications per file — Top UX complaint in download managers; use badge count instead." FINAL makes per-action toasts a core UX pattern throughout (limit hit, rename success, conflict resolution). These are not equivalent — badge count is passive, toasts are active. Either the Out of Scope exclusion must be removed and rationale updated, or the toast spec must be narrowed to non-per-file toasts only (e.g., limit and conflict only, not per-rename success). Requires a decision.

WARNING-02: Rule editing (PATT-04/05) scope has expanded beyond what REQUIREMENTS.md captures.

REQUIREMENTS.md covers view and delete only (PATT-04, PATT-05). FINAL adds: inline pencil-icon editing of rename format, forward-only edit semantics, a save/cancel flow, and full custom rule creation (create without downloading first, always wins in conflicts, editable/deletable). REQUIREMENTS.md v2 has RULE-01 for manual rule creation but scopes it to v2. FINAL promotes this to MVP. This is not a contradiction but a scope expansion that will affect Phase 3 plans and the roadmap phase requirements mapping. No existing locked decision is violated, but the roadmap phase boundaries need review.

---

### INFO (7)

INFO-01: Conflict resolution system is new and additive.

When a custom rule and a learned rule match the same file, FINAL specifies a toast/modal presenting both options, user picks one, and the extension remembers the choice for future matches. This is not mentioned anywhere in current planning artifacts. No contradiction — purely additive. Needs new requirements entries.

INFO-02: Popup dimensions specified as 380x280px.

FINAL provides concrete popup dimensions. No existing artifact specifies dimensions. Additive detail for implementation.

INFO-03: Premium perks clarified — bigger stat numbers only, no additional features.

FINAL states premium shows "bigger stat numbers in dashboard" as a perk beyond unlimited renames and no ads. Current planning does not list this as a perk. Additive and minor, but worth capturing so it is not accidentally scoped out during build.

INFO-04: Anonymized logging detail added.

FINAL specifies that server-side logs record only the pattern (e.g., "invoice + .pdf"), tag, rename format, and timestamp — never the actual filename or user identifiers. QUAL-03 in REQUIREMENTS.md covers the privacy policy requirement but does not specify what is and is not logged server-side. This is an additive implementation constraint. Relevant once a backend logging layer exists.

INFO-05: IndexedDB cap of 10MB specified.

FINAL specifies a 10MB cap for stored patterns with auto-cleanup of old patterns as a risk mitigation. PROJECT.md Constraints section already references this. Consistent, no conflict.

INFO-06: Settings page "About" section and empty states specified.

FINAL adds an About section (version, privacy link, bug report, rating link) and two empty state strings to the settings page. Not captured in current requirements. Additive UI detail.

INFO-07: Free tier monthly reset confirmed as global (1st of month, all users).

FINAL states the counter resets globally on the 1st. MON-01 in REQUIREMENTS.md specifies a chrome.alarms-based monthly reset but does not clarify whether it is per-user or global. Because the API key is hosted (see BLOCKER-01), a server-side reset makes more sense than a per-device alarm. This detail is consistent with the hosted-key model and will need to be resolved once BLOCKER-01 is decided.

---

### Summary

Total deltas identified: 10
BLOCKERS: 1 (must resolve before Phase 3 dev begins)
WARNINGS: 2 (need a decision, non-blocking for Phase 1-2)
INFO: 7 (additive, pull into REQUIREMENTS.md on next update)
