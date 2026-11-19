import React, { useState, useRef, useCallback } from 'react';
import { motion } from 'motion/react';
import {
  UploadCloud,
  FileText,
  FolderUp,
  Globe,
  Clipboard,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { isSupported } from '../lib/converters';

interface FileSystemEntry {
  isFile: boolean;
  isDirectory: boolean;
  file: (success: (f: File) => void, error: (e: Error) => void) => void;
  createReader: () => {
    readEntries: (success: (entries: FileSystemEntry[]) => void, error: (e: Error) => void) => void;
  };
}

export const DropZone: React.FC = () => {
  const { processFiles, processUrl, isProcessing } = useApp();
  const [isDragOver, setIsDragOver] = useState(false);
  const [dragCount, setDragCount] = useState(0);
  const [urlInput, setUrlInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
    const count = e.dataTransfer.items?.length || 0;
    setDragCount(count);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    setDragCount(0);
  }, []);

  const collectFilesFromEntries = async (entries: FileSystemEntry[]): Promise<File[]> => {
    const files: File[] = [];
    async function readEntry(entry: FileSystemEntry) {
      if (entry.isFile) {
        const file = await new Promise<File>((resolve, reject) => entry.file(resolve, reject));
        files.push(file);
      } else if (entry.isDirectory) {
        const reader = entry.createReader();
        let batch: FileSystemEntry[];
        do {
          batch = await new Promise<FileSystemEntry[]>((resolve, reject) =>
            reader.readEntries(resolve, reject)
          );
          for (const child of batch) await readEntry(child);
        } while (batch.length > 0);
      }
    }
    for (const entry of entries) await readEntry(entry);
    return files;
  };

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      setDragCount(0);

      // Check for folders
      const items = Array.from(e.dataTransfer.items || []);
      const entries = items
        .map((i) => (i as unknown as { webkitGetAsEntry?: () => FileSystemEntry }).webkitGetAsEntry?.())
        .filter((entry): entry is FileSystemEntry => Boolean(entry));

      const hasDirectory = entries.some((entry) => entry.isDirectory);
      if (hasDirectory) {
        const collected = await collectFilesFromEntries(entries);
        const supported = collected.filter(isSupported);
        if (supported.length > 0) {
          await processFiles(supported);
        }
        return;
      }

      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        await processFiles(files);
      }
    },
    [processFiles]
  );

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(Array.from(e.target.files));
      e.target.value = '';
    }
  };

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (urlInput.trim()) {
      processUrl(urlInput.trim());
      setUrlInput('');
    }
  };

  const supportedFormats = [
    { label: 'PDF', desc: 'Text & Scanned' },
    { label: 'DOCX', desc: 'Word' },
    { label: 'PPTX', desc: 'PowerPoint' },
    { label: 'XLSX / CSV', desc: 'Sheets' },
    { label: 'EPUB', desc: 'E-Books' },
    { label: 'HTML', desc: 'Webpages' },
    { label: 'Images', desc: 'OCR 12+ Langs' },
    { label: 'LaTeX', desc: 'Academic' },
  ];

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8 sm:py-12 flex flex-col items-center text-center">
      {/* Hero Header */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="mb-8 sm:mb-10"
      >
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/60 mb-4 shadow-sm">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Local WebAssembly &amp; AI-Ready Markdown Engine</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 mb-4">
          Any Document <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600">→ Clean Markdown</span>
        </h1>
        <p className="max-w-2xl text-base sm:text-lg text-zinc-600 dark:text-zinc-400 font-normal leading-relaxed">
          Convert PDF, Word, PowerPoint, Excel, EPUB, and images to LLM-ready markdown.
          Zero server uploads. 100% private in your browser.
        </p>
      </motion.div>

      {/* Main Drag & Drop Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.35, delay: 0.1 }}
        className="w-full"
      >
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key !== 'Enter' && e.key !== ' ') return;
            e.preventDefault();
            fileInputRef.current?.click();
          }}
          role="button"
          tabIndex={0}
          aria-label="Choose files to convert, or drop them here"
          className={`relative group cursor-pointer rounded-3xl p-8 sm:p-14 border-2 border-dashed transition-all duration-300 flex flex-col items-center justify-center ${
            isDragOver
              ? 'border-indigo-500 bg-indigo-50/60 dark:bg-indigo-950/30 scale-[1.01] shadow-2xl shadow-indigo-500/10'
              : 'border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 hover:border-indigo-400 dark:hover:border-indigo-600 shadow-xl shadow-zinc-950/5'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFileInputChange}
            accept=".pdf,.docx,.pptx,.xlsx,.xls,.csv,.tsv,.html,.htm,.epub,.rtf,.txt,.md,.tex,.latex,.xml,.json,.png,.jpg,.jpeg,.webp,.gif,.bmp,.tiff,.tif"
          />

          {/* Upload Icon Circle */}
          <div className="w-20 h-20 rounded-2xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/80 transition-all duration-300 shadow-inner">
            <UploadCloud className="w-10 h-10 stroke-[1.8]" />
          </div>

          <h3 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
            {isDragOver
              ? `Drop ${dragCount > 1 ? `${dragCount} files` : 'file'} to convert`
              : 'Drag & drop documents or folders here'}
          </h3>

          <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-md mb-6">
            Drop single files, multiple documents for batch processing, or entire folders. Up to 100 MB per file.
          </p>

          <button
            type="button"
            className="px-6 py-2.5 rounded-xl font-semibold text-sm bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/25 transition-all group-hover:shadow-lg group-hover:shadow-indigo-600/35"
          >
            Browse Files
          </button>

          {/* Quick tips */}
          <div className="mt-8 pt-6 border-t border-zinc-100 dark:border-zinc-800/80 flex flex-wrap items-center justify-center gap-6 text-xs text-zinc-500 dark:text-zinc-400">
            <div className="flex items-center gap-1.5">
              <FolderUp className="w-4 h-4 text-zinc-400" />
              <span>Folder Drag &amp; Drop</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clipboard className="w-4 h-4 text-zinc-400" />
              <span>Paste Image or HTML (<kbd className="font-sans px-1 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">Ctrl+V</kbd>)</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* URL Import & Supported Formats Section */}
      <div className="w-full mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* URL Importer */}
        <div className="md:col-span-3 p-4 sm:p-5 rounded-2xl bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col sm:flex-row items-center gap-3">
          <div className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300 font-medium text-sm shrink-0">
            <Globe className="w-4 h-4 text-indigo-500" />
            <span>Import from URL:</span>
          </div>
          <form onSubmit={handleUrlSubmit} className="flex-1 flex items-center gap-2 w-full">
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://example.com/article"
              disabled={isProcessing}
              className="flex-1 px-3.5 py-2 rounded-xl text-sm bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="submit"
              disabled={isProcessing || !urlInput.trim()}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 disabled:opacity-50 transition-colors shrink-0 flex items-center gap-1.5"
            >
              <span>Fetch</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>

        {/* Format Badges Grid */}
        <div className="md:col-span-3 grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2 pt-2">
          {supportedFormats.map((fmt) => (
            <div
              key={fmt.label}
              className="p-2.5 rounded-xl bg-white/60 dark:bg-zinc-900/40 border border-zinc-200/60 dark:border-zinc-800/60 text-center"
            >
              <div className="flex items-center justify-center gap-1 font-semibold text-xs text-zinc-800 dark:text-zinc-200">
                <FileText className="w-3 h-3 text-indigo-500" />
                <span>{fmt.label}</span>
              </div>
              <span className="text-[10px] text-zinc-400 block mt-0.5">{fmt.desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
