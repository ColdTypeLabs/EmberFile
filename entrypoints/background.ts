import { computeFingerprint } from '../src/lib/fingerprint';
import { applyTemplate } from '../src/lib/renameEngine';
import {
  storageEnabled,
  storageMonthlyCount,
  storageMonthlyResetDate,
  storageRules,
  storageCustomRules,
  storageConflict,
  storageLocalLicenseKey,
} from '../src/lib/storage';

import { UPGRADE_URL } from '../src/lib/constants';

const WORKER_URL = import.meta.env.VITE_WORKER_URL;

// --- Helper: returns the Unix timestamp (ms) of the first day of next month ---
function getFirstOfNextMonthMs(): number {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0, 0).getTime();
}

// --- Helper: resets monthly counter if stored reset date is in a prior month ---
async function checkMissedReset(): Promise<void> {
  const resetDate = await storageMonthlyResetDate.getValue();
  const parts = resetDate.split('-');
  const storedYear = parseInt(parts[0], 10);
  const storedMonth = parseInt(parts[1], 10); // 1-based
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1-based

  const isBehind =
    storedYear < currentYear ||
    (storedYear === currentYear && storedMonth < currentMonth);

  if (isBehind) {
    await storageMonthlyCount.setValue(0);
    const newDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
    await storageMonthlyResetDate.setValue(newDate);
  }
}

// --- Helper: creates the monthly reset alarm if it doesn't already exist ---
async function setupAlarms(): Promise<void> {
  const existing = await chrome.alarms.get('monthlyReset');
  if (!existing) {
    chrome.alarms.create('monthlyReset', {
      when: getFirstOfNextMonthMs(),
      periodInMinutes: 43200, // 30 days fallback period
    });
  }
}

// --- Top-level listeners (registered synchronously at module init — MV3 requirement) ---

// Extracted as a pure function for unit testability — guards against any future
// notification type with a button at index 0 from misrouting to the upgrade URL.
export function shouldOpenUpgradeUrl(notifId: string, btnIdx: number): boolean {
  return notifId === 'limitReached' && btnIdx === 0;
}

chrome.notifications.onButtonClicked.addListener((notifId, btnIdx) => {
  if (shouldOpenUpgradeUrl(notifId, btnIdx)) {
    chrome.tabs.create({ url: UPGRADE_URL });
  }
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'monthlyReset') {
    await storageMonthlyCount.setValue(0);
    const now = new Date();
    const newDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    await storageMonthlyResetDate.setValue(newDate);
    // Reschedule to the first of next month
    chrome.alarms.create('monthlyReset', { when: getFirstOfNextMonthMs() });
  }
});

// --- Extracted handler for unit testability ---
export async function handleDeterminingFilename(
  downloadItem: chrome.downloads.DownloadItem,
  suggest: (suggestion?: chrome.downloads.FilenameSuggestion) => void
): Promise<void> {
  let suggested = false;

  try {
    // Compute originalName first — needed for both the gate and the rename logic
    const originalName = downloadItem.filename.split(/[/\\]/).pop() ?? downloadItem.filename;

    // --- Freemium gate ---
    const licenseKey = await storageLocalLicenseKey.getValue();
    const isPremium = !!licenseKey;
    const monthlyCount = await storageMonthlyCount.getValue();

    if (!isPremium && monthlyCount >= 5) {
      suggest({ filename: originalName });
      suggested = true;
      chrome.notifications.create('limitReached', {
        type: 'basic',
        iconUrl: chrome.runtime.getURL('icon/128.png'),
        title: 'Download Renamer — Limit reached',
        message: "You’ve used your 5 free renames this month. Upgrade for unlimited.",
        buttons: [{ title: 'Upgrade to Premium' }],
      });
      return;
    }

    const enabled = await storageEnabled.getValue();
    if (!enabled) return; // finally calls suggest() with no args

    if (!WORKER_URL) throw new Error('VITE_WORKER_URL not set');

    const fingerprint = computeFingerprint(originalName);
    const ext = originalName.includes('.') ? originalName.slice(originalName.lastIndexOf('.')) : '';

    const rules = await storageRules.getValue();

    if (rules[fingerprint]) {
      // Cache hit — apply locally, no network request
      const rule = rules[fingerprint];

      // D-20/D-21/D-22: Conflict detection — check if any custom rule also matches this filename
      const customRules = await storageCustomRules.getValue();
      const matchingCustomRule = Object.values(customRules).find(
        (cr) => originalName.toLowerCase().includes(cr.matchText.toLowerCase())
      );
      if (matchingCustomRule) {
        // First-conflict-wins (D-22): only write if no pending conflict is already queued
        const existingConflict = await storageConflict.getValue();
        if (existingConflict === null) {
          await storageConflict.setValue({
            fingerprint,
            customRule: { matchText: matchingCustomRule.matchText, renameFormat: matchingCustomRule.renameFormat },
            learnedRule: { tag: rule.tag, renameFormat: rule.renameFormat },
          });
        }
        // D-21: learned rule applied as fallback regardless of conflict state
      }

      rule.matchCount++;
      await storageRules.setValue(rules);
      const newStem = applyTemplate(rule.renameFormat, rule.tag, rule.matchCount);
      suggest({ filename: newStem + ext, conflictAction: 'uniquify' });
      suggested = true;
      // WR-04: increment monthly counter after successful rename (cache-hit path)
      const currentCount = await storageMonthlyCount.getValue();
      await storageMonthlyCount.setValue(currentCount + 1);
    } else {
      // Cache miss — call Worker relay with 5-second timeout
      const response = await Promise.race([
        fetch(WORKER_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: originalName,
            mimeType: downloadItem.mime ?? '',
            fileSize: downloadItem.fileSize ?? 0,
          }),
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Worker fetch timeout')), 5000)
        ),
      ]);

      if (!response.ok) {
        throw new Error(`Worker error: ${response.status}`);
      }
      const body = await response.json() as { suggestedName?: string; tag?: string; renameFormat?: string };
      if (!body.suggestedName || !body.tag || !body.renameFormat) {
        throw new Error('Invalid Worker response shape');
      }
      const { suggestedName, tag, renameFormat } = body;

      // D-15: full read → mutate → write-back
      const updatedRules = await storageRules.getValue();
      updatedRules[fingerprint] = { tag, renameFormat, matchCount: 1 };
      await storageRules.setValue(updatedRules);

      suggest({ filename: suggestedName + ext, conflictAction: 'uniquify' });
      suggested = true;
      // WR-04: increment monthly counter after successful rename (cache-miss path)
      const currentCount = await storageMonthlyCount.getValue();
      await storageMonthlyCount.setValue(currentCount + 1);
    }
  } catch {
    // Storage or network errors must not hang downloads — fall through to finally
  } finally {
    if (!suggested) {
      suggest(); // no-arg = Chrome uses its default filename; releases the download
    }
  }
}

export default defineBackground(async () => {
  await checkMissedReset();
  await setupAlarms();

  chrome.downloads.onDeterminingFilename.addListener((downloadItem, suggest) => {
    handleDeterminingFilename(downloadItem, suggest);
    return true; // signal Chrome to wait for async suggest() call
  });
});
