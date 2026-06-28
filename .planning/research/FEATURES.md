# Feature Landscape

**Domain:** Chrome extension — AI-powered download file renaming
**Researched:** 2026-06-28
**Overall confidence:** MEDIUM (Chrome Web Store listings + HN thread + official docs; limited deep review data)

---

## Competitive Landscape

Existing tools in this space:

| Extension | Approach | Users | Differentiator |
|-----------|----------|-------|----------------|
| **DownloadRenamer** | Template tokens `{date}`, `{title}`, `{hostname}` | ~60 | Zero data collection, deterministic rules |
| **General Download Renamer** | Regex-driven user-defined patterns | Unknown | Power-user pattern engine |
| **Cantrips.ai** | AI-inferred names from file content/type | ~623 | Per-type formatting (papers, financials) |
| **AutoRename** | Social media username + date metadata | Unknown | Twitter/Reddit/Bluesky-specific |
| **Auto Rename & Organize Downloads** | Rule-based rename + folder routing | Unknown | Combined rename + organize |
| **Chrono Download Manager** | Full download manager + naming masks | Large | Resume, queue, speed — not rename-first |

**Gap this project fills:** None of the above learn from patterns and reduce API calls over time. Cantrips.ai is the closest direct competitor — AI-powered, but always calls an API per file with no local caching of learned patterns.

---

## Table Stakes

Features users expect. Missing any of these = users leave or leave 1-star reviews.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Automatic rename on download | Core promise — must require zero manual steps | Low | Chrome `downloads` API `onDeterminingFilename` handles this |
| Enable / disable toggle | Users need trust and control; background actions feel invasive without an off switch | Low | Single `storage` value; popup toggle |
| Settings panel with API key input | Required for any AI-backed extension; users are now trained to expect this pattern | Low | Popup UI with key field + masked display |
| Rename counter / stats | Reassurance the extension is working silently; builds trust | Low | Stored in IndexedDB; shown in popup |
| Privacy policy stating only filenames are sent | Extension stores/privacy reviews require this; users specifically fear content leakage | Low | Static page; must be linked from popup |
| Handle duplicate filenames gracefully | Chrome may already append ` (2)` — extension must not double-suffix | Medium | Check existing file; pattern must be idempotent |
| Graceful degradation on API failure | If Claude is down or key is invalid, files must still download (just unnamed) | Medium | Fallback to original filename; surface error in popup |
| Windows + macOS filename sanitization | Filenames with `:`, `?`, `*`, `/` break on Windows | Low | Strip or replace illegal chars; well-understood problem |

---

## Differentiators

Features that set this product apart. Not expected, but meaningfully valued.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Pattern learning (local rule cache) | After first rename, identical patterns are free and instant — no competitor does this | High | Core IP of the product; IndexedDB keyed by pattern fingerprint |
| "Files renamed free so far" counter | Makes the value of the AI visible; drives upgrade when free tier is near limit | Low | Depends on: stats tracking |
| Rename history log | Users want to review what the extension did silently; top requested feature class in download managers | Medium | Ring buffer of last N renames; name-before / name-after / timestamp |
| One-click undo last rename | Rare but high-trust feature; "I can undo" overcomes the main objection to background automation | High | Requires Chrome `downloads` API move + storing original name in history; only viable for recent downloads |
| Confidence indicator on AI names | Shows user when a rule is "learned" (high confidence) vs newly inferred (AI) | Medium | Depends on: pattern cache; surfaced in history log |
| Per-filetype naming style | Papers vs invoices vs screenshots have different ideal formats | High | Depends on: pattern learning; adds rule complexity |
| Rule viewer / editor | Power users want to see and correct learned rules | Medium | Table of pattern → naming rule in settings; CRUD operations |
| Upgrade prompt triggered by free tier limit | Non-intrusive upgrade CTA when user hits 5-file limit | Low | Depends on: counter; show in popup, not as OS notification |
| Badge count on extension icon | Shows number of files renamed this session — passive feedback without requiring popup open | Low | `chrome.action.setBadgeText`; clears on popup open |

---

## Anti-Features

Things to deliberately NOT build. Each would erode trust, increase scope, or conflict with the project's minimal-permission philosophy.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Reading file contents to infer names | Sends actual document text to an AI — severe privacy violation; users will uninstall | Send only filename + source URL to Claude, never content |
| Requesting `tabs` or `history` permissions | Triggers Chrome's "this extension can read your browsing history" warning; kills installs | Use `downloads` and `storage` only |
| Auto-organizing files into subfolders | Scope creep; Chrome `downloads` API allows destination path changes but this adds complex rules that break users' mental models | Stay rename-only in v1; folder routing is a separate product |
| OS-level notifications per file | Noisy; every downloaded file generating a system notification is the #1 complaint in download manager reviews | Use badge count + popup history log instead |
| Sending filenames to analytics or logging | Even aggregate logging of what files users download is a privacy red line | All telemetry must be anonymous counts (files renamed: N), never filenames |
| Bulk rename UI for existing files | Requires `nativeMessaging` or filesystem API — far outside Chrome extension trust model; confusing scope | Keep to new downloads only |
| Custom AI model selection | Increases cost unpredictability; complicates billing and support | Claude Haiku only; this is a constraint, not a gap |
| Always-on status in system tray / menubar | Chrome extensions have no native tray presence; faking it adds complexity | Use extension popup as the only surface |
| Renaming files outside the Downloads folder | Requires broad filesystem permissions; destroys trust | Scoped to Downloads folder only |

---

## Feature Dependencies

```
API key input
  └── AI rename (first encounter)
        └── Pattern cache (IndexedDB)
              └── Local rename (subsequent encounters)
                    └── Stats / counter
                          └── Free tier limit check
                                └── Upgrade prompt

AI rename
  └── Rename history log (store before/after)
        └── One-click undo (requires original name in history)

Pattern cache
  └── Rule viewer / editor
        └── Confidence indicator

Stats / counter
  └── Badge count on icon
```

---

## MVP Recommendation

Prioritize in this order:

1. Automatic rename on download (Chrome `downloads` API integration)
2. Enable / disable toggle
3. API key input + settings panel
4. Pattern learning and local cache
5. Rename counter / stats
6. Free tier limit + upgrade prompt
7. Graceful degradation on API failure
8. Privacy policy (required for Web Store submission)

**Defer post-MVP:**
- Rename history log — high trust value but adds storage complexity; build in Phase 2
- One-click undo — depends on history log; Phase 2
- Rule viewer / editor — power-user feature; Phase 3
- Per-filetype naming styles — adds rule engine complexity; Phase 3
- Badge count — quick win but non-essential; can slip into Phase 2

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Core rename logic | `onDeterminingFilename` must return synchronously in MV3; async AI call cannot block it — need a pre-fetch or rename-after-download approach | Research Chrome `downloads` API rename timing before implementation |
| Pattern fingerprinting | Defining what "same pattern" means is non-trivial — `invoice_2024_03.pdf` and `invoice_2024_04.pdf` must match the same rule | Design fingerprint schema carefully; use filename structure not content |
| Free tier enforcement | Counter must be reliable; localStorage can be cleared — use `chrome.storage.sync` not IndexedDB for this | Sync storage survives extension updates; IndexedDB is for rules |
| Upgrade flow | No backend in v1 — how is premium verified? Stripe + webhook needs server | Decide on verification approach before building paywall |

---

## Sources

- [Cantrips.ai Chrome Web Store](https://chromewebstore.google.com/detail/cantripsai-auto-rename-do/fnaemmlnchphilapbdjejjlhoomcpblk)
- [DownloadRenamer Chrome Web Store](https://chromewebstore.google.com/detail/downloadrenamer/haopfpoimcploggpianaioljkglpdnpj)
- [AutoRename GitHub](https://github.com/ddasutein/AutoRename)
- [HN: Show HN — Auto rename downloads by AI](https://news.ycombinator.com/item?id=43030622)
- [General Download Renamer privacy policy](https://shotgunzz.github.io/General_Download_Renamer/)
- [Chrome Extension Privacy Concerns — Cybernews](https://cybernews.com/security/chrome-extensions-get-too-many-dangerous-permissions/)
- [Chrono Download Manager](https://www.chronodownloader.net/)
