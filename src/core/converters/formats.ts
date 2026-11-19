import JSZip from 'jszip';
import type { ConversionResult } from '../../types';
import { fileToBase64, formatBytes } from '../../lib/utils';
import { createOcrWorker } from '../../lib/vendor/ocr';
import { createTurndown } from '../html';
import { extractSlideParagraphs } from '../ooxml';
import type { ConversionContext, ConverterInput } from '../types';

// ── DOCX ──────────────────────────────────────────────────────

export async function convertDocx(file: ConverterInput, ctx: ConversionContext): Promise<ConversionResult> {
  const mammoth = await import('mammoth');
  ctx.onProgress({ fraction: 0.3, message: 'Parsing DOCX structure...' });
  const buf = await file.arrayBuffer();
  const result = await mammoth.convertToHtml({ arrayBuffer: buf });
  ctx.onProgress({ fraction: 0.7, message: 'Transforming to Markdown...' });
  const md = createTurndown().turndown(result.value);
  return { markdown: md, pageCount: 1, metadata: null };
}

// ── PPTX ──────────────────────────────────────────────────────

export async function convertPptx(file: ConverterInput, ctx: ConversionContext): Promise<ConversionResult> {
  ctx.onProgress({ fraction: 0.2, message: 'Extracting presentation slides...' });
  const buf = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(buf);
  const slides: string[] = [];
  let i = 1;

  while (zip.file(`ppt/slides/slide${i}.xml`)) {
    ctx.signal.throwIfAborted();
    const xml = await zip.file(`ppt/slides/slide${i}.xml`)!.async('text');
    try {
      const paragraphs = extractSlideParagraphs(xml);
      if (paragraphs.length) slides.push(paragraphs.join('\n'));
    } catch (error) {
      // One unreadable slide must not lose the deck; say so in the output instead.
      slides.push(`> ⚠ Slide ${i} could not be read: ${error instanceof Error ? error.message : 'unknown error'}`);
    }
    i++;
    ctx.onProgress({ fraction: 0.2 + 0.7 * (i / (i + 5)), message: `Slide ${i - 1}...` });
  }

  const md = slides.map((s, idx) => `## Slide ${idx + 1}\n\n${s}`).join('\n\n---\n\n');
  return { markdown: md || '> No text found in slides.', pageCount: Math.max(1, slides.length), metadata: null };
}

// ── XLSX / XLS ────────────────────────────────────────────────

export async function convertXlsx(file: ConverterInput, ctx: ConversionContext): Promise<ConversionResult> {
  const XLSX = await import('xlsx');
  ctx.onProgress({ fraction: 0.3, message: 'Parsing spreadsheet...' });
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array' });
  const parts: string[] = [];

  for (const name of wb.SheetNames) {
    const data = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[name], { header: 1 });
    if (data.length) {
      parts.push(`## ${name}\n\n${arrayToMdTable(data)}`);
    }
  }

  ctx.onProgress({ fraction: 0.9, message: 'Finalizing sheets...' });
  return {
    markdown: parts.join('\n\n---\n\n') || '> Empty spreadsheet.',
    pageCount: wb.SheetNames.length || 1,
    metadata: null,
  };
}

// ── CSV / TSV ─────────────────────────────────────────────────

export async function convertCsv(file: ConverterInput, ctx: ConversionContext): Promise<ConversionResult> {
  ctx.onProgress({ fraction: 0.3, message: 'Parsing CSV/TSV...' });
  const text = await file.text();
  const sep = file.name.endsWith('.tsv') ? '\t' : ',';
  const rows = parseCsv(text, sep);
  if (!rows.length) return { markdown: '> Empty file.', pageCount: 1, metadata: null };
  return { markdown: arrayToMdTable(rows), pageCount: 1, metadata: null };
}

// ── HTML ──────────────────────────────────────────────────────

export async function convertHtml(file: ConverterInput, ctx: ConversionContext): Promise<ConversionResult> {
  ctx.onProgress({ fraction: 0.3, message: 'Converting HTML document...' });
  const html = await file.text();
  const md = createTurndown().turndown(html);
  return { markdown: md, pageCount: 1, metadata: null };
}

// ── EPUB ──────────────────────────────────────────────────────

export async function convertEpub(file: ConverterInput, ctx: ConversionContext): Promise<ConversionResult> {
  ctx.onProgress({ fraction: 0.2, message: 'Extracting EPUB package...' });
  const buf = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(buf);
  const htmlFiles = Object.keys(zip.files)
    .filter((f) => /\.(x?html?)$/i.test(f))
    .sort();
  const td = createTurndown();
  const chapters: string[] = [];

  for (let i = 0; i < htmlFiles.length; i++) {
    ctx.signal.throwIfAborted();
    const fileRef = zip.file(htmlFiles[i]);
    if (fileRef) {
      const raw = await fileRef.async('text');
      const body = raw.replace(/^[\s\S]*<body[^>]*>/i, '').replace(/<\/body>[\s\S]*$/i, '') || raw;
      const md = td.turndown(body).trim();
      if (md) chapters.push(md);
    }
    ctx.onProgress({
      fraction: 0.2 + 0.7 * (i / htmlFiles.length),
      message: `Chapter ${i + 1}/${htmlFiles.length}...`,
    });
  }

  return {
    markdown: chapters.join('\n\n---\n\n') || '> No readable text found in EPUB.',
    pageCount: Math.max(1, chapters.length),
    metadata: null,
  };
}

// ── RTF ───────────────────────────────────────────────────────

export async function convertRtf(file: ConverterInput, ctx: ConversionContext): Promise<ConversionResult> {
  ctx.onProgress({ fraction: 0.3, message: 'Processing RTF text...' });
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

export async function convertImage(file: ConverterInput, ctx: ConversionContext): Promise<ConversionResult> {
  const lang = ctx.options.ocrLanguage || 'eng';
  let worker: Awaited<ReturnType<typeof createOcrWorker>> | null = null;
  ctx.signal.throwIfAborted();

  try {
    ctx.onProgress({ fraction: 0.2, message: 'Initializing OCR engine...' });
    worker = await createOcrWorker(lang);
    ctx.onProgress({ fraction: 0.4, message: 'Recognizing image text...' });
    const {
      data: { text },
    } = await worker.recognize(file);
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
      try {
        await worker.terminate();
      } catch {
        /* ignore */
      }
    }
    throw new Error('OCR recognition failed: ' + (err instanceof Error ? err.message : String(err)));
  }
}

// ── Plain Text / Markdown ─────────────────────────────────────

export async function convertText(file: ConverterInput, ctx: ConversionContext): Promise<ConversionResult> {
  ctx.onProgress({ fraction: 0.5, message: 'Reading file...' });
  return { markdown: await file.text(), pageCount: 1, metadata: null };
}

// ── LaTeX ─────────────────────────────────────────────────────

export async function convertLatex(file: ConverterInput, ctx: ConversionContext): Promise<ConversionResult> {
  ctx.onProgress({ fraction: 0.3, message: 'Parsing LaTeX document...' });
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
    .replace(/\\begin\{quote\}([\s\S]*?)\\end\{quote\}/g, (_, c) =>
      c
        .trim()
        .split('\n')
        .map((l: string) => '> ' + l)
        .join('\n'),
    )
    .replace(/\\\\/g, '\n')
    .replace(/\\[a-zA-Z]+\{([^}]*)\}/g, '$1')
    .replace(/\\[a-zA-Z]+/g, '')
    .replace(/[{}]/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return { markdown: tex || '> Could not parse LaTeX content.', pageCount: 1, metadata: null };
}

// ── XML & JSON ────────────────────────────────────────────────

export async function convertXml(file: ConverterInput, ctx: ConversionContext): Promise<ConversionResult> {
  ctx.onProgress({ fraction: 0.5, message: 'Formatting XML...' });
  return { markdown: '```xml\n' + (await file.text()) + '\n```', pageCount: 1, metadata: null };
}

export async function convertJson(file: ConverterInput, ctx: ConversionContext): Promise<ConversionResult> {
  ctx.onProgress({ fraction: 0.5, message: 'Formatting JSON...' });
  const text = await file.text();
  try {
    return {
      markdown: '```json\n' + JSON.stringify(JSON.parse(text), null, 2) + '\n```',
      pageCount: 1,
      metadata: null,
    };
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
