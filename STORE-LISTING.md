# Chrome Web Store — Store Listing

## Extension Name

Emberfile — AI File Naming

*(27 characters — within the 45-character limit. TM may edit.)*

---

## Short Description (≤132 characters)

Auto-renames downloads using AI. First download uses Claude; every repeat uses a saved rule — zero API cost.

*(105 characters. TM may edit.)*

---

## Long Description

Emberfile silently takes over the tedious job of naming your files. The moment a download begins, the extension intercepts it — before anything is written to disk — and suggests a clean, consistent name. No renaming after the fact, no manual cleanup.

The first time a file pattern is seen (say, a bank statement PDF), the extension sends the filename to Claude Haiku to generate a smart rename and categorization tag. Every subsequent download with the same pattern uses a saved local rule — no API call, instant result. Over time your library of rules grows and the AI is called less and less.

Emberfile is free for up to 5 file renames per month. For unlimited renames, upgrade to Premium ($2.99/month). You can view your usage count, pause the extension, manage learned rules, and activate a license key from the built-in popup and options page.

Your privacy is built into the design. Only the filename is ever transmitted — never the file contents, your browsing history, or any personal identifier. The developer-operated relay extracts only an anonymized pattern (e.g., "invoice + .pdf") before passing anything to Claude. Your actual filename is never logged server-side.

---

## Category

Productivity

---

## Permission Justifications (for Chrome Web Store dashboard)

- **downloads:** Required to intercept file downloads and suggest renamed filenames before the file is written to disk.
- **storage:** Required to persist rename rules, usage counters, and premium status locally on the user's device.
- **alarms:** Required to reset the monthly rename counter on the first day of each calendar month.
- **notifications:** Required to alert users when they reach the monthly free-tier rename limit.

---

## Icon Assets Required (manual — TM provides)

- 16×16 PNG → `public/icons/icon-16.png`
- 48×48 PNG → `public/icons/icon-48.png`
- 128×128 PNG → `public/icons/icon-128.png`

*(These are referenced in `wxt.config.ts` as default WXT icons — confirm location with `npx wxt build` output.)*

---

## Store Promo Tile

440×280 PNG — required for store listing (affects ranking). TM creates a simple branded image.

- Size: 440px × 280px
- Format: PNG
- No animated content

---

## Privacy Policy URL

https://coldtypelabs.github.io/Download-Renamer-Web-Extension-privacy/privacy.html

→ Using dedicated privacy repo: github.com/ColdTypeLabs/Download-Renamer-Web-Extension-privacy
→ Confirm once GitHub Pages is enabled on that repo and the URL is live.

---

## Upgrade URL (replace before submission)

PLACEHOLDER: https://example.com/upgrade

→ Replace in:
- `entrypoints/background.ts` — `UPGRADE_URL` const
- `entrypoints/options/App.tsx` — upgrade button `onClick`
- `entrypoints/popup/App.tsx` — upgrade banner button `onClick`

---

## Pre-Submission Checklist

- [ ] Icons at `public/icons/` (16, 48, 128 px PNGs)
- [ ] Promo tile 440×280 PNG created
- [ ] GitHub Pages enabled, `privacy.html` live and accessible
- [ ] `UPGRADE_URL` replaced in `background.ts`, `popup/App.tsx`, `options/App.tsx`
- [ ] `wrangler.toml` KV namespace ID filled in (see 04-02 plan)
- [ ] Worker deployed with real `LICENSE_KEYS` KV namespace
- [ ] Extension loads clean in Chrome (no console errors)
- [ ] Manual test: 6th download shows notification and original filename retained
- [ ] Manual test: Valid license key activation flips badge to PREMIUM

---

## Developer Contact

**Developer:** TM  
**Support:** ColdtypeLabs.support@proton.me
