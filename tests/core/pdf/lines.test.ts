import { describe, expect, it } from 'vitest';
import { classifyFont } from '../../../src/core/pdf/fontStyle';
import { renderFragments } from '../../../src/core/pdf/inline';
import { buildLines } from '../../../src/core/pdf/lines';
import type { FontStyle, Fragment, TextRun } from '../../../src/core/pdf/types';

const PLAIN: FontStyle = { bold: false, italic: false };
const BOLD: FontStyle = { bold: true, italic: false };
const ITALIC: FontStyle = { bold: false, italic: true };

const styleOf = (fontName: string): FontStyle => (fontName === 'b' ? BOLD : fontName === 'i' ? ITALIC : PLAIN);
const run = (text: string, x: number, y: number, width: number, fontName = 'p', fontSize = 12): TextRun => ({
  text,
  x,
  y,
  width,
  fontSize,
  fontName,
});
const text = (fragments: Fragment[], emphasis = true) => renderFragments(fragments, emphasis);

describe('classifyFont', () => {
  it.each([
    ['ABCDEF+ArialMT', false, false],
    ['BAAAAA+Arial-BoldMT', true, false],
    ['CAAAAA+Arial-ItalicMT', false, true],
    ['Arial-BoldItalicMT', true, true],
    ['Helvetica-Oblique', false, true],
    ['TimesNewRomanPS-BoldMT', true, false],
    ['Calibri-Light', false, false],
    ['Inter-SemiBold', true, false],
    ['g_d0_f2', false, false],
  ])('%s -> bold=%s italic=%s', (name, bold, italic) => {
    expect(classifyFont(name)).toEqual({ bold, italic });
  });
});

describe('buildLines', () => {
  it('merges runs split by a font change into one span with per-run styles', () => {
    // "A bold word." where "bold" is a separate bold run, as PDF.js reports it.
    const lines = buildLines(
      [run('A ', 10, 700, 8), run('bold', 18, 700, 22, 'b'), run(' word.', 40, 700, 30)],
      styleOf,
    );
    expect(lines).toHaveLength(1);
    expect(lines[0].spans).toHaveLength(1);
    expect(text(lines[0].spans[0].fragments)).toBe('A **bold** word.');
  });

  it('keeps a real column gap as separate spans', () => {
    const lines = buildLines([run('Region', 10, 700, 40), run('Revenue', 200, 700, 45)], styleOf);
    expect(lines[0].spans.map((span) => span.fragments[0].text)).toEqual(['Region', 'Revenue']);
  });

  it('puts a word space between runs whose gap is wider than a space', () => {
    const lines = buildLines([run('Hello', 10, 700, 30), run('world', 43, 700, 30)], styleOf); // 3pt gap = 0.25em
    expect(text(lines[0].spans[0].fragments)).toBe('Hello world');
  });

  it('does not add a space between touching runs (a bold letter inside a word)', () => {
    const lines = buildLines(
      [run('un', 10, 700, 14), run('believ', 24, 700, 30, 'b'), run('able', 54, 700, 24)],
      styleOf,
    );
    expect(text(lines[0].spans[0].fragments)).toBe('un**believ**able');
  });

  it('uses a whitespace-only run as a space', () => {
    const lines = buildLines([run('a', 10, 700, 6), run(' ', 16, 700, 3), run('b', 19, 700, 6)], styleOf);
    expect(text(lines[0].spans[0].fragments)).toBe('a b');
  });

  it('orders lines top to bottom and runs left to right regardless of input order', () => {
    const lines = buildLines([run('low', 10, 600, 20), run('right', 80, 700, 30), run('left', 10, 700, 30)], styleOf);
    expect(lines.map((line) => line.spans.map((s) => text(s.fragments)))).toEqual([['left', 'right'], ['low']]);
  });

  it('treats small baseline differences as the same line, large ones as different lines', () => {
    expect(buildLines([run('a', 10, 700, 6), run('b', 20, 699, 6)], styleOf)).toHaveLength(1);
    expect(buildLines([run('a', 10, 700, 6), run('b', 20, 690, 6)], styleOf)).toHaveLength(2);
  });

  it('scales thresholds with font size', () => {
    // 20pt text: a 4pt gap is 0.2em - a word space, not a column.
    const lines = buildLines([run('Big', 10, 700, 40, 'p', 20), run('text', 54, 700, 40, 'p', 20)], styleOf);
    expect(lines[0].spans).toHaveLength(1);
  });

  it('returns nothing for no runs or only blank runs', () => {
    expect(buildLines([], styleOf)).toEqual([]);
    expect(buildLines([run(' ', 10, 700, 3)], styleOf)).toEqual([]);
  });

  it('handles tens of thousands of runs quickly (n log n)', () => {
    const runs = Array.from({ length: 60_000 }, (_, index) =>
      run('w', (index % 100) * 8, 900 - Math.floor(index / 100) * 14, 6),
    );
    const start = performance.now();
    const lines = buildLines(runs, styleOf);
    expect(lines).toHaveLength(600);
    expect(performance.now() - start).toBeLessThan(1500);
  });
});

describe('renderFragments', () => {
  it('wraps bold, italic and bold-italic', () => {
    expect(
      text([
        { text: 'a ', style: PLAIN },
        { text: 'b', style: BOLD },
        { text: ' ', style: PLAIN },
        { text: 'i', style: ITALIC },
        { text: ' ', style: PLAIN },
        { text: 'bi', style: { bold: true, italic: true } },
      ]),
    ).toBe('a **b** *i* ***bi***');
  });

  it('keeps whitespace outside the markers', () => {
    expect(
      text([
        { text: 'x', style: PLAIN },
        { text: ' bold ', style: BOLD },
        { text: 'y', style: PLAIN },
      ]),
    ).toBe('x **bold** y');
  });

  it('wraps a multi-word bold phrase once, not word by word', () => {
    expect(
      text([
        { text: 'bold', style: BOLD },
        { text: ' ', style: PLAIN },
        { text: 'phrase', style: BOLD },
      ]),
    ).toBe('**bold phrase**');
  });

  it('drops styling when emphasis is off (headings)', () => {
    expect(text([{ text: 'Title', style: BOLD }], false)).toBe('Title');
  });

  it('collapses repeated whitespace and trims the ends', () => {
    expect(
      text([
        { text: '  a  ', style: PLAIN },
        { text: ' b ', style: PLAIN },
      ]),
    ).toBe('a b');
  });

  it('emits nothing for blank input', () => {
    expect(text([])).toBe('');
    expect(text([{ text: '   ', style: BOLD }])).toBe('');
  });
});
