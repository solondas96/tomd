import { describe, expect, it, vi } from 'vitest';
import { createOcrSession, type OcrWorkerLike } from '../../src/lib/vendor/ocr-session';

const IMAGE = new Blob(['x']);

function fakeWorker(recognize: OcrWorkerLike['recognize']) {
  const terminate = vi.fn(async () => undefined);
  const worker: OcrWorkerLike = { recognize, terminate };
  return { worker, terminate };
}

describe('createOcrSession', () => {
  it('returns recognised text and terminates the worker on dispose', async () => {
    const { worker, terminate } = fakeWorker(async () => ({ data: { text: 'hello' } }));
    const session = await createOcrSession('eng', new AbortController().signal, async () => worker);
    expect(await session.recognize(IMAGE)).toBe('hello');
    await session.dispose();
    await session.dispose(); // idempotent
    expect(terminate).toHaveBeenCalledTimes(1);
  });

  it('cancelling stops a stuck recognition immediately and terminates the worker', async () => {
    // Tesseract never settles a pending job once its worker is terminated.
    const { worker, terminate } = fakeWorker(() => new Promise(() => {}));
    const controller = new AbortController();
    const session = await createOcrSession('eng', controller.signal, async () => worker);
    const pending = session.recognize(IMAGE);
    controller.abort();
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
    expect(terminate).toHaveBeenCalledTimes(1);
  });

  it('rejects at once when the signal was already aborted', async () => {
    const { worker } = fakeWorker(async () => ({ data: { text: 'late' } }));
    const controller = new AbortController();
    const session = await createOcrSession('eng', controller.signal, async () => worker);
    controller.abort();
    await expect(session.recognize(IMAGE)).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('releases a worker that finishes starting after cancellation', async () => {
    const { worker, terminate } = fakeWorker(async () => ({ data: { text: '' } }));
    const controller = new AbortController();
    let finishStart: (worker: OcrWorkerLike) => void = () => {};
    const starting = new Promise<OcrWorkerLike>((resolve) => (finishStart = resolve));
    const creation = createOcrSession('eng', controller.signal, () => starting);
    controller.abort();
    await expect(creation).rejects.toMatchObject({ name: 'AbortError' });
    finishStart(worker);
    await vi.waitFor(() => expect(terminate).toHaveBeenCalledTimes(1));
  });

  it('propagates a start-up failure', async () => {
    await expect(
      createOcrSession('eng', new AbortController().signal, async () => {
        throw new Error('no wasm');
      }),
    ).rejects.toThrow('no wasm');
  });
});
