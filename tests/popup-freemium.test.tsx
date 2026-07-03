import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { fakeBrowser } from '@webext-core/fake-browser';
import App from '../entrypoints/popup/App';
import { UPGRADE_URL } from '../src/lib/constants';

beforeEach(async () => {
  fakeBrowser.reset();
  // fakeBrowser.reset() resets API listeners but not storage data — clear explicitly
  await fakeBrowser.storage.local.clear();
  vi.unstubAllGlobals();
  // chrome.tabs.create is not implemented by fakeBrowser — stub it manually
  (globalThis as any).chrome = {
    ...(globalThis as any).chrome,
    tabs: { create: vi.fn() },
  };
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('PopupScreen — freemium UI', () => {
  it('shows upgrade banner and FREE badge when free tier is at the monthly limit', async () => {
    // @wxt-dev/storage strips the 'local:' prefix when writing to chrome.storage.local
    await fakeBrowser.storage.local.set({
      enabled: true,
      monthlyCount: 5,
      licenseKey: null,
      hasConsented: true,
    });

    render(<App />);

    const banner = await screen.findByText('Monthly limit reached');
    expect(banner).toBeTruthy();
    expect(screen.getByText('FREE')).toBeTruthy();
    expect(screen.queryByText('PREMIUM ✓')).toBeNull();
  });

  it('hides upgrade banner and shows PREMIUM badge when license key is set, even at/above limit', async () => {
    await fakeBrowser.storage.local.set({
      enabled: true,
      monthlyCount: 5,
      licenseKey: 'PREMIUM-KEY-123',
      hasConsented: true,
    });

    render(<App />);

    await screen.findByText('PREMIUM ✓');
    expect(screen.queryByText('Monthly limit reached')).toBeNull();
    expect(screen.queryByText('FREE')).toBeNull();
  });

  it('hides upgrade banner when free tier is under the monthly limit', async () => {
    await fakeBrowser.storage.local.set({
      enabled: true,
      monthlyCount: 2,
      licenseKey: null,
      hasConsented: true,
    });

    render(<App />);

    await screen.findByText('FREE');
    expect(screen.queryByText('Monthly limit reached')).toBeNull();
  });

  it('clicking the banner "Upgrade to Premium" button opens UPGRADE_URL in a new tab', async () => {
    await fakeBrowser.storage.local.set({
      enabled: true,
      monthlyCount: 5,
      licenseKey: null,
      hasConsented: true,
    });

    render(<App />);

    const upgradeButton = await screen.findByText('Upgrade to Premium');
    fireEvent.click(upgradeButton);

    expect((globalThis as any).chrome.tabs.create).toHaveBeenCalledWith({ url: UPGRADE_URL });
  });
});
