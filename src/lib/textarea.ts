const MIRRORED_STYLES = [
  'boxSizing',
  'width',
  'paddingTop',
  'paddingRight',
  'paddingBottom',
  'paddingLeft',
  'borderTopWidth',
  'borderRightWidth',
  'borderBottomWidth',
  'borderLeftWidth',
  'fontFamily',
  'fontSize',
  'fontWeight',
  'lineHeight',
  'letterSpacing',
  'tabSize',
] as const;

/** Distance in pixels left above a revealed line so it is not flush with the top edge. */
const REVEAL_TOP_MARGIN_PX = 24;

/**
 * Measures the vertical offset of a character index inside a textarea, accounting for soft wrapping.
 *
 * Purpose: `setSelectionRange` does not scroll; a hidden mirror element with identical text metrics tells us where to scroll.
 */
function measureOffsetTop(textarea: HTMLTextAreaElement, index: number): number {
  const mirror = document.createElement('div');
  const computed = getComputedStyle(textarea);
  for (const property of MIRRORED_STYLES) mirror.style[property] = computed[property];
  mirror.style.position = 'absolute';
  mirror.style.visibility = 'hidden';
  mirror.style.whiteSpace = 'pre-wrap';
  mirror.style.overflowWrap = 'break-word';
  mirror.textContent = textarea.value.slice(0, index);
  const marker = document.createElement('span');
  marker.textContent = '​';
  mirror.appendChild(marker);
  document.body.appendChild(mirror);
  const top = marker.offsetTop;
  mirror.remove();
  return top;
}

/**
 * Selects a character range in a textarea and scrolls it into view.
 *
 * Params: textarea - the target; start/end - selection offsets into its value;
 *   focus - move keyboard focus to the textarea (false keeps it where it is, e.g. in the find box).
 */
export function selectAndReveal(textarea: HTMLTextAreaElement, start: number, end: number, focus = true): void {
  if (focus) textarea.focus({ preventScroll: true });
  textarea.setSelectionRange(start, end);
  textarea.scrollTop = Math.max(0, measureOffsetTop(textarea, start) - REVEAL_TOP_MARGIN_PX);
}

/**
 * Returns the character range of a zero-based line, excluding its newline.
 *
 * Params: text - full text; line - zero-based line number.
 * Returns: `[start, end]`, or `null` if the line does not exist.
 */
export function lineRange(text: string, line: number): [number, number] | null {
  let start = 0;
  for (let current = 0; current < line; current++) {
    const newline = text.indexOf('\n', start);
    if (newline < 0) return null;
    start = newline + 1;
  }
  const newline = text.indexOf('\n', start);
  return [start, newline < 0 ? text.length : newline];
}
