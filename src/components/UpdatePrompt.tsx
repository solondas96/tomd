import React from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

/**
 * Tells the user when the app is ready offline or a new version is waiting.
 *
 * Purpose: updates are applied only when the user accepts, so an open conversion is never interrupted.
 */
export const UpdatePrompt: React.FC = () => {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW();

  if (!needRefresh && !offlineReady) return null;

  const dismiss = () => {
    setNeedRefresh(false);
    setOfflineReady(false);
  };

  return (
    <div
      role="status"
      className="fixed bottom-4 left-4 z-50 max-w-sm flex items-center gap-3 px-4 py-3 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xl text-sm text-zinc-800 dark:text-zinc-100"
    >
      <span>{needRefresh ? 'A new version of toMD is available.' : 'toMD is ready to work offline.'}</span>
      {needRefresh && (
        <button
          type="button"
          onClick={() => updateServiceWorker(true)}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white"
        >
          Reload
        </button>
      )}
      <button
        type="button"
        onClick={dismiss}
        className="px-2 py-1.5 rounded-lg text-xs font-semibold text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
      >
        Dismiss
      </button>
    </div>
  );
};
