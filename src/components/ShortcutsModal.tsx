import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Command, X } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const ShortcutsModal: React.FC = () => {
  const { openShortcuts, setOpenShortcuts } = useApp();

  if (!openShortcuts) return null;

  const shortcuts = [
    { key: ['Ctrl', 'F'], desc: 'Open Find & Replace' },
    { key: ['Ctrl', 'S'], desc: 'Quick Download (.md)' },
    { key: ['Ctrl', 'E'], desc: 'Toggle Live Edit Mode' },
    { key: ['Ctrl', 'Z'], desc: 'Undo edit' },
    { key: ['Ctrl', 'Y'], desc: 'Redo edit' },
    { key: ['Ctrl', 'D'], desc: 'Toggle Dark / Light Theme' },
    { key: ['Escape'], desc: 'Close dialog or panel' },
    { key: ['?'], desc: 'Show keyboard shortcuts' },
  ];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/40 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl p-6"
        >
          <div className="flex items-center justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800 mb-5">
            <div className="flex items-center gap-2">
              <Command className="w-4 h-4 text-indigo-500" />
              <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100">Keyboard Shortcuts</h3>
            </div>
            <button
              onClick={() => setOpenShortcuts(false)}
              className="p-1 rounded-md text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-2.5">
            {shortcuts.map((s, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800/60 text-xs"
              >
                <span className="text-zinc-600 dark:text-zinc-300 font-medium">{s.desc}</span>
                <div className="flex items-center gap-1">
                  {s.key.map((k) => (
                    <kbd
                      key={k}
                      className="px-2 py-0.5 rounded-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-750 text-zinc-800 dark:text-zinc-200 font-mono text-[11px] font-bold shadow-xs"
                    >
                      {k}
                    </kbd>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={() => setOpenShortcuts(false)}
            className="w-full mt-6 py-2 rounded-xl text-xs font-semibold bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 transition-colors"
          >
            Close
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
