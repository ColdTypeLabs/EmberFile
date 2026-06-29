import React, { useEffect, useState } from 'react';
import { storageEnabled, storageMonthlyCount } from '../../src/lib/storage';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PopupState {
  enabled: boolean;
  count: number;
  loaded: boolean;
}

// ---------------------------------------------------------------------------
// Sub-components (inline — small popup scope)
// ---------------------------------------------------------------------------

function PopupHeader() {
  return (
    <div className="flex items-center gap-2">
      {/* Placeholder icon — 20x20 blue circle */}
      <svg
        width="20"
        height="20"
        viewBox="0 0 20 20"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <circle cx="10" cy="10" r="10" fill="#2563eb" />
        <path
          d="M6 10h8M10 6l4 4-4 4"
          stroke="white"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className="text-lg font-bold text-gray-900">Download Renamer</span>
    </div>
  );
}

interface PauseResumeButtonProps {
  enabled: boolean;
  onToggle: () => void;
}

function PauseResumeButton({ enabled, onToggle }: PauseResumeButtonProps) {
  return (
    <button
      onClick={onToggle}
      className="w-full bg-blue-600 text-white rounded-md h-9 text-sm font-semibold hover:bg-blue-700 transition-colors"
    >
      {enabled ? 'Pause' : 'Resume'}
    </button>
  );
}

interface RenameCountLabelProps {
  count: number;
}

function RenameCountLabel({ count }: RenameCountLabelProps) {
  return (
    <p className="text-sm text-gray-500">{count} files renamed this month</p>
  );
}

interface AccountBadgeProps {
  isPremium: boolean;
}

function AccountBadge({ isPremium }: AccountBadgeProps) {
  if (isPremium) {
    return (
      <span className="bg-indigo-100 text-indigo-700 text-xs font-semibold px-2 py-0.5 rounded-full">
        PREMIUM ✓
      </span>
    );
  }
  return (
    <span className="bg-blue-100 text-blue-700 text-xs font-semibold px-2 py-0.5 rounded-full">
      FREE
    </span>
  );
}

function ManageRulesLink() {
  function handleClick() {
    chrome.tabs.create({ url: chrome.runtime.getURL('options.html') });
  }

  return (
    <button
      onClick={handleClick}
      className="text-blue-600 text-sm font-semibold text-left"
    >
      Manage rules →
    </button>
  );
}

// ---------------------------------------------------------------------------
// Loading skeleton — prevents flash of incorrect state
// ---------------------------------------------------------------------------

function LoadingSkeleton() {
  return (
    <div className="w-[360px] bg-white p-4 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <div className="w-5 h-5 rounded-full bg-gray-200 animate-pulse" />
        <div className="h-5 w-36 rounded bg-gray-200 animate-pulse" />
      </div>
      <div className="w-full h-9 rounded-md bg-gray-200 animate-pulse" />
      <div className="h-4 w-48 rounded bg-gray-200 animate-pulse" />
      <div className="flex items-center justify-between">
        <div className="h-5 w-12 rounded-full bg-gray-200 animate-pulse" />
        <div className="h-4 w-24 rounded bg-gray-200 animate-pulse" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// PopupShell — main container
// ---------------------------------------------------------------------------

export default function App() {
  const [state, setState] = useState<PopupState>({
    enabled: true,
    count: 0,
    loaded: false,
  });

  // Phase 3: isPremium is hardcoded false — Phase 4 wires the real license check
  const isPremium = false;

  useEffect(() => {
    Promise.all([
      storageEnabled.getValue(),
      storageMonthlyCount.getValue(),
    ]).then(([enabled, count]) => {
      setState({ enabled, count, loaded: true });
    }).catch(() => {
      // Storage unavailable — default to safe values so popup doesn't stay in LoadingSkeleton (WR-02)
      setState({ enabled: true, count: 0, loaded: true });
    });
  }, []);

  async function handleToggle() {
    const next = !state.enabled;
    try {
      await storageEnabled.setValue(next);
      setState((s) => ({ ...s, enabled: next }));
    } catch {
      // Storage error — do not leave promise unhandled; UI keeps current state (WR-01)
    }
  }

  if (!state.loaded) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="w-[360px] bg-white p-4 flex flex-col gap-3">
      <PopupHeader />
      <PauseResumeButton enabled={state.enabled} onToggle={handleToggle} />
      <RenameCountLabel count={state.count} />
      <div className="flex items-center justify-between">
        <AccountBadge isPremium={isPremium} />
        <ManageRulesLink />
      </div>
    </div>
  );
}
