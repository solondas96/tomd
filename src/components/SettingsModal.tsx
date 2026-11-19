import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Settings, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { OCR_LANGUAGE_DATA_HOST, OCR_LANGUAGES } from '../config';
import { HeadingSensitivity, PageSeparator, ThemePreference } from '../types';

export const SettingsModal: React.FC = () => {
  const { openSettings, setOpenSettings, settings, updateSettings } = useApp();

  if (!openSettings) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/40 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="w-full max-w-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl p-6 sm:p-7 max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800 mb-6">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400">
                <Settings className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100">Conversion Settings</h3>
                <p className="text-xs text-zinc-500">Fine-tune extraction heuristics and formatting.</p>
              </div>
            </div>
            <button
              onClick={() => setOpenSettings(false)}
              className="p-1 rounded-md text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Form Settings */}
          <div className="space-y-5 text-sm">
            {/* Theme */}
            <div>
              <label
                htmlFor="setting-theme"
                className="font-semibold text-xs text-zinc-900 dark:text-zinc-100 block mb-1"
              >
                Theme
              </label>
              <select
                id="setting-theme"
                value={settings.theme}
                onChange={(e) => updateSettings({ theme: e.target.value as ThemePreference })}
                className="w-full px-3 py-2 rounded-xl text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value={ThemePreference.System}>System (follow OS)</option>
                <option value={ThemePreference.Light}>Light</option>
                <option value={ThemePreference.Dark}>Dark</option>
              </select>
            </div>

            {/* Heading sensitivity */}
            <div>
              <label
                htmlFor="setting-heading-sensitivity"
                className="font-semibold text-xs text-zinc-900 dark:text-zinc-100 block mb-1"
              >
                Heading Sensitivity (PDF)
              </label>
              <p className="text-[11px] text-zinc-500 mb-2">
                Controls the font-size ratio threshold required to classify a line as a header.
              </p>
              <select
                id="setting-heading-sensitivity"
                value={settings.headingSensitivity}
                onChange={(e) => updateSettings({ headingSensitivity: e.target.value as HeadingSensitivity })}
                className="w-full px-3 py-2 rounded-xl text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="low">Low (1.3x font size)</option>
                <option value="medium">Medium (1.1x font size - recommended)</option>
                <option value="high">High (1.05x font size)</option>
              </select>
            </div>

            {/* Page separator */}
            <div>
              <label
                htmlFor="setting-page-separator"
                className="font-semibold text-xs text-zinc-900 dark:text-zinc-100 block mb-1"
              >
                Page Separator
              </label>
              <select
                id="setting-page-separator"
                value={settings.pageSeparator}
                onChange={(e) => updateSettings({ pageSeparator: e.target.value as PageSeparator })}
                className="w-full px-3 py-2 rounded-xl text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="---">Horizontal Rule (---)</option>
                <option value="blank">Blank Line</option>
                <option value="none">None (Continuous)</option>
              </select>
            </div>

            {/* Toggles */}
            <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 space-y-4">
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <span className="font-semibold text-xs text-zinc-900 dark:text-zinc-100 block">
                    Strip Headers &amp; Footers
                  </span>
                  <span className="text-[11px] text-zinc-500 block">
                    Discard page-numbering lines within 4% of top and bottom margins.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.stripDecorations}
                  onChange={(e) => updateSettings({ stripDecorations: e.target.checked })}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <span className="font-semibold text-xs text-zinc-900 dark:text-zinc-100 block">
                    Table Reconstruction
                  </span>
                  <span className="text-[11px] text-zinc-500 block">
                    Automatically assemble vertically aligned text clusters into GFM tables.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.tableDetection}
                  onChange={(e) => updateSettings({ tableDetection: e.target.checked })}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <span className="font-semibold text-xs text-zinc-900 dark:text-zinc-100 block">
                    Embed Image Pages
                  </span>
                  <span className="text-[11px] text-zinc-500 block">
                    Render image-only PDF pages as inline base64 graphics.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.extractImages}
                  onChange={(e) => updateSettings({ extractImages: e.target.checked })}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <span className="font-semibold text-xs text-zinc-900 dark:text-zinc-100 block">
                    Auto-Generate YAML Frontmatter
                  </span>
                  <span className="text-[11px] text-zinc-500 block">
                    Prepend document title, date, and author metadata to markdown.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.frontmatter}
                  onChange={(e) => updateSettings({ frontmatter: e.target.checked })}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                />
              </label>
            </div>

            {/* OCR Settings */}
            <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 space-y-3">
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <span className="font-semibold text-xs text-zinc-900 dark:text-zinc-100 block">
                    OCR for Scanned Documents
                  </span>
                  <span className="text-[11px] text-zinc-500 block">
                    Uses in-browser Tesseract.js WebAssembly worker.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.ocr}
                  onChange={(e) => updateSettings({ ocr: e.target.checked })}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                />
              </label>

              {settings.ocr && (
                <div className="pl-2 pt-1">
                  <p
                    id="ocr-disclosure"
                    className="text-[11px] leading-relaxed text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-lg px-2.5 py-2 mb-2"
                  >
                    The first time you use a language, its recognition model (a few MB) is downloaded from{' '}
                    <span className="font-mono">{OCR_LANGUAGE_DATA_HOST}</span>. Only that request is made; your
                    documents and images are never uploaded.
                  </p>
                  <label
                    htmlFor="setting-ocr-language"
                    className="font-semibold text-[11px] text-zinc-700 dark:text-zinc-300 block mb-1"
                  >
                    OCR Language:
                  </label>
                  <select
                    id="setting-ocr-language"
                    value={settings.ocrLanguage}
                    onChange={(e) => updateSettings({ ocrLanguage: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-xl text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    {OCR_LANGUAGES.map((l) => (
                      <option key={l.code} value={l.code}>
                        {l.label} ({l.code})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          <button
            onClick={() => setOpenSettings(false)}
            className="w-full mt-6 py-2.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 transition-all"
          >
            Done
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
