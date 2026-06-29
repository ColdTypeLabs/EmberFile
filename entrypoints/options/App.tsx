import React, { useEffect, useState } from 'react';
import { storageRules, storageMonthlyCount } from '../../src/lib/storage';

// isPremium is hardcoded false in Phase 3; Phase 4 wires real tier data
const isPremium = false;

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

export default function App() {
  const [ruleCount, setRuleCount] = useState<number | null>(null);
  const [monthlyCount, setMonthlyCount] = useState<number | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    Promise.all([storageRules.getValue(), storageMonthlyCount.getValue()])
      .then(([rules, count]) => {
        setRuleCount(Object.keys(rules).length);
        setMonthlyCount(count);
      })
      .catch(() => {
        setLoadError(true);
      });
  }, []);

  const isLoading = ruleCount === null && monthlyCount === null && !loadError;

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

        {/* Rule sections go here — 03-04, 03-05 */}

      </div>
    </div>
  );
}
