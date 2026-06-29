# Phase 4: Freemium + Store Submission - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-29
**Phase:** 4-Freemium-Store
**Areas discussed:** Upgrade notification, Premium verification, Key redemption UX, Store submission scope

---

## Upgrade Notification

| Option | Description | Selected |
|--------|-------------|----------|
| chrome.notifications | OS-level popup from background worker. Needs `notifications` permission. | ✓ |
| Silent block + popup badge | Block silently, badge on icon, prompt only on popup open. | |
| Silent block only | Block rename, no notification of any kind. | |

**User's choice:** chrome.notifications

---

### Notification content

| Option | Description | Selected |
|--------|-------------|----------|
| Title + message + button | Title, message, one "Upgrade to Premium" action button. | ✓ |
| Title + message only | Informational only, no action button. | |
| You decide | Claude picks structure. | |

**User's choice:** Title + message + button

---

### Notification CTA URL

| Option | Description | Selected |
|--------|-------------|----------|
| Placeholder URL for now | `https://example.com/upgrade` — Trevor replaces before submission. | ✓ |
| Real URL provided | Trevor provides actual payment URL now. | |

**User's choice:** Placeholder URL for now

---

### Popup upgrade banner

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — banner in popup | Banner below count when at limit. | ✓ |
| No — notification only | OS notification is the only prompt. | |

**User's choice:** Yes — banner in popup

---

### Popup count label at limit

| Option | Description | Selected |
|--------|-------------|----------|
| Show "5/5 files this month" | Explicit cap display when at limit. | ✓ |
| Keep current format always | Always "{N} files renamed this month". | |

**User's choice:** Show "5/5 files this month"

---

## Premium Verification

| Option | Description | Selected |
|--------|-------------|----------|
| Cloudflare Worker call | POST to /validate-key endpoint, Worker checks KV store. | ✓ (Claude's pick) |
| Hardcoded prefix pattern | Local format check only. Trivially bypassable. | |
| You decide | Claude picks approach. | ✓ |

**User's choice:** You decide — Claude selected Cloudflare Worker validation

---

### Key storage backend

| Option | Description | Selected |
|--------|-------------|----------|
| Hardcoded array in Worker | Simple, no database. Requires redeploy to add keys. | |
| KV store (Cloudflare KV) | Keys in KV, add via Wrangler CLI or dashboard. No redeploy. | ✓ |

**User's choice:** KV store (Cloudflare KV)

---

## Key Redemption UX

| Option | Description | Selected |
|--------|-------------|----------|
| Inline expand in AccountSection | "Have a key?" link expands text input + Activate button. | ✓ |
| Modal on Upgrade click | Modal with "Buy now" / "Enter key" paths. | |
| Separate "Enter key" button | Two explicit buttons in AccountSection. | |

**User's choice:** Inline expand in AccountSection

---

### Post-activation behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Badge flips to PREMIUM, input disappears | Immediate React state update, no reload. | ✓ |
| Success message then reload | Brief message then page reload. | |

**User's choice:** Badge flips to PREMIUM, input disappears

---

### Badge style at limit

| Option | Description | Selected |
|--------|-------------|----------|
| Premium: PREMIUM ✓ (indigo). At-limit: FREE ⚠ (red/orange) | Visual limit signal on badge. | |
| Keep existing badge styles unchanged | FREE stays blue always. Banner is the only limit signal. | ✓ |

**User's choice:** Keep existing badge styles unchanged

---

### Validation failure handling

| Option | Description | Selected |
|--------|-------------|----------|
| Show error inline, stay free tier | Error message in input, key not stored. | ✓ |
| Optimistically accept, validate later | Accept locally, re-validate in background. | |

**User's choice:** Show error inline, stay free tier

---

## Store Submission Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Assets/ mock PNGs are UI mockups | Not store-ready. Phase 4 needs real assets. | ✓ |
| Store-ready assets | Could use as-is. | |

**User's choice:** UI mockups — not store-ready

---

### Icon production

| Option | Description | Selected |
|--------|-------------|----------|
| Generate SVG icon in code | Claude produces 128x128 SVG + PNGs. | |
| Trevor provides the icon | Manual step, placeholder in plan. | ✓ |

**User's choice:** Trevor provides the icon

---

### Privacy policy hosting

| Option | Description | Selected |
|--------|-------------|----------|
| GitHub Pages from this repo | Enable Pages, serve PRIVACY.md. Free, permanent URL. | ✓ |
| Cloudflare Worker endpoint | /privacy route on existing Worker. | |
| Trevor hosts separately | Treated as placeholder. | |

**User's choice:** GitHub Pages from this repo

---

### Store screenshots

| Option | Description | Selected |
|--------|-------------|----------|
| Instructions + placeholders only | SCREENSHOTS.md with capture steps for Trevor. | ✓ |
| Playwright automated capture | Script that loads extension and takes screenshots. | |

**User's choice:** Instructions + placeholders only

---

### Store listing copy

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — Claude writes it | STORE-LISTING.md with title, descriptions. Trevor reviews. | ✓ |
| No — Trevor writes it | Blank template only. | |

**User's choice:** Yes — Claude writes it

---

## Claude's Discretion

- Premium verification: Cloudflare Worker call chosen over prefix pattern (user deferred to Claude)
- Worker `/validate-key` route structure (HTTP method, request/response shape)
- KV namespace naming and `wrangler.toml` binding
- Monthly reset alarm timing calculation
- React state for inline key input expand/collapse
- Tailwind classes for upgrade banner and key input UI

## Deferred Ideas

- Backend-verified subscription (PREM-01) — v2
- Playwright automated screenshots — v1 uses instructions-only approach
- KV key management tooling — Trevor manages manually via Wrangler CLI
- Promo tile (440×280) — not required for initial submission
