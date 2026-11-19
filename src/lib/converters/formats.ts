import TurndownService from 'turndown';
import JSZip from 'jszip';
import { ConversionResult, AppSettings } from '../../types';
import { loadScript, fileToBase64, formatBytes } from '../utils';

// Declare globals for dynamic libraries
declare global {
  interface Window {
    mammoth?: {
      convertToHtml: (options: { arrayBuffer: ArrayBuffer }) => Promise<{ value: string; messages: string[] }>;
    };
    XLSX?: {
      read: (data: ArrayBuffer, opts: { type: string }) => {
        SheetNames: string[];
        Sheets: Record<string, unknown>;
      };
      utils: {
        sheet_to_json: (sheet: unknown, opts: { header: number }) => unknown[][];
      };
    };
    Tesseract?: {
      createWorker: (lang: string) => Promise<{
        recognize: (img: File | HTMLCanvasElement) => Promise<{ data: { text: string } }>;
        terminate: () => Promise<void>;
      }>;
    };
  }
}

// ── GFM table rule for Turndown ───────────────────────────────

export function addTableRule(td: TurndownService): TurndownService {
  td.addRule('tableCell', {
    filter: ['th', 'td'],
    replacement(content) {
      return ' ' + content.replace(/\|/g, '\\|').replace(/\n/g, ' ').trim() + ' |';
    },
  });
  td.addRule('tableRow', {
    filter: 'tr',
    replacement(content) {
      return '|' + content.trim() + '\n';
    },
  });
  td.addRule('table', {
    filter: 'table',
    replacement(content) {
      const rows = content.trim().split('\n').filter(Boolean);
      if (!rows.length) return content;
      const colCount = (rows[0].match(/\|/g) || []).length - 1;
      const sep = '|' + ' --- |'.repeat(Math.max(1, colCount));
      return '\n\n' + rows[0] + '\n' + sep + '\n' + rows.slice(1).join('\n') + '\n\n';
    },
  });
  td.addRule('thead', { filter: ['thead', 'tbody', 'tfoot'], replacement: (c) => c });
  return td;
}

export function createTurndown(): TurndownService {
  const td = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
    hr: '---',
  });
  return addTableRule(td);
}

// ── DOCX ──────────────────────────────────────────────────────

export async function convertDocx(file: File, onProgress: (pct: number, msg: string) => void): Promise<ConversionResult> {
  await loadScript('https://cdn.jsdelivr.net/npm/mammoth@1.8.0/mammoth.browser.min.js', 'mammoth');
  onProgress(0.3, 'Parsing DOCX structure...');
  const buf = await file.arrayBuffer();
  if (!window.mammoth) throw new Error('Mammoth library failed to load');
  const result = await window.mammoth.convertToHtml({ arrayBuffer: buf });
  onProgress(0.7, 'Transforming to Markdown...');
  const md = createTurndown().turndown(result.value);
  return { markdown: md, pageCount: 1, metadata: null };
}

// ── PPTX ──────────────────────────────────────────────────────

export async function convertPptx(file: File, onProgress: (pct: number, msg: string) => void): Promise<ConversionResult> {
  onProgress(0.2, 'Extracting presentation slides...');
  const buf = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(buf);
  const slides: string[] = [];
  let i = 1;

  while (zip.file(`ppt/slides/slide${i}.xml`)) {
    const fileRef = zip.file(`ppt/slides/slide${i}.xml`);
    if (fileRef) {
      const xml = await fileRef.async('text');
      const texts = [...xml.matchAll(/<a:t>([^<]*)<\/a:t>/g)].map((m) => m[1]).filter(Boolean);
      if (texts.length) slides.push(texts.join('\n'));
    }
    i++;
    onProgress(0.2 + 0.7 * (i / (i + 5)), `Slide ${i - 1}...`);
  }

  const md = slides.map((s, idx) => `## Slide ${idx + 1}\n\n${s}`).join('\n\n---\n\n');
  return { markdown: md || '> No text found in slides.', pageCount: Math.max(1, slides.length), metadata: null };
}

// ── XLSX / XLS ────────────────────────────────────────────────

export async function convertXlsx(file: File, onProgress: (pct: number, msg: string) => void): Promise<ConversionResult> {
  await loadScript('https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js', 'XLSX');
  onProgress(0.3, 'Parsing spreadsheet...');
  const buf = await file.arrayBuffer();
  if (!window.XLSX) throw new Error('SheetJS library failed to load');
  const wb = window.XLSX.read(buf, { type: 'array' });
  const parts: string[] = [];

  for (const name of wb.SheetNames) {
    const data = window.XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1 });
    if (data.length) {
      parts.push(`## ${name}\n\n${arrayToMdTable(data)}`);
    }
  }

  onProgress(0.9, 'Finalizing sheets...');
  return {
    markdown: parts.join('\n\n---\n\n') || '> Empty spreadsheet.',
    pageCount: wb.SheetNames.length || 1,
    metadata: null,
  };
}

// ── CSV / TSV ─────────────────────────────────────────────────

export async function convertCsv(file: File, onProgress: (pct: number, msg: string) => void): Promise<ConversionResult> {
  onProgress(0.3, 'Parsing CSV/TSV...');
  const text = await file.text();
  const sep = file.name.endsWith('.tsv') ? '\t' : ',';
  const rows = parseCsv(text, sep);
  if (!rows.length) return { markdown: '> Empty file.', pageCount: 1, metadata: null };
  return { markdown: arrayToMdTable(rows), pageCount: 1, metadata: null };
}

// ── HTML ──────────────────────────────────────────────────────

export async function convertHtml(file: File, onProgress: (pct: number, msg: string) => void): Promise<ConversionResult> {
  onProgress(0.3, 'Converting HTML document...');
  const html = await file.text();
  const md = createTurndown().turndown(html);
  return { markdown: md, pageCount: 1, metadata: null };
}

// ── EPUB ──────────────────────────────────────────────────────

export async function convertEpub(file: File, onProgress: (pct: number, msg: string) => void): Promise<ConversionResult> {
  onProgress(0.2, 'Extracting EPUB package...');
  const buf = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(buf);
  const htmlFiles = Object.keys(zip.files).filter((f) => /\.(x?html?)$/i.test(f)).sort();
  const td = createTurndown();
  const chapters: string[] = [];

  for (let i = 0; i < htmlFiles.length; i++) {
    const fileRef = zip.file(htmlFiles[i]);
    if (fileRef) {
      const raw = await fileRef.async('text');
      const body = raw.replace(/^[\s\S]*<body[^>]*>/i, '').replace(/<\/body>[\s\S]*$/i, '') || raw;
      const md = td.turndown(body).trim();
      if (md) chapters.push(md);
    }
    onProgress(0.2 + 0.7 * (i / htmlFiles.length), `Chapter ${i + 1}/${htmlFiles.length}...`);
  }

  return {
    markdown: chapters.join('\n\n---\n\n') || '> No readable text found in EPUB.',
    pageCount: Math.max(1, chapters.length),
    metadata: null,
  };
}

// ── RTF ───────────────────────────────────────────────────────

export async function convertRtf(file: File, onProgress: (pct: number, msg: string) => void): Promise<ConversionResult> {
  onProgress(0.3, 'Processing RTF text...');
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

export async function convertImage(
  file: File,
  onProgress: (pct: number, msg: string) => void,
  settings: AppSettings
): Promise<ConversionResult> {
  const lang = settings.ocrLanguage || 'eng';
  let worker: Awaited<ReturnType<NonNullable<typeof window.Tesseract>['createWorker']>> | null = null;

  try {
    await loadScript('https://cdn.jsdelivr.net/npm/tesseract.js@5.1.0/dist/tesseract.min.js', 'Tesseract');
    if (!window.Tesseract) throw new Error('Tesseract OCR engine failed to load');
    onProgress(0.2, 'Initializing OCR engine...');
    worker = await window.Tesseract.createWorker(lang);
    onProgress(0.4, 'Recognizing image text...');
    const { data: { text } } = await worker.recognize(file);
    await worker.terminate();

    const md = text.trim();
    if (!md) {
      const b64 = await fileToBase64(file);
      return {
        markdown: `![Image](data:${file.type};base64,${b64})\n\n> No text detected in image.`,
        pageCount: 1,
        metadata: null,
      };
    }

    return {
      markdown: md,
      pageCount: 1,
      metadata: { Type: 'Image OCR', 'File size': formatBytes(file.size) },
    };
  } catch (err) {
    if (worker) {
      try { await worker.terminate(); } catch { /* ignore */ }
    }
    throw new Error('OCR recognition failed: ' + (err instanceof Error ? err.message : String(err)));
  }
}

// ── Plain Text / Markdown ─────────────────────────────────────

export async function convertText(file: File, onProgress: (pct: number, msg: string) => void): Promise<ConversionResult> {
  onProgress(0.5, 'Reading file...');
  return { markdown: await file.text(), pageCount: 1, metadata: null };
}

// ── LaTeX ─────────────────────────────────────────────────────

export async function convertLatex(file: File, onProgress: (pct: number, msg: string) => void): Promise<ConversionResult> {
  onProgress(0.3, 'Parsing LaTeX document...');
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
    .replace(/\\begin\{quote\}([\s\S]*?)\\end\{quote\}/g, (_, c) => c.trim().split('\n').map((l: string) => '> ' + l).join('\n'))
    .replace(/\\\\/g, '\n')
    .replace(/\\[a-zA-Z]+\{([^}]*)\}/g, '$1')
    .replace(/\\[a-zA-Z]+/g, '')
    .replace(/[{}]/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return { markdown: tex || '> Could not parse LaTeX content.', pageCount: 1, metadata: null };
}

// ── XML & JSON ────────────────────────────────────────────────

export async function convertXml(file: File, onProgress: (pct: number, msg: string) => void): Promise<ConversionResult> {
  onProgress(0.5, 'Formatting XML...');
  return { markdown: '```xml\n' + (await file.text()) + '\n```', pageCount: 1, metadata: null };
}

export async function convertJson(file: File, onProgress: (pct: number, msg: string) => void): Promise<ConversionResult> {
  onProgress(0.5, 'Formatting JSON...');
  const text = await file.text();
  try {
    return { markdown: '```json\n' + JSON.stringify(JSON.parse(text), null, 2) + '\n```', pageCount: 1, metadata: null };
  } catch {
    return { markdown: '```json\n' + text + '\n```', pageCount: 1, metadata: null };
  }
}

// ── Shared Table & CSV Helpers ────────────────────────────────

export function arrayToMdTable(rows: unknown[][]): string {
  if (!rows.length) return '';
  const maxCols = Math.max(...rows.map((r) => r.length));
  const norm = rows.map((r) => {
    const a = [...r];
    while (a.length < maxCols) a.push('');
    return a.map((c) => String(c ?? '').replace(/\|/g, '\\|'));
  });
  const header = norm[0];
  const sep = header.map(() => '---');
  return [
    '| ' + header.join(' | ') + ' |',
    '| ' + sep.join(' | ') + ' |',
    ...norm.slice(1).map((r) => '| ' + r.join(' | ') + ' |'),
  ].join('\n');
}

export function parseCsv(text: string, sep = ','): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuote = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuote) {
      if (c === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') {
        inQuote = false;
      } else {
        cell += c;
      }
    } else {
      if (c === '"') {
        inQuote = true;
      } else if (c === sep) {
        row.push(cell);
        cell = '';
      } else if (c === '\n' || c === '\r') {
        if (c === '\r' && text[i + 1] === '\n') i++;
        row.push(cell);
        if (row.some((x) => x.trim())) rows.push(row);
        row = [];
        cell = '';
      } else {
        cell += c;
      }
    }
  }

  row.push(cell);
  if (row.some((x) => x.trim())) rows.push(row);
  return rows;
}

// ── DOCX Generator ────────────────────────────────────────────

export async function createDocxBlob(html: string): Promise<Blob> {
  const zip = new JSZip();
  const div = document.createElement('div');
  div.innerHTML = html;
  const paragraphs: string[] = [];

  const escXml = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  for (const node of Array.from(div.childNodes)) {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement;
      const tag = el.tagName.toLowerCase();
      const text = (el.textContent || '').trim();
      if (!text && !['table', 'ul', 'ol'].includes(tag)) continue;

      if (/^h[1-6]$/.test(tag)) {
        const level = parseInt(tag[1], 10);
        const sz = [52, 40, 32, 28, 26, 24][level - 1];
        paragraphs.push(
          `<w:p><w:pPr><w:pStyle w:val="Heading${level}"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="${sz}"/></w:rPr><w:t xml:space="preserve">${escXml(text)}</w:t></w:r></w:p>`
        );
      } else if (tag === 'li' || tag === 'ul' || tag === 'ol') {
        const items = tag === 'li' ? [el] : Array.from(el.querySelectorAll('li'));
        for (const li of items) {
          paragraphs.push(
            `<w:p><w:r><w:t xml:space="preserve">\u2022 ${escXml(li.textContent?.trim() || '')}</w:t></w:r></w:p>`
          );
        }
      } else {
        paragraphs.push(`<w:p><w:r><w:t xml:space="preserve">${escXml(text)}</w:t></w:r></w:p>`);
      }
    }
  }

  const docXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${paragraphs.join('')}<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/></w:sectPr></w:body></w:document>`;
  const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`;
  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`;
  const wordRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>`;

  zip.file('[Content_Types].xml', contentTypes);
  zip.file('_rels/.rels', rels);
  zip.file('word/document.xml', docXml);
  zip.file('word/_rels/document.xml.rels', wordRels);

  return await zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
}
