import React from 'react';
import { Editor } from './Editor';
import { Preview } from './Preview';

export const SplitView: React.FC = () => {
  return (
    <div className="w-full h-full flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-zinc-200 dark:divide-zinc-800">
      {/* Left: Editor */}
      <div className="flex-1 h-1/2 md:h-full flex flex-col min-w-0 bg-white dark:bg-zinc-950">
        <div className="px-4 py-2 bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider flex items-center justify-between">
          <span>Markdown Source</span>
        </div>
        <div className="flex-1 overflow-hidden">
          <Editor />
        </div>
      </div>

      {/* Right: Live Preview */}
      <div className="flex-1 h-1/2 md:h-full flex flex-col min-w-0 bg-zinc-50/50 dark:bg-zinc-900/30">
        <div className="px-4 py-2 bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider flex items-center justify-between">
          <span>Rendered HTML Preview</span>
        </div>
        <div className="flex-1 overflow-y-auto">
          <Preview />
        </div>
      </div>
    </div>
  );
};
