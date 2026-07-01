# Privacy Policy — Download Renamer

**Effective date:** 2026-06-28

## What this extension does

Download Renamer is a Chrome extension that automatically renames your downloaded files
using AI-suggested names. When you download a file, the extension sends the **filename**
(not the file contents) to a developer-operated relay to generate a suggested rename.

---

## What data we collect

| Data | Collected? | Purpose |
|------|-----------|---------|
| Filename (e.g., `report_v3_final.pdf`) | Yes — temporarily | Generates a suggested rename |
| File contents | **No — never** | Not transmitted at any step |
| Browsing history | **No — never** | Extension does not request tab permissions |
| Personal identifiers (name, email, IP) | **No — never** | No user account required; no identifier transmitted |
| Download URL or source website | **No — never** | Only the filename is used |

---

## How your data flows

When you download a file, the following two-hop flow occurs:

1. **Extension → Developer relay:** The extension sends the filename to a relay endpoint
   operated by the developer (Trevor McAllister). This endpoint extracts only an
   **anonymized pattern** from the filename (example: "invoice + .pdf") — the actual
   filename is not forwarded.

2. **Developer relay → Claude Haiku (Anthropic):** The relay sends only the anonymized
   pattern to Anthropic's Claude Haiku API to generate a suggested rename.

3. **Result returned:** Claude returns a suggested name and tag. The relay returns this
   to your extension. The relay logs only: the anonymized pattern, the suggested tag,
   the rename format, and a timestamp. **Your actual filename is never logged.**

---

## API key and account

The developer holds the Claude API key. **You do not need to provide or see an API key.**
No user account, login, or registration is required to use this extension.

---

## Third parties

| Party | What they receive | Their privacy policy |
|-------|------------------|----------------------|
| Anthropic (Claude Haiku) | Anonymized filename pattern only (e.g., "invoice + .pdf") — never your actual filename | https://www.anthropic.com/privacy |

No other third parties receive your data.

---

## Data retention

- The extension stores learned rename rules in your local browser storage (`chrome.storage.local`).
  This data never leaves your device except as described above.
- Server logs retain only the anonymized pattern, tag, rename format, and timestamp.
  Logs are retained for a maximum of 30 days.
- No personal data is retained server-side.

---

## Your rights

You may clear all locally stored rules at any time by uninstalling the extension or by
clearing the extension's storage via Chrome's developer tools.

To request deletion of any server-side log data, contact:
**ColdtypeLabs.support@proton.me**

---

## Changes to this policy

If this policy changes materially, the effective date above will be updated and the
change will be noted in the extension's changelog.

---

## Contact

**Developer:** Trevor McAllister
**Email:** ColdtypeLabs.support@proton.me
