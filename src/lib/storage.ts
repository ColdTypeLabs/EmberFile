import { storage } from '@wxt-dev/storage';

// --- Storage items — single source of truth for all storage definitions ---

export const storageEnabled = storage.defineItem<boolean>('local:enabled', {
  fallback: true,
});

export const storageMonthlyCount = storage.defineItem<number>('local:monthlyCount', {
  fallback: 0,
});

export const storageMonthlyResetDate = storage.defineItem<string>('local:monthlyResetDate', {
  init: () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  },
});

export const storageRules = storage.defineItem<
  Record<string, { tag: string; renameFormat: string; matchCount: number }>
>('local:rules', { fallback: {} });

export const storageCustomRules = storage.defineItem<
  Record<string, { matchText: string; renameFormat: string }>
>('local:customRules', { fallback: {} });

export const storageConflict = storage.defineItem<{
  fingerprint: string;
  customRule: { matchText: string; renameFormat: string };
  learnedRule: { tag: string; renameFormat: string };
} | null>('local:pendingConflict', { fallback: null });

export const storageLocalLicenseKey = storage.defineItem<string | null>('local:licenseKey', {
  fallback: null,
});
