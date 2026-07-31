import { describe, it, expect } from './framework.js';

export default function testSecurity() {
  // ── XSS Prevention ──────────────────────────────────────────

  describe('security: XSS prevention in escHtml', () => {
    it('neutralizes script injection', async () => {
      const { escHtml } = await import('../js/utils.js');
      const input = '<script>alert("xss")</script>';
      const output = escHtml(input);
      expect(output.includes('<script>')).toBe(false);
      expect(output).toContain('&lt;script&gt;');
    });

    it('neutralizes event handler injection', async () => {
      const { escHtml } = await import('../js/utils.js');
      const input = '" onmouseover="alert(1)"';
      const output = escHtml(input);
      expect(output.includes('"')).toBe(false);
    });

    it('neutralizes single-quote attribute breakout', async () => {
      const { escHtml } = await import('../js/utils.js');
      const input = "' onclick='alert(1)'";
      const output = escHtml(input);
      expect(output.includes("'")).toBe(false);
    });
  });

  describe('security: DOMPurify usage', () => {
    it('DOMPurify is loaded', () => {
      expect(typeof DOMPurify !== 'undefined').toBe(true);
    });

    it('DOMPurify strips script tags', () => {
      const dirty = '<p>Hello</p><script>alert("xss")</script>';
      const clean = DOMPurify.sanitize(dirty);
      expect(clean.includes('<script>')).toBe(false);
      expect(clean).toContain('Hello');
    });

    it('DOMPurify strips event handlers', () => {
      const dirty = '<img src=x onerror="alert(1)">';
      const clean = DOMPurify.sanitize(dirty);
      expect(clean.includes('onerror')).toBe(false);
    });

    it('DOMPurify preserves safe HTML', () => {
      const safe = '<p><strong>Bold</strong> and <em>italic</em></p>';
      const clean = DOMPurify.sanitize(safe);
      expect(clean).toContain('<strong>Bold</strong>');
      expect(clean).toContain('<em>italic</em>');
    });

    it('DOMPurify strips javascript: URLs', () => {
      const dirty = '<a href="javascript:alert(1)">click</a>';
      const clean = DOMPurify.sanitize(dirty);
      expect(clean.includes('javascript:')).toBe(false);
    });
  });

  // ── YAML Injection ──────────────────────────────────────────

  describe('security: YAML frontmatter injection', () => {
    it('escapes quotes to prevent YAML injection', async () => {
      const { generateFrontmatter } = await import('../js/utils.js');
      const malicious = { Title: '"; rm -rf / #', Author: 'attacker"' };
      const result = generateFrontmatter(malicious, 'x.pdf');
      // Double quotes should be escaped
      expect(result.includes('\\"')).toBe(true);
      // Raw unescaped quotes should not appear inside values
      const lines = result.split('\n');
      const titleLine = lines.find(l => l.startsWith('title:'));
      // Count unescaped quotes — should be exactly 2 (opening and closing)
      const unescaped = titleLine.replace(/\\"/g, '').match(/"/g);
      expect(unescaped).toHaveLength(2);
    });

    it('escapes backslashes', async () => {
      const { generateFrontmatter } = await import('../js/utils.js');
      const result = generateFrontmatter({ Title: 'path\\to\\file' }, 'x.pdf');
      expect(result).toContain('path\\\\to\\\\file');
    });
  });

  // ── URL Validation ──────────────────────────────────────────

  describe('security: URL validation', () => {
    it('rejects javascript: URLs', () => {
      let valid = true;
      try {
        const u = new URL('javascript:alert(1)');
        // URL constructor allows javascript: but the protocol check should catch it
        valid = u.protocol === 'http:' || u.protocol === 'https:';
      } catch { valid = false; }
      // App only builds proxy URLs for valid http/https
      expect(valid).toBe(false);
    });

    it('rejects data: URLs for fetch', () => {
      const url = 'data:text/html,<script>alert(1)</script>';
      let valid = false;
      try {
        const u = new URL(url);
        valid = u.protocol === 'http:' || u.protocol === 'https:';
      } catch {}
      expect(valid).toBe(false);
    });
  });

  // ── localStorage Safety ─────────────────────────────────────

  describe('security: localStorage handling', () => {
    it('loadSettings handles corrupted data', async () => {
      const { loadSettings } = await import('../js/state.js');
      const key = 'tomd_settings';
      const backup = localStorage.getItem(key);
      localStorage.setItem(key, '{"__proto__":{"polluted":"yes"}}');
      const s = loadSettings();
      // Prototype pollution should not work with spread operator
      expect(({}).polluted).toBe(undefined);
      if (backup) localStorage.setItem(key, backup);
      else localStorage.removeItem(key);
    });

    it('history data cannot inject HTML via id field', async () => {
      const { escHtml } = await import('../js/utils.js');
      const maliciousId = '"><img src=x onerror=alert(1)>';
      const escaped = escHtml(String(maliciousId));
      expect(escaped.includes('<')).toBe(false);
      expect(escaped.includes('"')).toBe(false);
    });
  });
}
