// PDF-to-Markdown conversion engine

import { HEADING_THRESHOLDS } from '../config.js';
import { loadScript } from '../utils.js';

export async function convertPdf(file, onProgress, opts) {
  let buffer;
  try { buffer = await file.arrayBuffer(); } catch { throw new Error('Could not read file. It may have been moved or deleted.'); }
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  const total = pdf.numPages;
  const from = Math.max(1, opts.pageFrom);
  const to = Math.min(total, opts.pageTo);
  const pages = [];
  let metadata = null;

  try { metadata = (await pdf.getMetadata())?.info || null; } catch {}

  for (let p = from; p <= to; p++) {
    try {
      const page = await pdf.getPage(p);
      const vp = page.getViewport({ scale: 1 });
      const content = await page.getTextContent();
      let md = pageToMarkdown(content, vp.height, opts);
      if (!md.trim() && opts.extractImages) md = await renderPageAsImage(page);
      if (!md.trim() && opts.ocr) md = await ocrPage(page);
      if (md.trim()) pages.push(md.trim());
    } catch (err) {
      pages.push(`> ⚠ Page ${p} failed: ${err.message || 'unknown error'}`);
    }
    onProgress((p - from + 1) / (to - from + 1), `Page ${p - from + 1} of ${to - from + 1}...`);
  }

  if (!pages.length) {
    return { markdown: '> No extractable text. Enable OCR in Settings for scanned PDFs.', pageCount: to - from + 1, metadata };
  }
  const sep = opts.pageSeparator === '---' ? '\n\n---\n\n' : opts.pageSeparator === 'blank' ? '\n\n' : '\n';
  return { markdown: pages.join(sep), pageCount: to - from + 1, metadata };
}

// ── Text extraction & assembly ────────────────────────────────

function pageToMarkdown(textContent, pageHeight, opts) {
  const { items, styles } = textContent;
  if (!items?.length) return '';
  const visible = items.filter(it => it.str?.trim());
  if (!visible.length) return '';

  const bodySize = modeSize(visible.map(getFontSize));
  let lines = groupByY(visible);
  lines.sort((a, b) => b.y - a.y);

  if (opts.stripDecorations) {
    const margin = pageHeight * 0.04;
    lines = lines.filter(g => g.y > margin && g.y < pageHeight - margin);
  }
  if (!lines.length) return '';
  return assembleMarkdown(lines, bodySize, styles, opts);
}

function assembleMarkdown(lines, bodySize, styles, opts) {
  const thr = HEADING_THRESHOLDS[opts.headingSensitivity] || 1.1;
  const blocks = [], para = [];
  let prevY = null, prevSize = bodySize, i = 0;

  const flush = () => { if (para.length) { blocks.push(formatParagraph(para)); para.length = 0; } };

  while (i < lines.length) {
    if (opts.tableDetection) {
      const tbl = tryExtractTable(lines, i);
      if (tbl) { flush(); blocks.push(tableToMarkdown(tbl.rows)); i += tbl.length; prevY = lines[i - 1]?.y ?? prevY; prevSize = bodySize; continue; }
    }
    const g = lines[i], text = lineText(g);
    if (!text) { i++; continue; }
    const sz = lineMaxFontSize(g);
    if (prevY !== null && prevY - g.y > prevSize * 1.35 * 1.65) flush();
    if (sz > bodySize * thr && text.length < 250) {
      flush();
      blocks.push('#'.repeat(headingLevel(sz, bodySize)) + ' ' + text);
    } else {
      para.push({ text, bold: lineIsBold(g, styles) });
    }
    prevY = g.y; prevSize = sz; i++;
  }
  flush();
  return blocks.join('\n\n');
}

// ── Font & line analysis ──────────────────────────────────────

function getFontSize(item) {
  const t = item.transform;
  return Math.sqrt(t[2] * t[2] + t[3] * t[3]);
}

function modeSize(sizes) {
  if (!sizes.length) return 12;
  const rounded = sizes.map(s => Math.round(s * 2) / 2);
  const freq = new Map();
  for (const s of rounded) freq.set(s, (freq.get(s) || 0) + 1);
  let best = rounded[0], bestCount = 0;
  for (const [s, c] of freq) {
    if (c > bestCount || (c === bestCount && s < best)) { best = s; bestCount = c; }
  }
  return best;
}

function groupByY(items) {
  const groups = [];
  for (const item of items) {
    const y = item.transform[5];
    let grp = groups.find(x => Math.abs(x.y - y) <= 1.5);
    if (!grp) { grp = { y, items: [] }; groups.push(grp); }
    grp.items.push(item);
  }
  for (const g of groups) g.items.sort((a, b) => a.transform[4] - b.transform[4]);
  return groups;
}

function lineText(group) {
  let r = '', lastX = null, lastW = 0;
  for (const item of group.items) {
    const x = item.transform[4];
    if (lastX !== null && x - (lastX + lastW) > 2) r += ' ';
    r += item.str; lastX = x; lastW = item.width || 0;
  }
  return r.replace(/\s+/g, ' ').trim();
}

function lineMaxFontSize(g) { return Math.max(...g.items.map(getFontSize)); }

function lineIsBold(group, styles) {
  return group.items.some(item => {
    const f = ((styles?.[item.fontName]?.fontFamily) || '').toLowerCase();
    const n = (item.fontName || '').toLowerCase();
    return f.includes('bold') || n.includes('bold');
  });
}

function headingLevel(sz, bodySize) {
  const r = sz / bodySize;
  return r >= 1.9 ? 1 : r >= 1.5 ? 2 : r >= 1.15 ? 3 : 4;
}

// ── Paragraph formatting ──────────────────────────────────────

const BULLET_RE = /^[\u2022\u25E6\u25AA\u25B8\u25BA\u2023\u25C9\u25CB\u25CF\u25B6\u25C6\u25C7\u25B7]\s*/;
const DASH_RE = /^[-\u2013\u2014]\s+(?=\S)/;

function normaliseLine(text) {
  if (BULLET_RE.test(text)) return '- ' + text.replace(BULLET_RE, '').trim();
  if (DASH_RE.test(text)) return '- ' + text.replace(DASH_RE, '').trim();
  return text;
}

function formatParagraph(lines) {
  const normalized = lines.map(({ text }) => normaliseLine(text));
  return normalized.every(t => /^[-\d]/.test(t)) ? normalized.join('\n') : normalized.join(' ').replace(/\s+/g, ' ').trim();
}

// ── Table detection ───────────────────────────────────────────

function clusterPositions(values, tol) {
  if (!values.length) return [];
  const sorted = [...values].sort((a, b) => a - b);
  const groups = [[sorted[0]]];
  for (let i = 1; i < sorted.length; i++) {
    const last = groups[groups.length - 1];
    if (sorted[i] - last[last.length - 1] <= tol) last.push(sorted[i]);
    else groups.push([sorted[i]]);
  }
  return groups.map(g => g[Math.floor(g.length / 2)]);
}

function tryExtractTable(lines, start) {
  if (start + 1 >= lines.length) return null;
  let end = start;
  while (end < lines.length && lines[end].items.length >= 2) end++;
  if (end - start < 2) return null;

  const candidates = lines.slice(start, end);
  const cols = clusterPositions(candidates.flatMap(l => l.items.map(it => it.transform[4])), 10);
  if (cols.length < 2) return null;

  const valid = candidates.every(line => {
    const matched = new Set(line.items.map(it => cols.findIndex(c => Math.abs(c - it.transform[4]) <= 12)).filter(i => i >= 0));
    return matched.size >= 2;
  });
  if (!valid) return null;

  return {
    rows: candidates.map(line => cols.map(col => line.items.filter(it => Math.abs(it.transform[4] - col) <= 12).map(it => it.str).join(' ').trim())),
    length: end - start,
  };
}

function tableToMarkdown(rows) {
  if (!rows?.length) return '';
  const n = rows[0].length;
  return [
    '| ' + rows[0].join(' | ') + ' |',
    '| ' + Array(n).fill('---').join(' | ') + ' |',
    ...rows.slice(1).map(r => '| ' + r.join(' | ') + ' |'),
  ].join('\n');
}

// ── Image/OCR fallbacks ───────────────────────────────────────

async function renderPageAsImage(page) {
  try {
    const vp = page.getViewport({ scale: 1.5 });
    const canvas = Object.assign(document.createElement('canvas'), { width: vp.width, height: vp.height });
    await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;
    return `![Page](${canvas.toDataURL('image/jpeg', 0.82)})`;
  } catch {
    return '';
  }
}

async function ocrPage(page) {
  try {
    await loadScript('https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js', 'Tesseract');
    const vp = page.getViewport({ scale: 2 });
    const canvas = Object.assign(document.createElement('canvas'), { width: vp.width, height: vp.height });
    await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;
    const worker = await Tesseract.createWorker('eng');
    const { data: { text } } = await worker.recognize(canvas);
    await worker.terminate();
    return text.trim();
  } catch (err) {
    console.warn('[OCR] Failed:', err.message);
    return '';
  }
}
