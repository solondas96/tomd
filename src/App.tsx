import React from 'react';
import { useApp } from './context/AppContext';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useClipboardPaste } from './hooks/useClipboardPaste';
import { Header } from './components/Header';
import { DropZone } from './components/DropZone';
import { BatchProcessor } from './components/BatchProcessor';
import { ActionBar } from './components/ActionBar';
import { Editor } from './components/Editor';
import { Preview } from './components/Preview';
import { SplitView } from './components/SplitView';
import { SourcePdfViewer } from './components/SourcePdfViewer';
import { FindReplaceBar } from './components/FindReplaceBar';
import { ProgressModal } from './components/ProgressModal';
import { SettingsModal } from './components/SettingsModal';
import { ShortcutsModal } from './components/ShortcutsModal';
import { HistoryDrawer } from './components/HistoryDrawer';
import { TableOfContents } from './components/TableOfContents';
import { DocumentMetadata } from './components/DocumentMetadata';
import { ToastContainer } from './components/ToastContainer';
import { UpdatePrompt } from './components/UpdatePrompt';

export const AppContent: React.FC = () => {
  const { currentMarkdown, isBatchMode, activeTab } = useApp();

  useKeyboardShortcuts();
  useClipboardPaste();

  return (
    <div className="h-dvh flex flex-col bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 transition-colors">
      <Header />

      <main className="flex-1 min-h-0 flex flex-col overflow-y-auto">
        {!currentMarkdown && !isBatchMode && (
          <div className="flex-1 flex items-center justify-center">
            <DropZone />
          </div>
        )}

        {isBatchMode && (
          <div className="flex-1">
            <BatchProcessor />
          </div>
        )}

        {currentMarkdown && !isBatchMode && (
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            <ActionBar />
            <FindReplaceBar />

            <div className="flex-1 min-h-0 relative overflow-hidden">
              {activeTab === 'raw' && <Editor />}
              {activeTab === 'preview' && <Preview />}
              {activeTab === 'split' && <SplitView />}
              {activeTab === 'source' && <SourcePdfViewer />}
              <TableOfContents />
            </div>
          </div>
        )}
      </main>

      {!currentMarkdown && !isBatchMode && (
        <footer className="w-full py-6 text-center text-xs text-zinc-400 border-t border-zinc-200/60 dark:border-zinc-800/60">
          <p>All conversions run 100% locally via WebAssembly &amp; JavaScript. No server required.</p>
        </footer>
      )}

      {/* Modals & Overlays */}
      <ProgressModal />
      <SettingsModal />
      <ShortcutsModal />
      <HistoryDrawer />
      <DocumentMetadata />
      <ToastContainer />
      <UpdatePrompt />
    </div>
  );
};
