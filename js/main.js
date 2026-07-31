// Application entry point — wires all modules together

import { dom } from './dom.js';
import { state, settings } from './state.js';
import {
  initSettings, initHistory, initTabs, initEditor,
  initFind, initTOC, initExport, initHighlight,
  openFindBar, closeFindBar, closeSettings, downloadAs,
  resetUI, undo, redo, toast,
} from './ui.js';
import { initFileInput, initBatch } from './file-handler.js';
import { initClipboard, initUrlImport } from './features.js';

// PDF.js worker config
pdfjsLib.GlobalWorkerOptions.workerSrc =
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// ── Initialize all modules ────────────────────────────────────

try {
  initSettings();
  initHistory();
  initTabs();
  initEditor();
  initFind();
  initTOC();
  initExport();
  initHighlight();
  initFileInput();
  initBatch();
  initClipboard();
  initUrlImport();
} catch (err) {
  console.error('[toMD] Initialization failed:', err);
  document.getElementById('errorBox')?.classList.remove('hidden');
  const t = document.getElementById('errorText');
  if (t) t.textContent = 'App failed to initialize. Please reload the page.';
}

// ── Shortcuts modal ───────────────────────────────────────────

document.getElementById('showShortcuts').addEventListener('click', () => dom.shortcutsOverlay.classList.remove('hidden'));
document.getElementById('closeShortcuts').addEventListener('click', () => dom.shortcutsOverlay.classList.add('hidden'));
dom.shortcutsOverlay.addEventListener('click', e => { if (e.target === dom.shortcutsOverlay) dom.shortcutsOverlay.classList.add('hidden'); });

// ── Keyboard shortcuts ────────────────────────────────────────

document.addEventListener('keydown', e => {
  const ctrl = e.ctrlKey || e.metaKey;

  if (ctrl && e.key === 'f') { e.preventDefault(); openFindBar(); return; }
  if (e.key === 'Escape') {
    if (!dom.findBar.classList.contains('hidden')) closeFindBar();
    else if (!dom.shortcutsOverlay.classList.contains('hidden')) dom.shortcutsOverlay.classList.add('hidden');
    else if (dom.settingsPanel.classList.contains('open')) closeSettings();
    else if (!dom.tocPanel.classList.contains('hidden')) dom.tocPanel.classList.add('hidden');
    return;
  }
  if (ctrl && e.key === 's') {
    e.preventDefault();
    if (state.currentMarkdown) { downloadAs(state.currentMarkdown, (state.currentFilename.replace(/\.[^.]+$/, '') || 'document') + '.md', 'text/markdown'); toast('Downloaded', 'success', 2000); }
    return;
  }
  if (ctrl && e.key === 'e') { e.preventDefault(); dom.editModeBtn.click(); return; }
  if (ctrl && e.key === 'z' && !e.shiftKey) { if (state.isEditMode && state.undoStack.length) { e.preventDefault(); undo(); } return; }
  if (ctrl && e.key === 'y') { if (state.isEditMode && state.redoStack.length) { e.preventDefault(); redo(); } return; }
  if (ctrl && e.key === 'd') { e.preventDefault(); document.getElementById('themeToggle').click(); return; }
  if (e.key === '?' && !ctrl && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) dom.shortcutsOverlay.classList.toggle('hidden');
});

// ── New file button (avoid circular import) ───────────────────

document.getElementById('newFileBtn').addEventListener('click', resetUI);

// ── Service Worker ────────────────────────────────────────────

if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});

// ── Global unhandled error safety net ─────────────────────────

window.addEventListener('unhandledrejection', e => {
  console.error('[toMD] Unhandled rejection:', e.reason);
  toast?.('Something went wrong. Check console for details.', 'error', 4000);
});
