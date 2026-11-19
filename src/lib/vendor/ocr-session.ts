import { createOcrWorker } from './ocr';

/** What a Tesseract worker must offer; a structural type so tests can supply a fake. */
export interface OcrWorkerLike {
  recognize(image: Blob | HTMLCanvasElement): Promise<{ data: { text: string } }>;
  terminate(): Promise<unknown>;
}

export type OcrWorkerFactory = (lang: string) => Promise<OcrWorkerLike>;

/** An OCR engine bound to one conversion; reuse it for every page, then `dispose()` it. */
export interface OcrSession {
  /** Returns the recognised text. Rejects with the signal's reason if cancelled. */
  recognize(image: Blob | HTMLCanvasElement): Promise<string>;
  dispose(): Promise<void>;
}

/**
 * Settles with `promise`, or rejects with the signal's reason as soon as the signal aborts.
 *
 * Purpose: terminating a Tesseract worker leaves its pending `recognize()` promise unresolved
 * forever, so cancellation has to race the job instead of waiting for it.
 * Params: onLateValue - called with the value if it arrives after an abort, so it can be released.
 */
function raceAbort<T>(promise: Promise<T>, signal: AbortSignal, onLateValue?: (value: T) => void): Promise<T> {
  const ignoreAfterAbort = (error: unknown) => console.warn('[OCR] Ignored error after cancellation:', error);
  if (signal.aborted) {
    promise.then(onLateValue, ignoreAfterAbort);
    return Promise.reject(signal.reason);
  }
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(signal.reason);
    signal.addEventListener('abort', onAbort, { once: true });
    promise.then(
      (value) => {
        signal.removeEventListener('abort', onAbort);
        if (signal.aborted) onLateValue?.(value);
        else resolve(value);
      },
      (error: unknown) => {
        signal.removeEventListener('abort', onAbort);
        if (signal.aborted) ignoreAfterAbort(error);
        else reject(error);
      },
    );
  });
}

/**
 * Starts an OCR worker that is terminated as soon as the signal aborts.
 *
 * Params: lang - Tesseract language code; signal - cancellation; createWorker - injectable for tests.
 * Returns: a session; the caller must `dispose()` it (it is safe to call more than once).
 * Throws: the signal's reason if cancelled while the engine was starting; Error if it cannot start.
 */
export async function createOcrSession(
  lang: string,
  signal: AbortSignal,
  createWorker: OcrWorkerFactory = createOcrWorker,
): Promise<OcrSession> {
  const terminate = (worker: OcrWorkerLike) =>
    worker.terminate().catch((error: unknown) => console.warn('[OCR] Failed to terminate worker:', error));

  const worker = await raceAbort(createWorker(lang), signal, terminate);
  let disposed = false;
  const dispose = async () => {
    if (disposed) return;
    disposed = true;
    signal.removeEventListener('abort', dispose);
    await terminate(worker);
  };
  signal.addEventListener('abort', dispose, { once: true });

  return {
    async recognize(image) {
      const result = await raceAbort(worker.recognize(image), signal);
      return result.data.text;
    },
    dispose,
  };
}
