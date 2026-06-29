---
phase: 02-rename-engine
plan: "02"
subsystem: cloudflare-worker-relay
tags: [cloudflare-workers, wrangler, anthropic-relay, cors, env-vars, host-permissions]

dependency_graph:
  requires: []
  provides:
    - workers/rename-relay/index.ts — Cloudflare Worker CORS relay for Anthropic API calls
    - VITE_WORKER_URL env convention for background.ts (Plan 02-03)
  affects:
    - wxt.config.ts — host_permissions changed from api.anthropic.com to workers.dev
    - .gitignore — added .dev.vars and .env.local exclusions

tech_stack:
  added:
    - wrangler@4.105.0 (devDep — Worker CLI)
    - "@cloudflare/workers-types@4.20260628.1" (devDep — ambient TS types for Worker runtime)
  patterns:
    - Cloudflare Worker module syntax with typed Env interface
    - CORS_HEADERS constant + OPTIONS preflight branch
    - JSON preamble extraction regex to handle Claude prose before JSON
    - .env (committed placeholder) + .env.local (gitignored local override)

key_files:
  created:
    - workers/rename-relay/index.ts
    - workers/rename-relay/wrangler.toml
    - workers/rename-relay/.dev.vars.example
    - .env
  modified:
    - wxt.config.ts (host_permissions)
    - .gitignore (added .dev.vars and .env.local)
    - package.json / package-lock.json (wrangler + workers-types devDeps)

decisions:
  - "Used wrangler deploy --dry-run (not --dry-run flag on wrangler dev which does not exist in v4) to validate Worker syntax"
  - "CORS_HEADERS named constant (not CORS) per plan spec — more readable at usage sites"
  - "ANTHROPIC_API_KEY appears twice in index.ts: once in Env interface (type decl) and once as env.ANTHROPIC_API_KEY (usage) — both are correct, no hardcoded value"

metrics:
  duration: "~12 minutes"
  completed: "2026-06-28"
  tasks_completed: 3
  tasks_total: 3
  files_created: 5
  files_modified: 3
---

# Phase 02 Plan 02: Cloudflare Worker Relay Summary

**One-liner:** Cloudflare Worker relay in workers/rename-relay/ proxies extension fetch calls to Anthropic via secret binding, with CORS handling, JSON preamble extraction, and wxt.config.ts host_permissions updated to workers.dev.

## Tasks Completed

| # | Name | Commit | Files |
|---|------|--------|-------|
| 1 | Install Worker devDeps and scaffold workers/rename-relay/ | 87bc9ce | .gitignore, package.json, package-lock.json, wrangler.toml, .dev.vars.example |
| 2 | Implement workers/rename-relay/index.ts | 983cc77 | workers/rename-relay/index.ts |
| 3 | Wire VITE_WORKER_URL and update host_permissions | 81bef34 | .env, wxt.config.ts |

## Verification Results

- `wrangler deploy --dry-run` exits 0 (Total Upload: 2.32 KiB)
- `npx wxt build` exits 0
- Built manifest host_permissions: `["https://*.workers.dev/*"]`
- `api.anthropic.com` not present in manifest
- No `sk-ant-` string in index.ts
- `workers/rename-relay/.dev.vars` is gitignored
- `.env.local` is gitignored

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] wrangler --dry-run flag does not exist in v4**
- **Found during:** Task 2 verification
- **Issue:** The plan's verify step specified `npx wrangler dev --dry-run` but wrangler v4.105.0 does not have a `--dry-run` flag on `wrangler dev`. The command returned "Unknown arguments: dry-run".
- **Fix:** Used `npx wrangler deploy --dry-run` instead, which is the correct v4 equivalent. It validates TypeScript compilation and wrangler.toml without actually deploying.
- **Files modified:** None — verification command only, not a code change.
- **Commit:** Verified inline; not a separate commit.

## Known Stubs

- `.env` contains `VITE_WORKER_URL=https://download-renamer-relay.your-subdomain.workers.dev` — this is an intentional placeholder. Wave 2 (Plan 02-03) consumes this value; the real URL is filled in after Trevor's first `wrangler deploy`. Local dev uses `.env.local` override pointing to `http://127.0.0.1:8787`.

## Threat Flags

No new threat surface beyond what is in the plan's threat model. All T-02-02-* threats are mitigated or accepted per plan.

## Self-Check: PASSED

- workers/rename-relay/index.ts: FOUND
- workers/rename-relay/wrangler.toml: FOUND
- workers/rename-relay/.dev.vars.example: FOUND
- .env: FOUND
- wxt.config.ts contains workers.dev: CONFIRMED
- Commits 87bc9ce, 983cc77, 81bef34: FOUND in git log
