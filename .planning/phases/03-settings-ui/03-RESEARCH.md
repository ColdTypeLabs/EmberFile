# Phase 3: Settings UI — Research

**Researched:** 2026-06-28
**Domain:** React UI, WXT entrypoints, chrome.storage.local, Tailwind v4 PostCSS, lucide-react
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- D-01: Popup width 360px
- D-02: Enable/disable = single Pause/Resume button (not a toggle switch)
- D-03: "Manage rules →" button opens full-tab options page via `chrome.tabs.create()`
- D-04: White card, blue/indigo accent (Tailwind blue/indigo palette)
- D-05: Popup header: logo/icon + "Download Renamer"
- D-06: Rename count label: "{N} files renamed this month"
- D-07: No conflict badge in popup
- D-08: Options page is a full-tab HTML page under `entrypoints/options/` (not native WXT options entrypoint)
- D-09: Single scrolling page — stats → learned rules → custom rules
- D-10: Same branding header on options page as popup
- D-11: "Upgrade" button opens external URL in new tab (no in-extension payment modal)
- D-12: No search/filter bar in rule list (v1)
- D-13: Only `renameFormat` is editable on a learned rule; `tag` is not user-editable
- D-14: Inline editing — pencil expands row in place, not a modal
- D-15: Slot hint: `Slots: {tag} {date} {index}` shown below edit input
- D-16: Delete confirmation: row turns red inline, "Yes, delete" / "Cancel" — no `confirm()` dialog
- D-17: Custom rules in a separate "Custom Rules" section below learned rules
- D-18: Custom rule match: "if filename contains [text]" — single match type only
- D-19: Adding a custom rule opens a modal dialog (not inline)
- D-20: Conflict storage schema: `{ fingerprint, customRule: { matchText, renameFormat }, learnedRule: { tag, renameFormat } } | null` under `local:pendingConflict`
- D-21: Conflict fallback = learned rule; conflict queued in storage for later resolution
- D-22: One conflict queued at a time; first conflict wins, not overwritten
- D-23: Options page checks `local:pendingConflict` on mount; shows conflict modal if non-null; no dismiss without picking

### Claude's Discretion
- Component composition, state management approach (React state vs. hooks), Tailwind class choices, animation/transition decisions, exact pixel spacing

### Deferred Ideas (OUT OF SCOPE)
- Search/filter bar for rule list
- Conflict badge in popup
- Structured match types (starts with / ends with / extension is)
- Per-rename success toasts
- Undo last rename (HIST-02 v2)
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PATT-04 | User can view full list of stored rules in settings panel | `storageRules` exported from background.ts; read on options page mount |
| PATT-05 | User can delete individual rules (with confirm dialog) | Inline red-row pattern; write-back via `storageRules.setValue()` |
| PATT-06 | User can edit a learned rule's rename format via inline pencil | `applyTemplate()` for live preview; write-back to `storageRules` |
| PATT-07 | User can create custom rules ("contains X → rename Y") | New `local:customRules` storage item; custom rule modal |
| PATT-08 | Conflict modal when custom and learned rule both match | `local:pendingConflict` written in background.ts; read on options mount |
| SET-01 | Popup shows enabled/disabled status, monthly count, FREE/PREMIUM badge | `storageEnabled`, `storageMonthlyCount` reads in popup |
| SET-02 | User can enable/disable from popup | `storageEnabled.setValue()` on button click |
| SET-03 | Options page shows account tier, rename stats, upgrade button for free users | Client-side tier flag (Phase 4 concern — stub as FREE in Phase 3) |
| SET-04 | Options page shows rule count and files renamed this month | `Object.keys(rules).length`, `storageMonthlyCount` |
| SET-05 | Options page shows all learned rules with edit and delete controls | Full `storageRules` read; `RuleRow` + `EditExpandedRow` + `DeleteConfirmRow` components |
| NOTIF-02 | Extension shows modal when rule conflict detected; user selects which rule | `ConflictModal` on options page mount checking `local:pendingConflict` |
</phase_requirements>

---

## Summary

Phase 3 is a pure UI layer built on top of the storage and rename engine from Phases 1-2. No new business logic is introduced — the work is (1) replacing the popup stub with a real React UI, (2) scaffolding a new `entrypoints/options/` full-tab page, (3) adding two storage items to background.ts (`local:customRules` and `local:pendingConflict`), and (4) wiring conflict detection into `handleDeterminingFilename`.

Tailwind CSS v4 is not yet installed in the project. The v4 PostCSS plugin approach differs meaningfully from v3 — configuration is CSS-first (`@import "tailwindcss"` in a CSS file, no `tailwind.config.js` required). This must be installed in Wave 0 before any UI work begins.

lucide-react 1.22.0 is available on npm, well-established, and is the only new runtime dependency this phase requires beyond Tailwind.

**Primary recommendation:** Scaffold options page as `entrypoints/options/{index.html, main.tsx, App.tsx}` mirroring the popup pattern exactly. Share components via `src/components/`. Add storage items to background.ts before UI work. Install Tailwind v4 + lucide-react in Wave 0.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Enable/disable toggle | Popup (UI) | Background (storage) | User action in popup writes `local:enabled`; background reads it on each download |
| Rule viewing/editing/deleting | Options page (UI) | Storage (persistence) | Options page reads/writes `storageRules`; background not involved |
| Custom rule creation | Options page (UI) | Background (conflict check) | UI writes `local:customRules`; background reads both rule sets on each download |
| Conflict detection | Background service worker | Storage | Background checks both rule sets on cache-hit path; writes `local:pendingConflict` |
| Conflict resolution | Options page (UI) | Storage | Options page reads pending conflict on mount, user picks, writes resolution back |
| Account/tier display | Options page + Popup (UI) | — | Client-side flag in Phase 3 (no backend yet); Phase 4 adds real verification |

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| tailwindcss | 4.3.1 | Utility CSS | Project constraint (PostCSS plugin only) |
| @tailwindcss/vite | 4.3.1 | Vite plugin for Tailwind v4 | WXT is Vite-based; this is the correct integration path in v4 |
| lucide-react | 1.22.0 | SVG icon components | Project UI-SPEC names it; lightweight, tree-shakeable |

[VERIFIED: npm registry] — confirmed via `npm view` on 2026-06-28.

### Existing (already installed — no install needed)
| Library | Version | Purpose |
|---------|---------|---------|
| wxt | 0.20.27 | Extension framework |
| @wxt-dev/module-react | 1.0.4 | WXT React integration |
| @wxt-dev/storage | 1.0.1 | Type-safe chrome.storage wrapper |
| react / react-dom | 18.3.1 | UI framework |
| vitest | 3.2.4 | Unit testing |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| lucide-react | heroicons / phosphor-icons | All equivalent quality; lucide-react already decided in UI-SPEC |
| Tailwind v4 | Tailwind v3 | v4 is current; v3 config pattern differs (JS config file vs CSS-first). Use v4. |

**Installation (Wave 0):**
```bash
# Run from project root
npm install tailwindcss @tailwindcss/vite lucide-react
```

**Version verification:** npm view confirmed 2026-06-28. tailwindcss@4.3.1, @tailwindcss/vite@4.3.1, lucide-react@1.22.0.

---

## Package Legitimacy Audit

slopcheck could not be installed (auto-mode sandbox restriction). Packages verified against npm registry manually.

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| tailwindcss | npm | ~6 yrs | ~10M+/wk | github.com/tailwindlabs/tailwindcss | [ASSUMED OK] | Approved — industry standard |
| @tailwindcss/vite | npm | ~1 yr | mirrors tailwindcss | github.com/tailwindlabs/tailwindcss | [ASSUMED OK] | Approved — official Tailwind org |
| lucide-react | npm | ~4 yrs | ~3M+/wk | github.com/lucide-icons/lucide | [ASSUMED OK] | Approved — well-established |

**Packages removed due to slopcheck [SLOP]:** none
**Packages flagged [SUS]:** none

*slopcheck was unavailable at research time. Packages are tagged `[ASSUMED]` but are widely recognized industry-standard packages. Risk is minimal. Planner may add a checkpoint:human-verify before install if desired.*

---

## Architecture Patterns

### System Architecture Diagram

```
Popup (entrypoints/popup/)
  ├── reads: local:enabled, local:monthlyCount, local:rules (count only)
  ├── writes: local:enabled
  └── action: chrome.tabs.create → options.html

Options Page (entrypoints/options/)
  ├── reads on mount: local:rules, local:customRules, local:monthlyCount, local:pendingConflict
  ├── ConflictModal shown if pendingConflict !== null
  │     └── user picks → write resolved rule to local:rules or local:customRules
  │                    → clear local:pendingConflict
  ├── LearnedRules section: edit renameFormat → write local:rules
  │                          delete rule → write local:rules
  └── CustomRules section: add rule → write local:customRules
                            delete rule → write local:customRules

Background (entrypoints/background.ts)
  ├── onDeterminingFilename fires
  ├── reads: local:enabled, local:rules, local:customRules
  ├── if customRules[fingerprint] matches → apply custom rule (custom wins)
  ├── if rules[fingerprint] AND customRules[fingerprint] both match
  │     → apply learned rule as fallback
  │     → write local:pendingConflict (first conflict only; don't overwrite)
  └── if only rules[fingerprint] matches → apply learned rule (existing behavior)
```

### Recommended Project Structure
```
entrypoints/
├── background.ts          # add storageCustomRules, storagePendingConflict, conflict detection
├── popup/
│   ├── index.html
│   ├── main.tsx           # existing — no change
│   └── App.tsx            # REPLACE with full popup UI
└── options/
    ├── index.html         # new — mirror popup/index.html
    ├── main.tsx           # new — mirror popup/main.tsx
    └── App.tsx            # new — full options page

src/
├── lib/
│   ├── fingerprint.ts     # existing
│   └── renameEngine.ts    # existing — applyTemplate() reused in edit preview
└── components/            # NEW — shared between popup and options
    ├── AccountBadge.tsx
    ├── SectionHeading.tsx
    └── (other shared primitives)
```

**Component isolation strategy:** Components used only in one entrypoint live in that entrypoint folder. Components used by both (e.g., `AccountBadge`, `SectionHeading`) live in `src/components/`. This avoids circular imports across entrypoints.

### Pattern 1: Storage-First State (no optimistic updates)

```typescript
// Source: CLAUDE.md architecture constraint + @wxt-dev/storage pattern
import { storageRules } from '../../background';

// On mount — read once
const [rules, setRules] = useState<Record<string, Rule>>({});
useEffect(() => {
  storageRules.getValue().then(setRules);
}, []);

// On mutation — write first, then update local state from written value
async function deleteRule(fingerprint: string) {
  const current = await storageRules.getValue();
  delete current[fingerprint];
  await storageRules.setValue(current);
  setRules({ ...current }); // reflect committed state
}
```

**Key constraint:** Never use optimistic state that hasn't been flushed to storage. The service worker may terminate between the optimistic write and the storage write. [ASSUMED] — based on CLAUDE.md constraint.

### Pattern 2: WXT Options Page Scaffold

WXT treats any folder under `entrypoints/` that contains an `index.html` as a separate HTML page. The built output will be accessible at `chrome-extension://[id]/options.html`. [ASSUMED — based on WXT documentation pattern and existing popup structure as reference]

```
entrypoints/options/index.html   → built as options.html
entrypoints/options/main.tsx     → React entry point
entrypoints/options/App.tsx      → options UI
```

`index.html` for options mirrors popup's `index.html` exactly (same structure, title changed to "Download Renamer — Settings").

Opening from popup:
```typescript
// Source: CONTEXT.md D-03 / D-08
chrome.tabs.create({ url: chrome.runtime.getURL('options.html') });
```

### Pattern 3: Tailwind v4 PostCSS Integration with WXT/Vite

Tailwind v4 drops `tailwind.config.js`. Configuration is CSS-first. [ASSUMED — based on Tailwind v4 documentation pattern]

```css
/* src/assets/tailwind.css  (or entrypoints/popup/style.css) */
@import "tailwindcss";
```

Import this CSS in each entrypoint's `main.tsx`:
```typescript
import './style.css'; // or shared path
```

In `wxt.config.ts`, add the Vite plugin:
```typescript
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  vite: () => ({
    plugins: [tailwindcss()],
  }),
  manifest: { /* existing */ },
});
```

**Important:** Do NOT add `@tailwindcss/postcss` separately when using `@tailwindcss/vite` — the Vite plugin handles the transform. [ASSUMED]

### Pattern 4: Conflict Detection in background.ts

The conflict check is added inside `handleDeterminingFilename`, on the cache-hit branch:

```typescript
// After reading storageRules and storageCustomRules:
const customRules = await storageCustomRules.getValue();
const fingerprint = computeFingerprint(originalName);

const learnedRule = rules[fingerprint];
const customRule = findCustomRuleMatch(originalName, customRules); // check "contains" match

if (customRule && learnedRule) {
  // Conflict — use learned rule as fallback, queue conflict for user
  const existing = await storagePendingConflict.getValue();
  if (!existing) { // D-22: first conflict wins, don't overwrite
    await storagePendingConflict.setValue({
      fingerprint,
      customRule: { matchText: customRule.matchText, renameFormat: customRule.renameFormat },
      learnedRule: { tag: learnedRule.tag, renameFormat: learnedRule.renameFormat },
    });
  }
  // Fall through to apply learned rule (D-21)
}
```

`findCustomRuleMatch` iterates `customRules` and returns the first entry where `originalName.toLowerCase().includes(entry.matchText.toLowerCase())`.

### Anti-Patterns to Avoid

- **Importing from `entrypoints/background.ts` via relative path in options page:** WXT bundles each entrypoint independently. The storage item definitions (storageRules, etc.) should be re-exported from `src/lib/storage.ts` or imported from background.ts using the `~/` WXT alias so bundler can tree-shake correctly. [ASSUMED]
- **Using `window.confirm()` for delete:** Banned by D-16 and MV3 CSP (blocked in extension pages).
- **Importing Tailwind via CDN `<link>` or `<script>`:** Web Store instant rejection (CLAUDE.md constraint).
- **Writing `local:pendingConflict` on every conflicting download:** D-22 requires first-conflict-only. Always read existing value before writing.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| SVG icons | Custom SVG inline components | `lucide-react` (Pencil, Trash2, X, Check, Plus) | Tree-shakeable, consistent stroke weight, accessible |
| Utility CSS classes | Custom CSS variables | Tailwind v4 utility classes | PostCSS plugin generates only used classes; no manual purge config |
| Storage type wrappers | Raw `chrome.storage.local.get/set` | `@wxt-dev/storage` `defineItem` (already in use) | Type safety, fallbacks, watch API |

**Key insight:** The only hand-rolling in this phase is React component composition. Infrastructure (styling, storage, icons) is all covered by existing or newly installed libraries.

---

## Common Pitfalls

### Pitfall 1: Tailwind v4 CSS-first config vs. v3 JS config
**What goes wrong:** Developer creates `tailwind.config.js` expecting v3 behavior. Classes don't apply.
**Why it happens:** Tailwind v4 removed JS config file. Content scanning is automatic from imports.
**How to avoid:** Only a CSS `@import "tailwindcss"` is needed. No config file. Use `@tailwindcss/vite` plugin in `wxt.config.ts`.
**Warning signs:** Build succeeds but no Tailwind classes appear in output.

### Pitfall 2: WXT options entrypoint filename → built output name
**What goes wrong:** `chrome.runtime.getURL('options/index.html')` instead of `'options.html'`.
**Why it happens:** WXT flattens entrypoint folder names to `{name}.html` in the built output.
**How to avoid:** Use `chrome.runtime.getURL('options.html')`. Verify in `wxt build` output.
**Warning signs:** Options tab opens but shows a blank page or 404.

### Pitfall 3: Importing storage items creates circular entrypoint dependencies
**What goes wrong:** `options/App.tsx` imports `storageRules` from `../../entrypoints/background`. WXT may warn or bundle both together.
**Why it happens:** background.ts is a separate WXT entrypoint, not a shared module.
**How to avoid:** Move storage item definitions to `src/lib/storage.ts` and import from there in both background.ts and the UI entrypoints.
**Warning signs:** WXT build warning about cross-entrypoint imports; bundle size anomaly.

### Pitfall 4: Stale rule state after mutation
**What goes wrong:** User deletes a rule, the list still shows it (optimistic remove diverges from storage).
**Why it happens:** Optimistic local state is set before `storageRules.setValue()` completes.
**How to avoid:** Storage-first pattern — await the write, then update React state from the committed storage value (re-read or derive from the already-mutated object).

### Pitfall 5: `local:customRules` keyed by fingerprint vs. match text
**What goes wrong:** Custom rules stored under fingerprint key but looked up against raw filename text.
**Why it happens:** Custom rules use a "contains" match on raw filename, not a fingerprint. Fingerprint is computed from normalized keywords, so two different filenames can share a fingerprint.
**How to avoid:** Key `local:customRules` by `matchText` (the user-supplied string), not by fingerprint. During conflict detection in background.ts, iterate all custom rules and check `.includes()` against the raw filename.

---

## Code Examples

### New Storage Items for background.ts

```typescript
// Source: CONTEXT.md D-20, code_context section

export const storageCustomRules = storage.defineItem<
  Record<string, { matchText: string; renameFormat: string }>
>('local:customRules', { fallback: {} });

export const storagePendingConflict = storage.defineItem<{
  fingerprint: string;
  customRule: { matchText: string; renameFormat: string };
  learnedRule: { tag: string; renameFormat: string };
} | null>('local:pendingConflict', { fallback: null });
```

### Popup: Reading Storage on Mount

```typescript
// Pattern: read all needed values once on mount, no subscriptions needed for popup
const [enabled, setEnabled] = useState(true);
const [count, setCount] = useState(0);

useEffect(() => {
  Promise.all([
    storageEnabled.getValue(),
    storageMonthlyCount.getValue(),
  ]).then(([en, cnt]) => {
    setEnabled(en);
    setCount(cnt);
  });
}, []);
```

### Options Page: Conflict Modal Gate

```typescript
// Source: CONTEXT.md D-23
const [conflict, setConflict] = useState<PendingConflict | null>(null);

useEffect(() => {
  storagePendingConflict.getValue().then(setConflict);
}, []);

async function resolveConflict(pick: 'custom' | 'learned') {
  if (!conflict) return;
  // Write chosen format back to appropriate storage, clear pending
  if (pick === 'learned') {
    const rules = await storageRules.getValue();
    // already stored; no change needed
  } else {
    // Promote custom rule to rules keyed by fingerprint
    const rules = await storageRules.getValue();
    rules[conflict.fingerprint] = {
      tag: conflict.learnedRule.tag,
      renameFormat: conflict.customRule.renameFormat,
      matchCount: 0,
    };
    await storageRules.setValue(rules);
  }
  await storagePendingConflict.setValue(null);
  setConflict(null);
}
```

### lucide-react Icon Usage

```typescript
import { Pencil, Trash2, X, Check, Plus } from 'lucide-react';

// Usage — size via className, not size prop for Tailwind consistency
<Pencil className="w-4 h-4 text-gray-400" aria-label="Edit rename format" />
<Trash2 className="w-4 h-4 text-gray-400" aria-label="Delete rule" />
```

### applyTemplate for Live Preview

```typescript
import { applyTemplate } from '../../lib/renameEngine';

// Live preview below the edit input
const preview = applyTemplate(editValue, rule.tag, rule.matchCount);
// Display: "Preview: {preview}.pdf"
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Tailwind v3 JS config (`tailwind.config.js`) | Tailwind v4 CSS-first (`@import "tailwindcss"`) | Tailwind v4.0 (Jan 2025) | No JS config file; `@tailwindcss/vite` plugin replaces `@tailwindcss/postcss` |
| WXT options page via `manifest.options_page` | Full-tab HTML page via `entrypoints/options/` + `chrome.tabs.create` | Design decision D-08 | More control over layout; not constrained to Chrome's options frame |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | WXT builds `entrypoints/options/` to `options.html` (folder-name flattening) | Architecture Patterns | Options tab would 404; rename entrypoint folder to match |
| A2 | `@tailwindcss/vite` plugin in `wxt.config.ts` `vite()` hook is the correct Tailwind v4 integration for WXT 0.20.x | Standard Stack / Pitfall 1 | Build succeeds but Tailwind classes absent; fallback: use `@tailwindcss/postcss` in a `postcss.config.js` instead |
| A3 | Cross-entrypoint imports (options importing background.ts exports) may trigger WXT warnings | Pitfall 3 | No functional breakage, just noise; resolve by moving storage defs to `src/lib/storage.ts` |
| A4 | `storageCustomRules` should be keyed by `matchText`, not fingerprint | Code Examples | Custom rule lookup logic wrong; all custom rules would fail to match |
| A5 | slopcheck package audit not performed (tool unavailable) | Package Legitimacy Audit | Very low risk — all three packages are industry standard with years of public history |

---

## Open Questions (RESOLVED)

1. **Storage item import strategy** — RESOLVED: Move to `src/lib/storage.ts` per 03-01 Task 2. Background.ts, popup, and options all import from there. Clean architecture, no cross-entrypoint bundler issues.

2. **Tier flag storage for SET-03 (FREE/PREMIUM badge)** — RESOLVED: Phase 3 uses hardcoded `isPremium = false` — no `local:tier` storage key added. Phase 4 wires the real license check and can update the UI at that point. Simpler than adding a stub key now.

3. **Tailwind CSS file location** — RESOLVED: Single shared file at `src/assets/tailwind.css` imported by both `popup/main.tsx` and `options/main.tsx` per 03-01 Task 1.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js / npm | Package install | ✓ | (project already running) | — |
| tailwindcss | Styling | ✗ (not installed) | — | None — required by design |
| @tailwindcss/vite | Tailwind v4 Vite integration | ✗ (not installed) | — | `@tailwindcss/postcss` with `postcss.config.js` |
| lucide-react | Icons | ✗ (not installed) | — | Inline SVGs (inferior, more code) |
| WXT 0.20.27 | Framework | ✓ | 0.20.27 | — |
| Vitest 3.2.4 | Testing | ✓ | 3.2.4 | — |

**Missing dependencies with no fallback:** tailwindcss (install required in Wave 0)
**Missing dependencies with viable fallback:** @tailwindcss/vite (can use postcss.config.js approach), lucide-react (can use inline SVGs, but significantly more work)

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 3.2.4 |
| Config file | `vitest.config.ts` (exists, uses `WxtVitest()` plugin) |
| Quick run command | `npm test` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PATT-05 | Delete rule removes it from storageRules | unit | `npm test -- tests/background.test.ts` | ❌ Wave 0 |
| PATT-06 | Edit renameFormat updates storageRules correctly | unit | `npm test -- tests/background.test.ts` | ❌ Wave 0 |
| PATT-07 | Custom rule stored in storageCustomRules with correct shape | unit | `npm test -- tests/storage-schema.test.ts` | ❌ Wave 0 (extend existing) |
| PATT-08 | Conflict detected when both rule sets match; pendingConflict written; learned rule applied | unit | `npm test -- tests/background.test.ts` | ❌ Wave 0 |
| PATT-08 | Second conflict does not overwrite first (D-22) | unit | `npm test -- tests/background.test.ts` | ❌ Wave 0 |
| NOTIF-02 | Conflict modal shown when pendingConflict non-null | manual-only | — | Manual — React component UI |
| SET-01/02 | Popup reads/writes enabled and count correctly | unit | `npm test -- tests/storage-schema.test.ts` | ❌ Wave 0 (extend) |

**Note:** React UI components (popup, options page) are not unit-tested in this project's established pattern. Logic that touches storage (conflict detection, rule mutations) is tested via the background.test.ts + fakeBrowser pattern already in use.

### Sampling Rate
- **Per task commit:** `npm test`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] Install tailwindcss, @tailwindcss/vite, lucide-react
- [ ] Add Vite plugin to `wxt.config.ts`
- [ ] Create `src/assets/tailwind.css` with `@import "tailwindcss"`
- [ ] Move storage item definitions to `src/lib/storage.ts` (refactor — no logic change)
- [ ] Add `storageCustomRules` and `storagePendingConflict` to `src/lib/storage.ts`
- [ ] Extend `tests/background.test.ts` — conflict detection test cases
- [ ] Extend `tests/storage-schema.test.ts` — customRules and pendingConflict schema

---

## Security Domain

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | — |
| V3 Session Management | no | — |
| V4 Access Control | no | — |
| V5 Input Validation | yes | Validate matchText and renameFormat inputs in the custom rule modal — trim whitespace, enforce non-empty before saving |
| V6 Cryptography | no | — |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| XSS via user-supplied matchText or renameFormat rendered in DOM | Tampering | React's JSX rendering escapes by default; never use `dangerouslySetInnerHTML` |
| Prototype pollution via `local:customRules` Record keys | Tampering | Sanitize matchText keys before using as object keys (strip `__proto__`, `constructor`, etc.) |

---

## Sources

### Primary (HIGH confidence)
- `entrypoints/background.ts` — existing storage keys, rule schema, handleDeterminingFilename structure (verified by direct file read)
- `entrypoints/popup/` — existing WXT popup entrypoint pattern (verified by direct file read)
- `package.json` — installed packages and versions (verified by direct file read)
- `wxt.config.ts` — WXT configuration (verified by direct file read)
- `vitest.config.ts` — test setup (verified by direct file read)
- `.planning/phases/03-settings-ui/03-CONTEXT.md` — locked decisions (verified by direct file read)
- `.planning/phases/03-settings-ui/03-UI-SPEC.md` — component inventory, copywriting, color system (verified by direct file read)

### Secondary (MEDIUM confidence)
- npm registry — lucide-react 1.22.0, tailwindcss 4.3.1, @tailwindcss/vite 4.3.1 (verified via `npm view`)

### Tertiary (LOW confidence / ASSUMED)
- Tailwind v4 CSS-first config pattern (training knowledge, not verified via Context7 this session)
- WXT options page folder → output filename flattening behavior (inferred from popup pattern, not verified against WXT docs)
- @tailwindcss/vite as the correct Vite integration hook (training knowledge)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — npm registry confirmed all three packages
- Architecture (WXT + options page): MEDIUM — inferred from existing popup structure; WXT docs not directly queried
- Tailwind v4 integration: MEDIUM — well-known pattern but not Context7-verified this session
- Pitfalls: HIGH — derived from direct codebase analysis and locked decisions
- Storage patterns: HIGH — directly from existing code

**Research date:** 2026-06-28
**Valid until:** 2026-07-28 (stable stack — WXT, Tailwind, lucide-react don't ship breaking changes weekly)
