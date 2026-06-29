# Chrome Web Store — Screenshot Capture Guide

Chrome Web Store requires at least 1 screenshot; up to 5 are allowed.
Preferred size: **1280×800 px**. Also accepted: 640×400 px. Format: PNG or JPG.

---

## Before You Start

Build and load the extension:

1. From the project root, run: `npx wxt build`
2. Open `chrome://extensions` in Chrome
3. Enable **Developer mode** (toggle in top-right)
4. Click **Load unpacked** and select the `dist/` folder
5. Confirm "Download Renamer" appears in the extension list

---

## Screenshot 1: Popup — Normal State

Shows the popup with a mid-range rename count and the FREE badge.

1. Open the Service Worker console: `chrome://extensions` → Download Renamer → **Inspect views: service worker**
2. In the console, run:
   ```js
   chrome.storage.local.set({ 'local:monthlyCount': 2 })
   ```
3. Click the Download Renamer icon in the Chrome toolbar to open the popup
4. Confirm the popup shows "2 files renamed this month", the **Pause** button, and the **FREE** badge
5. Capture the popup area. Options:
   - Right-click the popup area → **Inspect** → use the device toolbar to set a fixed width
   - Use a screen capture tool (ShareX, Lightshot, or macOS ⌘+Shift+4)
6. If the popup is smaller than 1280×800, center it on a white 1280×800 canvas in any image editor
7. Save as: `screenshot-1-popup-normal.png`

---

## Screenshot 2: Options Page — Learned Rules

Shows the rule management table with at least one rule row.

1. Open the Service Worker console (same as Screenshot 1, step 1)
2. Inject a sample rule:
   ```js
   chrome.storage.local.set({
     'local:rules': {
       'invoice-pdf': {
         tag: 'invoice',
         renameFormat: '{tag}-{date}',
         matchCount: 3
       }
     }
   })
   ```
3. Open the options page via one of:
   - `chrome://extensions` → Download Renamer → **Details** → **Extension options**
   - Or click **Manage rules →** in the popup (if the link is present)
4. Confirm the rule row is visible with the pencil (edit) and trash (delete) icons
5. Capture the full options page at 1280×800 px
6. Save as: `screenshot-2-options-rules.png`

---

## Screenshot 3: Popup — Limit Reached (Upgrade Banner)

Shows the upgrade prompt when the free-tier limit is hit.

1. Open the Service Worker console
2. Set the monthly count to the free-tier limit:
   ```js
   chrome.storage.local.set({ 'local:monthlyCount': 5 })
   ```
3. Click the extension icon to open the popup
4. Confirm the popup shows "5/5 files this month" and the amber upgrade banner below the counter
5. Capture the popup area (center on white 1280×800 canvas if needed)
6. Save as: `screenshot-3-popup-limit.png`

---

## Screenshot 4: Options Page — License Key Input

Shows the key activation flow for the premium upgrade.

1. Open the options page
2. Locate the **"Have a key?"** link or button and click it to expand the key input field
3. Type any placeholder string in the input (does not need to be a valid key — this is for the screenshot only)
4. Confirm the expanded state shows the text input and the **Activate** button
5. Capture the full options page at 1280×800 px
6. Save as: `screenshot-4-options-key-input.png`

---

## Notes

- **Preferred dimensions:** 1280×800 px. If popup or options content is smaller, center it on a white 1280×800 canvas using any image editor (e.g., GIMP, Preview, Figma).
- **No personal information:** Do not include real filenames, email addresses, or any identifiable data in screenshots. The injected rule key `invoice-pdf` and the placeholder key string are safe.
- **Promo tile is separate:** The 440×280 PNG promo tile is a marketing banner — not a screenshot. Create it in Figma, Canva, or a similar tool and upload it separately in the Chrome Web Store Developer Dashboard under "Promotional images."
- **Upload location:** Chrome Web Store Developer Dashboard → your extension → **Store listing** tab → Screenshots section.
- **Order matters:** Upload the screenshots in the order above — Screenshot 1 appears first in the listing.
