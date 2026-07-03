import React, { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { storageCustomRules } from '../lib/storage';
import type { CustomRuleEntry, RowMode } from './types';

export function CustomRuleRow({
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
        <div className="bg-red-950/30 rounded px-2 py-3 flex items-center justify-between">
          <span className="text-sm text-red-400">Delete this rule?</span>
          <div className="flex items-center gap-2">
            {deleteError && (
              <span className="text-xs text-red-400">Could not delete rule. Please try again.</span>
            )}
            <button
              disabled={deleting}
              onClick={async () => {
                setDeleting(true);
                setDeleteError(false);
                try {
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
              className="text-sm font-semibold text-text-secondary px-3 py-1"
            >
              Cancel
            </button>
          </div>
        </div>
      </li>
    );
  }

  return (
    <li className="flex items-center justify-between py-3 px-2 hover:bg-surface rounded">
      <span className="text-sm text-text-primary">
        contains "{rule.matchText}" → {rule.renameFormat}
      </span>
      <button
        aria-label="Delete custom rule"
        onClick={() => onSetMode(matchText, 'deleting')}
        className="p-1 rounded hover:bg-border text-text-muted hover:text-text-primary transition-colors"
      >
        <Trash2 size={16} />
      </button>
    </li>
  );
}
