import { HEADING_THRESHOLDS } from '../../config';
import type { ConversionOptions, ConversionResult, ConversionMetadata } from '../../types';
import type { PDFPageProxy } from 'pdfjs-dist';
import type { TextContent, TextItem } from 'pdfjs-dist/types/src/display/api';
import { require2dContext } from '../../lib/utils';
import { createOcrSession, type OcrSession } from '../../lib/vendor/ocr-session';
import { loadPdfJs } from '../../lib/vendor/pdfjs';
import { isListItemText } from '../listItem';
import { classifyFont, PLAIN_STYLE } from '../pdf/fontStyle';
import { renderFragments } from '../pdf/inline';
import { buildLines } from '../pdf/lines';
import type { FontStyle, Fragment, Line, TextRun } from '../pdf/types';
import type { ConversionContext, ConverterInput } from '../types';

/**
 * Converts a PDF to Markdown using PDF.js text layout analysis (optionally OCR).
 *
 * Params: file - the PDF; ctx - options, abort signal and progress callback.
 * Returns: Markdown, page count and document metadata.
 * Throws: Error for unreadable or invalid PDFs; the signal's `AbortError` when cancelled.
 */
export async function convertPdf(file: ConverterInput, ctx: ConversionContext): Promise<ConversionResult> {
  const opts = ctx.options;
  let buffer: ArrayBuffer;
  try {
    buffer = await file.arrayBuffer();
  } catch {
    throw new Error('Could not read file. It may have been moved or deleted.');
  }

  const pdfjs = await loadPdfJs();

  const pdf = await pdfjs.getDocument({ data: buffer }).promise;
  const total = pdf.numPages;
  const from = Math.max(1, opts.pageFrom ?? 1);
  const to = Math.min(total, opts.pageTo ?? total);
  const pages: string[] = [];
  let metadata: ConversionMetadata | null = null;

  try {
    metadata = ((await pdf.getMetadata())?.info as ConversionMetadata | undefined) || null;
  } catch (err) {
    console.warn('[toMD] Could not read PDF metadata:', err);
  }

  const pagesToProcess = Math.max(1, to - from + 1);

  let ocrSession: OcrSession | null = null;
  try {
    for (let p = from; p <= to; p++) {
      // Outside the try below, so cancellation is not mistaken for a failed page.
      ctx.signal.throwIfAborted();
      try {
        const page = await pdf.getPage(p);
        const vp = page.getViewport({ scale: 1 });
        const content = await page.getTextContent();
        await page.getOperatorList(); // loads the fonts, so their real names (Arial-Bold...) become readable
        let md = pageToMarkdown(runsFromTextContent(content), fontStylesForPage(page, content), vp.height, opts);

        if (!md.trim() && opts.extractImages) {
          md = await renderPageAsImage(page);
        }
        if (!md.trim() && opts.ocr) {
          // One OCR engine per document: starting it is slow, and it must be released when done.
          ocrSession ??= await createOcrSession(opts.ocrLanguage || 'eng', ctx.signal);
          md = await ocrPage(page, ocrSession);
        }

        if (md.trim()) {
          pages.push(md.trim());
        }
      } catch (err) {
        if (ctx.signal.aborted) throw err; // cancelled mid-page: stop, do not record a page failure
        pages.push(`> ⚠ Page ${p} failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }

      const currentProcessed = p - from + 1;
      ctx.onProgress({
        fraction: currentProcessed / pagesToProcess,
        message: `Processed page ${currentProcessed} of ${pagesToProcess}...`,
      });
    }
  } finally {
    await ocrSession?.dispose();
  }

  if (!pages.length) {
    return {
      markdown: '> No extractable text found. Enable OCR in Settings for scanned documents.',
      pageCount: pagesToProcess,
      metadata,
    };
  }

  const sep = opts.pageSeparator === '---' ? '\n\n---\n\n' : opts.pageSeparator === 'blank' ? '\n\n' : '\n';
  return {
    markdown: pages.join(sep),
    pageCount: pagesToProcess,
    metadata,
  };
}

// ── Text layout analysis ──────────────────────────────────────

/** Reads real font names (only available after the operator list is evaluated) into bold/italic flags. */
function fontStylesForPage(page: PDFPageProxy, textContent: TextContent): (fontName: string) => FontStyle {
  const styles = new Map<string, FontStyle>();
  for (const fontId of Object.keys(textContent.styles)) {
    if (!page.commonObjs.has(fontId)) continue;
    const font = page.commonObjs.get(fontId) as { name?: string } | undefined;
    if (font?.name) styles.set(fontId, classifyFont(font.name));
  }
  return (fontName) => styles.get(fontName) ?? PLAIN_STYLE;
}

function runsFromTextContent(textContent: TextContent): TextRun[] {
  const runs: TextRun[] = [];
  for (const item of textContent.items) {
    if (!('str' in item)) continue;
    runs.push({
      text: item.str,
      x: item.transform[4],
      y: item.transform[5],
      width: item.width,
      fontSize: getFontSize(item),
      fontName: item.fontName,
    });
  }
  return runs;
}

function pageToMarkdown(
  runs: TextRun[],
  styleOf: (fontName: string) => FontStyle,
  pageHeight: number,
  opts: ConversionOptions,
): string {
  const visible = runs.filter((run) => run.text.trim().length > 0);
  if (!visible.length) return '';

  const columns = detectColumns(visible);
  if (columns) {
    const left = processRuns(
      runs.filter((run) => columns.left.includes(run)),
      styleOf,
      pageHeight,
      opts,
    );
    const right = processRuns(
      runs.filter((run) => columns.right.includes(run)),
      styleOf,
      pageHeight,
      opts,
    );
    return [left, right].filter(Boolean).join('\n\n');
  }

  return processRuns(runs, styleOf, pageHeight, opts);
}

function processRuns(
  runs: TextRun[],
  styleOf: (fontName: string) => FontStyle,
  pageHeight: number,
  opts: ConversionOptions,
): string {
  const visible = runs.filter((run) => run.text.trim().length > 0);
  if (!visible.length) return '';
  const bodySize = modeSize(visible.map((run) => run.fontSize));
  let lines = buildLines(runs, styleOf);

  if (opts.stripDecorations) {
    const margin = pageHeight * 0.04;
    lines = lines.filter((line) => line.y > margin && line.y < pageHeight - margin);
  }

  if (!lines.length) return '';
  return assembleMarkdown(lines, bodySize, opts);
}

function detectColumns(runs: TextRun[]): { left: TextRun[]; right: TextRun[] } | null {
  let minX = Infinity;
  let maxX = -Infinity;
  for (const run of runs) {
    minX = Math.min(minX, run.x);
    maxX = Math.max(maxX, run.x);
  }
  const pageWidth = maxX - minX;
  if (pageWidth < 200) return null;

  const midX = minX + pageWidth / 2;
  const gapMargin = pageWidth * 0.08;
  const left = runs.filter((run) => run.x < midX - gapMargin);
  const right = runs.filter((run) => run.x > midX + gapMargin);

  if (left.length < 10 || right.length < 10) return null;

  let leftMaxX = -Infinity;
  for (const run of left) leftMaxX = Math.max(leftMaxX, run.x + run.width);
  let rightMinX = Infinity;
  for (const run of right) rightMinX = Math.min(rightMinX, run.x);
  if (rightMinX - leftMaxX < pageWidth * 0.05) return null;

  return { left, right };
}

function assembleMarkdown(lines: Line[], bodySize: number, opts: ConversionOptions): string {
  const thr = HEADING_THRESHOLDS[opts.headingSensitivity || 'medium'] || 1.1;
  const blocks: string[] = [];
  const para: Line[] = [];
  let prevY: number | null = null;
  let prevSize = bodySize;
  let i = 0;

  const flush = () => {
    if (para.length) {
      blocks.push(formatParagraph(para));
      para.length = 0;
    }
  };

  while (i < lines.length) {
    if (opts.tableDetection) {
      const tbl = tryExtractTable(lines, i);
      if (tbl) {
        flush();
        blocks.push(tableToMarkdown(tbl.rows));
        i += tbl.length;
        prevY = lines[i - 1]?.y ?? prevY;
        prevSize = bodySize;
        continue;
      }
    }

    const line = lines[i];
    const plain = renderFragments(lineFragments(line), false);
    if (!plain) {
      i++;
      continue;
    }

    const sz = line.fontSize;
    if (prevY !== null && prevY - line.y > prevSize * 1.35 * 1.65) {
      flush();
    }

    if (sz > bodySize * thr && plain.length < 250) {
      flush();
      blocks.push('#'.repeat(headingLevel(sz, bodySize)) + ' ' + plain);
    } else {
      para.push(line);
    }

    prevY = line.y;
    prevSize = sz;
    i++;
  }

  flush();
  return blocks.join('\n\n');
}

// ── Font & Line Grouping ──────────────────────────────────────

function getFontSize(item: TextItem): number {
  const t = item.transform;
  return Math.sqrt(t[2] * t[2] + t[3] * t[3]);
}

function modeSize(sizes: number[]): number {
  if (!sizes.length) return 12;
  const rounded = sizes.map((s) => Math.round(s * 2) / 2);
  const freq = new Map<number, number>();
  for (const s of rounded) {
    freq.set(s, (freq.get(s) || 0) + 1);
  }
  let best = rounded[0];
  let bestCount = 0;
  for (const [s, c] of freq) {
    if (c > bestCount || (c === bestCount && s < best)) {
      best = s;
      bestCount = c;
    }
  }
  return best;
}

/** All fragments of a line, with a plain space between its spans. */
function lineFragments(line: Line): Fragment[] {
  return line.spans.flatMap((span, index) =>
    index === 0 ? span.fragments : [{ text: ' ', style: PLAIN_STYLE }, ...span.fragments],
  );
}

function headingLevel(sz: number, bodySize: number): number {
  const r = sz / bodySize;
  return r >= 1.9 ? 1 : r >= 1.5 ? 2 : r >= 1.15 ? 3 : 4;
}

// ── Paragraphs & Tables ───────────────────────────────────────

const BULLET_RE = /^[\u2022\u25E6\u25AA\u25B8\u25BA\u2023\u25C9\u25CB\u25CF\u25B6\u25C6\u25C7\u25B7]\s*/;
const DASH_RE = /^[-\u2013\u2014]\s+(?=\S)/;

function normaliseLine(text: string): string {
  if (BULLET_RE.test(text)) return '- ' + text.replace(BULLET_RE, '').trim();
  if (DASH_RE.test(text)) return '- ' + text.replace(DASH_RE, '').trim();
  return text;
}

function formatParagraph(lines: Line[]): string {
  const normalized = lines.map((line) => normaliseLine(renderFragments(lineFragments(line), false)));
  if (normalized.every(isListItemText)) return normalized.join('\n');
  // Render all lines together so emphasis that continues across a line break is wrapped once.
  const joined = lines.flatMap((line, index) =>
    index === 0 ? lineFragments(line) : [{ text: ' ', style: PLAIN_STYLE }, ...lineFragments(line)],
  );
  return renderFragments(joined);
}

function clusterPositions(values: number[], tol: number): number[] {
  if (!values.length) return [];
  const sorted = [...values].sort((a, b) => a - b);
  const groups: number[][] = [[sorted[0]]];
  for (let i = 1; i < sorted.length; i++) {
    const last = groups[groups.length - 1];
    if (sorted[i] - last[last.length - 1] <= tol) last.push(sorted[i]);
    else groups.push([sorted[i]]);
  }
  return groups.map((g) => g[Math.floor(g.length / 2)]);
}

function tryExtractTable(lines: Line[], start: number): { rows: string[][]; length: number } | null {
  if (start + 1 >= lines.length) return null;
  let end = start;
  while (end < lines.length && lines[end].spans.length >= 2) end++;
  if (end - start < 2) return null;

  const candidates = lines.slice(start, end);
  const cols = clusterPositions(
    candidates.flatMap((l) => l.spans.map((span) => span.x)),
    10,
  );
  if (cols.length < 2) return null;

  const valid = candidates.every((line) => {
    const matched = new Set(
      line.spans.map((span) => cols.findIndex((c) => Math.abs(c - span.x) <= 12)).filter((i) => i >= 0),
    );
    return matched.size >= 2;
  });
  if (!valid) return null;

  return {
    rows: candidates.map((line) =>
      cols.map((col) =>
        line.spans
          .filter((span) => Math.abs(span.x - col) <= 12)
          .map((span) => renderFragments(span.fragments, false))
          .join(' ')
          .trim(),
      ),
    ),
    length: end - start,
  };
}

function tableToMarkdown(rows: string[][]): string {
  if (!rows?.length) return '';
  const n = rows[0].length;
  return [
    '| ' + rows[0].join(' | ') + ' |',
    '| ' + Array(n).fill('---').join(' | ') + ' |',
    ...rows.slice(1).map((r) => '| ' + r.join(' | ') + ' |'),
  ].join('\n');
}

// ── Image / OCR Fallbacks ─────────────────────────────────────

async function renderPageAsImage(page: PDFPageProxy): Promise<string> {
  try {
    const vp = page.getViewport({ scale: 1.5 });
    const canvas = document.createElement('canvas');
    canvas.width = vp.width;
    canvas.height = vp.height;
    await page.render({ canvasContext: require2dContext(canvas), viewport: vp }).promise;
    return `![Page](${canvas.toDataURL('image/jpeg', 0.82)})`;
  } catch {
    return '';
  }
}

async function ocrPage(page: PDFPageProxy, session: OcrSession): Promise<string> {
  const vp = page.getViewport({ scale: 2 });
  const canvas = document.createElement('canvas');
  canvas.width = vp.width;
  canvas.height = vp.height;
  await page.render({ canvasContext: require2dContext(canvas), viewport: vp }).promise;
  return (await session.recognize(canvas)).trim();
}
