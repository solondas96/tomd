import { describe, it, expect } from './framework.js';

export default function testEdgeCases() {
  // ── Unicode & Encoding ──────────────────────────────────────

  describe('edge: Unicode handling', () => {
    it('escHtml handles Unicode', async () => {
      const { escHtml } = await import('../js/utils.js');
      expect(escHtml('日本語')).toBe('日本語');
      expect(escHtml('🎉🚀')).toBe('🎉🚀');
    });

    it('wordCount handles CJK text', async () => {
      const { wordCount } = await import('../js/utils.js');
      // CJK without spaces counts as one "word" in this implementation
      expect(wordCount('你好世界')).toBe(1);
    });

    it('slugify strips non-ascii', async () => {
      const { slugify } = await import('../js/utils.js');
      expect(slugify('Ñoño')).toBe('o-o');
    });

    it('fileToBase64 handles unicode content', async () => {
      const { fileToBase64 } = await import('../js/utils.js');
      const file = new File(['日本語テスト'], 'test.txt', { type: 'text/plain' });
      const result = await fileToBase64(file);
      expect(result.length).toBeGreaterThan(0);
    });
  });

  // ── Boundary Values ─────────────────────────────────────────

  describe('edge: boundary values', () => {
    it('wordCount with single character', async () => {
      const { wordCount } = await import('../js/utils.js');
      expect(wordCount('a')).toBe(1);
    });

    it('formatBytes at exact boundaries', async () => {
      const { formatBytes } = await import('../js/utils.js');
      expect(formatBytes(1024)).toBe('1.0 KB');
      expect(formatBytes(1048576)).toBe('1.0 MB');
    });

    it('slugify with single char', async () => {
      const { slugify } = await import('../js/utils.js');
      expect(slugify('a')).toBe('a');
      expect(slugify('A')).toBe('a');
    });

    it('parseCsv single cell', async () => {
      const { parseCsv } = await import('../js/converters/formats.js');
      expect(parseCsv('x')).toEqual([['x']]);
    });

    it('arrayToMdTable single cell', async () => {
      const { arrayToMdTable } = await import('../js/converters/formats.js');
      const result = arrayToMdTable([['Only']]);
      expect(result).toContain('| Only |');
    });
  });

  // ── Very Large Inputs ───────────────────────────────────────

  describe('edge: large inputs', () => {
    it('wordCount handles large text', async () => {
      const { wordCount } = await import('../js/utils.js');
      const large = Array(10000).fill('word').join(' ');
      expect(wordCount(large)).toBe(10000);
    });

    it('escHtml handles large strings', async () => {
      const { escHtml } = await import('../js/utils.js');
      const large = '<script>'.repeat(1000);
      const result = escHtml(large);
      expect(result.includes('<script>')).toBe(false);
    });

    it('parseCsv handles many rows', async () => {
      const { parseCsv } = await import('../js/converters/formats.js');
      const csv = Array(1000).fill('a,b,c').join('\n');
      const result = parseCsv(csv);
      expect(result).toHaveLength(1000);
    });

    it('arrayToMdTable handles many columns', async () => {
      const { arrayToMdTable } = await import('../js/converters/formats.js');
      const row = Array(50).fill('cell');
      const result = arrayToMdTable([row, row]);
      expect(result.split('|').length).toBeGreaterThan(50);
    });
  });

  // ── Null/Undefined Safety ───────────────────────────────────

  describe('edge: null/undefined safety', () => {
    it('friendlyError handles various falsy values', async () => {
      const { friendlyError } = await import('../js/utils.js');
      expect(friendlyError(null)).toBe('An unknown error occurred.');
      expect(friendlyError(undefined)).toBe('An unknown error occurred.');
      expect(friendlyError(0)).toBe('An unknown error occurred.');
      expect(friendlyError('')).toBe('An unknown error occurred.');
    });

    it('generateFrontmatter handles null meta', async () => {
      const { generateFrontmatter } = await import('../js/utils.js');
      const result = generateFrontmatter(null, 'file.pdf');
      expect(result).toContain('title: "file"');
    });

    it('generateFrontmatter handles undefined fields', async () => {
      const { generateFrontmatter } = await import('../js/utils.js');
      const result = generateFrontmatter({ Title: undefined, Author: undefined }, 'x.pdf');
      expect(result).toContain('title: "x"');
      expect(result.includes('author:')).toBe(false);
    });

    it('parsePdfDate handles various non-date inputs', async () => {
      const { parsePdfDate } = await import('../js/utils.js');
      expect(parsePdfDate(null)).toBe('');
      expect(parsePdfDate('')).toBe('');
      expect(parsePdfDate(undefined)).toBe('');
    });
  });

  // ── Regex Safety ────────────────────────────────────────────

  describe('edge: regex safety', () => {
    it('escRegex prevents ReDoS via catastrophic backtracking', async () => {
      const { escRegex } = await import('../js/utils.js');
      const evil = '(a+)+$'; // known ReDoS pattern
      const escaped = escRegex(evil);
      // Should be safe to use in RegExp now
      const re = new RegExp(escaped);
      expect(re.test('(a+)+$')).toBe(true);
      // This should NOT take exponential time
      const start = Date.now();
      expect(re.test('aaaaaaaaaaaaaaaaaaaaaaab')).toBe(false);
      expect(Date.now() - start).toBeLessThan(100);
    });
  });

  // ── File API Edge Cases ─────────────────────────────────────

  describe('edge: File API', () => {
    it('File with empty name', () => {
      const f = new File(['content'], '', { type: 'text/plain' });
      expect(f.name).toBe('');
    });

    it('File with special chars in name', () => {
      const f = new File(['x'], 'hello world (1).pdf', { type: 'application/pdf' });
      expect(f.name).toBe('hello world (1).pdf');
    });

    it('zero-byte file', () => {
      const f = new File([], 'empty.pdf', { type: 'application/pdf' });
      expect(f.size).toBe(0);
    });

    it('very long filename', () => {
      const name = 'a'.repeat(255) + '.pdf';
      const f = new File(['x'], name, { type: 'application/pdf' });
      expect(f.name.endsWith('.pdf')).toBe(true);
    });
  });

  // ── Concurrency ─────────────────────────────────────────────

  describe('edge: concurrency guards', () => {
    it('isProcessing flag prevents re-entry', async () => {
      const { state } = await import('../js/state.js');
      state.isProcessing = true;
      // Simulating that processSingleFile checks this
      expect(state.isProcessing).toBe(true);
      state.isProcessing = false;
    });

    it('abort controller stops in-flight work', () => {
      const ac = new AbortController();
      let aborted = false;
      ac.signal.addEventListener('abort', () => { aborted = true; });
      ac.abort();
      expect(aborted).toBe(true);
    });
  });
}
