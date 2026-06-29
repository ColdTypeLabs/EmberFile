---
status: partial
phase: 02-rename-engine
source: [02-VERIFICATION.md]
started: 2026-06-28T17:35:00Z
updated: 2026-06-28T17:35:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Never-seen file renamed by Claude Haiku
expected: Download a file with a pattern not in storage. File should be renamed using the AI-suggested name from the Worker relay. DevTools Network tab shows a POST to the Worker URL.

result: [pending]

### 2. Repeat pattern uses local cache only
expected: Download a second file matching the same fingerprint as test 1. File should be renamed instantly using the cached rule. DevTools Network tab shows NO request to the Worker URL.

result: [pending]

### 3. Learned rules survive service worker restart
expected: After test 1 creates a rule, navigate to chrome://serviceworker-internals and stop the extension's service worker. Download a file matching the same pattern. Rule should still apply (loaded from chrome.storage.local on SW restart).

result: [pending]

### 4. Worker timeout = no hung download
expected: Stop `wrangler dev` (or set VITE_WORKER_URL to an unreachable URL). Trigger a download with an unknown pattern. The download should complete within ~5 seconds using the original filename — it must not hang indefinitely.

result: [pending]

## Summary

total: 4
passed: 0
issues: 0
pending: 4
skipped: 0
blocked: 0

## Gaps
