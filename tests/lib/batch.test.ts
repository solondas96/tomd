import { describe, expect, it } from 'vitest';
import { isAbortError, runBatch, type BatchCallbacks } from '../../src/lib/batch';

function recorder() {
  const events: string[] = [];
  const callbacks: BatchCallbacks<string> = {
    onStart: (index) => events.push(`start:${index}`),
    onDone: (index, result) => events.push(`done:${index}:${result}`),
    onError: (index, error) => events.push(`error:${index}:${(error as Error).message}`),
    onCancelled: (indexes) => events.push(`cancelled:${indexes.join(',')}`),
  };
  return { events, callbacks };
}

const abortError = () => new DOMException('Aborted', 'AbortError');

describe('runBatch', () => {
  it('converts every item in order', async () => {
    const { events, callbacks } = recorder();
    const summary = await runBatch(
      ['a', 'b'],
      async (item) => item.toUpperCase(),
      new AbortController().signal,
      callbacks,
    );
    expect(events).toEqual(['start:0', 'done:0:A', 'start:1', 'done:1:B']);
    expect(summary).toEqual({ done: 2, failed: 0, cancelled: 0 });
  });

  it('records a failure and carries on with the next item', async () => {
    const { events, callbacks } = recorder();
    const summary = await runBatch(
      ['a', 'bad', 'c'],
      async (item) => {
        if (item === 'bad') throw new Error('boom');
        return item;
      },
      new AbortController().signal,
      callbacks,
    );
    expect(events).toEqual(['start:0', 'done:0:a', 'start:1', 'error:1:boom', 'start:2', 'done:2:c']);
    expect(summary).toEqual({ done: 2, failed: 1, cancelled: 0 });
  });

  it('stops within one file: the in-flight item and everything queued are cancelled, nothing else starts', async () => {
    const controller = new AbortController();
    const { events, callbacks } = recorder();
    const items = Array.from({ length: 10 }, (_, index) => `f${index}`);
    const summary = await runBatch(
      items,
      async (item, index, signal) => {
        if (index === 3) {
          controller.abort(); // user clicks Cancel while file 3 is converting
          signal.throwIfAborted(); // the converter notices at its next boundary
        }
        return item;
      },
      controller.signal,
      callbacks,
    );
    expect(events.filter((event) => event.startsWith('start'))).toEqual(['start:0', 'start:1', 'start:2', 'start:3']);
    expect(events.at(-1)).toBe('cancelled:3,4,5,6,7,8,9');
    expect(summary).toEqual({ done: 3, failed: 0, cancelled: 7 });
  });

  it('cancels everything when aborted before the first item', async () => {
    const controller = new AbortController();
    controller.abort();
    const { events, callbacks } = recorder();
    const summary = await runBatch(['a', 'b'], async (item) => item, controller.signal, callbacks);
    expect(events).toEqual(['cancelled:0,1']);
    expect(summary.cancelled).toBe(2);
  });

  it('treats an AbortError from the converter as cancellation, not as a failure', async () => {
    const { events, callbacks } = recorder();
    await runBatch(
      ['a', 'b'],
      async () => {
        throw abortError();
      },
      new AbortController().signal,
      callbacks,
    );
    expect(events).toEqual(['start:0', 'cancelled:0,1']);
  });

  it('handles an empty list', async () => {
    const { events, callbacks } = recorder();
    expect(await runBatch([], async () => 'x', new AbortController().signal, callbacks)).toEqual({
      done: 0,
      failed: 0,
      cancelled: 0,
    });
    expect(events).toEqual([]);
  });
});

describe('isAbortError', () => {
  it('recognises AbortError only', () => {
    expect(isAbortError(abortError())).toBe(true);
    expect(isAbortError(new Error('x'))).toBe(false);
    expect(isAbortError('AbortError')).toBe(false);
  });
});
