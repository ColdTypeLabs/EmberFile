import { storage } from '@wxt-dev/storage';

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

export default defineBackground(() => {
  // Placeholder — download hook implemented in Plan 02
});
