import React, { useEffect, useState } from 'react';
import {
  storageEnabled,
  storageMonthlyCount,
  storageLocalLicenseKey,
  storageRules,
  storageCustomRules,
  storageConflict,
  storageHasConsented,
} from '../../src/lib/storage';
import { UPGRADE_URL, PRIVACY_URL, CHROME_STORE_URL } from '../../src/lib/constants';
import { RuleRow } from '../../src/components/RuleRow';
import { CustomRuleRow } from '../../src/components/CustomRuleRow';
import { ConflictModal } from '../../src/components/ConflictModal';
import type { RulesMap, CustomRulesMap, RowMode, ConflictData, CustomRuleEntry } from '../../src/components/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Screen = 'consent' | 'popup' | 'settings' | 'rules';

// ---------------------------------------------------------------------------
// Small inline helpers
// ---------------------------------------------------------------------------

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold text-text-muted uppercase tracking-widest px-3 pt-4 pb-1">
      {children}
    </p>
  );
}

function ScreenNav({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div className="flex items-center px-4 py-3 border-b border-border sticky top-0 bg-bg z-10">
      <button
        onClick={onBack}
        className="text-accent text-sm font-bold mr-auto"
      >
        ← Back
      </button>
      <span className="text-sm font-bold text-text-primary absolute left-1/2 -translate-x-1/2">
        {title}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

function LoadingSkeleton() {
  return (
    <div className="w-[380px] bg-bg p-4 flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <div className="w-5 h-5 rounded-full bg-surface animate-pulse" />
        <div className="h-5 w-32 rounded bg-surface animate-pulse" />
      </div>
      <div className="h-10 w-full rounded bg-surface animate-pulse" />
      <div className="h-4 w-40 rounded bg-surface animate-pulse" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Screen 0 — ConsentScreen (shown once before any data leaves the device)
// ---------------------------------------------------------------------------

function ConsentScreen({ onAccept }: { onAccept: () => void }) {
  return (
    <div className="w-[380px] bg-bg flex flex-col">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <rect x="3" y="2" width="10" height="13" rx="1.5" stroke="#4A90E2" strokeWidth="1.5" />
          <path d="M9 8h5M12 5l3 3-3 3" stroke="#4A90E2" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="text-base font-bold text-text-primary">Before we start</span>
      </div>

      <div className="px-5 py-5 flex flex-col gap-4">
        <p className="text-sm text-text-primary leading-relaxed">
          To rename your downloads, this extension sends a small amount of data to an AI model.
          Here's exactly what leaves your device:
        </p>

        <ul className="flex flex-col gap-2">
          {[
            ['✓ Sent', 'The filename (e.g. "invoice_2026_q1.pdf")'],
            ['✓ Sent', 'The file type and size'],
            ['✓ Sent', 'Download source — domain and path only (e.g. "adobe.com/billing/download")'],
            ['✗ Never sent', 'File contents'],
            ['✗ Never sent', 'URL query parameters (account numbers, tokens, IDs)'],
            ['✗ Never sent', 'Your browsing history or identity'],
          ].map(([label, desc]) => (
            <li key={desc} className="flex gap-2 text-xs">
              <span className={`font-bold shrink-0 ${label.startsWith('✓') ? 'text-green-400' : 'text-text-muted'}`}>
                {label}
              </span>
              <span className="text-text-secondary">{desc}</span>
            </li>
          ))}
        </ul>

        <p className="text-xs text-text-muted leading-relaxed">
          Data is processed by Claude AI and never stored or used for training.{' '}
          <button
            className="underline text-accent"
            onClick={() => chrome.tabs.create({ url: 'https://coldtypelabs.github.io/Download-Renamer-Web-Extension-privacy/privacy.html' })}
          >
            Full privacy policy
          </button>
        </p>

        <button
          onClick={onAccept}
          className="w-full py-2.5 rounded-lg bg-accent text-white text-sm font-bold hover:bg-accent/90 transition-colors"
        >
          Got it — start renaming
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Screen 1 — PopupScreen
// ---------------------------------------------------------------------------

interface PopupScreenProps {
  enabled: boolean;
  count: number;
  isPremium: boolean;
  onToggle: () => void;
  setScreen: (s: Screen) => void;
}

function PopupScreen({ enabled, count, isPremium, onToggle, setScreen }: PopupScreenProps) {
  const showUpgradeBanner = !isPremium && count >= 5;

  return (
    <div className="w-[380px] bg-bg flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <rect x="3" y="2" width="10" height="13" rx="1.5" stroke="#4A90E2" strokeWidth="1.5" />
          <path d="M9 8h5M12 5l3 3-3 3" stroke="#4A90E2" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="text-base font-bold text-text-primary">Smart Rename</span>
        <span className="text-[10px] text-text-muted ml-1">[PLACEHOLDER NAME]</span>
      </div>

      {/* Upgrade banner */}
      {showUpgradeBanner && (
        <div className="mx-3 mt-3 rounded-lg border border-[#FDE68A] bg-[#FFFBEB] px-3 py-2 flex items-center justify-between">
          <span className="text-xs font-semibold text-amber-800">Monthly limit reached</span>
          <button
            onClick={() => chrome.tabs.create({ url: UPGRADE_URL })}
            className="text-xs font-bold text-amber-700 underline ml-2"
          >
            Upgrade to Premium
          </button>
        </div>
      )}

      {/* Stats block */}
      <div className="flex flex-col items-center pt-6 pb-4">
        <span className="text-[30px] font-bold text-accent leading-none">{count}</span>
        <span className="text-sm text-text-secondary mt-1">files renamed this month</span>
      </div>

      {/* Toggle row */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-border">
        <span className="text-sm font-bold text-text-primary">Renaming</span>
        <button
          role="switch"
          aria-checked={enabled}
          onClick={onToggle}
          className={`relative w-10 h-6 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-accent/50 ${
            enabled ? 'bg-accent' : 'bg-border'
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
              enabled ? 'translate-x-4' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {/* Button row */}
      <div className="flex gap-2 px-4 pb-4">
        <button
          onClick={() => setScreen('settings')}
          className="flex-1 bg-surface border border-border text-text-primary text-sm font-bold rounded-lg py-2 hover:bg-border transition-colors"
        >
          Settings
        </button>
        <button
          onClick={() => setScreen('rules')}
          className="flex-1 bg-surface border border-border text-text-primary text-sm font-bold rounded-lg py-2 hover:bg-border transition-colors"
        >
          View Rules
        </button>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-border">
        <span className="text-xs font-semibold text-text-secondary">v1.0.0</span>
        {isPremium ? (
          <span className="text-xs font-bold text-accent">PREMIUM ✓</span>
        ) : (
          <div className="flex items-center gap-2">
            <span className="bg-surface border border-border text-text-secondary text-xs font-bold px-2 py-0.5 rounded-full">
              FREE
            </span>
            <button
              onClick={() => chrome.tabs.create({ url: UPGRADE_URL })}
              className="text-xs font-bold text-accent"
            >
              Upgrade →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Screen 2 — SettingsScreen
// ---------------------------------------------------------------------------

interface SettingsScreenProps {
  enabled: boolean;
  count: number;
  isPremium: boolean;
  rules: RulesMap;
  customRules: CustomRulesMap;
  rowModes: Record<string, RowMode>;
  customRowModes: Record<string, RowMode>;
  setScreen: (s: Screen) => void;
  onToggle: () => void;
  onSetMode: (fp: string, mode: RowMode) => void;
  onSaved: (fp: string, newFormat: string) => void;
  onDeleted: (fp: string) => void;
  onCustomSetMode: (key: string, mode: RowMode) => void;
  onCustomDeleted: (key: string) => void;
  onCustomAdded: (matchText: string, rule: CustomRuleEntry) => void;
  onClearStats: () => void;
  showKeyInput: boolean;
  setShowKeyInput: (v: boolean) => void;
  keyValue: string;
  setKeyValue: (v: string) => void;
  keyActivating: boolean;
  keyError: string | null;
  onActivateKey: () => void;
  setIsPremium: (v: boolean) => void;
}

function SettingsScreen({
  enabled,
  count,
  isPremium,
  rules,
  customRules,
  rowModes,
  customRowModes,
  setScreen,
  onToggle,
  onSetMode,
  onSaved,
  onDeleted,
  onCustomSetMode,
  onCustomDeleted,
  onCustomAdded,
  onClearStats,
  showKeyInput,
  setShowKeyInput,
  keyValue,
  setKeyValue,
  keyActivating,
  keyError,
  onActivateKey,
}: SettingsScreenProps) {
  const [showAddRule, setShowAddRule] = useState(false);
  const [addMatchText, setAddMatchText] = useState('');
  const [addRenameFormat, setAddRenameFormat] = useState('');
  const [addSubmitting, setAddSubmitting] = useState(false);
  const [addValidationError, setAddValidationError] = useState<string | null>(null);
  const [addSaveError, setAddSaveError] = useState(false);

  const patternsCount = Object.keys(rules).length;
  const remaining = Math.max(0, 5 - count);

  async function handleAddRule() {
    const trimmedMatch = addMatchText.trim();
    const trimmedFormat = addRenameFormat.trim();
    if (!trimmedMatch || !trimmedFormat) {
      setAddValidationError('Both fields are required.');
      return;
    }
    if (trimmedMatch.length > 200 || trimmedFormat.length > 200) {
      setAddValidationError('Fields must be 200 characters or fewer.');
      return;
    }
    if (['__proto__', 'constructor', 'prototype'].includes(trimmedMatch)) {
      setAddValidationError('Invalid match text.');
      return;
    }
    setAddValidationError(null);
    setAddSaveError(false);
    setAddSubmitting(true);
    try {
      const current = await storageCustomRules.getValue();
      current[trimmedMatch] = { matchText: trimmedMatch, renameFormat: trimmedFormat };
      await storageCustomRules.setValue(current);
      onCustomAdded(trimmedMatch, { matchText: trimmedMatch, renameFormat: trimmedFormat });
      setAddMatchText('');
      setAddRenameFormat('');
      setShowAddRule(false);
    } catch {
      setAddSaveError(true);
    } finally {
      setAddSubmitting(false);
    }
  }

  return (
    <div className="w-[380px] bg-bg flex flex-col max-h-[600px] overflow-y-auto">
      <ScreenNav title="Settings" onBack={() => setScreen('popup')} />

      {/* YOUR ACCOUNT */}
      <SectionHeader>Your Account</SectionHeader>
      <div className="mx-3 rounded-lg border border-border bg-surface p-3 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-text-secondary">Plan</span>
          {isPremium ? (
            <span className="text-xs font-bold text-accent">PREMIUM ✓</span>
          ) : (
            <span className="bg-bg border border-border text-text-secondary text-xs font-bold px-2 py-0.5 rounded-full">
              FREE
            </span>
          )}
        </div>
        {!isPremium && (
          <p className="text-xs text-text-secondary">5 files/month limit · {remaining} remaining this month</p>
        )}
        {!isPremium && (
          <button
            onClick={() => chrome.tabs.create({ url: UPGRADE_URL })}
            className="w-full bg-accent text-white text-sm font-bold rounded-lg py-2 hover:bg-accent-hover transition-colors mt-1"
          >
            Upgrade to Premium
          </button>
        )}
        {!isPremium && !showKeyInput && (
          <button
            onClick={() => setShowKeyInput(true)}
            className="text-xs text-text-muted underline text-left mt-1"
          >
            Have a key?
          </button>
        )}
        {!isPremium && showKeyInput && (
          <div className="flex flex-col gap-1 mt-1">
            <input
              type="text"
              value={keyValue}
              onChange={(e) => setKeyValue(e.target.value)}
              placeholder="Enter your license key"
              className="border border-input-border rounded px-2 py-1 text-sm w-full bg-input-bg text-input-text focus:outline-none focus:ring-2 focus:ring-accent"
            />
            <button
              disabled={keyActivating || !keyValue.trim()}
              onClick={onActivateKey}
              className="bg-accent text-white text-sm font-bold px-3 py-1 rounded h-8 hover:bg-accent-hover disabled:opacity-50 self-start mt-1"
            >
              {keyActivating ? 'Activating…' : 'Activate'}
            </button>
            {keyError && (
              <p className="text-xs text-red-400 mt-1">{keyError}</p>
            )}
          </div>
        )}
      </div>

      {/* THIS MONTH */}
      <SectionHeader>This Month</SectionHeader>
      <div className="mx-3 grid grid-cols-2 gap-2">
        <div className="rounded-lg border border-border bg-surface p-3 flex flex-col items-center">
          <span className="text-[22px] font-bold text-accent">{count}</span>
          <span className="text-xs text-text-secondary mt-1 text-center">Files Renamed</span>
        </div>
        <div className="rounded-lg border border-border bg-surface p-3 flex flex-col items-center">
          <span className="text-[22px] font-bold text-accent">{patternsCount}</span>
          <span className="text-xs text-text-secondary mt-1 text-center">Patterns Learned</span>
        </div>
      </div>
      <button
        onClick={onClearStats}
        className="text-xs text-text-muted text-right px-3 pt-1 pb-0 hover:text-text-secondary"
      >
        Clear Stats
      </button>

      {/* YOUR PATTERNS */}
      <SectionHeader>Your Patterns</SectionHeader>
      {patternsCount === 0 ? (
        <p className="text-sm text-text-muted text-center py-4 px-3">
          No patterns yet — rename a file to create your first rule.
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-border mx-3">
          {Object.entries(rules).map(([fingerprint, rule]) => (
            <RuleRow
              key={fingerprint}
              fingerprint={fingerprint}
              rule={rule}
              mode={rowModes[fingerprint] ?? 'default'}
              onSetMode={onSetMode}
              onSaved={onSaved}
              onDeleted={onDeleted}
            />
          ))}
        </ul>
      )}

      {/* CUSTOM RULES */}
      <SectionHeader>Custom Rules</SectionHeader>
      {Object.keys(customRules).length > 0 && (
        <ul className="flex flex-col divide-y divide-border mx-3">
          {Object.entries(customRules).map(([key, rule]) => (
            <CustomRuleRow
              key={key}
              matchText={key}
              rule={rule}
              mode={customRowModes[key] ?? 'default'}
              onSetMode={onCustomSetMode}
              onDeleted={onCustomDeleted}
            />
          ))}
        </ul>
      )}
      <div className="mx-3 mt-2 rounded-lg border border-border bg-surface overflow-hidden">
        <button
          onClick={() => setShowAddRule((v) => !v)}
          className="w-full flex items-center justify-between px-3 py-2.5 text-sm font-semibold text-text-primary"
        >
          <span>Create Custom Rule</span>
          <span className="text-text-muted">{showAddRule ? '▲' : '▼'}</span>
        </button>
        {showAddRule && (
          <div className="border-t border-border px-3 pb-3 pt-2 flex flex-col gap-2">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-text-secondary">Filename pattern contains:</label>
              <input
                type="text"
                value={addMatchText}
                onChange={(e) => setAddMatchText(e.target.value)}
                placeholder="e.g. invoice"
                className="border border-input-border rounded px-2 py-1 text-sm w-full bg-input-bg text-input-text focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-text-secondary">Rename to:</label>
              <input
                type="text"
                value={addRenameFormat}
                onChange={(e) => setAddRenameFormat(e.target.value)}
                placeholder="e.g. Invoice_{date}"
                className="border border-input-border rounded px-2 py-1 text-sm w-full bg-input-bg text-input-text font-mono focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            <p className="text-xs text-text-muted">Slots: {'{tag}'} {'{date}'} {'{index}'}</p>
            {addValidationError && (
              <p className="text-xs text-red-400">{addValidationError}</p>
            )}
            {addSaveError && (
              <p className="text-xs text-red-400">Could not save rule. Please try again.</p>
            )}
            <button
              disabled={addSubmitting}
              onClick={handleAddRule}
              className="bg-accent text-white text-sm font-bold px-4 py-2 rounded-lg hover:bg-accent-hover disabled:opacity-50 self-start"
            >
              Add Rule
            </button>
          </div>
        )}
      </div>

      {/* PREFERENCES */}
      <SectionHeader>Preferences</SectionHeader>
      <div className="mx-3 rounded-lg border border-border bg-surface">
        <div className="flex items-center justify-between px-3 py-2.5">
          <span className="text-sm text-text-primary">Enable renaming</span>
          <button
            role="switch"
            aria-checked={enabled}
            onClick={onToggle}
            className={`relative w-10 h-6 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-accent/50 ${
              enabled ? 'bg-accent' : 'bg-border'
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                enabled ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
        <div className="border-t border-border flex items-center justify-between px-3 py-2.5">
          <span className="text-sm text-text-secondary">Downloads folder</span>
          <span className="text-xs text-text-muted">~/Downloads</span>
        </div>
      </div>

      {/* ABOUT */}
      <SectionHeader>About</SectionHeader>
      <div className="mx-3 mb-4 rounded-lg border border-border bg-surface">
        <div className="flex items-center justify-between px-3 py-2.5">
          <span className="text-sm text-text-secondary">Version</span>
          <span className="text-xs font-semibold text-text-secondary">v1.0.0</span>
        </div>
        <div className="border-t border-border flex items-center gap-3 px-3 py-2.5">
          <button
            onClick={() => chrome.tabs.create({ url: PRIVACY_URL })}
            className="text-xs text-accent"
          >
            Privacy Policy
          </button>
          <button
            onClick={() => chrome.tabs.create({ url: 'mailto:ColdtypeLabs.support@proton.me' })}
            className="text-xs text-accent"
          >
            Report Bug
          </button>
          <button
            onClick={() => chrome.tabs.create({ url: CHROME_STORE_URL })}
            className="text-xs text-accent"
          >
            Rate Extension
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Screen 3 — RulesScreen
// ---------------------------------------------------------------------------

interface RulesScreenProps {
  rules: RulesMap;
  customRules: CustomRulesMap;
  rowModes: Record<string, RowMode>;
  customRowModes: Record<string, RowMode>;
  setScreen: (s: Screen) => void;
  onSetMode: (fp: string, mode: RowMode) => void;
  onSaved: (fp: string, newFormat: string) => void;
  onDeleted: (fp: string) => void;
  onCustomSetMode: (key: string, mode: RowMode) => void;
  onCustomDeleted: (key: string) => void;
}

function RulesScreen({
  rules,
  customRules,
  rowModes,
  customRowModes,
  setScreen,
  onSetMode,
  onSaved,
  onDeleted,
  onCustomSetMode,
  onCustomDeleted,
}: RulesScreenProps) {
  const learnedCount = Object.keys(rules).length;
  const customCount = Object.keys(customRules).length;

  return (
    <div className="w-[380px] bg-bg flex flex-col max-h-[600px] overflow-y-auto">
      <ScreenNav title="Your Rules" onBack={() => setScreen('popup')} />

      <SectionHeader>Learned Rules</SectionHeader>
      {learnedCount === 0 ? (
        <p className="text-sm text-text-muted text-center py-4 px-3">
          No patterns yet...
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-border mx-3">
          {Object.entries(rules).map(([fingerprint, rule]) => (
            <RuleRow
              key={fingerprint}
              fingerprint={fingerprint}
              rule={rule}
              mode={rowModes[fingerprint] ?? 'default'}
              onSetMode={onSetMode}
              onSaved={onSaved}
              onDeleted={onDeleted}
            />
          ))}
        </ul>
      )}

      <SectionHeader>Custom Rules</SectionHeader>
      {customCount === 0 ? (
        <p className="text-sm text-text-muted text-center py-4 px-3 mb-2">
          No custom rules yet.
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-border mx-3 mb-4">
          {Object.entries(customRules).map(([key, rule]) => (
            <CustomRuleRow
              key={key}
              matchText={key}
              rule={rule}
              mode={customRowModes[key] ?? 'default'}
              onSetMode={onCustomSetMode}
              onDeleted={onCustomDeleted}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Root App
// ---------------------------------------------------------------------------

export default function App() {
  const [screen, setScreen] = useState<Screen>('popup');
  const [loaded, setLoaded] = useState(false);
  const [hasConsented, setHasConsented] = useState(true); // optimistic — corrected on load
  const [enabled, setEnabled] = useState(true);
  const [count, setCount] = useState(0);
  const [isPremium, setIsPremium] = useState(false);
  const [rules, setRules] = useState<RulesMap>({});
  const [customRules, setCustomRules] = useState<CustomRulesMap>({});
  const [rowModes, setRowModes] = useState<Record<string, RowMode>>({});
  const [customRowModes, setCustomRowModes] = useState<Record<string, RowMode>>({});
  const [pendingConflict, setPendingConflict] = useState<ConflictData>(null);
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [keyValue, setKeyValue] = useState('');
  const [keyActivating, setKeyActivating] = useState(false);
  const [keyError, setKeyError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      storageEnabled.getValue(),
      storageMonthlyCount.getValue(),
      storageLocalLicenseKey.getValue(),
      storageRules.getValue(),
      storageCustomRules.getValue(),
      storageConflict.getValue(),
      storageHasConsented.getValue(),
    ]).then(([enabledVal, countVal, licenseKey, rulesVal, customRulesVal, conflictVal, consentedVal]) => {
      setEnabled(enabledVal);
      setCount(countVal);
      setIsPremium(!!licenseKey);
      setRules(rulesVal);
      setCustomRules(customRulesVal);
      setPendingConflict(conflictVal);
      setHasConsented(consentedVal);
      if (!consentedVal) setScreen('consent');
      setLoaded(true);
    }).catch(() => {
      setLoaded(true);
    });
  }, []);

  async function handleConsent() {
    await storageHasConsented.setValue(true);
    setHasConsented(true);
    setScreen('popup');
  }

  async function handleToggle() {
    const next = !enabled;
    try {
      await storageEnabled.setValue(next);
      setEnabled(next);
    } catch {
      // Storage error — keep current state
    }
  }

  async function handleActivateKey() {
    setKeyActivating(true);
    setKeyError(null);
    try {
      const res = await Promise.race([
        fetch(`${import.meta.env.VITE_WORKER_URL}/validate-key`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: keyValue.trim() }),
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new TypeError('timeout')), 5000)
        ),
      ]);
      const data = await res.json();
      if (!data.valid) throw new Error('invalid');
      await storageLocalLicenseKey.setValue(keyValue.trim());
      setIsPremium(true);
      setShowKeyInput(false);
      setKeyValue('');
    } catch (e) {
      setKeyError(
        e instanceof TypeError
          ? 'Activation failed — check your connection and try again.'
          : 'Invalid key — please check and try again.'
      );
    } finally {
      setKeyActivating(false);
    }
  }

  function handleSetMode(fingerprint: string, mode: RowMode) {
    setRowModes((prev) => ({ ...prev, [fingerprint]: mode }));
  }

  function handleSaved(fingerprint: string, newFormat: string) {
    setRules((prev) => ({
      ...prev,
      [fingerprint]: { ...prev[fingerprint], renameFormat: newFormat },
    }));
  }

  function handleDeleted(fingerprint: string) {
    setRules((prev) => {
      const next = { ...prev };
      delete next[fingerprint];
      return next;
    });
  }

  function handleCustomSetMode(key: string, mode: RowMode) {
    setCustomRowModes((prev) => ({ ...prev, [key]: mode }));
  }

  function handleCustomDeleted(key: string) {
    setCustomRules((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  function handleCustomAdded(matchText: string, rule: CustomRuleEntry) {
    setCustomRules((prev) => ({ ...prev, [matchText]: rule }));
  }

  async function handleClearStats() {
    try {
      await storageMonthlyCount.setValue(0);
      setCount(0);
    } catch {
      // Storage error — ignore
    }
  }

  if (!loaded) return <LoadingSkeleton />;

  const sharedRuleProps = {
    rules,
    customRules,
    rowModes,
    customRowModes,
    onSetMode: handleSetMode,
    onSaved: handleSaved,
    onDeleted: handleDeleted,
    onCustomSetMode: handleCustomSetMode,
    onCustomDeleted: handleCustomDeleted,
  };

  return (
    <>
      {screen === 'consent' ? (
        <ConsentScreen onAccept={handleConsent} />
      ) : pendingConflict !== null ? (
        <ConflictModal
          conflict={pendingConflict}
          onResolved={() => setPendingConflict(null)}
          onRulesUpdated={(fingerprint, newFormat) => handleSaved(fingerprint, newFormat)}
        />
      ) : screen === 'settings' ? (
        <SettingsScreen
          {...sharedRuleProps}
          enabled={enabled}
          count={count}
          isPremium={isPremium}
          setScreen={setScreen}
          onToggle={handleToggle}
          onCustomAdded={handleCustomAdded}
          onClearStats={handleClearStats}
          showKeyInput={showKeyInput}
          setShowKeyInput={setShowKeyInput}
          keyValue={keyValue}
          setKeyValue={setKeyValue}
          keyActivating={keyActivating}
          keyError={keyError}
          onActivateKey={handleActivateKey}
          setIsPremium={setIsPremium}
        />
      ) : screen === 'rules' ? (
        <RulesScreen
          {...sharedRuleProps}
          setScreen={setScreen}
        />
      ) : (
        <PopupScreen
          enabled={enabled}
          count={count}
          isPremium={isPremium}
          onToggle={handleToggle}
          setScreen={setScreen}
        />
      )}
    </>
  );
}
