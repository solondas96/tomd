import { describe, it, expect } from './framework.js';
import { htmlToMarkdown, arrayToMdTable, parseCsv } from '../js/converters/formats.js';

export default function testFormats() {
  // ── htmlToMarkdown (fallback without TurndownService) ───────

  describe('htmlToMarkdown fallback', () => {
    // Temporarily remove TurndownService to test fallback
    let savedTD;

    function withoutTurndown(fn) {
      savedTD = window.TurndownService;
      delete window.TurndownService;
      try { fn(); }
      finally { if (savedTD) window.TurndownService = savedTD; }
    }

    it('converts h1', () => {
      withoutTurndown(() => {
        expect(htmlToMarkdown('<h1>Title</h1>')).toContain('# Title');
      });
    });

    it('converts h2', () => {
      withoutTurndown(() => {
        expect(htmlToMarkdown('<h2>Subtitle</h2>')).toContain('## Subtitle');
      });
    });

    it('converts h3-h6', () => {
      withoutTurndown(() => {
        expect(htmlToMarkdown('<h3>Three</h3>')).toContain('### Three');
        expect(htmlToMarkdown('<h6>Six</h6>')).toContain('###### Six');
      });
    });

    it('converts paragraphs', () => {
      withoutTurndown(() => {
        expect(htmlToMarkdown('<p>Hello</p>')).toContain('Hello');
      });
    });

    it('converts bold', () => {
      withoutTurndown(() => {
        expect(htmlToMarkdown('<strong>bold</strong>')).toContain('**bold**');
      });
    });

    it('converts italic', () => {
      withoutTurndown(() => {
        expect(htmlToMarkdown('<em>italic</em>')).toContain('*italic*');
      });
    });

    it('converts links', () => {
      withoutTurndown(() => {
        const result = htmlToMarkdown('<a href="https://x.com">Link</a>');
        expect(result).toContain('[Link](https://x.com)');
      });
    });

    it('converts list items', () => {
      withoutTurndown(() => {
        expect(htmlToMarkdown('<li>Item</li>')).toContain('- Item');
      });
    });

    it('converts br to newline', () => {
      withoutTurndown(() => {
        expect(htmlToMarkdown('a<br/>b')).toContain('a\nb');
      });
    });

    it('strips remaining HTML tags', () => {
      withoutTurndown(() => {
        const result = htmlToMarkdown('<div><span>text</span></div>');
        expect(result.includes('<')).toBe(false);
      });
    });

    it('decodes HTML entities', () => {
      withoutTurndown(() => {
        expect(htmlToMarkdown('&amp; &lt; &gt; &quot;')).toContain('& < > "');
      });
    });

    it('handles empty string', () => {
      withoutTurndown(() => {
        expect(htmlToMarkdown('')).toBe('');
      });
    });

    it('strips nested tags from headings', () => {
      withoutTurndown(() => {
        expect(htmlToMarkdown('<h1><span>Title</span></h1>')).toContain('# Title');
      });
    });
  });

  // ── arrayToMdTable ──────────────────────────────────────────

  describe('arrayToMdTable', () => {
    it('creates a 2-row table', () => {
      const result = arrayToMdTable([['A', 'B'], ['1', '2']]);
      expect(result).toContain('| A | B |');
      expect(result).toContain('| --- | --- |');
      expect(result).toContain('| 1 | 2 |');
    });

    it('returns empty string for empty array', () => {
      expect(arrayToMdTable([])).toBe('');
    });

    it('handles single row (header only)', () => {
      const result = arrayToMdTable([['Col1', 'Col2']]);
      expect(result).toContain('| Col1 | Col2 |');
      expect(result).toContain('| --- | --- |');
    });

    it('normalizes uneven row lengths', () => {
      const result = arrayToMdTable([['A', 'B', 'C'], ['1']]);
      expect(result).toContain('| 1 |  |  |');
    });

    it('escapes pipe characters in cells', () => {
      const result = arrayToMdTable([['A|B'], ['C']]);
      expect(result).toContain('A\\|B');
    });

    it('handles null/undefined cells', () => {
      const result = arrayToMdTable([[null, undefined, 'ok']]);
      expect(result).toContain('|  |  | ok |');
    });

    it('handles numeric values', () => {
      const result = arrayToMdTable([[1, 2.5], [3, 4]]);
      expect(result).toContain('| 1 | 2.5 |');
    });
  });

  // ── parseCsv ────────────────────────────────────────────────

  describe('parseCsv', () => {
    it('parses simple CSV', () => {
      const result = parseCsv('a,b,c\n1,2,3');
      expect(result).toEqual([['a', 'b', 'c'], ['1', '2', '3']]);
    });

    it('handles quoted fields', () => {
      const result = parseCsv('"hello, world",b\n1,2');
      expect(result[0][0]).toBe('hello, world');
    });

    it('handles escaped quotes (doubled)', () => {
      const result = parseCsv('"say ""hello""",b\n1,2');
      expect(result[0][0]).toBe('say "hello"');
    });

    it('handles CRLF line endings', () => {
      const result = parseCsv('a,b\r\n1,2');
      expect(result).toEqual([['a', 'b'], ['1', '2']]);
    });

    it('handles empty file', () => {
      expect(parseCsv('')).toEqual([]);
    });

    it('handles single value', () => {
      const result = parseCsv('hello');
      expect(result).toEqual([['hello']]);
    });

    it('skips empty rows', () => {
      const result = parseCsv('a,b\n\n1,2');
      expect(result).toEqual([['a', 'b'], ['1', '2']]);
    });

    it('handles TSV with tab separator', () => {
      const result = parseCsv('a\tb\tc\n1\t2\t3', '\t');
      expect(result).toEqual([['a', 'b', 'c'], ['1', '2', '3']]);
    });

    it('handles multiline quoted fields', () => {
      const result = parseCsv('"line1\nline2",b\n1,2');
      expect(result[0][0]).toBe('line1\nline2');
    });

    it('handles trailing newline', () => {
      const result = parseCsv('a,b\n1,2\n');
      expect(result).toEqual([['a', 'b'], ['1', '2']]);
    });
  });

  // ── convertText ─────────────────────────────────────────────

  describe('convertText', () => {
    it('returns text content as markdown', async () => {
      const { convertText } = await import('../js/converters/formats.js');
      const file = new File(['# Hello\n\nWorld'], 'test.md', { type: 'text/plain' });
      const result = await convertText(file, () => {});
      expect(result.markdown).toBe('# Hello\n\nWorld');
      expect(result.pageCount).toBe(1);
    });

    it('handles empty file', async () => {
      const { convertText } = await import('../js/converters/formats.js');
      const file = new File([''], 'empty.txt', { type: 'text/plain' });
      const result = await convertText(file, () => {});
      expect(result.markdown).toBe('');
    });
  });

  // ── convertXml ──────────────────────────────────────────────

  describe('convertXml', () => {
    it('wraps XML in code fence', async () => {
      const { convertXml } = await import('../js/converters/formats.js');
      const file = new File(['<root><child/></root>'], 'test.xml', { type: 'text/xml' });
      const result = await convertXml(file, () => {});
      expect(result.markdown).toContain('```xml');
      expect(result.markdown).toContain('<root><child/></root>');
      expect(result.markdown).toContain('```');
    });
  });

  // ── convertJson ─────────────────────────────────────────────

  describe('convertJson', () => {
    it('formats valid JSON', async () => {
      const { convertJson } = await import('../js/converters/formats.js');
      const file = new File(['{"a":1}'], 'test.json', { type: 'application/json' });
      const result = await convertJson(file, () => {});
      expect(result.markdown).toContain('```json');
      expect(result.markdown).toContain('"a": 1');
    });

    it('handles invalid JSON gracefully', async () => {
      const { convertJson } = await import('../js/converters/formats.js');
      const file = new File(['{not valid json'], 'bad.json', { type: 'application/json' });
      const result = await convertJson(file, () => {});
      expect(result.markdown).toContain('```json');
      expect(result.markdown).toContain('{not valid json');
    });
  });

  // ── convertCsv ──────────────────────────────────────────────

  describe('convertCsv', () => {
    it('converts CSV to markdown table', async () => {
      const { convertCsv } = await import('../js/converters/formats.js');
      const file = new File(['Name,Age\nAlice,30\nBob,25'], 'data.csv', { type: 'text/csv' });
      const result = await convertCsv(file, () => {});
      expect(result.markdown).toContain('| Name | Age |');
      expect(result.markdown).toContain('| Alice | 30 |');
      expect(result.pageCount).toBe(1);
    });

    it('handles empty CSV', async () => {
      const { convertCsv } = await import('../js/converters/formats.js');
      const file = new File([''], 'empty.csv', { type: 'text/csv' });
      const result = await convertCsv(file, () => {});
      expect(result.markdown).toContain('Empty file');
    });

    it('detects TSV by extension', async () => {
      const { convertCsv } = await import('../js/converters/formats.js');
      const file = new File(['A\tB\n1\t2'], 'data.tsv', { type: 'text/tab-separated-values' });
      const result = await convertCsv(file, () => {});
      expect(result.markdown).toContain('| A | B |');
    });
  });

  // ── convertLatex ────────────────────────────────────────────

  describe('convertLatex', () => {
    it('converts sections to headings', async () => {
      const { convertLatex } = await import('../js/converters/formats.js');
      const tex = '\\begin{document}\\section{Intro}Hello\\end{document}';
      const file = new File([tex], 'doc.tex', { type: 'text/x-latex' });
      const result = await convertLatex(file, () => {});
      expect(result.markdown).toContain('## Intro');
    });

    it('converts textbf to bold', async () => {
      const { convertLatex } = await import('../js/converters/formats.js');
      const tex = '\\begin{document}\\textbf{bold text}\\end{document}';
      const file = new File([tex], 'doc.tex', { type: 'text/x-latex' });
      const result = await convertLatex(file, () => {});
      expect(result.markdown).toContain('**bold text**');
    });

    it('converts textit/emph to italic', async () => {
      const { convertLatex } = await import('../js/converters/formats.js');
      const tex = '\\begin{document}\\textit{italic}\\emph{also}\\end{document}';
      const file = new File([tex], 'doc.tex', { type: 'text/x-latex' });
      const result = await convertLatex(file, () => {});
      expect(result.markdown).toContain('*italic*');
      expect(result.markdown).toContain('*also*');
    });

    it('converts items to list', async () => {
      const { convertLatex } = await import('../js/converters/formats.js');
      const tex = '\\begin{document}\\begin{itemize}\\item First\\item Second\\end{itemize}\\end{document}';
      const file = new File([tex], 'doc.tex', { type: 'text/x-latex' });
      const result = await convertLatex(file, () => {});
      expect(result.markdown).toContain('- First');
      expect(result.markdown).toContain('- Second');
    });

    it('converts href to links', async () => {
      const { convertLatex } = await import('../js/converters/formats.js');
      const tex = '\\begin{document}\\href{https://x.com}{Link}\\end{document}';
      const file = new File([tex], 'doc.tex', { type: 'text/x-latex' });
      const result = await convertLatex(file, () => {});
      expect(result.markdown).toContain('[Link](https://x.com)');
    });

    it('handles empty document', async () => {
      const { convertLatex } = await import('../js/converters/formats.js');
      const tex = '\\begin{document}\\end{document}';
      const file = new File([tex], 'doc.tex', { type: 'text/x-latex' });
      const result = await convertLatex(file, () => {});
      expect(result.markdown).toContain('Could not parse');
    });
  });

  // ── convertRtf ──────────────────────────────────────────────

  describe('convertRtf', () => {
    it('extracts text from RTF', async () => {
      const { convertRtf } = await import('../js/converters/formats.js');
      const rtf = '{\\rtf1 Hello\\par World}';
      const file = new File([rtf], 'doc.rtf', { type: 'application/rtf' });
      const result = await convertRtf(file, () => {});
      expect(result.markdown).toContain('Hello');
      expect(result.markdown).toContain('World');
    });

    it('removes picture data', async () => {
      const { convertRtf } = await import('../js/converters/formats.js');
      const rtf = '{\\rtf1 Before{\\pict hex data here}After}';
      const file = new File([rtf], 'doc.rtf', { type: 'application/rtf' });
      const result = await convertRtf(file, () => {});
      expect(result.markdown.includes('pict')).toBe(false);
      expect(result.markdown).toContain('Before');
      expect(result.markdown).toContain('After');
    });
  });

  // ── convertHtml ─────────────────────────────────────────────

  describe('convertHtml', () => {
    it('converts HTML file to markdown', async () => {
      const { convertHtml } = await import('../js/converters/formats.js');
      const html = '<h1>Title</h1><p>Paragraph</p>';
      const file = new File([html], 'page.html', { type: 'text/html' });
      const result = await convertHtml(file, () => {});
      expect(result.markdown).toContain('Title');
      expect(result.markdown).toContain('Paragraph');
    });
  });
}
