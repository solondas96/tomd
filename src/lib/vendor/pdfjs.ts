import type * as PdfJs from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

let pdfJsPromise: Promise<typeof PdfJs> | null = null;

/**
 * Lazily loads PDF.js from the bundled npm package and points it at the bundled worker.
 *
 * Purpose: single place that knows how PDF.js is loaded, so no code fetches it from a CDN.
 * Returns: the PDF.js module; the import is cached after the first call.
 * Throws: Error if the chunk cannot be fetched (e.g. offline before first load).
 */
export function loadPdfJs(): Promise<typeof PdfJs> {
  if (!pdfJsPromise) {
    pdfJsPromise = import('pdfjs-dist')
      .then((pdfjs) => {
        pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
        return pdfjs;
      })
      .catch((err: unknown) => {
        pdfJsPromise = null; // allow a retry after a transient failure
        throw err;
      });
  }
  return pdfJsPromise;
}
