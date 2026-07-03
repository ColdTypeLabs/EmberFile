import React, { useState } from 'react';
import { storageRules, storageConflict } from '../lib/storage';
import type { ConflictData, RulesMap } from './types';

export function ConflictModal({
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
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50">
      <div className="bg-surface rounded-lg p-6 max-w-sm w-full mx-4 flex flex-col gap-4 border border-border">
        <h2 className="text-base font-semibold text-text-primary">Rule conflict detected</h2>
        <p className="text-sm text-text-secondary">
          A custom rule and a learned rule both match this download. Pick which format to use going forward.
        </p>

        <div className="flex gap-4">
          <div className="flex-1 flex flex-col">
            <span className="text-xs font-semibold text-text-muted uppercase tracking-wide">Custom rule</span>
            <span className="text-sm text-text-primary mt-1">{conflict.customRule.renameFormat}</span>
            <button
              disabled={saving}
              onClick={handlePickCustom}
              className="bg-accent text-white text-sm font-semibold px-3 py-1 rounded h-9 hover:bg-accent/90 w-full mt-2 disabled:opacity-50"
            >
              Use this
            </button>
          </div>
          <div className="flex-1 flex flex-col">
            <span className="text-xs font-semibold text-text-muted uppercase tracking-wide">Learned rule</span>
            <span className="text-sm text-text-primary mt-1">{conflict.learnedRule.renameFormat}</span>
            <button
              disabled={saving}
              onClick={handlePickLearned}
              className="bg-accent text-white text-sm font-semibold px-3 py-1 rounded h-9 hover:bg-accent/90 w-full mt-2 disabled:opacity-50"
            >
              Use this
            </button>
          </div>
        </div>

        {saveError && (
          <p className="text-xs text-red-400">Could not save choice. Please try again.</p>
        )}
      </div>
    </div>
  );
}
