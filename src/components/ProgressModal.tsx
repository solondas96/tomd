import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Loader2, XCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const ProgressModal: React.FC = () => {
  const { isProcessing, progressPct, progressMsg, abortCurrentProcess, isBatchMode } = useApp();

  if (!isProcessing || isBatchMode) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/40 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="w-full max-w-md p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl flex flex-col items-center text-center"
        >
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-4">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>

          <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-1">
            Converting Document
          </h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6 truncate max-w-xs">
            {progressMsg || 'Processing content in-memory...'}
          </p>

          {/* Progress track */}
          <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-2.5 rounded-full overflow-hidden mb-3">
            <motion.div
              className="h-full bg-gradient-to-r from-indigo-500 to-violet-600 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.2 }}
            />
          </div>

          <div className="w-full flex items-center justify-between text-xs text-zinc-400 font-medium mb-6">
            <span>Progress</span>
            <span>{progressPct}%</span>
          </div>

          <button
            onClick={abortCurrentProcess}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
          >
            <XCircle className="w-4 h-4" />
            <span>Cancel Conversion</span>
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
