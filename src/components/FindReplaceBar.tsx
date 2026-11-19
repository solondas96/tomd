import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronUp, ChevronDown, X, Replace, ReplaceAll } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { findMatches, replaceAllMatches, stepIndex } from '../lib/find';

export const FindReplaceBar: React.FC = () => {
  const { openFind, setOpenFind, currentMarkdown, updateMarkdown, isEditMode, addToast, requestEditorSelection } =
    useApp();
  const [findQuery, setFindQuery] = useState('');
  const [replaceQuery, setReplaceQuery] = useState('');
  const [isRegex, setIsRegex] = useState(false);
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [requestedIndex, setRequestedIndex] = useState(0);

  const options = useMemo(() => ({ isRegex, caseSensitive }), [isRegex, caseSensitive]);
  const { matches, error } = useMemo(
    () => findMatches(currentMarkdown, findQuery, options),
    [currentMarkdown, findQuery, options],
  );
  // The document can shrink under us (replace, edit), so clamp instead of trusting the stored index.
  const matchIdx = matches.length === 0 ? -1 : Math.min(requestedIndex, matches.length - 1);
  const activeMatch = matchIdx >= 0 ? matches[matchIdx] : null;
  const activeStart = activeMatch?.index;
  const activeEnd = activeMatch ? activeMatch.index + activeMatch.length : undefined;

  // Selecting the current match is how the editor "navigates": it sets the selection and scrolls.
  useEffect(() => {
    if (openFind && activeStart !== undefined && activeEnd !== undefined)
      requestEditorSelection(activeStart, activeEnd);
  }, [openFind, activeStart, activeEnd, requestEditorSelection]);

  const resetToFirstMatch = () => setRequestedIndex(0);
  const moveIdx = (delta: number) => {
    if (matches.length === 0) return;
    setRequestedIndex(stepIndex(matchIdx, delta, matches.length));
  };

  const handleFindKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    moveIdx(event.shiftKey ? -1 : 1);
  };

  const handleReplaceOne = () => {
    if (!isEditMode) {
      addToast('Enable edit mode first to replace text', 'info');
      return;
    }
    if (!activeMatch) return;
    updateMarkdown(
      currentMarkdown.slice(0, activeMatch.index) +
        replaceQuery +
        currentMarkdown.slice(activeMatch.index + activeMatch.length),
    );
  };

  const handleReplaceAll = () => {
    if (!isEditMode) {
      addToast('Enable edit mode first to replace text', 'info');
      return;
    }
    if (!findQuery) return;
    const result = replaceAllMatches(currentMarkdown, findQuery, options, replaceQuery);
    if (result.error) {
      addToast(result.error, 'error');
      return;
    }
    updateMarkdown(result.text);
    addToast(`Replaced ${result.count} occurrences`, 'success');
    setOpenFind(false);
  };

  const toggleClass = (active: boolean) =>
    `px-2 py-1.5 rounded-lg font-mono text-xs font-bold border transition-colors ${
      active
        ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 border-indigo-300 dark:border-indigo-700'
        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border-zinc-200 dark:border-zinc-700'
    }`;

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
            onChange={(e) => {
              setFindQuery(e.target.value);
              resetToFirstMatch();
            }}
            onKeyDown={handleFindKeyDown}
            aria-label="Find"
            aria-invalid={error !== null && findQuery !== ''}
            aria-describedby="find-status"
            placeholder="Find text..."
            // eslint-disable-next-line jsx-a11y/no-autofocus -- find bar is opened by an explicit user action, so focusing it is expected
            autoFocus
            className={`w-full px-3 py-1.5 rounded-lg bg-zinc-50 dark:bg-zinc-950 border text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 ${
              error
                ? 'border-rose-500 focus:ring-rose-500'
                : 'border-zinc-200 dark:border-zinc-800 focus:ring-indigo-500'
            }`}
          />
        </div>

        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <input
            type="text"
            value={replaceQuery}
            onChange={(e) => setReplaceQuery(e.target.value)}
            aria-label="Replace with"
            placeholder="Replace with..."
            className="w-full px-3 py-1.5 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        {/* Match options */}
        <button
          type="button"
          onClick={() => {
            setCaseSensitive(!caseSensitive);
            resetToFirstMatch();
          }}
          aria-pressed={caseSensitive}
          className={toggleClass(caseSensitive)}
          title="Match case"
          aria-label="Match case"
        >
          Aa
        </button>
        <button
          type="button"
          onClick={() => {
            setIsRegex(!isRegex);
            resetToFirstMatch();
          }}
          aria-pressed={isRegex}
          className={toggleClass(isRegex)}
          title="Match Regular Expression"
          aria-label="Regular expression"
        >
          .*
        </button>

        {/* Status */}
        <span
          id="find-status"
          role="status"
          className={`font-mono px-2 min-w-[50px] text-center ${error && findQuery ? 'text-rose-500' : 'text-zinc-400'}`}
        >
          {error && findQuery
            ? error
            : matches.length > 0
              ? `${matchIdx + 1}/${matches.length}`
              : findQuery
                ? '0 matches'
                : ''}
        </span>

        {/* Navigation */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => moveIdx(-1)}
            aria-label="Previous match"
            disabled={!matches.length}
            className="p-1 rounded-md text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30"
            title="Previous match"
          >
            <ChevronUp className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => moveIdx(1)}
            aria-label="Next match"
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
          disabled={!activeMatch || !isEditMode}
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
