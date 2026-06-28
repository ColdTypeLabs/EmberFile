import { describe, it, expect, beforeEach } from 'vitest';
import { fakeBrowser } from '@webext-core/fake-browser';
import {
  storageEnabled,
  storageMonthlyCount,
  storageMonthlyResetDate,
  storageRules,
} from '../entrypoints/background';

beforeEach(() => {
  fakeBrowser.reset();
});

describe('Storage schema defaults', () => {
  it('enabled defaults to true', async () => {
    const val = await storageEnabled.getValue();
    expect(val).toBe(true);
  });

  it('monthlyCount defaults to 0', async () => {
    const val = await storageMonthlyCount.getValue();
    expect(val).toBe(0);
  });

  it('rules defaults to empty object', async () => {
    const val = await storageRules.getValue();
    expect(val).toEqual({});
  });

  it('monthlyResetDate init returns YYYY-MM-01 format', async () => {
    const val = await storageMonthlyResetDate.getValue();
    expect(val).toMatch(/^\d{4}-\d{2}-01$/);
  });
});

describe('Storage schema persistence', () => {
  it('enabled write then read round-trips correctly', async () => {
    await storageEnabled.setValue(false);
    const val = await storageEnabled.getValue();
    expect(val).toBe(false);
  });

  it('monthlyCount write then read round-trips correctly', async () => {
    await storageMonthlyCount.setValue(3);
    const val = await storageMonthlyCount.getValue();
    expect(val).toBe(3);
  });
});
