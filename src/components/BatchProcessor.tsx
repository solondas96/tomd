import React from 'react';
import { motion } from 'motion/react';
import { FileText, Archive, Layers, CheckCircle2, AlertCircle, Loader2, Clock, ArrowRight, Plus } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatBytes, wordCount } from '../lib/utils';

export const BatchProcessor: React.FC = () => {
  const { batchItems, isProcessing, downloadZipBatch, mergeBatchItems, selectBatchItem, resetAll } = useApp();

  const doneCount = batchItems.filter((i) => i.status === 'done').length;
  const isAllFinished = !isProcessing && batchItems.every((i) => i.status === 'done' || i.status === 'error');

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8">
      {/* Header Card */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xl shadow-zinc-950/5 mb-6"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-zinc-100 dark:border-zinc-800">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse" />
              <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Batch Processing Queue</h2>
            </div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {doneCount} of {batchItems.length} documents successfully converted.
            </p>
          </div>

          {/* Batch Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={downloadZipBatch}
              disabled={doneCount === 0}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-40 transition-colors shadow-sm"
            >
              <Archive className="w-3.5 h-3.5" />
              <span>Download ZIP</span>
            </button>

            <button
              onClick={mergeBatchItems}
              disabled={doneCount === 0}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 disabled:opacity-40 transition-colors shadow-sm"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Merge All</span>
            </button>

            {isAllFinished && (
              <button
                onClick={resetAll}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Queue</span>
              </button>
            )}
          </div>
        </div>

        {/* Batch Queue List */}
        <div className="mt-4 divide-y divide-zinc-100 dark:divide-zinc-800/80 max-h-[500px] overflow-y-auto">
          {batchItems.map((item, idx) => (
            <div
              key={item.id}
              className="py-3.5 px-2 flex items-center justify-between gap-4 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 rounded-xl transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 shrink-0">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">{item.filename}</h4>
                  <div className="flex items-center gap-2 text-xs text-zinc-400 mt-0.5">
                    <span>{formatBytes(item.size)}</span>
                    {item.status === 'done' && (
                      <>
                        <span>•</span>
                        <span>{wordCount(item.markdown).toLocaleString()} words</span>
                      </>
                    )}
                    {item.status === 'error' && (
                      <span className="text-rose-500 font-medium truncate max-w-xs">{item.error}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Status pill & item action */}
              <div className="flex items-center gap-3 shrink-0">
                {item.status === 'pending' && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Queued</span>
                  </div>
                )}
                {item.status === 'processing' && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Converting...</span>
                  </div>
                )}
                {item.status === 'done' && (
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Done</span>
                    </div>
                    <button
                      onClick={() => selectBatchItem(idx)}
                      className="flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 transition-colors"
                    >
                      <span>View</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                )}
                {item.status === 'error' && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>Failed</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};
