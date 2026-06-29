import React, { useEffect, useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { storageRules, storageMonthlyCount } from '../../src/lib/storage';
import { applyTemplate } from '../../src/lib/renameEngine';

// isPremium is hardcoded false in Phase 3; Phase 4 wires real tier data
const isPremium = false;

type RuleEntry = { tag: string; renameFormat: string; matchCount: number };
type RulesMap = Record<string, RuleEntry>;
type RowMode = 'default' | 'editing' | 'deleting';

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
                  const current = await storageRules.getValue();
                  current[fingerprint] = { ...current[fingerprint], renameFormat: editValue };
                  await storageRules.setValue(current);
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
                  const current = await storageRules.getValue();
                  delete current[fingerprint];
                  await storageRules.setValue(current);
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

export default function App() {
  const [rules, setRules] = useState<RulesMap | null>(null);
  const [monthlyCount, setMonthlyCount] = useState<number | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [rowModes, setRowModes] = useState<Record<string, RowMode>>({});

  useEffect(() => {
    Promise.all([storageRules.getValue(), storageMonthlyCount.getValue()])
      .then(([rulesData, count]) => {
        setRules(rulesData);
        setMonthlyCount(count);
      })
      .catch(() => {
        setLoadError(true);
      });
  }, []);

  const ruleCount = rules !== null ? Object.keys(rules).length : null;
  const isLoading = rules === null && monthlyCount === null && !loadError;

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

        {/* Custom Rules section — 03-05 */}

      </div>
    </div>
  );
}
