import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import JSZip from 'jszip';
import {
  AppSettings,
  ConversionMetadata,
  BatchItem,
  HistoryEntry,
  ToastNotification,
  ToastType,
  TabType,
} from '../types';
import {
  DEFAULT_SETTINGS,
  SETTINGS_KEY,
  HISTORY_KEY,
  MAX_HISTORY,
  MAX_MD_STORE,
  MAX_UNDO,
  MAX_FILE_SIZE,
  FETCH_TIMEOUT_MS,
} from '../config';
import { wordCount, charCount, friendlyError, generateFrontmatter, triggerDownload, slugify } from '../lib/utils';
import { useThemeClass } from '../hooks/useThemeClass';
import { flippedPreference, migrateSettings } from '../lib/theme';
import { convertFile, FormatId, findConverter, htmlPageToMarkdown, isSupported } from '../core';

interface AppContextValue {
  settings: AppSettings;
  updateSettings: (patch: Partial<AppSettings>) => void;
  isDark: boolean;
  toggleTheme: () => void;
  currentMarkdown: string;
  updateMarkdown: (md: string) => void;
  currentFilename: string;
  sourceFile: File | null;
  metadata: ConversionMetadata | null;
  pageCount: number;
  isProcessing: boolean;
  progressPct: number;
  progressMsg: string;
  abortCurrentProcess: () => void;
  isEditMode: boolean;
  setIsEditMode: (v: boolean) => void;
  activeTab: TabType;
  setActiveTab: (t: TabType) => void;
  batchItems: BatchItem[];
  isBatchMode: boolean;
  history: HistoryEntry[];
  toasts: ToastNotification[];
  addToast: (message: string, type?: ToastType, duration?: number) => void;
  removeToast: (id: string) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  openSettings: boolean;
  setOpenSettings: (v: boolean) => void;
  openShortcuts: boolean;
  setOpenShortcuts: (v: boolean) => void;
  openHistory: boolean;
  setOpenHistory: (v: boolean) => void;
  openFind: boolean;
  setOpenFind: (v: boolean) => void;
  openToc: boolean;
  setOpenToc: (v: boolean) => void;
  openMetadata: boolean;
  setOpenMetadata: (v: boolean) => void;
  processFiles: (files: File[]) => Promise<void>;
  processUrl: (url: string) => Promise<void>;
  processPastedContent: (file: File) => Promise<void>;
  restoreHistory: (item: HistoryEntry) => void;
  deleteHistoryItem: (id: string) => void;
  downloadZipBatch: () => Promise<void>;
  mergeBatchItems: () => void;
  selectBatchItem: (index: number) => void;
  resetAll: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

function loadInitialSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? migrateSettings(JSON.parse(raw)) : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function loadInitialHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<AppSettings>(loadInitialSettings);
  const [currentMarkdown, setCurrentMarkdown] = useState<string>('');
  const [currentFilename, setCurrentFilename] = useState<string>('');
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [metadata, setMetadata] = useState<ConversionMetadata | null>(null);
  const [pageCount, setPageCount] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progressPct, setProgressPct] = useState<number>(0);
  const [progressMsg, setProgressMsg] = useState<string>('');
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<TabType>('raw');
  const [batchItems, setBatchItems] = useState<BatchItem[]>([]);
  const [isBatchMode, setIsBatchMode] = useState<boolean>(false);
  const [history, setHistory] = useState<HistoryEntry[]>(loadInitialHistory);
  const [toasts, setToasts] = useState<ToastNotification[]>([]);

  // Modals & Panels
  const [openSettings, setOpenSettings] = useState<boolean>(false);
  const [openShortcuts, setOpenShortcuts] = useState<boolean>(false);
  const [openHistory, setOpenHistory] = useState<boolean>(false);
  const [openFind, setOpenFind] = useState<boolean>(false);
  const [openToc, setOpenToc] = useState<boolean>(false);
  const [openMetadata, setOpenMetadata] = useState<boolean>(false);

  // Undo/Redo Stacks
  const undoStackRef = useRef<string[]>([]);
  const redoStackRef = useRef<string[]>([]);
  const [canUndo, setCanUndo] = useState<boolean>(false);
  const [canRedo, setCanRedo] = useState<boolean>(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Persist settings
  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (e) {
      console.warn('[toMD] Failed to save settings to localStorage:', e);
    }
  }, [settings]);

  const isDark = useThemeClass(settings.theme);
  const toggleTheme = useCallback(() => {
    const next = flippedPreference(isDark);
    setSettings((prev) => ({ ...prev, theme: next }));
  }, [isDark]);

  // Sync history with localStorage
  useEffect(() => {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    } catch (e) {
      console.warn('[toMD] Failed to save history to localStorage:', e);
    }
  }, [history]);

  const updateSettings = useCallback((patch: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  }, []);

  const addToast = useCallback((message: string, type: ToastType = 'info', duration = 3000) => {
    const id = Date.now().toString(36) + Math.random().toString(36).substring(2, 5);
    setToasts((prev) => [...prev.slice(-4), { id, message, type, duration }]);
    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    }
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const saveToHistory = useCallback((entry: { filename: string; markdown: string; pageCount: number }) => {
    const wc = wordCount(entry.markdown);
    const cc = charCount(entry.markdown);
    const truncatedMd =
      entry.markdown.length > MAX_MD_STORE
        ? entry.markdown.slice(0, MAX_MD_STORE) + '\n\n*(content truncated in history)*'
        : entry.markdown;

    const newEntry: HistoryEntry = {
      id: Date.now().toString(36) + Math.random().toString(36).substring(2, 5),
      filename: entry.filename,
      timestamp: Date.now(),
      wordCount: wc,
      charCount: cc,
      pageCount: entry.pageCount || 1,
      markdown: truncatedMd,
    };

    setHistory((prev) => [newEntry, ...prev.filter((x) => x.filename !== entry.filename)].slice(0, MAX_HISTORY));
  }, []);

  const updateMarkdown = useCallback(
    (md: string) => {
      undoStackRef.current.push(currentMarkdown);
      if (undoStackRef.current.length > MAX_UNDO) undoStackRef.current.shift();
      redoStackRef.current = [];
      setCanUndo(true);
      setCanRedo(false);
      setCurrentMarkdown(md);
    },
    [currentMarkdown],
  );

  const undo = useCallback(() => {
    if (!undoStackRef.current.length) return;
    redoStackRef.current.push(currentMarkdown);
    const prev = undoStackRef.current.pop() || '';
    setCurrentMarkdown(prev);
    setCanUndo(undoStackRef.current.length > 0);
    setCanRedo(true);
  }, [currentMarkdown]);

  const redo = useCallback(() => {
    if (!redoStackRef.current.length) return;
    undoStackRef.current.push(currentMarkdown);
    const next = redoStackRef.current.pop() || '';
    setCurrentMarkdown(next);
    setCanUndo(true);
    setCanRedo(redoStackRef.current.length > 0);
  }, [currentMarkdown]);

  const abortCurrentProcess = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  const resetAll = useCallback(() => {
    setCurrentMarkdown('');
    setCurrentFilename('');
    setSourceFile(null);
    setMetadata(null);
    setPageCount(0);
    setIsBatchMode(false);
    setBatchItems([]);
    setIsEditMode(false);
    setActiveTab('raw');
    undoStackRef.current = [];
    redoStackRef.current = [];
    setCanUndo(false);
    setCanRedo(false);
    setOpenFind(false);
    setOpenToc(false);
    setOpenMetadata(false);
  }, []);

  // ── Single & Batch Ingestion ──────────────────────────────────

  const processSingleFile = useCallback(
    async (file: File) => {
      if (isProcessing) return;
      setIsProcessing(true);
      setCurrentFilename(file.name);
      setProgressPct(10);
      setProgressMsg(`Reading ${file.name}...`);
      abortControllerRef.current = new AbortController();

      const abortSignal = abortControllerRef.current.signal;
      if (findConverter(file)?.id === FormatId.Pdf) {
        setSourceFile(file);
      } else {
        setSourceFile(null);
      }

      try {
        const result = await convertFile(file, {
          options: settings,
          signal: abortSignal,
          onProgress: ({ fraction, message }) => {
            setProgressPct(10 + Math.round(fraction * 85));
            setProgressMsg(message);
          },
        });

        let finalMd = result.markdown;
        if (settings.frontmatter && result.metadata) {
          finalMd = generateFrontmatter(result.metadata, file.name) + finalMd;
        }

        setCurrentMarkdown(finalMd);
        setMetadata(result.metadata || null);
        setPageCount(result.pageCount || 1);
        undoStackRef.current = [];
        redoStackRef.current = [];
        setCanUndo(false);
        setCanRedo(false);
        setIsBatchMode(false);
        setActiveTab('raw');

        saveToHistory({
          filename: file.name,
          markdown: finalMd,
          pageCount: result.pageCount || 1,
        });

        setProgressPct(100);
        setProgressMsg('Complete!');
        addToast(`Converted ${file.name} successfully`, 'success');
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          addToast('Conversion cancelled', 'info');
        } else {
          console.error('[toMD] Conversion error:', err);
          addToast(friendlyError(err), 'error', 4000);
        }
      } finally {
        setIsProcessing(false);
        abortControllerRef.current = null;
      }
    },
    [isProcessing, settings, saveToHistory, addToast],
  );

  const processBatchFiles = useCallback(
    async (files: File[]) => {
      if (isProcessing) return;
      setIsProcessing(true);
      setIsBatchMode(true);

      const items: BatchItem[] = files.map((f, i) => ({
        id: `${Date.now()}_${i}`,
        file: f,
        filename: f.name,
        size: f.size,
        markdown: '',
        status: 'pending',
      }));
      setBatchItems(items);
      const batchSignal = new AbortController().signal; // cancellation UI lands in B-08

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        setBatchItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, status: 'processing' } : it)));

        try {
          const result = await convertFile(item.file, {
            options: settings,
            signal: batchSignal,
            onProgress: () => {},
          });

          let md = result.markdown;
          if (settings.frontmatter && result.metadata) {
            md = generateFrontmatter(result.metadata, item.filename) + md;
          }

          setBatchItems((prev) =>
            prev.map((it, idx) =>
              idx === i ? { ...it, markdown: md, pageCount: result.pageCount, status: 'done' } : it,
            ),
          );

          saveToHistory({
            filename: item.filename,
            markdown: md,
            pageCount: result.pageCount || 1,
          });
        } catch (err) {
          setBatchItems((prev) =>
            prev.map((it, idx) => (idx === i ? { ...it, status: 'error', error: friendlyError(err) } : it)),
          );
        }
      }

      setIsProcessing(false);
      addToast(`Batch conversion finished (${items.length} files)`, 'success');
    },
    [isProcessing, settings, saveToHistory, addToast],
  );

  const processFiles = useCallback(
    async (files: File[]) => {
      const valid = files.filter(isSupported);
      if (!valid.length) {
        addToast('No supported files found.', 'error');
        return;
      }
      const oversized = valid.find((f) => f.size > MAX_FILE_SIZE);
      if (oversized) {
        addToast(
          `File too large: ${oversized.name} (${(oversized.size / 1048576).toFixed(0)} MB). Max 100 MB.`,
          'error',
          4000,
        );
        return;
      }

      if (valid.length === 1) {
        await processSingleFile(valid[0]);
      } else {
        await processBatchFiles(valid);
      }
    },
    [processSingleFile, processBatchFiles, addToast],
  );

  // ── URL Scraping & Import ─────────────────────────────────────

  const processUrl = useCallback(
    async (url: string) => {
      if (isProcessing) return;
      try {
        new URL(url);
      } catch {
        addToast('Invalid URL provided.', 'error');
        return;
      }

      setIsProcessing(true);
      setProgressPct(20);
      setProgressMsg('Fetching remote webpage...');

      const proxyUrls = [
        (u: string) => `https://corsproxy.io/?${encodeURIComponent(u)}`,
        (u: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
        (u: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(u)}`,
      ];

      try {
        let html: string | null = null;
        for (const buildUrl of proxyUrls) {
          try {
            const resp = await fetch(buildUrl(url), {
              signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
            });
            if (resp.ok) {
              html = await resp.text();
              break;
            }
          } catch {
            // try next proxy
          }
        }

        if (!html) throw new Error('Could not fetch URL. The site may block proxy access or timed out.');

        setProgressPct(60);
        setProgressMsg('Converting HTML to Markdown...');

        const page = htmlPageToMarkdown(html);
        let md = page.markdown;
        const title = page.title;
        const filename = new URL(url).hostname + '.md';
        const meta: ConversionMetadata = { Title: title, Source: url };

        if (settings.frontmatter) {
          md = generateFrontmatter(meta, filename) + md;
        }

        setCurrentMarkdown(md);
        setCurrentFilename(filename);
        setMetadata(meta);
        setPageCount(1);
        setIsBatchMode(false);
        setActiveTab('raw');

        saveToHistory({ filename, markdown: md, pageCount: 1 });
        addToast('URL converted successfully!', 'success');
      } catch (err) {
        console.error('[toMD] URL fetch error:', err);
        addToast(friendlyError(err), 'error', 4000);
      } finally {
        setIsProcessing(false);
      }
    },
    [isProcessing, settings, saveToHistory, addToast],
  );

  const processPastedContent = useCallback(
    async (file: File) => {
      await processSingleFile(file);
    },
    [processSingleFile],
  );

  // ── History Handlers ──────────────────────────────────────────

  const restoreHistory = useCallback(
    (item: HistoryEntry) => {
      setCurrentMarkdown(item.markdown);
      setCurrentFilename(item.filename);
      setMetadata(null);
      setPageCount(item.pageCount);
      setIsBatchMode(false);
      setActiveTab('raw');
      setOpenHistory(false);
      addToast(`Restored: ${item.filename}`, 'success');
    },
    [addToast],
  );

  const deleteHistoryItem = useCallback((id: string) => {
    setHistory((prev) => prev.filter((item) => item.id !== id));
  }, []);

  // ── Batch Actions ─────────────────────────────────────────────

  const downloadZipBatch = useCallback(async () => {
    const done = batchItems.filter((it) => it.status === 'done');
    if (!done.length) return;
    try {
      const zip = new JSZip();
      done.forEach((it) => {
        const cleanName = it.filename.replace(/\.[^.]+$/, '') + '.md';
        zip.file(cleanName, it.markdown);
      });
      const blob = await zip.generateAsync({ type: 'blob' });
      triggerDownload(blob, 'tomd-converted.zip');
      addToast('ZIP archive downloaded', 'success');
    } catch (err) {
      addToast('Failed to generate ZIP: ' + friendlyError(err), 'error');
    }
  }, [batchItems, addToast]);

  const mergeBatchItems = useCallback(() => {
    const done = batchItems.filter((it) => it.status === 'done');
    if (!done.length) return;

    const toc = done.map((it, i) => `${i + 1}. [${it.filename}](#${slugify(it.filename)})`).join('\n');
    const body = done.map((it) => `## ${it.filename} {#${slugify(it.filename)}}\n\n${it.markdown}`).join('\n\n---\n\n');
    const merged = `# Merged Documents\n\n${toc}\n\n---\n\n${body}`;

    setCurrentMarkdown(merged);
    setCurrentFilename('merged.md');
    setPageCount(done.length);
    setIsBatchMode(false);
    setActiveTab('raw');
    addToast(`Merged ${done.length} documents`, 'success');
  }, [batchItems, addToast]);

  const selectBatchItem = useCallback(
    (index: number) => {
      const item = batchItems[index];
      if (item && item.status === 'done') {
        setCurrentMarkdown(item.markdown);
        setCurrentFilename(item.filename);
        setPageCount(item.pageCount || 1);
        setIsBatchMode(false);
        setActiveTab('raw');
      }
    },
    [batchItems],
  );

  return (
    <AppContext.Provider
      value={{
        settings,
        updateSettings,
        isDark,
        toggleTheme,
        currentMarkdown,
        updateMarkdown,
        currentFilename,
        sourceFile,
        metadata,
        pageCount,
        isProcessing,
        progressPct,
        progressMsg,
        abortCurrentProcess,
        isEditMode,
        setIsEditMode,
        activeTab,
        setActiveTab,
        batchItems,
        isBatchMode,
        history,
        toasts,
        addToast,
        removeToast,
        undo,
        redo,
        canUndo,
        canRedo,
        openSettings,
        setOpenSettings,
        openShortcuts,
        setOpenShortcuts,
        openHistory,
        setOpenHistory,
        openFind,
        setOpenFind,
        openToc,
        setOpenToc,
        openMetadata,
        setOpenMetadata,
        processFiles,
        processUrl,
        processPastedContent,
        restoreHistory,
        deleteHistoryItem,
        downloadZipBatch,
        mergeBatchItems,
        selectBatchItem,
        resetAll,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};
