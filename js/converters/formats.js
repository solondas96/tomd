// Non-PDF format converters

import { loadScript, fileToBase64, formatBytes } from '../utils.js';

// ── DOCX ──────────────────────────────────────────────────────

export async function convertDocx(file, onProgress) {
  await loadScript('https://cdn.jsdelivr.net/npm/mammoth@1/mammoth.browser.min.js', 'mammoth');
  onProgress(0.3, 'Parsing DOCX...');
  let buf;
  try { buf = await file.arrayBuffer(); } catch { throw new Error('Could not read file. It may have been moved or deleted.'); }
  const result = await mammoth.convertToHtml({ arrayBuffer: buf });
  onProgress(0.7, 'Converting to Markdown...');
  return { markdown: htmlToMarkdown(result.value), pageCount: 1, metadata: null };
}

// ── PPTX ──────────────────────────────────────────────────────

export async function convertPptx(file, onProgress) {
  await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js', 'JSZip');
  onProgress(0.2, 'Extracting slides...');
  let buf;
  try { buf = await file.arrayBuffer(); } catch { throw new Error('Could not read file. It may have been moved or deleted.'); }
  const zip = await JSZip.loadAsync(buf);
  const slides = [];
  let i = 1;
  while (zip.file(`ppt/slides/slide${i}.xml`)) {
    const xml = await zip.file(`ppt/slides/slide${i}.xml`).async('text');
    const texts = [...xml.matchAll(/<a:t>([^<]*)<\/a:t>/g)].map(m => m[1]).filter(Boolean);
    if (texts.length) slides.push(texts.join('\n'));
    i++;
    onProgress(0.2 + (0.7 * (i / (i + 5))), `Slide ${i - 1}...`);
  }
  const md = slides.map((s, idx) => `## Slide ${idx + 1}\n\n${s}`).join('\n\n---\n\n');
  return { markdown: md || '> No text found in slides.', pageCount: slides.length, metadata: null };
}

// ── XLSX / XLS ────────────────────────────────────────────────

export async function convertXlsx(file, onProgress) {
  await loadScript('https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js', 'XLSX');
  onProgress(0.3, 'Parsing spreadsheet...');
  let buf;
  try { buf = await file.arrayBuffer(); } catch { throw new Error('Could not read file. It may have been moved or deleted.'); }
  const wb = XLSX.read(buf, { type: 'array' });
  const parts = [];
  for (const name of wb.SheetNames) {
    const data = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1 });
    if (data.length) parts.push(`## ${name}\n\n${arrayToMdTable(data)}`);
  }
  onProgress(0.9, 'Done');
  return { markdown: parts.join('\n\n---\n\n') || '> Empty spreadsheet.', pageCount: wb.SheetNames.length, metadata: null };
}

// ── CSV / TSV ─────────────────────────────────────────────────

export async function convertCsv(file, onProgress) {
  onProgress(0.3, 'Parsing...');
  const text = await file.text();
  const sep = file.name.endsWith('.tsv') ? '\t' : ',';
  const rows = parseCsv(text, sep);
  if (!rows.length) return { markdown: '> Empty file.', pageCount: 1, metadata: null };
  return { markdown: arrayToMdTable(rows), pageCount: 1, metadata: null };
}

// ── HTML ──────────────────────────────────────────────────────

export async function convertHtml(file, onProgress) {
  await loadScript('https://cdn.jsdelivr.net/npm/turndown@7/dist/turndown.js', 'TurndownService');
  onProgress(0.3, 'Converting HTML...');
  const html = await file.text();
  const td = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced' });
  return { markdown: td.turndown(html), pageCount: 1, metadata: null };
}

// ── EPUB ──────────────────────────────────────────────────────

export async function convertEpub(file, onProgress) {
  await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js', 'JSZip');
  await loadScript('https://cdn.jsdelivr.net/npm/turndown@7/dist/turndown.js', 'TurndownService');
  onProgress(0.2, 'Extracting EPUB...');
  let buf;
  try { buf = await file.arrayBuffer(); } catch { throw new Error('Could not read file. It may have been moved or deleted.'); }
  const zip = await JSZip.loadAsync(buf);
  const htmlFiles = Object.keys(zip.files).filter(f => /\.(x?html?)$/i.test(f)).sort();
  const td = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced' });
  const chapters = [];
  for (let i = 0; i < htmlFiles.length; i++) {
    const raw = await zip.file(htmlFiles[i]).async('text');
    const body = raw.replace(/^[\s\S]*<body[^>]*>/i, '').replace(/<\/body>[\s\S]*$/i, '');
    const md = td.turndown(body).trim();
    if (md) chapters.push(md);
    onProgress(0.2 + (0.7 * (i / htmlFiles.length)), `Chapter ${i + 1}/${htmlFiles.length}`);
  }
  return { markdown: chapters.join('\n\n---\n\n') || '> No text content found in EPUB.', pageCount: chapters.length, metadata: null };
}

// ── RTF ───────────────────────────────────────────────────────

export async function convertRtf(file, onProgress) {
  onProgress(0.3, 'Parsing RTF...');
  const text = await file.text();
  const result = text
    .replace(/\{\\pict[\s\S]*?\}/g, '')
    .replace(/\\par\b/g, '\n')
    .replace(/\\tab\b/g, '\t')
    .replace(/\\\n/g, '\n')
    .replace(/\\[a-z]+(-?\d+)?\s?/gi, '')
    .replace(/[{}]/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return { markdown: result || '> Could not extract text from RTF.', pageCount: 1, metadata: null };
}

// ── Image (OCR) ───────────────────────────────────────────────

export async function convertImage(file, onProgress) {
  let worker;
  try {
    await loadScript('https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js', 'Tesseract');
    onProgress(0.2, 'Loading OCR engine...');
    worker = await Tesseract.createWorker('eng');
    onProgress(0.4, 'Recognizing text...');
    const { data: { text } } = await worker.recognize(file);
    await worker.terminate();
    const md = text.trim();
    if (!md) {
      return { markdown: `![Image](data:${file.type};base64,${await fileToBase64(file)})\n\n> No text detected in image.`, pageCount: 1, metadata: null };
    }
    return { markdown: md, pageCount: 1, metadata: { Type: 'Image OCR', 'File size': formatBytes(file.size) } };
  } catch (err) {
    if (worker) try { await worker.terminate(); } catch {}
    throw new Error('OCR failed: ' + (err.message || 'Could not process image'));
  }
}

// ── Plain text / Markdown ─────────────────────────────────────

export async function convertText(file, onProgress) {
  onProgress(0.5, 'Reading...');
  return { markdown: await file.text(), pageCount: 1, metadata: null };
}

// ── LaTeX ─────────────────────────────────────────────────────

export async function convertLatex(file, onProgress) {
  onProgress(0.3, 'Converting LaTeX...');
  let tex = await file.text();
  tex = tex.replace(/^[\s\S]*?\\begin\{document\}/, '').replace(/\\end\{document\}[\s\S]*$/, '');
  tex = tex
    .replace(/\\section\{([^}]+)\}/g, '## $1')
    .replace(/\\subsection\{([^}]+)\}/g, '### $1')
    .replace(/\\subsubsection\{([^}]+)\}/g, '#### $1')
    .replace(/\\textbf\{([^}]+)\}/g, '**$1**')
    .replace(/\\textit\{([^}]+)\}/g, '*$1*')
    .replace(/\\emph\{([^}]+)\}/g, '*$1*')
    .replace(/\\texttt\{([^}]+)\}/g, '`$1`')
    .replace(/\\href\{([^}]+)\}\{([^}]+)\}/g, '[$2]($1)')
    .replace(/\\url\{([^}]+)\}/g, '<$1>')
    .replace(/\\begin\{itemize\}|\\begin\{enumerate\}/g, '')
    .replace(/\\end\{itemize\}|\\end\{enumerate\}/g, '')
    .replace(/\\item\s*/g, '- ')
    .replace(/\\begin\{verbatim\}([\s\S]*?)\\end\{verbatim\}/g, '```\n$1\n```')
    .replace(/\\begin\{quote\}([\s\S]*?)\\end\{quote\}/g, (_, c) => c.trim().split('\n').map(l => '> ' + l).join('\n'))
    .replace(/\\\\/g, '\n')
    .replace(/\\[a-zA-Z]+\{([^}]*)\}/g, '$1')
    .replace(/\\[a-zA-Z]+/g, '')
    .replace(/[{}]/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return { markdown: tex || '> Could not parse LaTeX content.', pageCount: 1, metadata: null };
}

// ── XML ───────────────────────────────────────────────────────

export async function convertXml(file, onProgress) {
  onProgress(0.5, 'Formatting XML...');
  return { markdown: '```xml\n' + await file.text() + '\n```', pageCount: 1, metadata: null };
}

// ── JSON ──────────────────────────────────────────────────────

export async function convertJson(file, onProgress) {
  onProgress(0.5, 'Formatting JSON...');
  const text = await file.text();
  try {
    return { markdown: '```json\n' + JSON.stringify(JSON.parse(text), null, 2) + '\n```', pageCount: 1, metadata: null };
  } catch {
    return { markdown: '```json\n' + text + '\n```', pageCount: 1, metadata: null };
  }
}

// ── Shared helpers ────────────────────────────────────────────

export function htmlToMarkdown(html) {
  if (window.TurndownService) {
    return new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced' }).turndown(html);
  }
  return html
    .replace(/<h([1-6])[^>]*>(.*?)<\/h[1-6]>/gi, (_, l, t) => '#'.repeat(+l) + ' ' + t.replace(/<[^>]+>/g, ''))
    .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<strong>(.*?)<\/strong>/gi, '**$1**')
    .replace(/<em>(.*?)<\/em>/gi, '*$1*')
    .replace(/<a[^>]+href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)')
    .replace(/<li>(.*?)<\/li>/gi, '- $1\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function arrayToMdTable(rows) {
  if (!rows.length) return '';
  const maxCols = Math.max(...rows.map(r => r.length));
  const norm = rows.map(r => {
    const a = [...r];
    while (a.length < maxCols) a.push('');
    return a.map(c => String(c ?? '').replace(/\|/g, '\\|'));
  });
  const header = norm[0], sep = header.map(() => '---');
  return [
    '| ' + header.join(' | ') + ' |',
    '| ' + sep.join(' | ') + ' |',
    ...norm.slice(1).map(r => '| ' + r.join(' | ') + ' |'),
  ].join('\n');
}

export function parseCsv(text, sep = ',') {
  const rows = [];
  let row = [], cell = '', inQuote = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuote) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') inQuote = false;
      else cell += c;
    } else {
      if (c === '"') inQuote = true;
      else if (c === sep) { row.push(cell); cell = ''; }
      else if (c === '\n' || c === '\r') {
        if (c === '\r' && text[i + 1] === '\n') i++;
        row.push(cell);
        if (row.some(x => x)) rows.push(row);
        row = []; cell = '';
      } else cell += c;
    }
  }
  row.push(cell);
  if (row.some(x => x)) rows.push(row);
  return rows;
}
