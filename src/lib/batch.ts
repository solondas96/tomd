/** True for the error a cancelled operation throws (`signal.throwIfAborted()`, aborted fetch, ...). */
export function isAbortError(error: unknown): boolean {
  // Structural check: a DOMException is not an `Error` instance in every environment (e.g. jsdom).
  return typeof error === 'object' && error !== null && (error as { name?: unknown }).name === 'AbortError';
}

/** Callbacks the runner uses to report progress; indexes refer to the input list. */
export interface BatchCallbacks<TResult> {
  onStart(index: number): void;
  onDone(index: number, result: TResult): void;
  onError(index: number, error: unknown): void;
  /** Called once with every item that did not finish because of cancellation (the in-flight one and all queued). */
  onCancelled(indexes: number[]): void;
}

export interface BatchSummary {
  done: number;
  failed: number;
  cancelled: number;
}

/**
 * Converts items one after another, stopping promptly when the signal aborts.
 *
 * Purpose: one shared signal cancels the whole batch; at most the in-flight item is abandoned
 * and nothing queued is started.
 * Params: items - the work list; convertOne - converts one item (must honour the signal);
 *   signal - shared cancellation; callbacks - progress reporting.
 * Returns: how many items finished, failed and were cancelled.
 */
export async function runBatch<TItem, TResult>(
  items: readonly TItem[],
  convertOne: (item: TItem, index: number, signal: AbortSignal) => Promise<TResult>,
  signal: AbortSignal,
  callbacks: BatchCallbacks<TResult>,
): Promise<BatchSummary> {
  const summary: BatchSummary = { done: 0, failed: 0, cancelled: 0 };
  const cancelFrom = (index: number) => {
    const indexes = items.slice(index).map((_, offset) => index + offset);
    summary.cancelled = indexes.length;
    callbacks.onCancelled(indexes);
  };

  for (let index = 0; index < items.length; index++) {
    if (signal.aborted) return (cancelFrom(index), summary);
    callbacks.onStart(index);
    try {
      callbacks.onDone(index, await convertOne(items[index], index, signal));
      summary.done++;
    } catch (error) {
      if (signal.aborted || isAbortError(error)) return (cancelFrom(index), summary);
      summary.failed++;
      callbacks.onError(index, error);
    }
  }
  return summary;
}
