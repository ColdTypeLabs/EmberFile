# Phase 2: Rename Engine - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-28
**Phase:** 02-rename-engine
**Areas discussed:** Fingerprint granularity, Claude prompt + response schema, Rename format — template vs literal, API key bundling

---

## Fingerprint Granularity

| Option | Description | Selected |
|--------|-------------|----------|
| Extension + category keywords | Strip dates/numbers/UUIDs from stem, extract meaningful nouns, combine with extension | ✓ |
| Extension only | All files of the same type share one rule — high false-positive risk | |
| Full normalized stem + extension | Keeps all keywords; more precise but more Claude calls | |

**Normalization scope:**

| Option | Description | Selected |
|--------|-------------|----------|
| Dates, numbers, UUIDs, hashes | Strip anything per-file with no semantic meaning; keep nouns | ✓ |
| Numbers and UUIDs only | Preserve date tokens in fingerprint | |
| You decide | Delegate to researcher/planner | |

**Key format:**

| Option | Description | Selected |
|--------|-------------|----------|
| '{keywords}.{ext}' string | Human-readable, easy to debug in DevTools | ✓ |
| Hash of normalized stem + ext | Compact but opaque | |
| You decide | Delegate to planner | |

**Notes:** Canonical example: `invoice-jan-2024.pdf` → fingerprint `invoice.pdf`.

---

## Claude Prompt + Response Schema

**Context sent to Claude:**

| Option | Description | Selected |
|--------|-------------|----------|
| Filename + extension only | Minimal and fast; no extra signal | |
| Filename + MIME type + file size | MIME confirms type; size gives weak content hint | ✓ |
| Filename + URL | Rich context but PII-adjacent; violates privacy policy | |

**Response fields:**

| Option | Description | Selected |
|--------|-------------|----------|
| { suggestedName, tag, renameFormat } | All three fields needed for cache, display, and Phase 3 editing | ✓ |
| { suggestedName, tag } | Simpler; defers template to Phase 3 settings | |
| { suggestedName } only | Minimal; loses rule abstraction needed for cache lookup | |

**Prompting strategy:**

| Option | Description | Selected |
|--------|-------------|----------|
| Few-shot (2-3 examples baked in) | Better JSON compliance; ~200 extra tokens per call | |
| Zero-shot with schema description | Leaner prompt; relies on Haiku following schema instructions | ✓ |
| You decide | Delegate to researcher/planner | |

**Notes:** If zero-shot JSON compliance is poor in practice, add few-shot examples in Phase 3+ iteration.

---

## Rename Format — Template vs Literal

**Template semantics:**

| Option | Description | Selected |
|--------|-------------|----------|
| Tag-based template with runtime slots | `{tag}-{date}-{index}` filled at download time | ✓ |
| Literal prefix only | Just a prefix string; relies on Chrome uniquify for deduplication | |
| Claude called every time | Defeats PATT-03 zero-API-call requirement | |

**Available slots:**

| Option | Description | Selected |
|--------|-------------|----------|
| {tag}, {date}, {index} | Three slots covering common cases | ✓ |
| {tag}, {date}, {index}, {ext} | Adds explicit extension slot | |
| You decide | Let planner define slot set | |

**Notes:** Slots at apply-time: `{tag}` = rule tag, `{date}` = YYYY-MM-DD, `{index}` = matchCount. Extension appended by Chrome after template render.

---

## API Key Bundling

**Key delivery method:**

| Option | Description | Selected |
|--------|-------------|----------|
| WXT env var (VITE_ANTHROPIC_KEY in .env) | Key baked in at build time; anyone who unpacks .crx can extract it | |
| Relay server — Trevor's backend proxies | Key never ships in extension; requires backend infrastructure | ✓ |
| Runtime fetch from config URL | Key rotatable without republish; still extractable from network | |

**Relay platform:**

| Option | Description | Selected |
|--------|-------------|----------|
| Vercel serverless function | Free tier ~10K req/month; zero-config deploy | |
| Cloudflare Worker | Edge network; 100K req/day free; Wrangler secrets | ✓ |
| Decide later — just need the contract | Phase 2 stubs the relay; deploy in Phase 4 | |

**Repo structure:**

| Option | Description | Selected |
|--------|-------------|----------|
| Same repo — workers/ subfolder | Single repo, easier contract sync | ✓ |
| Separate repo | Cleaner separation; higher maintenance overhead | |
| You decide | Let planner pick | |

**Notes:** Worker URL injected via `VITE_WORKER_URL` env var. Local dev uses `.dev.vars` (Wrangler convention). `host_permissions` in manifest changes from `api.anthropic.com` to the Worker URL.

---

## Claude's Discretion

None — all gray areas had a user selection.

## Deferred Ideas

- Relay rate limiting / tier auth — deferred to Phase 4 (freemium enforcement)
- Few-shot prompt examples — deferred; add if zero-shot compliance is poor in practice
- IndexedDB for rules — confirmed not needed at v1 scale
