---
status: partial
phase: 04-freemium-store
source: [04-VERIFICATION.md]
started: 2026-06-30T06:07:31Z
updated: 2026-06-30T06:07:31Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Cloudflare KV namespace deployment and license key validation

expected: POST `/validate-key` with a real license key stored in KV returns `{"valid":true}`; POST `/validate-key` with an unknown key returns `{"valid":false}`; empty or malformed key request returns `{"valid":false}` with status 400; existing POST `/` rename route continues working unchanged. Requires Trevor to run `npx wrangler kv namespace create LICENSE_KEYS` from `workers/rename-relay/`, copy the KV namespace ID into `workers/rename-relay/wrangler.toml`, run `npx wrangler deploy`, add a test license key, and curl-test the endpoint.
result: [pending]

### 2. GitHub Pages privacy policy URL is live and accessible

expected: Repository Settings → Pages shows the Pages URL; `docs/privacy.html` is accessible at `{pages-url}/privacy.html`; the live page displays the full privacy policy content (no 404, no placeholder, valid HTML). Requires Trevor to enable GitHub Pages (Settings → Pages → main branch → /docs folder → Save), wait for the build, verify the URL is live, and update the `PRIVACY_URL` placeholder in `src/lib/constants.ts` with the confirmed URL.
result: [pending]

## Summary

total: 2
passed: 0
issues: 0
pending: 2
skipped: 0
blocked: 0

## Gaps
