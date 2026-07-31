import { describe, it, expect } from './framework.js';

export default function testServiceWorker() {
  describe('sw.js: cache configuration', () => {
    it('CACHE version is defined', async () => {
      const text = await fetch('/sw.js').then(r => r.text());
      expect(text).toContain("const CACHE = 'tomd-v");
    });

    it('ASSETS includes index.html', async () => {
      const text = await fetch('/sw.js').then(r => r.text());
      expect(text).toContain('./index.html');
    });

    it('ASSETS includes css/style.css', async () => {
      const text = await fetch('/sw.js').then(r => r.text());
      expect(text).toContain('./css/style.css');
    });

    it('ASSETS includes js/main.js', async () => {
      const text = await fetch('/sw.js').then(r => r.text());
      expect(text).toContain('./js/main.js');
    });

    it('ASSETS includes all module files', async () => {
      const text = await fetch('/sw.js').then(r => r.text());
      const expected = [
        './js/config.js', './js/state.js', './js/utils.js',
        './js/dom.js', './js/ui.js', './js/file-handler.js',
        './js/features.js', './js/converters/index.js',
        './js/converters/pdf.js', './js/converters/formats.js',
      ];
      for (const path of expected) {
        expect(text).toContain(path);
      }
    });

    it('ASSETS includes CDN scripts', async () => {
      const text = await fetch('/sw.js').then(r => r.text());
      expect(text).toContain('pdf.min.js');
      expect(text).toContain('pdf.worker.min.js');
      expect(text).toContain('marked');
      expect(text).toContain('purify');
    });
  });

  describe('sw.js: caching strategy', () => {
    it('uses allSettled for resilient install', async () => {
      const text = await fetch('/sw.js').then(r => r.text());
      expect(text).toContain('Promise.allSettled');
    });

    it('only caches same-origin (basic) responses', async () => {
      const text = await fetch('/sw.js').then(r => r.text());
      expect(text).toContain("resp.type === 'basic'");
    });

    it('cleans up old caches on activate', async () => {
      const text = await fetch('/sw.js').then(r => r.text());
      expect(text).toContain('caches.delete');
    });

    it('returns 503 on offline fetch failure', async () => {
      const text = await fetch('/sw.js').then(r => r.text());
      expect(text).toContain('503');
    });
  });
}
