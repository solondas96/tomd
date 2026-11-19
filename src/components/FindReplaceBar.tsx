import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronUp, ChevronDown, X, Replace, ReplaceAll } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { escRegex } from '../lib/utils';
import { FindMatch } from '../types';

export const FindReplaceBar: React.FC = () => {
  const { openFind, setOpenFind, currentMarkdown, updateMarkdown, isEditMode, addToast } = useApp();
  const [findQuery, setFindQuery] = useState('');
  const [replaceQuery, setReplaceQuery] = useState('');
  const [isRegex, setIsRegex] = useState(false);
  const [matches, setMatches] = useState<FindMatch[]>([]);
  const [matchIdx, setMatchIdx] = useState(-1);

  const runFind = useCallback(() => {
    if (!findQuery || !currentMarkdown) {
      setMatches([]);
      setMatchIdx(-1);
      return;
    }

    try {
      const re = isRegex ? new RegExp(findQuery, 'gi') : new RegExp(escRegex(findQuery), 'gi');
      const found: FindMatch[] = [];
      const matchAll = currentMarkdown.matchAll(re);
      for (const m of matchAll) {
        if (m.index !== undefined) {
          found.push({ index: m.index, length: m[0].length });
        }
      }
      setMatches(found);
      setMatchIdx(found.length > 0 ? 0 : -1);
    } catch {
      setMatches([]);
      setMatchIdx(-1);
    }
  }, [findQuery, isRegex, currentMarkdown]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- match list is derived state; B-07 reworks find, A-02 moves it out of effects
    if (openFind) runFind();
  }, [openFind, findQuery, isRegex, runFind]);

  const moveIdx = (delta: number) => {
    if (!matches.length) return;
    setMatchIdx((prev) => (prev + delta + matches.length) % matches.length);
  };

  const handleReplaceOne = () => {
    if (matchIdx < 0 || !isEditMode || !matches[matchIdx]) {
      if (!isEditMode) addToast('Enable edit mode first to replace text', 'info');
      return;
    }
    const m = matches[matchIdx];
    const next = currentMarkdown.slice(0, m.index) + replaceQuery + currentMarkdown.slice(m.index + m.length);
    updateMarkdown(next);
  };

  const handleReplaceAll = () => {
    if (!findQuery || !isEditMode) {
      if (!isEditMode) addToast('Enable edit mode first to replace text', 'info');
      return;
    }
    try {
      const re = isRegex ? new RegExp(findQuery, 'gi') : new RegExp(escRegex(findQuery), 'gi');
      const count = (currentMarkdown.match(re) || []).length;
      const next = currentMarkdown.replace(re, replaceQuery);
      updateMarkdown(next);
      addToast(`Replaced ${count} occurrences`, 'success');
      setOpenFind(false);
    } catch {
      addToast('Invalid regular expression', 'error');
    }
  };

  if (!openFind) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="w-full bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 px-4 py-2.5 z-20 shadow-md flex flex-wrap items-center gap-2 text-xs"
      >
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <input
            type="text"
            value={findQuery}
            onChange={(e) => setFindQuery(e.target.value)}
            placeholder="Find text..."
            // eslint-disable-next-line jsx-a11y/no-autofocus -- find bar is opened by an explicit user action, so focusing it is expected
            autoFocus
            className="w-full px-3 py-1.5 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <input
            type="text"
            value={replaceQuery}
            onChange={(e) => setReplaceQuery(e.target.value)}
            placeholder="Replace with..."
            className="w-full px-3 py-1.5 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        {/* Regex toggle */}
        <button
          onClick={() => setIsRegex(!isRegex)}
          className={`px-2 py-1.5 rounded-lg font-mono text-xs font-bold border transition-colors ${
            isRegex
              ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 border-indigo-300 dark:border-indigo-700'
              : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border-zinc-200 dark:border-zinc-700'
          }`}
          title="Match Regular Expression"
        >
          .*
        </button>

        {/* Counter */}
        <span className="text-zinc-400 font-mono px-2 min-w-[50px] text-center">
          {matches.length > 0 ? `${matchIdx + 1}/${matches.length}` : findQuery ? '0 matches' : ''}
        </span>

        {/* Navigation */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => moveIdx(-1)}
            disabled={!matches.length}
            className="p-1 rounded-md text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30"
            title="Previous match"
          >
            <ChevronUp className="w-4 h-4" />
          </button>
          <button
            onClick={() => moveIdx(1)}
            disabled={!matches.length}
            className="p-1 rounded-md text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30"
            title="Next match"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>

        {/* Replace Buttons */}
        <button
          onClick={handleReplaceOne}
          disabled={matchIdx < 0 || !isEditMode}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-semibold bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-zinc-800 dark:text-zinc-200 disabled:opacity-40"
        >
          <Replace className="w-3.5 h-3.5" />
          <span>Replace</span>
        </button>

        <button
          onClick={handleReplaceAll}
          disabled={!findQuery || !isEditMode}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-semibold bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-zinc-800 dark:text-zinc-200 disabled:opacity-40"
        >
          <ReplaceAll className="w-3.5 h-3.5" />
          <span>Replace All</span>
        </button>

        {/* Close Button */}
        <button
          onClick={() => setOpenFind(false)}
          className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 ml-auto"
          title="Close (Esc)"
        >
          <X className="w-4 h-4" />
        </button>
      </motion.div>
    </AnimatePresence>
  );
};
