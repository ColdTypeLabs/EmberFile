---
status: resolved
phase: 01-foundation
source: [01-VERIFICATION.md]
started: 2026-06-28
updated: 2026-06-28
---

## Current Test

[awaiting human testing]

## Tests

### 1. Chrome load test — extension loads without error badge

Run from repo root:
```
npx wxt build
```
Then in Chrome:
- Open `chrome://extensions`, enable Developer mode
- Click "Load unpacked" → select `.output\chrome-mv3`
- Confirm "Download Renamer" appears with no error badge

expected: Extension listed in chrome://extensions with no CSP violations or error indicators
result: [pending]

---

### 2. Hook fires — downloads renamed sequentially

- Download any file
- Open Downloads folder
- Confirm filename is `[HOOK-OK-1]-{original}`
- Download a second file → confirm `[HOOK-OK-2]-{original}`

expected: Two consecutive downloads receive sequential [HOOK-OK-N]- prefixes
result: [pending]

---

### 3. Disabled mode — download does not hang

- Open extension background DevTools (chrome://extensions → "Service Worker")
- In console: `chrome.storage.local.set({ enabled: false })`
- Download a file
- Confirm it saves with original filename — no hang
- Restore: `chrome.storage.local.set({ enabled: true })`

expected: Download completes normally with original filename; no indefinite hang
result: [pending]

---

### 4. No CSP violations in console

- With background DevTools open during the above tests
- Confirm no "Content Security Policy" errors or "chrome is not defined" errors

expected: Clean console — no CSP or runtime errors
result: [pending]

---

## Summary

total: 4
passed: 0
issues: 0
pending: 4
skipped: 0
blocked: 0

## Gaps
