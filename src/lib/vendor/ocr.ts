import type { Worker as TesseractWorker } from 'tesseract.js';
import tesseractWorkerUrl from 'tesseract.js/dist/worker.min.js?url';
import tesseractCoreUrl from 'tesseract.js-core/tesseract-core-simd-lstm.wasm.js?url';

/**
 * Creates a Tesseract OCR worker whose worker script and WASM core are served from this app.
 *
 * Purpose: keep the OCR engine off third-party CDNs. Only the trained language data
 * (`<lang>.traineddata`) is still downloaded, and only when the user has enabled OCR.
 * The SIMD + LSTM-only core is used; every current evergreen browser supports WASM SIMD.
 * Params: lang - Tesseract language code, e.g. `eng`.
 * Returns: a ready worker; the caller must call `terminate()` on it.
 * Throws: Error if the engine or the language data cannot be loaded.
 */
export async function createOcrWorker(lang: string): Promise<TesseractWorker> {
  const { createWorker, OEM } = await import('tesseract.js');
  return createWorker(lang, OEM.LSTM_ONLY, {
    workerPath: new URL(tesseractWorkerUrl, document.baseURI).href,
    corePath: new URL(tesseractCoreUrl, document.baseURI).href,
  });
}
