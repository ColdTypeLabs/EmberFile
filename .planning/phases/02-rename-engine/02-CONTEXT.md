# Phase 2: Rename Engine - Context

**Gathered:** 2026-06-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Downloads are renamed intelligently. When a file matches no stored rule, the extension calls a Cloudflare Worker relay (same repo) which calls Claude Haiku and returns a suggested name + tag + rename template. The rule is stored and all future files matching the same fingerprint are renamed locally with zero network calls. The `[HOOK-OK-{n}]-` prefix from Phase 1 is stripped entirely and replaced with real rename logic.

</domain>

<decisions>
## Implementation Decisions

### Fingerprint Design
- **D-01:** Fingerprint dimensions: normalized stem keywords + extension. Strip dates, numbers, UUIDs, and hashes from the stem; keep semantic nouns (invoice, receipt, screenshot, report). Combine with extension: `invoice-jan-2024.pdf` → fingerprint `invoice.pdf`.
- **D-02:** Normalization strips: dates (YYYY-MM-DD, MM-DD-YYYY, month names), numeric sequences, UUIDs (hex runs 8+ chars), hash strings. Keeps meaningful noun tokens.
- **D-03:** Fingerprint key format: `'{keywords}.{ext}'` as a plain string (e.g., `'invoice.pdf'`). Human-readable in DevTools, easy to debug in chrome.storage.

### Claude Prompt + Response Schema
- **D-04:** Context sent to Claude: filename + MIME type + file size. MIME type confirms type beyond extension; size provides a weak signal (e.g., 40KB PNG vs 4MB PNG). URL is NOT sent (PII-adjacent, violates privacy policy's filename-only claim).
- **D-05:** Claude returns: `{ suggestedName: string, tag: string, renameFormat: string }`. All three fields required: `suggestedName` = literal rename for this file, `tag` = human-readable category label, `renameFormat` = reusable template for future files.
- **D-06:** Prompting strategy: zero-shot with schema description (no few-shot examples). Describe the JSON schema in the system prompt. If JSON parse fails, fall through to original filename via the existing error path.

### Rename Format — Templates
- **D-07:** `renameFormat` is a template string with runtime slots: `{tag}`, `{date}`, `{index}`. Example: `'{tag}-{date}-{index}'`. Claude sets the template once; the extension fills slots at apply-time.
- **D-08:** Slot definitions at apply-time:
  - `{tag}` → the rule's `tag` field
  - `{date}` → ISO date `YYYY-MM-DD` at download time
  - `{index}` → the rule's `matchCount` (auto-incremented on every cache hit)
- **D-09:** The extension appends the original file extension after template render (Chrome preserves it, but the template shouldn't duplicate it).

### API Key / Relay Architecture
- **D-10:** Trevor's Anthropic API key is NOT bundled in the extension. The extension calls a Cloudflare Worker relay instead. Key lives in Cloudflare environment secrets.
- **D-11:** Relay lives in this same repo under `workers/` subfolder. Built and deployed separately with Wrangler. WXT handles extension build; Wrangler handles Worker build.
- **D-12:** Extension's `host_permissions` changes from `https://api.anthropic.com/*` to the Cloudflare Worker URL. No Anthropic key is ever shipped in the extension bundle.
- **D-13:** Worker URL for Phase 2 development: use a `.dev.vars` file (Wrangler convention) for local testing. Production URL stored in WXT env var `VITE_WORKER_URL`.

### State Management (carried from Phase 1)
- **D-14:** All rule state stays in `chrome.storage.local` under the `rules` key (D-05 from Phase 1 CONTEXT). No IndexedDB — 500 rules × ~100 bytes ≈ 50KB, well within the 10MB limit.
- **D-15:** Rule write pattern: read current rules object, add/update the fingerprint key, write the full object back immediately. No partial writes.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase 1 Decisions (locked — inherit, do not override)
- `.planning/phases/01-foundation/01-CONTEXT.md` — Storage schema (D-04 to D-07), key names final, `[HOOK-OK-{n}]-` prefix to strip in Phase 2
- `entrypoints/background.ts` — Existing hook handler; Phase 2 replaces the stub rename logic inside `handleDeterminingFilename`

### Architecture Constraints
- `.planning/REQUIREMENTS.md` — CORE-03, CORE-04, PATT-03 are the three Phase 2 requirements
- `.planning/ROADMAP.md` — Phase 2 success criteria (4 criteria that must be TRUE)
- `CLAUDE.md` (project root) — Critical architecture constraints: `suggest()` in finally, 5-second timeout, storage-first state, WXT framework

### Cloudflare Worker
- WXT env var convention: `VITE_WORKER_URL` for the relay endpoint
- Wrangler `.dev.vars` for local secrets during development
- Workers live in `workers/` subfolder (to be created in Phase 2)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `entrypoints/background.ts:handleDeterminingFilename` — Phase 2 replaces the stub body of this function with real rename logic. The function signature, `try/finally` structure, and `suggest()` call pattern are preserved.
- `storageRules` (background.ts line 19) — Already defined storage item for the rules object. Phase 2 reads and writes to it.
- `storageEnabled` (background.ts line 4) — Already gating the hook; Phase 2 inherits this check unchanged.

### Established Patterns
- Storage-first: every mutation written immediately to `chrome.storage.local` — no in-memory cache
- Event listeners registered synchronously at module top level
- `try/finally` with `suggested` flag — download must never hang

### Integration Points
- `entrypoints/background.ts` — All Phase 2 logic lives here (or in modules imported by it)
- `workers/` subfolder — New directory for Cloudflare Worker relay (to be created)

</code_context>

<specifics>
## Specific Ideas

- The Cloudflare Worker relay approach was explicitly chosen over bundling the API key or runtime-fetching it. Worker is in the same repo (`workers/`) for contract-sync convenience.
- Zero-shot prompting chosen over few-shot to keep prompt lean. If JSON parse failures become a problem in Phase 3+, add few-shot examples then.
- `{tag}-{date}-{index}` is the expected default renameFormat Claude will suggest; users can edit this in Phase 3.

</specifics>

<deferred>
## Deferred Ideas

- Relay server rate limiting / auth — Phase 4 freemium enforcement will need the relay to validate tier. For Phase 2 the relay is open (no auth). Add usage tracking in Phase 4.
- Few-shot prompt examples — Deferred; add if zero-shot JSON compliance is poor in practice.
- IndexedDB for rules — Confirmed not needed at v1 scale (500 rules ≈ 50KB).

</deferred>

---

*Phase: 2-Rename-Engine*
*Context gathered: 2026-06-28*
