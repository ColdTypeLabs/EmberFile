import { describe, it, expect, beforeEach } from 'vitest';
import { fakeBrowser } from '@webext-core/fake-browser';
import { storageLocalLicenseKey } from '../src/lib/storage';

beforeEach(async () => {
  fakeBrowser.reset();
  await fakeBrowser.storage.local.clear();
});

describe('storageLocalLicenseKey', () => {
  it('defaults to null when no key stored', async () => {
    const val = await storageLocalLicenseKey.getValue();
    expect(val).toBeNull();
  });

  it('round-trips a string value', async () => {
    await storageLocalLicenseKey.setValue('KEY-ABC');
    const val = await storageLocalLicenseKey.getValue();
    expect(val).toBe('KEY-ABC');
  });

  it('isPremium is false when null', async () => {
    const val = await storageLocalLicenseKey.getValue();
    const isPremium = !!val;
    expect(isPremium).toBe(false);
  });

  it('isPremium is true when a key string is stored', async () => {
    await storageLocalLicenseKey.setValue('PREMIUM-KEY-XYZ');
    const val = await storageLocalLicenseKey.getValue();
    const isPremium = !!val;
    expect(isPremium).toBe(true);
  });
});
