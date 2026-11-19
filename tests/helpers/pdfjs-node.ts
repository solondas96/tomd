import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import type * as PdfJs from 'pdfjs-dist';

const require = createRequire(import.meta.url);
let pdfJsPromise: Promise<typeof PdfJs> | null = null;

/**
 * Test-only stand-in for `src/lib/vendor/pdfjs` (aliased in vitest.config.ts).
 *
 * Purpose: PDF.js's browser build expects a bundler-provided worker URL; in Node the
 * legacy build with a file-URL worker runs the same text-extraction code.
 */
export function loadPdfJs(): Promise<typeof PdfJs> {
  pdfJsPromise ??= import('pdfjs-dist/legacy/build/pdf.mjs').then((pdfjs) => {
    pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(require.resolve('pdfjs-dist/legacy/build/pdf.worker.mjs')).href;
    return pdfjs as unknown as typeof PdfJs;
  });
  return pdfJsPromise;
}
