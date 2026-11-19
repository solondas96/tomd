import type { Fragment, FontStyle } from './types';

const sameStyle = (a: FontStyle, b: FontStyle) => a.bold === b.bold && a.italic === b.italic;

function mergeAdjacent(fragments: Fragment[]): Fragment[] {
  const merged: Fragment[] = [];
  for (const fragment of fragments) {
    if (fragment.text === '') continue;
    const last = merged[merged.length - 1];
    if (last && sameStyle(last.style, fragment.style)) last.text += fragment.text;
    else merged.push({ text: fragment.text, style: fragment.style });
  }
  return merged;
}

/** Marker for a style: `***` bold+italic, `**` bold, `*` italic. */
function markerFor(style: FontStyle): string {
  if (style.bold && style.italic) return '***';
  if (style.bold) return '**';
  return style.italic ? '*' : '';
}

/** Wraps text in emphasis markers, keeping surrounding whitespace outside (CommonMark requires it). */
function wrapEmphasis(text: string, style: FontStyle): string {
  const marker = markerFor(style);
  if (!marker) return text;
  const core = text.trim();
  if (!core) return text;
  const leading = text.slice(0, text.length - text.trimStart().length);
  const trailing = text.slice(text.trimEnd().length);
  return `${leading}${marker}${core}${marker}${trailing}`;
}

/**
 * Renders styled text fragments as inline Markdown.
 *
 * Purpose: PDF.js splits a line wherever the font changes; this puts the pieces back together and
 * turns bold/italic runs into `**` / `*`. A space between two fragments of the same style takes that
 * style too, so a bold phrase is wrapped once rather than word by word.
 * Params: fragments - text pieces in reading order; emphasis - false to drop all styling (for headings).
 * Returns: Markdown text with single spaces and no leading or trailing whitespace.
 */
export function renderFragments(fragments: readonly Fragment[], emphasis = true): string {
  let pieces = mergeAdjacent(fragments.map((fragment) => ({ ...fragment })));
  // Whitespace between two equally styled neighbours belongs to them.
  pieces = mergeAdjacent(
    pieces.map((piece, index) => {
      const before = pieces[index - 1];
      const after = pieces[index + 1];
      if (piece.text.trim() === '' && before && after && sameStyle(before.style, after.style)) {
        return { text: piece.text, style: before.style };
      }
      return piece;
    }),
  );

  // Collapse whitespace across fragment boundaries, then trim the whole text.
  let previousEndsWithSpace = true; // true at the start also trims leading whitespace
  const collapsed: Fragment[] = [];
  for (const piece of pieces) {
    let text = piece.text.replace(/\s+/g, ' ');
    if (previousEndsWithSpace) text = text.replace(/^ /, '');
    if (text === '') continue;
    previousEndsWithSpace = text.endsWith(' ');
    collapsed.push({ text, style: piece.style });
  }
  const last = collapsed[collapsed.length - 1];
  if (last) last.text = last.text.replace(/ $/, '');

  return collapsed
    .filter((piece) => piece.text !== '')
    .map((piece) => (emphasis ? wrapEmphasis(piece.text, piece.style) : piece.text))
    .join('');
}
