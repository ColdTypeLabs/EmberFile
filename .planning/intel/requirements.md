# Intel: New/Changed Requirements from FINAL Scope Doc

Source: RENAME_EXTENSION_PROJECT_SCOPE_FINAL.md
Ingest date: 2026-06-28

---

## Requirements to ADD to REQUIREMENTS.md

### Rule Editing (promote from v2 to v1)

- RULE-EDIT-01: User can click a pencil icon on any learned rule to enter inline edit mode, modify the rename format, and save or cancel.
- RULE-EDIT-02: Rule edits apply forward only — no retroactive renaming of already-renamed files.
- RULE-EDIT-03: User can delete a rule via a trash icon with a confirmation dialog.

### Custom Rule Creation (promote from v2 to v1)

- RULE-CREATE-01: User can create a custom rule without downloading a file first. Format: "If filename contains X, rename to Y."
- RULE-CREATE-02: Custom rules always take precedence over learned rules when both match.
- RULE-CREATE-03: Custom rules are editable and deletable from the settings panel.

### Conflict Resolution (new, v1)

- CONF-01: When a custom rule and a learned rule both match an incoming file, the extension displays a toast or modal presenting both options.
- CONF-02: User selects which rule to apply. Extension applies the chosen rule to the current file.
- CONF-03: Extension stores the user's conflict resolution choice and applies it automatically to future files matching the same conflict pair — no repeated dialogs.

### Toast Notifications (new, v1)

- TOAST-01: Extension displays a toast on successful rename (file renamed, rule applied).
- TOAST-02: Extension displays a toast on API error or permission failure.
- TOAST-03: Extension displays a toast when the free tier limit is reached: "5 renames used. Upgrade for unlimited."
- TOAST-04: Extension displays a toast when a conflict resolution choice is needed.

### UI/UX Specifics (new, v1)

- UI-01: Popup dimensions are 380x280px.
- UI-02: Popup shows: extension icon + "Smart Rename" title, large rename count stat, last-renamed timestamp or "No renames yet", ON/OFF toggle, "Settings" and "View Rules" buttons, FREE/PREMIUM badge.
- UI-03: Settings page includes an "About" section with version number, privacy policy link, bug report link, and Chrome Web Store rating link.
- UI-04: Empty state for patterns list: "No patterns yet. Download a file to start learning."
- UI-05: Empty state when free limit hit: "5 renames used. Upgrade for unlimited." with upgrade button visible in popup.

### Privacy / Logging (new, v1 constraint)

- PRIV-01: Server-side logs record only: pattern (e.g., "invoice + .pdf"), assigned tag, rename format, and timestamp. Actual filenames are never logged.
- PRIV-02: No user identifiers are stored in logs.

### API Key Model (replaces SET-03, QUAL-01 — pending BLOCKER-01 resolution)

- API-HOST-01: Trevor hosts the Claude Haiku API key. Users never input, view, or manage an API key. No API key field exists in the settings UI.
- API-HOST-02: At 10k+ active users, the fallback option is to offer optional per-user API keys, not a hard requirement. Decision deferred.

---

## Requirements to MODIFY in REQUIREMENTS.md

SET-03 — Remove or replace. "Options page provides API key input field with masked display and save confirmation" contradicts the hosted-key model. Replacement: settings page shows account tier only, no key input.

QUAL-01 — Remove or replace. "API key stored in chrome.storage.local; settings UI includes a one-line security note (use a low-spend-limit key)" is inapplicable when Trevor hosts the key.

Out of Scope entry "Real-time notifications per file" — Remove. Toast notifications per action are explicitly in scope per FINAL. Update rationale to reflect that toasts are scoped to limit, conflict, and error states (not necessarily every single rename success, TBD).

PATT-04, PATT-05 — Expand. Currently view-only and delete-only. Must add edit capability (RULE-EDIT-01 through 03).

v2 RULE-01 — Promote to v1 (captured as RULE-CREATE-01 through 03 above).
