// File input, drop zone, single conversion, batch processing, merge

import { FORMAT_MAP, MAX_FILE_SIZE } from './config.js';
import { state, settings } from './state.js';
import { dom } from './dom.js';
import { wordCount, friendlyError, escHtml, slugify, loadScript, generateFrontmatter } from './utils.js';
import { convertFile, getFileExt, isSupported } from './converters/index.js';
import {
  toast, setProgress, show, hide, showError, hideError,
  updateStats, showMetadata, switchTab, buildTOC,
  updateSyntaxHighlight, updateUndoUI, saveToHistory, syncMarkdown, downloadBlob,
  renderSourcePdf,
} from './ui.js';

// ── Drop zone ─────────────────────────────────────────────────

export function initFileInput() {
  dom.dropZone.addEventListener('click', () => dom.fileInput.click());
  document.getElementById('chooseBtn').addEventListener('click', e => { e.stopPropagation(); dom.fileInput.click(); });
  dom.dropZone.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); dom.fileInput.click(); } });

  dom.fileInput.addEventListener('change', e => {
    const f = [...e.target.files];
    if (f.length) handleFiles(f);
    e.target.value = '';
  });

  dom.dropZone.addEventListener('dragover', e => {
    e.preventDefault(); dom.dropZone.classList.add('drag-over');
    const c = e.dataTransfer.items?.length || 0;
    if (c) { dom.dzDropCount.textContent = `${c} file${c > 1 ? 's' : ''}`; dom.dzDropCount.classList.remove('hidden'); }
  });

  dom.dropZone.addEventListener('dragleave', e => {
    if (!dom.dropZone.contains(e.relatedTarget)) { dom.dropZone.classList.remove('drag-over'); dom.dzDropCount.classList.add('hidden'); }
  });

  dom.dropZone.addEventListener('drop', async e => {
    e.preventDefault(); dom.dropZone.classList.remove('drag-over'); dom.dzDropCount.classList.add('hidden');
    const entries = [...(e.dataTransfer.items || [])].map(i => i.webkitGetAsEntry?.()).filter(Boolean);
    const hasFolder = entries.some(entry => entry.isDirectory);
    if (hasFolder) {
      const collected = await collectFilesFromEntries(entries);
      const supported = collected.filter(isSupported);
      if (!supported.length) { showError('No supported files found in folder.'); return; }
      handleFiles(supported);
      return;
    }
    const files = [...e.dataTransfer.files].filter(isSupported);
    if (!files.length) { showError('No supported files found.'); return; }
    handleFiles(files);
  });

  dom.abortBtn.addEventListener('click', () => { if (state.abortController) state.abortController.abort(); });
}

async function collectFilesFromEntries(entries) {
  const files = [];
  async function readEntry(entry) {
    if (entry.isFile) {
      const file = await new Promise((resolve, reject) => entry.file(resolve, reject));
      files.push(file);
    } else if (entry.isDirectory) {
      const reader = entry.createReader();
      let batch;
      do {
        batch = await new Promise((resolve, reject) => reader.readEntries(resolve, reject));
        for (const child of batch) await readEntry(child);
      } while (batch.length > 0);
    }
  }
  for (const entry of entries) await readEntry(entry);
  return files;
}

function handleFiles(files) {
  const valid = files.filter(isSupported);
  if (!valid.length) { showError('No supported file types found.'); return; }
  const oversized = valid.find(f => f.size > MAX_FILE_SIZE);
  if (oversized) { showError(`File too large: ${oversized.name} (${(oversized.size / 1048576).toFixed(0)} MB). Max 100 MB.`); return; }
  hideError();
  valid.length === 1 ? processSingleFile(valid[0]) : processBatch(valid);
}

// ── Single file ───────────────────────────────────────────────

export async function processSingleFile(file) {
  if (state.isProcessing) return;
  state.isProcessing = true;
  state.currentFilename = file.name;
  state.abortController = new AbortController();
  hideError(); show(dom.progressSection); hide(dom.uploadSection); hide(dom.batchSection); hide(dom.outputSection); hide(dom.metadataSection);
  setProgress(0, 'Reading file...');

  try {
    const ext = getFileExt(file), format = FORMAT_MAP[ext];
    if (format === 'pdf') renderSourcePdf(file);
    setProgress(10, `Processing ${ext.toUpperCase()}...`);
    const result = await convertFile(file, format, (p, msg) => {
      if (state.abortController.signal.aborted) throw new DOMException('Aborted', 'AbortError');
      setProgress(10 + Math.round(p * 85), msg);
    });

    state.currentMarkdown = result.markdown;
    if (settings.frontmatter && result.metadata) {
      state.currentMarkdown = generateFrontmatter(result.metadata, file.name) + state.currentMarkdown;
    }
    state.undoStack = []; state.redoStack = []; updateUndoUI();
    dom.markdownOutput.value = state.currentMarkdown;
    dom.splitMdOutput.value = state.currentMarkdown;
    updateStats(state.currentMarkdown, result.pageCount || null);
    if (result.metadata) showMetadata(result.metadata, file); else hide(dom.metadataSection);
    setProgress(100, 'Done!');
    setTimeout(() => { hide(dom.progressSection); show(dom.outputSection); switchTab('raw'); buildTOC(); updateSyntaxHighlight(); }, 300);
    saveToHistory({ filename: file.name, markdown: state.currentMarkdown, wordCount: wordCount(state.currentMarkdown), charCount: state.currentMarkdown.length, pageCount: result.pageCount || 1 });
    toast('Conversion complete!', 'success', 2500);
  } catch (err) {
    if (err.name === 'AbortError') { hide(dom.progressSection); show(dom.uploadSection); toast('Cancelled', 'info', 2000); }
    else { console.error('[toMD]', err); hide(dom.progressSection); show(dom.uploadSection); showError(friendlyError(err)); }
  }
  state.isProcessing = false; state.abortController = null;
}

// ── Batch ─────────────────────────────────────────────────────

async function processBatch(files) {
  if (state.isProcessing) return;
  state.isProcessing = true;
  state.batchResults = files.map(f => ({ filename: f.name, markdown: '', status: 'pending' }));
  hide(dom.uploadSection); hide(dom.outputSection); hide(dom.progressSection); hide(dom.metadataSection); show(dom.batchSection);
  dom.batchTitle.textContent = `Converting ${files.length} files...`;
  dom.downloadZipBtn.disabled = true; dom.mergeBatchBtn.disabled = true;
  renderBatchList();

  for (let i = 0; i < files.length; i++) {
    state.batchResults[i].status = 'processing'; renderBatchList();
    try {
      const r = await convertFile(files[i], FORMAT_MAP[getFileExt(files[i])], () => {});
      state.batchResults[i] = { ...state.batchResults[i], markdown: r.markdown, pageCount: r.pageCount, status: 'done' };
      saveToHistory({ filename: files[i].name, markdown: r.markdown, wordCount: wordCount(r.markdown), charCount: r.markdown.length, pageCount: r.pageCount || 1 });
    } catch (err) {
      state.batchResults[i].status = 'error';
      state.batchResults[i].error = friendlyError(err);
    }
    renderBatchList();
  }

  const done = state.batchResults.filter(r => r.status === 'done').length;
  dom.batchTitle.textContent = `Converted ${done}/${files.length} files`;
  dom.downloadZipBtn.disabled = done === 0;
  dom.mergeBatchBtn.disabled = done === 0;
  state.isProcessing = false;
  toast(`Batch: ${done}/${files.length} done`, 'success');
}

function renderBatchList() {
  const icons = { pending: '\u25CB', processing: '\u27F3', done: '\u2713', error: '\u2717' };
  dom.batchList.innerHTML = state.batchResults.map((r, i) =>
    `<li class="batch-item batch-${r.status}"><span class="batch-icon">${icons[r.status]}</span><span class="batch-name">${escHtml(r.filename)}</span><span class="batch-stat">${r.status === 'done' ? wordCount(r.markdown).toLocaleString() + ' words' : r.status === 'error' ? escHtml(r.error) : r.status}</span>${r.status === 'done' ? `<button class="history-btn" data-batch="${i}">View</button>` : ''}</li>`
  ).join('');
}

export function initBatch() {
  dom.batchList.addEventListener('click', e => {
    const btn = e.target.closest('[data-batch]');
    if (!btn) return;
    const r = state.batchResults[+btn.dataset.batch];
    if (!r || r.status !== 'done') return;
    state.currentMarkdown = r.markdown; state.currentFilename = r.filename;
    state.undoStack = []; state.redoStack = []; updateUndoUI();
    dom.markdownOutput.value = r.markdown; dom.splitMdOutput.value = r.markdown;
    updateStats(r.markdown, r.pageCount || 0);
    hide(dom.batchSection); show(dom.outputSection); switchTab('raw'); buildTOC(); updateSyntaxHighlight();
  });

  dom.downloadZipBtn.addEventListener('click', async () => {
    const done = state.batchResults.filter(r => r.status === 'done');
    if (!done.length) return;
    try {
      await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js', 'JSZip');
      const zip = new JSZip();
      done.forEach(r => zip.file(r.filename.replace(/\.[^.]+$/, '') + '.md', r.markdown));
      downloadBlob(await zip.generateAsync({ type: 'blob' }), 'converted.zip');
      toast('ZIP downloaded!', 'success');
    } catch (err) {
      toast('ZIP generation failed: ' + (err.message || 'unknown error'), 'error');
    }
  });

  dom.mergeBatchBtn.addEventListener('click', mergeBatch);
}

function mergeBatch() {
  const done = state.batchResults.filter(r => r.status === 'done');
  if (!done.length) return;
  const toc = done.map((r, i) => `${i + 1}. [${r.filename}](#${slugify(r.filename)})`).join('\n');
  const body = done.map(r => `## ${r.filename} {#${slugify(r.filename)}}\n\n${r.markdown}`).join('\n\n---\n\n');
  state.currentMarkdown = `# Merged Documents\n\n${toc}\n\n---\n\n${body}`;
  state.currentFilename = 'merged.md';
  state.undoStack = []; state.redoStack = []; updateUndoUI();
  dom.markdownOutput.value = state.currentMarkdown; dom.splitMdOutput.value = state.currentMarkdown;
  updateStats(state.currentMarkdown, done.length);
  hide(dom.batchSection); show(dom.outputSection); switchTab('raw'); buildTOC(); updateSyntaxHighlight();
  toast(`Merged ${done.length} files`, 'success');
}
