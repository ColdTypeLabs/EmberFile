import React, { useEffect, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { storageRules, storageMonthlyCount, storageCustomRules, storageConflict } from '../../src/lib/storage';
import { applyTemplate } from '../../src/lib/renameEngine';

// isPremium is hardcoded false in Phase 3; Phase 4 wires real tier data
const isPremium = false;

type RuleEntry = { tag: string; renameFormat: string; matchCount: number };
type RulesMap = Record<string, RuleEntry>;
type RowMode = 'default' | 'editing' | 'deleting';
type CustomRuleEntry = { matchText: string; renameFormat: string };
type CustomRulesMap = Record<string, CustomRuleEntry>;
type ConflictData = {
  fingerprint: string;
  customRule: { matchText: string; renameFormat: string };
  learnedRule: { tag: string; renameFormat: string };
} | null;

function AccountBadge({ premium }: { premium: boolean }) {
  if (premium) {
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

function EmptyRuleState() {
  return (
    <div className="text-center py-8">
      <h3 className="text-sm font-semibold text-gray-900">No learned rules yet</h3>
      <p className="text-sm text-gray-500 mt-1">
        Rules are created automatically the first time you download a new file type.
      </p>
    </div>
  );
}

function RuleRow({
  fingerprint,
  rule,
  mode,
  onSetMode,
  onSaved,
  onDeleted,
}: {
  fingerprint: string;
  rule: RuleEntry;
  mode: RowMode;
  onSetMode: (fp: string, mode: RowMode) => void;
  onSaved: (fp: string, newFormat: string) => void;
  onDeleted: (fp: string) => void;
}) {
  const [editValue, setEditValue] = useState(rule.renameFormat);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [deleteError, setDeleteError] = useState(false);

  // Reset edit value when row mode changes back to default
  useEffect(() => {
    if (mode === 'default') {
      setEditValue(rule.renameFormat);
      setSaveError(false);
      setDeleteError(false);
    }
  }, [mode, rule.renameFormat]);

  if (mode === 'editing') {
    return (
      <li className="py-3 px-2">
        <div className="flex flex-col gap-1">
          <input
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            placeholder="e.g. {tag}_{date}"
            className="border border-gray-200 rounded px-2 py-1 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-400 mt-1">Slots: {'{tag}'} {'{date}'} {'{index}'}</p>
          <p className="text-xs text-gray-500 mt-1">
            Preview: {applyTemplate(editValue, rule.tag, rule.matchCount)}
          </p>
          {saveError && (
            <p className="text-xs text-red-600">Could not save changes. Please try again.</p>
          )}
          <div className="flex items-center gap-2 mt-1">
            <button
              disabled={saving}
              onClick={async () => {
                setSaving(true);
                setSaveError(false);
                try {
                  // Fresh read immediately before write (CR-01)
                  const freshRules = await storageRules.getValue();
                  if (freshRules[fingerprint]) {
                    freshRules[fingerprint].renameFormat = editValue;
                  }
                  await storageRules.setValue(freshRules);
                  onSaved(fingerprint, editValue);
                  onSetMode(fingerprint, 'default');
                } catch {
                  setSaveError(true);
                } finally {
                  setSaving(false);
                }
              }}
              className="bg-blue-600 text-white text-sm font-semibold px-3 py-1 rounded h-9 hover:bg-blue-700 disabled:opacity-50"
            >
              Save format
            </button>
            <button
              onClick={() => {
                setEditValue(rule.renameFormat);
                onSetMode(fingerprint, 'default');
              }}
              className="text-sm font-semibold text-gray-500 px-3 py-1 hover:text-gray-700"
            >
              Discard
            </button>
          </div>
        </div>
      </li>
    );
  }

  if (mode === 'deleting') {
    return (
      <li className="py-3 px-2">
        <div className="bg-red-50 rounded px-2 py-3 flex items-center justify-between">
          <span className="text-sm text-red-700">Delete this rule?</span>
          <div className="flex items-center gap-2">
            {deleteError && (
              <span className="text-xs text-red-600">Could not delete rule. Please try again.</span>
            )}
            <button
              disabled={deleting}
              onClick={async () => {
                setDeleting(true);
                setDeleteError(false);
                try {
                  // Fresh read immediately before write (CR-01)
                  const freshRules = await storageRules.getValue();
                  delete freshRules[fingerprint];
                  await storageRules.setValue(freshRules);
                  onDeleted(fingerprint);
                } catch {
                  setDeleteError(true);
                } finally {
                  setDeleting(false);
                }
              }}
              className="bg-red-600 text-white text-sm font-semibold px-3 py-1 rounded h-9 hover:bg-red-700 disabled:opacity-50"
            >
              Yes, delete
            </button>
            <button
              onClick={() => onSetMode(fingerprint, 'default')}
              className="text-sm font-semibold text-gray-500 px-3 py-1"
            >
              Cancel
            </button>
          </div>
        </div>
      </li>
    );
  }

  // default state
  return (
    <li className="flex items-center justify-between py-3 px-2 hover:bg-gray-50 rounded">
      <span className="text-sm text-gray-900">
        {rule.tag} → {rule.renameFormat}
      </span>
      <div className="flex items-center gap-1">
        <button
          aria-label="Edit rename format"
          onClick={() => onSetMode(fingerprint, 'editing')}
          className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
        >
          <Pencil size={16} />
        </button>
        <button
          aria-label="Delete rule"
          onClick={() => onSetMode(fingerprint, 'deleting')}
          className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </li>
  );
}

function ConflictModal({
  conflict,
  onResolved,
  onRulesUpdated,
}: {
  conflict: NonNullable<ConflictData>;
  onResolved: () => void;
  onRulesUpdated: (fingerprint: string, renameFormat: string) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);

  async function handlePickCustom() {
    setSaving(true);
    setSaveError(false);
    try {
      // Fresh read immediately before write to minimize stale overwrite race (CR-01)
      const freshRules = await storageRules.getValue();
      if (freshRules[conflict.fingerprint]) {
        freshRules[conflict.fingerprint].renameFormat = conflict.customRule.renameFormat;
      }
      await storageRules.setValue(freshRules);
      await storageConflict.setValue(null);
      onRulesUpdated(conflict.fingerprint, conflict.customRule.renameFormat);
      onResolved();
    } catch {
      setSaveError(true);
    } finally {
      setSaving(false);
    }
  }

  async function handlePickLearned() {
    setSaving(true);
    setSaveError(false);
    try {
      await storageConflict.setValue(null);
      onResolved();
    } catch {
      setSaveError(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4 flex flex-col gap-4">
        <h2 className="text-base font-semibold text-gray-900">Rule conflict detected</h2>
        <p className="text-sm text-gray-500">
          A custom rule and a learned rule both match this download. Pick which format to use going forward.
        </p>

        <div className="flex gap-4">
          {/* Custom rule option */}
          <div className="flex-1 flex flex-col">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Custom rule</span>
            <span className="text-sm text-gray-900 mt-1">{conflict.customRule.renameFormat}</span>
            <button
              disabled={saving}
              onClick={handlePickCustom}
              className="bg-blue-600 text-white text-sm font-semibold px-3 py-1 rounded h-9 hover:bg-blue-700 w-full mt-2 disabled:opacity-50"
            >
              Use this
            </button>
          </div>
          {/* Learned rule option */}
          <div className="flex-1 flex flex-col">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Learned rule</span>
            <span className="text-sm text-gray-900 mt-1">{conflict.learnedRule.renameFormat}</span>
            <button
              disabled={saving}
              onClick={handlePickLearned}
              className="bg-blue-600 text-white text-sm font-semibold px-3 py-1 rounded h-9 hover:bg-blue-700 w-full mt-2 disabled:opacity-50"
            >
              Use this
            </button>
          </div>
        </div>

        {saveError && (
          <p className="text-xs text-red-600">Could not save choice. Please try again.</p>
        )}
      </div>
    </div>
  );
}

function EmptyCustomRuleState() {
  return (
    <div className="text-center py-8">
      <h3 className="text-sm font-semibold text-gray-900">No custom rules</h3>
      <p className="text-sm text-gray-500 mt-1">
        Add a custom rule to override or supplement learned rules.
      </p>
    </div>
  );
}

function CustomRuleRow({
  matchText,
  rule,
  mode,
  onSetMode,
  onDeleted,
}: {
  matchText: string;
  rule: CustomRuleEntry;
  mode: RowMode;
  onSetMode: (key: string, mode: RowMode) => void;
  onDeleted: (key: string) => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(false);

  useEffect(() => {
    if (mode === 'default') {
      setDeleteError(false);
    }
  }, [mode]);

  if (mode === 'deleting') {
    return (
      <li className="py-3 px-2">
        <div className="bg-red-50 rounded px-2 py-3 flex items-center justify-between">
          <span className="text-sm text-red-700">Delete this rule?</span>
          <div className="flex items-center gap-2">
            {deleteError && (
              <span className="text-xs text-red-600">Could not delete rule. Please try again.</span>
            )}
            <button
              disabled={deleting}
              onClick={async () => {
                setDeleting(true);
                setDeleteError(false);
                try {
                  // Fresh read immediately before write (CR-01)
                  const freshCustomRules = await storageCustomRules.getValue();
                  delete freshCustomRules[matchText];
                  await storageCustomRules.setValue(freshCustomRules);
                  onDeleted(matchText);
                } catch {
                  setDeleteError(true);
                } finally {
                  setDeleting(false);
                }
              }}
              className="bg-red-600 text-white text-sm font-semibold px-3 py-1 rounded h-9 hover:bg-red-700 disabled:opacity-50"
            >
              Yes, delete
            </button>
            <button
              onClick={() => onSetMode(matchText, 'default')}
              className="text-sm font-semibold text-gray-500 px-3 py-1"
            >
              Cancel
            </button>
          </div>
        </div>
      </li>
    );
  }

  // default state
  return (
    <li className="flex items-center justify-between py-3 px-2 hover:bg-gray-50 rounded">
      <span className="text-sm text-gray-900">
        contains "{rule.matchText}" → {rule.renameFormat}
      </span>
      <button
        aria-label="Delete custom rule"
        onClick={() => onSetMode(matchText, 'deleting')}
        className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
      >
        <Trash2 size={16} />
      </button>
    </li>
  );
}

function CustomRuleModal({
  onClose,
  onAdded,
}: {
  onClose: () => void;
  onAdded: (matchText: string, rule: CustomRuleEntry) => void;
}) {
  const [matchText, setMatchText] = useState('');
  const [renameFormat, setRenameFormat] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState(false);

  async function handleSubmit() {
    const trimmedMatch = matchText.trim();
    const trimmedFormat = renameFormat.trim();
    if (!trimmedMatch || !trimmedFormat) {
      setValidationError('Both fields are required.');
      return;
    }
    if (trimmedMatch.length > 200 || trimmedFormat.length > 200) {
      setValidationError('Fields must be 200 characters or fewer.');
      return;
    }
    // Reject prototype-polluting keys (CR-04)
    if (['__proto__', 'constructor', 'prototype'].includes(trimmedMatch)) {
      setValidationError('Invalid match text.');
      return;
    }
    setValidationError(null);
    setSaveError(false);
    setSubmitting(true);
    try {
      const current = await storageCustomRules.getValue();
      current[trimmedMatch] = { matchText: trimmedMatch, renameFormat: trimmedFormat };
      await storageCustomRules.setValue(current);
      onAdded(trimmedMatch, { matchText: trimmedMatch, renameFormat: trimmedFormat });
      onClose();
    } catch {
      setSaveError(true);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4 flex flex-col gap-4">
        <h2 className="text-base font-semibold text-gray-900">Add custom rule</h2>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-semibold text-gray-700">If filename contains</label>
          <input
            type="text"
            value={matchText}
            onChange={(e) => setMatchText(e.target.value)}
            placeholder="e.g. invoice"
            className="border border-gray-200 rounded px-2 py-1 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-semibold text-gray-700">Rename to</label>
          <input
            type="text"
            value={renameFormat}
            onChange={(e) => setRenameFormat(e.target.value)}
            placeholder="e.g. Invoice_{date}"
            className="border border-gray-200 rounded px-2 py-1 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <p className="text-xs text-gray-400">Slots: {'{tag}'} {'{date}'} {'{index}'}</p>

        {validationError && (
          <p className="text-xs text-red-600">{validationError}</p>
        )}
        {saveError && (
          <p className="text-xs text-red-600">Could not save rule. Please try again.</p>
        )}

        <div className="flex gap-2 justify-end">
          <button
            onClick={() => {
              setMatchText('');
              setRenameFormat('');
              setValidationError(null);
              setSaveError(false);
              onClose();
            }}
            className="text-sm font-semibold text-gray-500 px-3 py-1 hover:text-gray-700"
          >
            Discard
          </button>
          <button
            disabled={submitting}
            onClick={handleSubmit}
            className="bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-md h-9 hover:bg-blue-700 disabled:opacity-50"
          >
            Add rule
          </button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [rules, setRules] = useState<RulesMap | null>(null);
  const [monthlyCount, setMonthlyCount] = useState<number | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [rowModes, setRowModes] = useState<Record<string, RowMode>>({});
  const [customRules, setCustomRules] = useState<CustomRulesMap | null>(null);
  const [customRowModes, setCustomRowModes] = useState<Record<string, RowMode>>({});
  const [showCustomRuleModal, setShowCustomRuleModal] = useState(false);
  const [pendingConflict, setPendingConflict] = useState<ConflictData>(null);

  useEffect(() => {
    Promise.all([
      storageRules.getValue(),
      storageMonthlyCount.getValue(),
      storageCustomRules.getValue(),
      storageConflict.getValue(),
    ])
      .then(([rulesData, count, customRulesData, conflictData]) => {
        setRules(rulesData);
        setMonthlyCount(count);
        setCustomRules(customRulesData);
        setPendingConflict(conflictData);
        setLoaded(true);
      })
      .catch(() => {
        setLoadError(true);
      });
  }, []);

  const ruleCount = rules !== null ? Object.keys(rules).length : null;
  const isLoading = !loaded && !loadError; // single loaded flag is the definitive gate (WR-03)

  function handleSetMode(fingerprint: string, mode: RowMode) {
    setRowModes((prev) => ({ ...prev, [fingerprint]: mode }));
  }

  function handleSaved(fingerprint: string, newFormat: string) {
    setRules((prev) => {
      if (!prev) return prev;
      return { ...prev, [fingerprint]: { ...prev[fingerprint], renameFormat: newFormat } };
    });
  }

  function handleDeleted(fingerprint: string) {
    setRules((prev) => {
      if (!prev) return prev;
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
      if (!prev) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  function handleCustomAdded(matchText: string, rule: CustomRuleEntry) {
    setCustomRules((prev) => ({ ...(prev ?? {}), [matchText]: rule }));
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-2xl mx-auto px-6 py-8 flex flex-col gap-8">

        {/* OptionsHeader */}
        <div className="flex items-center gap-2 mb-2">
          {/* Icon placeholder */}
          <div className="w-5 h-5 rounded bg-indigo-600" aria-hidden="true" />
          <span className="text-lg font-bold text-gray-900">Download Renamer</span>
        </div>

        {/* StatsSection */}
        <div className="flex flex-col gap-1">
          {isLoading && (
            <p className="text-sm text-gray-400">Loading...</p>
          )}
          {loadError && (
            <p className="text-sm text-red-600">Could not load rules. Reload the page to try again.</p>
          )}
          {!isLoading && !loadError && (
            <>
              <p className="text-sm text-gray-500">{ruleCount} learned rules</p>
              <p className="text-sm text-gray-500">{monthlyCount} files renamed this month</p>
            </>
          )}
        </div>

        {/* AccountSection */}
        <div>
          <h2 className="text-base font-semibold text-gray-900 mb-4">Account</h2>
          <div className="flex items-center gap-4">
            <AccountBadge premium={isPremium} />
            {!isPremium && (
              <button
                className="bg-indigo-600 text-white text-sm font-semibold px-4 py-2 rounded-md h-9 hover:bg-indigo-700 transition-colors"
                onClick={() => chrome.tabs.create({ url: 'https://example.com/upgrade' })}
              >
                Upgrade to Premium
              </button>
            )}
          </div>
        </div>

        {/* Learned Rules section */}
        {!isLoading && !loadError && rules !== null && (
          <div>
            <h2 className="text-base font-semibold text-gray-900 mb-4">Learned Rules</h2>
            {ruleCount === 0 ? (
              <EmptyRuleState />
            ) : (
              <ul className="flex flex-col divide-y divide-gray-100">
                {Object.entries(rules).map(([fingerprint, rule]) => (
                  <RuleRow
                    key={fingerprint}
                    fingerprint={fingerprint}
                    rule={rule}
                    mode={rowModes[fingerprint] ?? 'default'}
                    onSetMode={handleSetMode}
                    onSaved={handleSaved}
                    onDeleted={handleDeleted}
                  />
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Custom Rules section */}
        {!isLoading && !loadError && customRules !== null && (
          <div>
            <h2 className="text-base font-semibold text-gray-900 mb-4">Custom Rules</h2>
            {Object.keys(customRules).length === 0 ? (
              <EmptyCustomRuleState />
            ) : (
              <ul className="flex flex-col divide-y divide-gray-100">
                {Object.entries(customRules).map(([key, rule]) => (
                  <CustomRuleRow
                    key={key}
                    matchText={key}
                    rule={rule}
                    mode={customRowModes[key] ?? 'default'}
                    onSetMode={handleCustomSetMode}
                    onDeleted={handleCustomDeleted}
                  />
                ))}
              </ul>
            )}
            <div className="mt-4">
              <button
                onClick={() => setShowCustomRuleModal(true)}
                className="bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-md h-9 hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Plus size={16} />
                Add custom rule
              </button>
            </div>
          </div>
        )}

        {pendingConflict !== null && (
          <ConflictModal
            conflict={pendingConflict}
            onResolved={() => setPendingConflict(null)}
            onRulesUpdated={(fingerprint, newFormat) => {
              setRules((prev) => {
                if (!prev) return prev;
                return {
                  ...prev,
                  [fingerprint]: { ...prev[fingerprint], renameFormat: newFormat },
                };
              });
            }}
          />
        )}

        {showCustomRuleModal && (
          <CustomRuleModal
            onClose={() => setShowCustomRuleModal(false)}
            onAdded={handleCustomAdded}
          />
        )}

      </div>
    </div>
  );
}
