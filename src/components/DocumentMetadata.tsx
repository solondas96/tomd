import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Info, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { parsePdfDate, formatBytes } from '../lib/utils';

export const DocumentMetadata: React.FC = () => {
  const { openMetadata, setOpenMetadata, metadata, sourceFile } = useApp();

  if (!openMetadata || !metadata) return null;

  const items: { label: string; value: string }[] = [];
  if (metadata.Title) items.push({ label: 'Title', value: metadata.Title });
  if (metadata.Author) items.push({ label: 'Author', value: metadata.Author });
  if (metadata.Source) items.push({ label: 'Source', value: metadata.Source });
  if (metadata.CreationDate) items.push({ label: 'Created', value: parsePdfDate(metadata.CreationDate) });
  if (sourceFile) items.push({ label: 'File Size', value: formatBytes(sourceFile.size) });
  if (metadata.Producer) items.push({ label: 'Producer', value: metadata.Producer });
  if (metadata.Creator) items.push({ label: 'Creator', value: metadata.Creator });

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/40 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl p-6"
        >
          <div className="flex items-center justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800 mb-4">
            <div className="flex items-center gap-2 text-zinc-900 dark:text-zinc-100 font-bold text-base">
              <Info className="w-4 h-4 text-indigo-500" />
              <span>Document Metadata</span>
            </div>
            <button
              onClick={() => setOpenMetadata(false)}
              className="p-1 rounded-md text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-2.5">
            {items.map((it) => (
              <div key={it.label} className="flex justify-between py-1.5 border-b border-zinc-50 dark:border-zinc-800/40 text-xs">
                <span className="font-semibold text-zinc-500 dark:text-zinc-400">{it.label}</span>
                <span className="font-medium text-zinc-900 dark:text-zinc-100 text-right truncate max-w-[220px]">
                  {it.value}
                </span>
              </div>
            ))}
          </div>

          <button
            onClick={() => setOpenMetadata(false)}
            className="w-full mt-6 py-2 rounded-xl text-xs font-semibold bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 transition-colors"
          >
            Close
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
