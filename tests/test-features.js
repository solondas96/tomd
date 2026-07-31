import { describe, it, expect } from './framework.js';

export default function testFeatures() {
  describe('features: URL validation', () => {
    it('valid URL passes', () => {
      let valid = true;
      try { new URL('https://example.com'); } catch { valid = false; }
      expect(valid).toBe(true);
    });

    it('invalid URL throws', () => {
      let valid = true;
      try { new URL('not a url'); } catch { valid = false; }
      expect(valid).toBe(false);
    });

    it('URL without protocol throws', () => {
      let valid = true;
      try { new URL('example.com'); } catch { valid = false; }
      expect(valid).toBe(false);
    });

    it('URL with spaces throws', () => {
      let valid = true;
      try { new URL('not a valid url at all'); } catch { valid = false; }
      expect(valid).toBe(false);
    });

    it('file:// URL passes', () => {
      let valid = true;
      try { new URL('file:///path/to/file'); } catch { valid = false; }
      expect(valid).toBe(true);
    });
  });

  describe('features: proxy URL construction', () => {
    it('corsproxy.io format', () => {
      const url = 'https://example.com/page?q=1';
      const proxy = `https://corsproxy.io/?${encodeURIComponent(url)}`;
      expect(proxy).toContain('corsproxy.io');
      expect(proxy).toContain(encodeURIComponent(url));
    });

    it('allorigins format', () => {
      const url = 'https://example.com';
      const proxy = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
      expect(proxy).toContain('allorigins.win');
    });

    it('encodes special characters in URL', () => {
      const url = 'https://example.com/path?a=1&b=2';
      const encoded = encodeURIComponent(url);
      expect(encoded).toContain('%3A');
      expect(encoded).toContain('%26');
    });
  });

  describe('features: AbortSignal.timeout', () => {
    it('AbortSignal.timeout creates a signal', () => {
      const signal = AbortSignal.timeout(5000);
      expect(signal.aborted).toBe(false);
    });

    it('times out and aborts', async () => {
      const signal = AbortSignal.timeout(50);
      await new Promise(r => setTimeout(r, 100));
      expect(signal.aborted).toBe(true);
    });
  });

  describe('features: HTML title extraction', () => {
    function extractHtmlTitle(html) {
      const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
      return m ? m[1].trim().replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>') : '';
    }

    it('extracts simple title', () => {
      expect(extractHtmlTitle('<html><head><title>Hello</title></head></html>')).toBe('Hello');
    });

    it('returns empty for no title', () => {
      expect(extractHtmlTitle('<html><head></head></html>')).toBe('');
    });

    it('decodes HTML entities in title', () => {
      expect(extractHtmlTitle('<title>A &amp; B</title>')).toBe('A & B');
    });

    it('handles multiline title', () => {
      expect(extractHtmlTitle('<title>\n  My Page\n</title>')).toBe('My Page');
    });

    it('handles title with attributes', () => {
      expect(extractHtmlTitle('<title lang="en">Test</title>')).toBe('Test');
    });
  });

  describe('features: clipboard paste detection', () => {
    it('identifies image items', () => {
      const items = [
        { type: 'text/plain', getAsFile: () => null },
        { type: 'image/png', getAsFile: () => new Blob() },
      ];
      const imgItem = items.find(i => i.type.startsWith('image/'));
      expect(imgItem).toBeTruthy();
      expect(imgItem.type).toBe('image/png');
    });

    it('returns undefined when no image', () => {
      const items = [{ type: 'text/plain', getAsFile: () => null }];
      const imgItem = items.find(i => i.type.startsWith('image/'));
      expect(imgItem).toBe(undefined);
    });

    it('detects rich HTML paste', () => {
      const htmlData = '<div><p>Rich content with lots of HTML markup inside the element</p></div>';
      expect(htmlData.length > 50).toBe(true);
    });

    it('ignores short HTML', () => {
      const htmlData = '<br>';
      expect(htmlData.length > 50).toBe(false);
    });
  });
}
