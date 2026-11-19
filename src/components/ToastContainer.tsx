import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useApp();

  return (
    <div
      className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none max-w-sm w-full px-4 sm:px-0"
      aria-live="polite"
    >
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className={`pointer-events-auto flex items-center justify-between gap-3 p-3.5 rounded-xl shadow-lg border backdrop-blur-md text-sm font-medium ${
              toast.type === 'success'
                ? 'bg-emerald-50/90 dark:bg-emerald-950/80 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100'
                : toast.type === 'error'
                  ? 'bg-rose-50/90 dark:bg-rose-950/80 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-100'
                  : 'bg-white/90 dark:bg-zinc-900/90 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-zinc-950/5'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              {toast.type === 'success' && (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              )}
              {toast.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />}
              {toast.type === 'info' && <Info className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />}
              <span className="truncate">{toast.message}</span>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="p-1 rounded-md opacity-60 hover:opacity-100 transition-opacity hover:bg-black/5 dark:hover:bg-white/5 shrink-0"
              aria-label="Dismiss toast"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
