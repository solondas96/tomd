import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const fromRoot = (path: string) => fileURLToPath(new URL(path, import.meta.url));

// Kept separate from vite.config.ts so tests do not load the React/Tailwind build plugins.
export default defineConfig({
  resolve: {
    alias: [
      // Node-capable PDF.js loader (the app's loader relies on a bundler-provided worker URL).
      { find: /^.*\/lib\/vendor\/pdfjs$/, replacement: fromRoot('./tests/helpers/pdfjs-node.ts') },
      // Test the same Mammoth build the browser ships; the Node entry rejects `arrayBuffer` input.
      { find: /^mammoth$/, replacement: fromRoot('./node_modules/mammoth/mammoth.browser.js') },
    ],
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['tests/setup/dom-parser.ts'],
    include: ['tests/**/*.test.ts'],
  },
});
