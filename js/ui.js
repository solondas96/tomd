// UI interactions — toast, progress, settings, history, tabs, editor, find, toc, export, highlight

import { dom } from './dom.js';
import { state, settings, updateSettings, loadSettings } from './state.js';
import { MAX_UNDO, MAX_HISTORY, MAX_MD_STORE, HISTORY_KEY, SETTINGS_KEY } from './config.js';
import { escHtml, escRegex, wordCount, formatBytes, parsePdfDate, formatDate } from './utils.js';

// ── Toast ─────────────────────────────────────────────────────

export function toast(msg, type = 'info', dur = 3000) {
  const icons = {
    success: '<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
    error: '<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
    info: '<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
  };
  // Cap at 5 visible toasts
  while (dom.toastContainer.children.length >= 5) dom.toastContainer.firstChild.remove();
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.innerHTML = `${icons[type] || icons.info}<span>${escHtml(msg)}</span>`;
  dom.toastContainer.appendChild(el);
  setTimeout(() => { el.classList.add('removing'); el.addEventListener('animationend', () => el.remove()); }, dur);
}

// ── Progress ──────────────────────────────────────────────────

export function setProgress(pct, detail) {
  dom.progressFill.style.width = pct + '%';
  dom.progressPct.textContent = pct + '%';
  dom.progressDetail.textContent = detail;
  dom.progressLabel.textContent = pct >= 100 ? 'Complete!' : 'Converting...';
}

// ── Show / Hide / Error ───────────────────────────────────────

export function show(el) { el.classList.remove('hidden'); }
export function hide(el) { el.classList.add('hidden'); }
export function showError(msg) { dom.errorText.textContent = msg; dom.errorBox.classList.remove('hidden'); }
export function hideError() { dom.errorBox.classList.add('hidden'); }

// ── Stats ─────────────────────────────────────────────────────

export function updateStats(md, pageCount) {
  const w = wordCount(md), m = Math.max(1, Math.ceil(w / 200));
  const p = pageCount != null ? ` \u00B7 ${pageCount} page${pageCount !== 1 ? 's' : ''}` : '';
  dom.statsBar.textContent = `${md.split('\n').length} lines \u00B7 ${w.toLocaleString()} words \u00B7 ${md.length.toLocaleString()} chars \u00B7 ~${m} min read${p}`;
}

// ── Settings ──────────────────────────────────────────────────

export function initSettings() {
  const map = [
    ['settingHeadingSensitivity', 'headingSensitivity', 'value'],
    ['settingPageSeparator', 'pageSeparator', 'value'],
    ['settingStripDecorations', 'stripDecorations', 'checked'],
    ['settingTableDetection', 'tableDetection', 'checked'],
    ['settingExtractImages', 'extractImages', 'checked'],
    ['settingOcr', 'ocr', 'checked'],
    ['settingFrontmatter', 'frontmatter', 'checked'],
    ['settingSyntaxHighlight', 'syntaxHighlight', 'checked'],
  ];

  // Sync UI to current settings
  for (const [elId, key, prop] of map) {
    const el = document.getElementById(elId);
    el[prop] = settings[key];
    el.addEventListener('change', e => {
      updateSettings({ [key]: e.target[prop] });
      if (key === 'syntaxHighlight') updateSyntaxHighlight();
    });
  }

  document.getElementById('themeToggle').addEventListener('click', () => {
    updateSettings({ darkMode: !settings.darkMode });
    applyDarkMode();
    toast(settings.darkMode ? 'Dark mode' : 'Light mode', 'info', 1500);
  });

  document.getElementById('openSettings').addEventListener('click', openSettings);
  document.getElementById('closeSettings').addEventListener('click', closeSettings);
  dom.settingsOverlay.addEventListener('click', closeSettings);
  applyDarkMode();
}

function applyDarkMode() {
  document.documentElement.setAttribute('data-theme', settings.darkMode ? 'dark' : 'light');
}

export function openSettings() { dom.settingsPanel.classList.add('open'); dom.settingsOverlay.classList.remove('hidden'); }
export function closeSettings() { dom.settingsPanel.classList.remove('open'); dom.settingsOverlay.classList.add('hidden'); }

// ── History ───────────────────────────────────────────────────

function loadHistoryData() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); } catch { return []; }
}

export function saveToHistory({ filename, markdown, wordCount: wc, charCount, pageCount }) {
  const h = loadHistoryData();
  h.unshift({
    id: Date.now().toString(36), filename, timestamp: Date.now(),
    wordCount: wc, charCount, pageCount,
    markdown: markdown.length > MAX_MD_STORE ? markdown.slice(0, MAX_MD_STORE) + '\n\n*(truncated)*' : markdown,
  });
  h.splice(MAX_HISTORY);
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(h)); }
  catch { h.pop(); try { localStorage.setItem(HISTORY_KEY, JSON.stringify(h)); } catch {} }
  renderHistory();
}

export function renderHistory() {
  const h = loadHistoryData();
  if (!h.length) { dom.historySection.classList.add('hidden'); return; }
  dom.historySection.classList.remove('hidden');
  dom.historyCount.textContent = `(${h.length})`;
  dom.historyList.innerHTML = h.map(e => `<li class="history-item"><div class="history-item-info"><span class="history-filename">${escHtml(e.filename || '')}</span><span class="history-meta">${(e.wordCount || 0).toLocaleString()} words \u00B7 ${formatDate(e.timestamp)}</span></div><div class="history-item-actions"><button class="history-btn" data-action="restore" data-id="${escHtml(String(e.id))}">Restore</button><button class="history-btn history-btn-danger" data-action="delete" data-id="${escHtml(String(e.id))}">&times;</button></div></li>`).join('');
}

export function initHistory() {
  document.getElementById('historyToggle').addEventListener('click', () => {
    dom.historyList.classList.toggle('hidden');
    document.getElementById('historyToggle').classList.toggle('open');
  });
  dom.historyList.addEventListener('click', e => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const { action, id } = btn.dataset;
    const h = loadHistoryData(), entry = h.find(x => x.id === id);
    if (!entry) return;
    if (action === 'restore') {
      state.currentMarkdown = entry.markdown;
      state.currentFilename = entry.filename;
      dom.markdownOutput.value = state.currentMarkdown;
      dom.splitMdOutput.value = state.currentMarkdown;
      updateStats(state.currentMarkdown, entry.pageCount);
      hide(dom.uploadSection); hide(dom.batchSection); show(dom.outputSection);
      switchTab('raw'); updateSyntaxHighlight();
      toast('Restored: ' + entry.filename, 'success', 2000);
    } else {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(h.filter(x => x.id !== id)));
      renderHistory();
      toast('Removed', 'info', 1500);
    }
  });
  renderHistory();
}

// ── Tabs & Preview ────────────────────────────────────────────

export function switchTab(name) {
  document.querySelectorAll('.tab').forEach(t => {
    t.classList.toggle('active', t.dataset.tab === name);
    t.setAttribute('aria-selected', String(t.dataset.tab === name));
  });
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.toggle('active', p.id === 'panel-' + name));
  if (name === 'preview' && state.currentMarkdown) renderPreview();
  if (name === 'split' && state.currentMarkdown) { dom.splitMdOutput.value = state.currentMarkdown; renderSplitPreview(); }
}

function renderPreview() {
  const h = marked.parse(state.currentMarkdown);
  if (typeof DOMPurify === 'undefined') { dom.previewBody.textContent = state.currentMarkdown; return; }
  dom.previewBody.innerHTML = DOMPurify.sanitize(h, { USE_PROFILES: { html: true } });
}

function renderSplitPreview() {
  const h = marked.parse(dom.splitMdOutput.value || state.currentMarkdown);
  if (typeof DOMPurify === 'undefined') { dom.splitPreview.textContent = dom.splitMdOutput.value || state.currentMarkdown; return; }
  dom.splitPreview.innerHTML = DOMPurify.sanitize(h, { USE_PROFILES: { html: true } });
}

export function initTabs() {
  document.querySelectorAll('.tab').forEach(t => t.addEventListener('click', () => switchTab(t.dataset.tab)));
}

// ── Editor (edit mode, undo/redo) ─────────────────────────────

export function pushUndo() {
  state.undoStack.push(state.currentMarkdown);
  if (state.undoStack.length > MAX_UNDO) state.undoStack.shift();
  state.redoStack = [];
  updateUndoUI();
}

function undo() {
  if (!state.undoStack.length) return;
  state.redoStack.push(state.currentMarkdown);
  state.currentMarkdown = state.undoStack.pop();
  syncMarkdown(); updateUndoUI();
}

function redo() {
  if (!state.redoStack.length) return;
  state.undoStack.push(state.currentMarkdown);
  state.currentMarkdown = state.redoStack.pop();
  syncMarkdown(); updateUndoUI();
}

export function updateUndoUI() {
  dom.undoBtn.disabled = !state.undoStack.length;
  dom.redoBtn.disabled = !state.redoStack.length;
}

export function syncMarkdown() {
  dom.markdownOutput.value = state.currentMarkdown;
  dom.splitMdOutput.value = state.currentMarkdown;
  updateStats(state.currentMarkdown, null);
  updateSyntaxHighlight();
  if (document.getElementById('panel-preview').classList.contains('active')) renderPreview();
  if (document.getElementById('panel-split').classList.contains('active')) renderSplitPreview();
}

let splitTimer = null;
function debounceSplit() {
  clearTimeout(splitTimer);
  splitTimer = setTimeout(() => { if (document.getElementById('panel-split').classList.contains('active')) renderSplitPreview(); }, 300);
}

let undoTimer = null;
let undoSnapshot = null;
function debouncedUndo() {
  if (undoSnapshot === null) undoSnapshot = state.currentMarkdown;
  clearTimeout(undoTimer);
  undoTimer = setTimeout(() => {
    if (undoSnapshot !== null && undoSnapshot !== state.currentMarkdown) pushUndoRaw(undoSnapshot);
    undoSnapshot = null;
  }, 400);
}
function pushUndoRaw(snapshot) {
  state.undoStack.push(snapshot);
  if (state.undoStack.length > MAX_UNDO) state.undoStack.shift();
  state.redoStack = [];
  updateUndoUI();
}

export function initEditor() {
  dom.undoBtn.addEventListener('click', undo);
  dom.redoBtn.addEventListener('click', redo);

  dom.editModeBtn.addEventListener('click', () => {
    state.isEditMode = !state.isEditMode;
    dom.markdownOutput.readOnly = !state.isEditMode;
    dom.splitMdOutput.readOnly = !state.isEditMode;
    dom.editModeBtn.classList.toggle('active', state.isEditMode);
    toast(state.isEditMode ? 'Edit mode on' : 'Edit locked', 'info', 1200);
  });

  dom.markdownOutput.addEventListener('input', () => {
    if (!state.isEditMode) return;
    debouncedUndo();
    state.currentMarkdown = dom.markdownOutput.value;
    dom.splitMdOutput.value = state.currentMarkdown;
    updateStats(state.currentMarkdown, null);
    updateSyntaxHighlight(); debounceSplit();
  });

  dom.splitMdOutput.addEventListener('input', () => {
    if (!state.isEditMode) return;
    debouncedUndo();
    state.currentMarkdown = dom.splitMdOutput.value;
    dom.markdownOutput.value = state.currentMarkdown;
    updateStats(state.currentMarkdown, null);
    updateSyntaxHighlight(); debounceSplit();
  });
}

// ── Find & Replace ────────────────────────────────────────────

export function openFindBar() { dom.findBar.classList.remove('hidden'); dom.findInput.focus(); dom.findInput.select(); }
export function closeFindBar() { dom.findBar.classList.add('hidden'); state.findMatches = []; state.findIdx = -1; dom.findCount.textContent = ''; }

function getActiveTa() { return document.querySelector('.tab-panel.active textarea') || dom.markdownOutput; }

function runFind() {
  const q = dom.findInput.value;
  if (!q || !state.currentMarkdown) { state.findMatches = []; state.findIdx = -1; dom.findCount.textContent = ''; return; }
  try {
    const re = dom.findRegex.checked ? new RegExp(q, 'gi') : new RegExp(escRegex(q), 'gi');
    state.findMatches = [...state.currentMarkdown.matchAll(re)].map(m => ({ index: m.index, length: m[0].length }));
  } catch { state.findMatches = []; dom.findCount.textContent = 'Invalid regex'; return; }
  state.findIdx = state.findMatches.length ? 0 : -1;
  updateFindUI();
}

function moveFindIdx(d) {
  if (!state.findMatches.length) return;
  state.findIdx = (state.findIdx + d + state.findMatches.length) % state.findMatches.length;
  updateFindUI();
}

function updateFindUI() {
  if (!state.findMatches.length) { dom.findCount.textContent = 'No matches'; return; }
  dom.findCount.textContent = `${state.findIdx + 1}/${state.findMatches.length}`;
  const ta = getActiveTa(), m = state.findMatches[state.findIdx];
  if (ta && m) {
    ta.focus(); ta.setSelectionRange(m.index, m.index + m.length);
    const lh = parseInt(getComputedStyle(ta).lineHeight, 10) || 20;
    ta.scrollTop = Math.max(0, (state.currentMarkdown.slice(0, m.index).split('\n').length - 5) * lh);
  }
}

function replaceOne() {
  if (state.findIdx < 0 || !state.isEditMode) return;
  pushUndo();
  const m = state.findMatches[state.findIdx];
  state.currentMarkdown = state.currentMarkdown.slice(0, m.index) + dom.replaceInput.value + state.currentMarkdown.slice(m.index + m.length);
  syncMarkdown(); runFind();
}

function replaceAll() {
  const q = dom.findInput.value;
  if (!q || !state.isEditMode) return;
  pushUndo();
  try {
    const re = dom.findRegex.checked ? new RegExp(q, 'gi') : new RegExp(escRegex(q), 'gi');
    const count = (state.currentMarkdown.match(re) || []).length;
    state.currentMarkdown = state.currentMarkdown.replace(re, dom.replaceInput.value);
    syncMarkdown(); closeFindBar();
    toast(`Replaced ${count}`, 'success', 2000);
  } catch { toast('Invalid regex', 'error'); }
}

export function initFind() {
  document.getElementById('findBtn').addEventListener('click', openFindBar);
  document.getElementById('closeFindBtn').addEventListener('click', closeFindBar);
  dom.findInput.addEventListener('input', runFind);
  dom.findRegex.addEventListener('change', runFind);
  document.getElementById('findNextBtn').addEventListener('click', () => moveFindIdx(1));
  document.getElementById('findPrevBtn').addEventListener('click', () => moveFindIdx(-1));
  document.getElementById('replaceBtn').addEventListener('click', replaceOne);
  document.getElementById('replaceAllBtn').addEventListener('click', replaceAll);
}

// ── TOC ───────────────────────────────────────────────────────

export function buildTOC() {
  const headings = [];
  state.currentMarkdown.split('\n').forEach((l, i) => {
    const m = l.match(/^(#{1,4})\s+(.+)/);
    if (m) headings.push({ level: m[1].length, text: m[2], line: i });
  });
  if (!headings.length) { dom.tocBody.innerHTML = '<p style="padding:1rem;color:var(--muted);font-size:.82rem">No headings.</p>'; return; }
  dom.tocBody.innerHTML = headings.map(h => `<button class="toc-item" data-level="${h.level}" data-line="${h.line}">${escHtml(h.text)}</button>`).join('');
}

export function initTOC() {
  dom.tocBody.addEventListener('click', e => {
    const btn = e.target.closest('.toc-item');
    if (!btn) return;
    const line = +btn.dataset.line, ta = getActiveTa();
    if (ta) {
      const pos = state.currentMarkdown.split('\n').slice(0, line).join('\n').length;
      ta.focus(); ta.setSelectionRange(pos, pos);
      const lh = parseInt(getComputedStyle(ta).lineHeight, 10) || 20;
      ta.scrollTop = Math.max(0, (line - 3) * lh);
    }
  });
  document.getElementById('tocBtn').addEventListener('click', () => dom.tocPanel.classList.toggle('hidden'));
  document.getElementById('closeToc').addEventListener('click', () => dom.tocPanel.classList.add('hidden'));
}

// ── Export / Copy ─────────────────────────────────────────────

function stem() { return state.currentFilename.replace(/\.[^.]+$/, '') || 'document'; }

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

export function downloadAs(content, filename, mimeType) {
  triggerDownload(new Blob([content], { type: mimeType + ';charset=utf-8' }), filename);
  dom.exportMenu.classList.remove('open');
}

export function downloadBlob(blob, filename) {
  triggerDownload(blob, filename);
}

export function initExport() {
  document.getElementById('copyBtn').addEventListener('click', async () => {
    if (!state.currentMarkdown) return;
    try {
      await navigator.clipboard.writeText(state.currentMarkdown);
      dom.copyLabel.textContent = '\u2713 Copied!';
      setTimeout(() => { dom.copyLabel.textContent = 'Copy'; }, 2000);
      toast('Copied', 'success', 1500);
    } catch { toast('Copy failed', 'error'); }
  });

  document.getElementById('exportBtn').addEventListener('click', e => { e.stopPropagation(); dom.exportMenu.classList.toggle('open'); });
  document.addEventListener('click', () => dom.exportMenu.classList.remove('open'));

  document.getElementById('downloadMd').addEventListener('click', () => {
    downloadAs(state.currentMarkdown, stem() + '.md', 'text/markdown');
    toast('Downloaded .md', 'success', 2000);
  });

  document.getElementById('downloadHtml').addEventListener('click', () => {
    const h = marked.parse(state.currentMarkdown);
    const s = typeof DOMPurify !== 'undefined' ? DOMPurify.sanitize(h) : h;
    const doc = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${escHtml(stem())}</title><style>body{max-width:800px;margin:2rem auto;font-family:system-ui;line-height:1.7;padding:0 1rem}pre{background:#f5f5f5;padding:1rem;border-radius:8px;overflow-x:auto}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ddd;padding:.5rem}</style></head><body>${s}</body></html>`;
    downloadAs(doc, stem() + '.html', 'text/html');
    toast('Downloaded .html', 'success', 2000);
  });

  document.getElementById('downloadTxt').addEventListener('click', () => {
    const t = state.currentMarkdown
      .replace(/#{1,6}\s+/g, '').replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/`{1,3}[^`\n]*`{1,3}/g, '')
      .replace(/^[-*]\s+/gm, '\u2022 ').replace(/\n{3,}/g, '\n\n');
    downloadAs(t, stem() + '.txt', 'text/plain');
    toast('Downloaded .txt', 'success', 2000);
  });

  document.getElementById('copyHtmlBtn').addEventListener('click', async () => {
    const h = marked.parse(state.currentMarkdown);
    const s = typeof DOMPurify !== 'undefined' ? DOMPurify.sanitize(h) : h;
    try { if (navigator.clipboard) await navigator.clipboard.writeText(s); }
    catch { toast('Copy failed', 'error'); return; }
    dom.exportMenu.classList.remove('open');
    toast('HTML copied', 'success');
  });
}

// ── Metadata ──────────────────────────────────────────────────

export function showMetadata(meta, file) {
  if (!meta) { hide(dom.metadataSection); return; }
  const items = [];
  if (meta.Title) items.push({ l: 'Title', v: meta.Title });
  if (meta.Author) items.push({ l: 'Author', v: meta.Author });
  if (meta.Source) items.push({ l: 'Source', v: meta.Source });
  if (meta.CreationDate) items.push({ l: 'Created', v: parsePdfDate(meta.CreationDate) });
  items.push({ l: 'Size', v: formatBytes(file.size || 0) });
  if (meta.Producer) items.push({ l: 'Producer', v: meta.Producer });
  if (!items.length) { hide(dom.metadataSection); return; }
  dom.metadataGrid.innerHTML = items.map(i => `<div class="meta-item"><span class="meta-label">${escHtml(i.l)}</span><span class="meta-value">${escHtml(i.v)}</span></div>`).join('');
  show(dom.metadataSection);
}

// ── Syntax Highlighting ───────────────────────────────────────

export function updateSyntaxHighlight() {
  if (!settings.syntaxHighlight || !state.currentMarkdown) { dom.syntaxHighlight.innerHTML = ''; return; }
  dom.syntaxHighlight.innerHTML = highlightMarkdown(state.currentMarkdown);
  syncHighlightScroll();
}

function highlightMarkdown(md) {
  return escHtml(md)
    .replace(/^(#{1,6}\s.*)$/gm, '<span class="sh-heading">$1</span>')
    .replace(/(\*\*|__)(.*?)\1/g, '<span class="sh-bold">$1$2$1</span>')
    .replace(/(\*|_)([^*_]+)\1/g, '<span class="sh-italic">$1$2$1</span>')
    .replace(/(`[^`\n]+`)/g, '<span class="sh-code">$1</span>')
    .replace(/^(&gt;\s.*)$/gm, '<span class="sh-blockquote">$1</span>')
    .replace(/^(---|\*\*\*|___)$/gm, '<span class="sh-hr">$1</span>')
    .replace(/^([-*+]\s)/gm, '<span class="sh-list">$1</span>')
    .replace(/(\[.*?\]\(.*?\))/g, '<span class="sh-link">$1</span>');
}

function syncHighlightScroll() {
  dom.syntaxHighlight.scrollTop = dom.markdownOutput.scrollTop;
  dom.syntaxHighlight.scrollLeft = dom.markdownOutput.scrollLeft;
}

export function initHighlight() {
  dom.markdownOutput.addEventListener('scroll', syncHighlightScroll);
}

// ── Reset ─────────────────────────────────────────────────────

export function resetUI() {
  state.currentMarkdown = ''; state.currentFilename = '';
  state.batchResults = []; state.undoStack = []; state.redoStack = [];
  updateUndoUI();
  dom.markdownOutput.value = ''; dom.splitMdOutput.value = '';
  dom.previewBody.innerHTML = ''; dom.splitPreview.innerHTML = '';
  dom.statsBar.textContent = '';
  state.isEditMode = false;
  dom.markdownOutput.readOnly = true; dom.splitMdOutput.readOnly = true;
  dom.editModeBtn.classList.remove('active');
  closeFindBar(); dom.tocPanel.classList.add('hidden');
  hide(dom.outputSection); hide(dom.progressSection); hide(dom.batchSection); hide(dom.metadataSection);
  show(dom.uploadSection); hideError(); switchTab('raw');
}

// ── Undo/Redo exports for keyboard shortcuts ──────────────────

export { undo, redo };
