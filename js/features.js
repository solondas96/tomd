// Clipboard paste, URL import, YAML frontmatter generation

import { dom } from './dom.js';
import { state, settings } from './state.js';
import { loadScript, wordCount, generateFrontmatter } from './utils.js';
import { processSingleFile } from './file-handler.js';
import {
  toast, setProgress, show, hide, showError, hideError,
  updateStats, showMetadata, switchTab, buildTOC,
  updateSyntaxHighlight, updateUndoUI, saveToHistory,
} from './ui.js';

// ── Clipboard paste ───────────────────────────────────────────

export function initClipboard() {
  document.addEventListener('paste', async e => {
    if (state.isProcessing || ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
    const items = [...(e.clipboardData?.items || [])];

    const imgItem = items.find(i => i.type.startsWith('image/'));
    if (imgItem) {
      e.preventDefault();
      const blob = imgItem.getAsFile();
      if (!blob) return;
      toast('Processing pasted image...', 'info', 2000);
      await processSingleFile(new File([blob], 'pasted-image.png', { type: blob.type }));
      return;
    }

    const htmlData = e.clipboardData?.getData('text/html');
    if (htmlData && htmlData.length > 50) {
      e.preventDefault();
      toast('Converting pasted HTML...', 'info', 2000);
      await processSingleFile(new File([htmlData], 'pasted-content.html', { type: 'text/html' }));
    }
  });
}

// ── URL import ────────────────────────────────────────────────

export function initUrlImport() {
  dom.urlFetchBtn.addEventListener('click', fetchUrl);
  dom.urlInput.addEventListener('keydown', e => { if (e.key === 'Enter') fetchUrl(); });
}

async function fetchUrl() {
  const url = dom.urlInput.value.trim();
  if (!url) return;
  try { new URL(url); } catch { showError('Invalid URL.'); return; }
  if (state.isProcessing) return;

  state.isProcessing = true;
  dom.urlFetchBtn.disabled = true;
  hideError(); show(dom.progressSection); hide(dom.uploadSection);
  setProgress(20, 'Fetching page...');

  const timeout = AbortSignal.timeout(30000);
  try {
    let html = null;
    const proxies = [
      `https://corsproxy.io/?${encodeURIComponent(url)}`,
      `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
      `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
    ];
    for (const proxyUrl of proxies) {
      try { const r = await fetch(proxyUrl, { signal: timeout }); if (r.ok) { html = await r.text(); break; } } catch (e) { if (e.name === 'TimeoutError') break; /* try next */ }
    }
    if (!html) throw new Error('Could not fetch URL. The site may block external access or the request timed out.');

    setProgress(50, 'Converting to Markdown...');
    await loadScript('https://cdn.jsdelivr.net/npm/turndown@7/dist/turndown.js', 'TurndownService');
    const td = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced' });
    const cleaned = html.replace(/<(script|style|nav|header|footer)[^>]*>[\s\S]*?<\/\1>/gi, '');
    const body = cleaned.replace(/^[\s\S]*<body[^>]*>/i, '').replace(/<\/body>[\s\S]*$/i, '') || cleaned;
    let md = td.turndown(body);

    state.currentFilename = new URL(url).hostname + '.md';
    const meta = { Title: extractHtmlTitle(html), Source: url };
    if (settings.frontmatter) md = generateFrontmatter(meta, state.currentFilename) + md;

    state.currentMarkdown = md;
    state.undoStack = []; state.redoStack = []; updateUndoUI();
    dom.markdownOutput.value = state.currentMarkdown;
    dom.splitMdOutput.value = state.currentMarkdown;
    updateStats(state.currentMarkdown, null);
    showMetadata(meta, { size: html.length, name: state.currentFilename });
    setProgress(100, 'Done!');
    setTimeout(() => { hide(dom.progressSection); show(dom.outputSection); switchTab('raw'); buildTOC(); updateSyntaxHighlight(); }, 300);
    saveToHistory({ filename: state.currentFilename, markdown: state.currentMarkdown, wordCount: wordCount(state.currentMarkdown), charCount: state.currentMarkdown.length, pageCount: 1 });
    toast('URL converted!', 'success', 2500);
  } catch (err) {
    console.error('[toMD URL]', err);
    hide(dom.progressSection); show(dom.uploadSection);
    showError('Failed to fetch URL: ' + (err.message || 'Network error'));
  }
  state.isProcessing = false; dom.urlFetchBtn.disabled = false;
}

function extractHtmlTitle(html) {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return m ? m[1].trim().replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>') : '';
}

// ── YAML frontmatter ──────────────────────────────────────────

export { generateFrontmatter } from './utils.js';
