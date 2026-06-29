import { computeFingerprint } from '../src/lib/fingerprint';
import { applyTemplate } from '../src/lib/renameEngine';
import {
  storageEnabled,
  storageMonthlyCount,
  storageMonthlyResetDate,
  storageRules,
  storageCustomRules,
  storageConflict,
} from '../src/lib/storage';

const WORKER_URL = import.meta.env.VITE_WORKER_URL;

// --- Extracted handler for unit testability ---
export async function handleDeterminingFilename(
  downloadItem: chrome.downloads.DownloadItem,
  suggest: (suggestion?: chrome.downloads.FilenameSuggestion) => void
): Promise<void> {
  let suggested = false;

  try {
    const enabled = await storageEnabled.getValue();
    if (!enabled) return; // finally calls suggest() with no args

    if (!WORKER_URL) throw new Error('VITE_WORKER_URL not set');

    const originalName = downloadItem.filename.split(/[/\\]/).pop() ?? downloadItem.filename;
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
    }
  } catch {
    // Storage or network errors must not hang downloads — fall through to finally
  } finally {
    if (!suggested) {
      suggest(); // no-arg = Chrome uses its default filename; releases the download
    }
  }
}

export default defineBackground(() => {
  chrome.downloads.onDeterminingFilename.addListener((downloadItem, suggest) => {
    handleDeterminingFilename(downloadItem, suggest);
    return true; // signal Chrome to wait for async suggest() call
  });
});
