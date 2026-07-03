import React, { useEffect, useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { storageRules } from '../lib/storage';
import { applyTemplate } from '../lib/renameEngine';
import type { RuleEntry, RowMode } from './types';

export function RuleRow({
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
            className="border border-input-border rounded px-2 py-1 text-sm w-full bg-input-bg text-input-text focus:outline-none focus:ring-2 focus:ring-accent"
          />
          <p className="text-xs text-text-muted mt-1">Slots: {'{tag}'} {'{date}'} {'{index}'}</p>
          <p className="text-xs text-text-secondary mt-1">
            Preview: {applyTemplate(editValue, rule.tag, rule.matchCount)}
          </p>
          {saveError && (
            <p className="text-xs text-red-400">Could not save changes. Please try again.</p>
          )}
          <div className="flex items-center gap-2 mt-1">
            <button
              disabled={saving}
              onClick={async () => {
                setSaving(true);
                setSaveError(false);
                try {
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
              className="bg-accent text-white text-sm font-semibold px-3 py-1 rounded h-9 hover:bg-accent/90 disabled:opacity-50"
            >
              Save format
            </button>
            <button
              onClick={() => {
                setEditValue(rule.renameFormat);
                onSetMode(fingerprint, 'default');
              }}
              className="text-sm font-semibold text-text-secondary px-3 py-1 hover:text-text-primary"
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
        {rule.tag} → {rule.renameFormat}
      </span>
      <div className="flex items-center gap-1">
        <button
          aria-label="Edit rename format"
          onClick={() => onSetMode(fingerprint, 'editing')}
          className="p-1 rounded hover:bg-border text-text-muted hover:text-text-primary transition-colors"
        >
          <Pencil size={16} />
        </button>
        <button
          aria-label="Delete rule"
          onClick={() => onSetMode(fingerprint, 'deleting')}
          className="p-1 rounded hover:bg-border text-text-muted hover:text-text-primary transition-colors"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </li>
  );
}
