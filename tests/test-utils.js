import { describe, it, expect } from './framework.js';
import {
  escHtml, escRegex, wordCount, formatBytes, formatDate,
  parsePdfDate, slugify, friendlyError, loadScript, fileToBase64, generateFrontmatter,
} from '../js/utils.js';

export default function testUtils() {
  // ── escHtml ─────────────────────────────────────────────────

  describe('escHtml', () => {
    it('escapes ampersands', () => {
      expect(escHtml('a & b')).toBe('a &amp; b');
    });
    it('escapes less-than', () => {
      expect(escHtml('<script>')).toBe('&lt;script&gt;');
    });
    it('escapes double quotes', () => {
      expect(escHtml('a "b" c')).toBe('a &quot;b&quot; c');
    });
    it('escapes single quotes', () => {
      expect(escHtml("it's")).toBe('it&#39;s');
    });
    it('handles empty string', () => {
      expect(escHtml('')).toBe('');
    });
    it('handles string with all special chars', () => {
      expect(escHtml('<>&"\'')).toBe('&lt;&gt;&amp;&quot;&#39;');
    });
    it('does not double-escape', () => {
      expect(escHtml('&amp;')).toBe('&amp;amp;');
    });
  });

  // ── escRegex ────────────────────────────────────────────────

  describe('escRegex', () => {
    it('escapes dots', () => {
      expect(escRegex('file.txt')).toBe('file\\.txt');
    });
    it('escapes parens and brackets', () => {
      expect(escRegex('(a)[b]{c}')).toBe('\\(a\\)\\[b\\]\\{c\\}');
    });
    it('escapes pipe and caret', () => {
      expect(escRegex('a|b^c$d')).toBe('a\\|b\\^c\\$d');
    });
    it('escapes star and plus', () => {
      expect(escRegex('a*b+c?')).toBe('a\\*b\\+c\\?');
    });
    it('handles empty string', () => {
      expect(escRegex('')).toBe('');
    });
    it('produces valid regex when used', () => {
      const pattern = escRegex('file(1).txt');
      const re = new RegExp(pattern);
      expect(re.test('file(1).txt')).toBe(true);
      expect(re.test('fileX1Ytxt')).toBe(false);
    });
  });

  // ── wordCount ───────────────────────────────────────────────

  describe('wordCount', () => {
    it('counts simple words', () => {
      expect(wordCount('hello world')).toBe(2);
    });
    it('returns 0 for empty string', () => {
      expect(wordCount('')).toBe(0);
    });
    it('returns 0 for whitespace only', () => {
      expect(wordCount('   \n\t  ')).toBe(0);
    });
    it('handles single word', () => {
      expect(wordCount('hello')).toBe(1);
    });
    it('handles multiple spaces between words', () => {
      expect(wordCount('a   b    c')).toBe(3);
    });
    it('handles newlines and tabs', () => {
      expect(wordCount('hello\nworld\tthere')).toBe(3);
    });
    it('counts markdown content', () => {
      expect(wordCount('# Heading\n\nSome paragraph text.')).toBe(5);
    });
  });

  // ── formatBytes ─────────────────────────────────────────────

  describe('formatBytes', () => {
    it('formats bytes', () => {
      expect(formatBytes(500)).toBe('500 B');
    });
    it('formats kilobytes', () => {
      expect(formatBytes(1024)).toBe('1.0 KB');
    });
    it('formats megabytes', () => {
      expect(formatBytes(1048576)).toBe('1.0 MB');
    });
    it('formats fractional KB', () => {
      expect(formatBytes(1536)).toBe('1.5 KB');
    });
    it('handles 0 bytes', () => {
      expect(formatBytes(0)).toBe('0 B');
    });
    it('handles just under 1KB', () => {
      expect(formatBytes(1023)).toBe('1023 B');
    });
    it('handles just under 1MB', () => {
      const result = formatBytes(1048575);
      expect(result).toContain('KB');
    });
    it('handles large files', () => {
      expect(formatBytes(5242880)).toBe('5.0 MB');
    });
  });

  // ── formatDate ──────────────────────────────────────────────

  describe('formatDate', () => {
    it('formats a timestamp', () => {
      const result = formatDate(1700000000000);
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });
    it('formats current timestamp', () => {
      const result = formatDate(Date.now());
      expect(result.length).toBeGreaterThan(0);
    });
  });

  // ── parsePdfDate ────────────────────────────────────────────

  describe('parsePdfDate', () => {
    it('parses full PDF date', () => {
      expect(parsePdfDate('D:20230415143022')).toBe('2023-04-15 14:30');
    });
    it('parses date without time', () => {
      expect(parsePdfDate('D:20230415')).toBe('2023-04-15');
    });
    it('returns empty string for null', () => {
      expect(parsePdfDate(null)).toBe('');
    });
    it('returns empty string for undefined', () => {
      expect(parsePdfDate(undefined)).toBe('');
    });
    it('returns empty string for empty', () => {
      expect(parsePdfDate('')).toBe('');
    });
    it('returns original string for non-matching format', () => {
      expect(parsePdfDate('not-a-date')).toBe('not-a-date');
    });
    it('parses date with hour but no minute', () => {
      expect(parsePdfDate('D:2023041514')).toBe('2023-04-15 14:00');
    });
  });

  // ── slugify ─────────────────────────────────────────────────

  describe('slugify', () => {
    it('lowercases and replaces spaces', () => {
      expect(slugify('Hello World')).toBe('hello-world');
    });
    it('replaces special chars with hyphens', () => {
      expect(slugify('file (1).pdf')).toBe('file-1-pdf');
    });
    it('strips leading/trailing hyphens', () => {
      expect(slugify('---hello---')).toBe('hello');
    });
    it('handles empty string', () => {
      expect(slugify('')).toBe('');
    });
    it('collapses multiple special chars', () => {
      expect(slugify('a!!!b')).toBe('a-b');
    });
    it('handles all-special chars', () => {
      expect(slugify('!!!')).toBe('');
    });
    it('preserves numbers', () => {
      expect(slugify('Part 2 of 3')).toBe('part-2-of-3');
    });
  });

  // ── friendlyError ───────────────────────────────────────────

  describe('friendlyError', () => {
    it('handles PasswordException', () => {
      expect(friendlyError({ name: 'PasswordException' })).toBe('PDF is password-protected.');
    });
    it('handles InvalidPDFException', () => {
      expect(friendlyError({ name: 'InvalidPDFException' })).toBe('Invalid or corrupted file.');
    });
    it('shows message for generic errors', () => {
      expect(friendlyError(new Error('Something broke'))).toBe('Error: Something broke');
    });
    it('handles null error', () => {
      expect(friendlyError(null)).toBe('An unknown error occurred.');
    });
    it('handles undefined error', () => {
      expect(friendlyError(undefined)).toBe('An unknown error occurred.');
    });
    it('handles error with no message', () => {
      expect(friendlyError({ name: 'SomeError' })).toBe('An unknown error occurred.');
    });
    it('handles error with empty message', () => {
      expect(friendlyError({ message: '' })).toBe('An unknown error occurred.');
    });
  });

  // ── loadScript ──────────────────────────────────────────────

  describe('loadScript', () => {
    it('resolves immediately if global already exists', async () => {
      window.__testGlobal = true;
      await loadScript('nonexistent.js', '__testGlobal');
      expect(window.__testGlobal).toBe(true);
      delete window.__testGlobal;
    });

    it('rejects on invalid URL after retries', async () => {
      const start = Date.now();
      await expect(async () => await loadScript('/tests/__nonexistent__.js', null, 0)).toReject('Failed to load');
      // With 0 retries, should fail fast
      expect(Date.now() - start).toBeLessThan(5000);
    });

    it('cleans up failed script elements', async () => {
      const before = document.querySelectorAll('script[src*="__cleanup_test__"]').length;
      try { await loadScript('/__cleanup_test__.js', null, 0); } catch {}
      const after = document.querySelectorAll('script[src*="__cleanup_test__"]').length;
      expect(after).toBe(before);
    });
  });

  // ── fileToBase64 ────────────────────────────────────────────

  describe('fileToBase64', () => {
    it('converts a text file to base64', async () => {
      const file = new File(['hello'], 'test.txt', { type: 'text/plain' });
      const result = await fileToBase64(file);
      expect(atob(result)).toBe('hello');
    });

    it('converts empty file', async () => {
      const file = new File([''], 'empty.txt', { type: 'text/plain' });
      const result = await fileToBase64(file);
      expect(result).toBe('');
    });

    it('converts binary data', async () => {
      const data = new Uint8Array([0, 1, 2, 255]);
      const file = new File([data], 'bin.dat', { type: 'application/octet-stream' });
      const result = await fileToBase64(file);
      expect(result.length).toBeGreaterThan(0);
    });
  });

  // ── generateFrontmatter ─────────────────────────────────────

  describe('generateFrontmatter', () => {
    it('generates basic frontmatter', () => {
      const result = generateFrontmatter({ Title: 'Test Doc' }, 'test.pdf');
      expect(result).toContain('---');
      expect(result).toContain('title: "Test Doc"');
      expect(result).toMatch(/date: \d{4}-\d{2}-\d{2}/);
    });

    it('uses filename when no title', () => {
      const result = generateFrontmatter({}, 'my-report.pdf');
      expect(result).toContain('title: "my-report"');
    });

    it('uses Untitled as last resort', () => {
      const result = generateFrontmatter(null, null);
      expect(result).toContain('title: "Untitled"');
    });

    it('includes author when provided', () => {
      const result = generateFrontmatter({ Title: 'X', Author: 'John' }, 'x.pdf');
      expect(result).toContain('author: "John"');
    });

    it('includes source when provided', () => {
      const result = generateFrontmatter({ Title: 'X', Source: 'https://example.com' }, 'x.pdf');
      expect(result).toContain('source: "https://example.com"');
    });

    it('escapes quotes in title', () => {
      const result = generateFrontmatter({ Title: 'A "quoted" title' }, 'x.pdf');
      expect(result).toContain('title: "A \\"quoted\\" title"');
    });

    it('escapes backslashes', () => {
      const result = generateFrontmatter({ Title: 'C:\\path\\file' }, 'x.pdf');
      expect(result).toContain('title: "C:\\\\path\\\\file"');
    });

    it('omits author when empty', () => {
      const result = generateFrontmatter({ Title: 'X', Author: '' }, 'x.pdf');
      expect(result.includes('author:')).toBe(false);
    });

    it('ends with triple dash and newlines', () => {
      const result = generateFrontmatter({ Title: 'X' }, 'x.pdf');
      expect(result).toContain('---\n\n');
    });
  });
}
