import { PDF_LAYOUT } from '../../config';
import type { Fragment, FontStyle, Line, Span, TextRun } from './types';

/**
 * Groups text runs into visual lines and merges neighbouring runs into spans.
 *
 * Purpose: PDF.js emits a new run at every font change, so one sentence arrives in several pieces.
 * Runs whose gap is smaller than a word space are joined into one span (keeping each piece's
 * style); only a real gap (a column) starts another span.
 * Params: runs - text runs of one page or column; styleOf - font style for a run's font id.
 * Returns: lines from top to bottom, spans left to right.
 * Complexity: O(n log n) for n runs - one sort by y, one sweep, then a sort by x inside each line.
 */
export function buildLines(runs: readonly TextRun[], styleOf: (fontName: string) => FontStyle): Line[] {
  const sorted = [...runs].sort((a, b) => b.y - a.y);
  const lines: Line[] = [];
  let lineRuns: TextRun[] = [];
  let anchorY = 0;
  let tolerance = 0;

  const flush = () => {
    if (lineRuns.length > 0) lines.push(buildLine(lineRuns, styleOf));
    lineRuns = [];
  };

  for (const run of sorted) {
    if (lineRuns.length === 0 || anchorY - run.y > tolerance) {
      flush();
      anchorY = run.y;
      tolerance = Math.max(PDF_LAYOUT.MIN_LINE_Y_TOLERANCE_PT, run.fontSize * PDF_LAYOUT.LINE_Y_TOLERANCE_EM);
    }
    lineRuns.push(run);
  }
  flush();
  return lines.filter((line) => line.spans.length > 0);
}

function buildLine(runs: TextRun[], styleOf: (fontName: string) => FontStyle): Line {
  const ordered = [...runs].sort((a, b) => a.x - b.x);
  const spans: Span[] = [];
  let current: Span | null = null;
  let previousEnd = 0;
  let sawSpaceRun = false;

  for (const run of ordered) {
    if (run.text.trim() === '') {
      // A whitespace-only run is PDF.js's way of saying "a space goes here".
      if (run.text.length > 0) sawSpaceRun = true;
      continue;
    }
    const style = styleOf(run.fontName);
    const gap = run.x - previousEnd;
    const startsNewSpan = current === null || gap > PDF_LAYOUT.SPAN_GAP_EM * run.fontSize;

    if (current === null || startsNewSpan) {
      current = { x: run.x, width: 0, fontSize: run.fontSize, fragments: [] };
      spans.push(current);
    } else if (sawSpaceRun || gap > PDF_LAYOUT.WORD_GAP_EM * run.fontSize) {
      current.fragments.push(spaceFragment(current.fragments));
    }

    current.fragments.push({ text: run.text, style });
    current.width = run.x + run.width - current.x;
    current.fontSize = Math.max(current.fontSize, run.fontSize);
    previousEnd = run.x + run.width;
    sawSpaceRun = false;
  }

  return {
    y: runs[0].y,
    fontSize: Math.max(...spans.map((span) => span.fontSize), 0),
    spans,
  };
}

/** A space styled like the text before it, so emphasis continues across it. */
function spaceFragment(fragments: Fragment[]): Fragment {
  const previous = fragments[fragments.length - 1];
  return { text: ' ', style: previous ? previous.style : { bold: false, italic: false } };
}
