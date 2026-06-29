---
phase: 04-freemium-store
plan: 02
subsystem: infra
tags: [cloudflare-workers, cloudflare-kv, license-key, typescript]

# Dependency graph
requires:
  - phase: 04-freemium-store-01
    provides: existing Cloudflare Worker rename relay at workers/rename-relay/

provides:
  - /validate-key POST route on the Cloudflare Worker (returns { valid: boolean } via KV lookup)
  - LICENSE_KEYS KV namespace binding in wrangler.toml
affects: [04-03, 04-04, 04-05]

# Tech tracking
tech-stack:
  added: [Cloudflare KV (LICENSE_KEYS namespace)]
  patterns: [KV lookup for license key validation, pathname routing in Cloudflare Worker]

key-files:
  created: []
  modified:
    - workers/rename-relay/index.ts
    - workers/rename-relay/wrangler.toml

key-decisions:
  - "LICENSE_KEYS KV binding added with placeholder ID — Trevor creates namespace + deploys via Wrangler CLI in checkpoint"
  - "Malformed/empty key returns { valid: false } with 400 (not 500) to satisfy T-04-05 threat mitigation"
  - "validate-key route checked before existing POST / rename fallback using url.pathname"

patterns-established:
  - "Pattern: Cloudflare Worker multi-route dispatch via url.pathname check before fallthrough"
  - "Pattern: KV.get() returns null for missing keys — used directly as { valid: value !== null }"

requirements-completed: [MON-03]

# Metrics
duration: 1min
completed: 2026-06-29
---

# Phase 4 Plan 02: Cloudflare Worker /validate-key Route + KV Binding Summary

**Cloudflare Worker gains /validate-key POST route backed by LICENSE_KEYS KV namespace; wrangler.toml updated with binding; dry-run passes; awaiting Trevor's namespace create + deploy checkpoint**

## Performance

- **Duration:** 1 min
- **Started:** 2026-06-29T14:57:29Z
- **Completed:** 2026-06-29T14:58:41Z
- **Tasks:** 1/2 (Task 2 is checkpoint:human-action)
- **Files modified:** 2

## Accomplishments
- Added `LICENSE_KEYS: KVNamespace` to Worker Env interface
- Added `/validate-key` POST route with KV lookup, input validation, and safe error handling
- Updated wrangler.toml with `[[kv_namespaces]]` binding (placeholder ID pending Trevor's namespace create)
- `wrangler deploy --dry-run` passes cleanly — binding is recognized, TypeScript compiles

## Task Commits

1. **Task 1: Add /validate-key route to Worker and KV binding to wrangler.toml** - `10aaa60` (feat)

**Plan metadata:** pending (docs commit after checkpoint completes)

## Files Created/Modified
- `workers/rename-relay/index.ts` - Added LICENSE_KEYS to Env, added /validate-key POST route with KV lookup
- `workers/rename-relay/wrangler.toml` - Added [[kv_namespaces]] binding block with placeholder ID

## Decisions Made
- KV namespace ID left as `"REPLACE_WITH_KV_NAMESPACE_ID"` placeholder — Trevor must run `npx wrangler kv namespace create LICENSE_KEYS` to get the real ID, then update this field before deploying.
- Empty-string key returns 400 `{ valid: false }` rather than proceeding to KV — satisfies T-04-05 tamper threat.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None — `wrangler deploy --dry-run` passed on the first run, binding recognized.

## User Setup Required

Trevor must complete these steps from `workers/rename-relay/` before this plan is fully done:

1. `npx wrangler kv namespace create LICENSE_KEYS` — copy the returned `id`
2. Replace `"REPLACE_WITH_KV_NAMESPACE_ID"` in `workers/rename-relay/wrangler.toml` with the real ID
3. `npx wrangler deploy` — deploy the updated Worker
4. `npx wrangler kv key put --binding=LICENSE_KEYS "TEST-KEY-001" "active" --remote` — add test key
5. Verify: `curl -X POST https://YOUR_WORKER_URL/validate-key -H "Content-Type: application/json" -d '{"key":"TEST-KEY-001"}'` → `{"valid":true}`
6. Verify: `curl -X POST https://YOUR_WORKER_URL/validate-key -H "Content-Type: application/json" -d '{"key":"FAKE-KEY"}'` → `{"valid":false}`

## Next Phase Readiness
- After checkpoint: Worker is live with /validate-key; downstream plans (04-03 license-key settings UI, 04-04 freemium gate) can wire against the real endpoint
- Plans 04-03 through 04-05 depend on this Worker being deployed — Trevor must complete the checkpoint before those plans can be fully verified

---
*Phase: 04-freemium-store*
*Completed: 2026-06-29 (partial — awaiting human-action checkpoint)*
