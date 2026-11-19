import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ListTree, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { TOC_MAX_LEVEL } from '../config';
import { extractHeadings } from '../lib/headings';
import { HeadingItem } from '../types';

export const TableOfContents: React.FC = () => {
  const { openToc, setOpenToc, currentMarkdown, jumpToHeading } = useApp();

  const headings = useMemo<HeadingItem[]>(
    () => extractHeadings(currentMarkdown).filter((heading) => heading.level <= TOC_MAX_LEVEL),
    [currentMarkdown],
  );

  if (!openToc) return null;

  return (
    <AnimatePresence>
      <motion.aside
        initial={{ x: 300, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 300, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed top-16 right-0 w-80 h-[calc(100vh-4rem)] bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 shadow-2xl z-30 flex flex-col"
      >
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ListTree className="w-4 h-4 text-indigo-500" />
            <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">Table of Contents</h3>
          </div>
          <button
            onClick={() => setOpenToc(false)}
            className="p-1 rounded-md text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-1">
          {headings.length === 0 ? (
            <p className="text-xs text-zinc-400 italic">No headings found in document.</p>
          ) : (
            headings.map((h) => (
              <button
                key={h.slug}
                type="button"
                onClick={() => jumpToHeading(h)}
                style={{ paddingLeft: `${(h.level - 1) * 14 + 8}px` }}
                className="w-full text-left py-1.5 pr-2 rounded-lg text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 truncate transition-colors"
                title={h.text}
              >
                {h.text}
              </button>
            ))
          )}
        </div>
      </motion.aside>
    </AnimatePresence>
  );
};
