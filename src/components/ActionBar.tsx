import React, { useState, useRef, useEffect } from 'react';
import {
  FileText,
  Eye,
  Columns,
  FileCode,
  Lock,
  Unlock,
  Undo2,
  Redo2,
  Search,
  ListTree,
  Info,
  Copy,
  Download,
  ChevronDown,
  Check,
  FileCheck,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { wordCount, charCount, readingTime, downloadAs } from '../lib/utils';
import { createDocxBlob } from '../lib/converters/formats';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { TabType } from '../types';

export const ActionBar: React.FC = () => {
  const {
    currentMarkdown,
    currentFilename,
    sourceFile,
    pageCount,
    isEditMode,
    setIsEditMode,
    activeTab,
    setActiveTab,
    undo,
    redo,
    canUndo,
    canRedo,
    openFind,
    setOpenFind,
    openToc,
    setOpenToc,
    setOpenMetadata,
    metadata,
    addToast,
  } = useApp();

  const [copyOpen, setCopyOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [copiedMd, setCopiedMd] = useState(false);

  const copyMenuRef = useRef<HTMLDivElement>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (copyMenuRef.current && !copyMenuRef.current.contains(e.target as Node)) {
        setCopyOpen(false);
      }
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setExportOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const wc = wordCount(currentMarkdown);
  const cc = charCount(currentMarkdown);
  const lines = currentMarkdown ? currentMarkdown.split('\n').length : 0;
  const rt = readingTime(wc);
  const stem = currentFilename.replace(/\.[^.]+$/, '') || 'document';

  const handleCopyMarkdown = async () => {
    try {
      await navigator.clipboard.writeText(currentMarkdown);
      setCopiedMd(true);
      setTimeout(() => setCopiedMd(false), 2000);
      setCopyOpen(false);
      addToast('Copied Markdown to clipboard', 'success');
    } catch {
      addToast('Failed to copy to clipboard', 'error');
    }
  };

  const handleCopyHtml = async () => {
    try {
      const rawHtml = marked.parse(currentMarkdown) as string;
      const cleanHtml = DOMPurify.sanitize(rawHtml);
      await navigator.clipboard.writeText(cleanHtml);
      setCopyOpen(false);
      addToast('Copied HTML to clipboard', 'success');
    } catch {
      addToast('Failed to copy HTML', 'error');
    }
  };

  const handleDownloadMd = () => {
    downloadAs(currentMarkdown, `${stem}.md`, 'text/markdown');
    setExportOpen(false);
    addToast('Downloaded .md', 'success');
  };

  const handleDownloadHtml = () => {
    const rawHtml = marked.parse(currentMarkdown) as string;
    const cleanHtml = DOMPurify.sanitize(rawHtml);
    const doc = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${stem}</title><style>body{max-width:820px;margin:2rem auto;font-family:system-ui,-apple-system,sans-serif;line-height:1.7;padding:0 1.5rem;color:#18181b}pre{background:#f4f4f5;padding:1rem;border-radius:8px;overflow-x:auto}table{border-collapse:collapse;width:100%;margin:1.5rem 0}th,td{border:1px solid #e4e4e7;padding:.6rem 1rem;text-align:left}th{background:#f4f4f5}blockquote{border-left:4px solid #6366f1;padding-left:1rem;color:#71717a;margin:1.5rem 0}</style></head><body>${cleanHtml}</body></html>`;
    downloadAs(doc, `${stem}.html`, 'text/html');
    setExportOpen(false);
    addToast('Downloaded .html', 'success');
  };

  const handleDownloadTxt = () => {
    const plainText = currentMarkdown
      .replace(/#{1,6}\s+/g, '')
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/`{1,3}[^`\n]*`{1,3}/g, '')
      .replace(/^[-*]\s+/gm, '• ')
      .replace(/\n{3,}/g, '\n\n');
    downloadAs(plainText, `${stem}.txt`, 'text/plain');
    setExportOpen(false);
    addToast('Downloaded .txt', 'success');
  };

  const handleDownloadDocx = async () => {
    try {
      const rawHtml = marked.parse(currentMarkdown) as string;
      const cleanHtml = DOMPurify.sanitize(rawHtml);
      const blob = await createDocxBlob(cleanHtml);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${stem}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
      setExportOpen(false);
      addToast('Generated and downloaded Word .docx', 'success');
    } catch (err) {
      addToast('Failed to create DOCX document: ' + String(err), 'error');
    }
  };

  const tabs: { id: TabType; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'raw', label: 'Raw Editor', icon: FileCode },
    { id: 'preview', label: 'Preview', icon: Eye },
    { id: 'split', label: 'Split View', icon: Columns },
    ...(sourceFile ? [{ id: 'source' as TabType, label: 'Source PDF', icon: FileText }] : []),
  ];

  return (
    <div className="w-full border-b border-zinc-200 dark:border-zinc-800 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md sticky top-16 z-20 px-4 py-2.5">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Left: Document info & View tabs */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Filename Tag */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-semibold text-xs truncate max-w-xs sm:max-w-md shadow-xs">
            <FileText className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
            <span className="truncate">{currentFilename}</span>
          </div>

          {/* View Tab Buttons */}
          <div className="flex items-center bg-zinc-100 dark:bg-zinc-800/80 p-0.5 rounded-xl border border-zinc-200/80 dark:border-zinc-750">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Stats Bar */}
          <div className="hidden xl:flex items-center gap-2 text-[11px] text-zinc-400 font-medium pl-1">
            <span>{lines} lines</span>
            <span>•</span>
            <span>{wc.toLocaleString()} words</span>
            <span>•</span>
            <span>{cc.toLocaleString()} chars</span>
            <span>•</span>
            <span>~{rt} min read</span>
            {pageCount > 0 && (
              <>
                <span>•</span>
                <span>
                  {pageCount} {pageCount === 1 ? 'page' : 'pages'}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Right: Editing & Export Actions */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Edit Mode Lock/Unlock */}
          <button
            onClick={() => setIsEditMode(!isEditMode)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              isEditMode
                ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800 shadow-xs'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-200'
            }`}
            title={isEditMode ? 'Lock Editor (Read-only)' : 'Enable Live Edit Mode (Ctrl+E)'}
          >
            {isEditMode ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
            <span>{isEditMode ? 'Editing' : 'Locked'}</span>
          </button>

          {/* Undo / Redo */}
          <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 rounded-lg p-0.5 border border-zinc-200 dark:border-zinc-700">
            <button
              onClick={undo}
              disabled={!canUndo || !isEditMode}
              className="p-1 rounded text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 disabled:opacity-30 disabled:pointer-events-none"
              title="Undo (Ctrl+Z)"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={redo}
              disabled={!canRedo || !isEditMode}
              className="p-1 rounded text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 disabled:opacity-30 disabled:pointer-events-none"
              title="Redo (Ctrl+Y)"
            >
              <Redo2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Find & Replace */}
          <button
            onClick={() => setOpenFind(!openFind)}
            className={`p-1.5 rounded-lg border text-xs transition-colors ${
              openFind
                ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 border-indigo-200 dark:border-indigo-800'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700 hover:text-zinc-900'
            }`}
            title="Find & Replace (Ctrl+F)"
          >
            <Search className="w-3.5 h-3.5" />
          </button>

          {/* Table of Contents */}
          <button
            onClick={() => setOpenToc(!openToc)}
            className={`p-1.5 rounded-lg border text-xs transition-colors ${
              openToc
                ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 border-indigo-200 dark:border-indigo-800'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700 hover:text-zinc-900'
            }`}
            title="Table of Contents"
          >
            <ListTree className="w-3.5 h-3.5" />
          </button>

          {/* Document Metadata */}
          {metadata && (
            <button
              onClick={() => setOpenMetadata(true)}
              className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 text-xs transition-colors"
              title="Document Metadata"
            >
              <Info className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Copy Dropdown */}
          <div className="relative" ref={copyMenuRef}>
            <button
              onClick={() => setCopyOpen(!copyOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 transition-colors shadow-xs"
            >
              {copiedMd ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedMd ? 'Copied!' : 'Copy'}</span>
              <ChevronDown className="w-3 h-3 opacity-60" />
            </button>

            {copyOpen && (
              <div className="absolute right-0 mt-1.5 w-44 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xl py-1.5 z-40 text-xs font-medium animate-in fade-in zoom-in-95">
                <button
                  onClick={handleCopyMarkdown}
                  className="w-full px-3 py-2 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 flex items-center gap-2"
                >
                  <FileText className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Copy Markdown</span>
                </button>
                <button
                  onClick={handleCopyHtml}
                  className="w-full px-3 py-2 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 flex items-center gap-2"
                >
                  <FileCode className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Copy Clean HTML</span>
                </button>
              </div>
            )}
          </div>

          {/* Export Dropdown */}
          <div className="relative" ref={exportMenuRef}>
            <button
              onClick={() => setExportOpen(!exportOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export</span>
              <ChevronDown className="w-3 h-3 opacity-80" />
            </button>

            {exportOpen && (
              <div className="absolute right-0 mt-1.5 w-48 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xl py-1.5 z-40 text-xs font-medium animate-in fade-in zoom-in-95">
                <button
                  onClick={handleDownloadMd}
                  className="w-full px-3 py-2 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 flex items-center gap-2"
                >
                  <FileText className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Download Markdown (.md)</span>
                </button>
                <button
                  onClick={handleDownloadHtml}
                  className="w-full px-3 py-2 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 flex items-center gap-2"
                >
                  <FileCode className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Download HTML (.html)</span>
                </button>
                <button
                  onClick={handleDownloadTxt}
                  className="w-full px-3 py-2 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 flex items-center gap-2"
                >
                  <FileText className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Download Plain Text (.txt)</span>
                </button>
                <button
                  onClick={handleDownloadDocx}
                  className="w-full px-3 py-2 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 flex items-center gap-2 border-t border-zinc-100 dark:border-zinc-800"
                >
                  <FileCheck className="w-3.5 h-3.5 text-blue-500" />
                  <span>Download Word (.docx)</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
