import { slugify } from './utils';
import type { HeadingItem } from '../types';

const ATX_HEADING = /^ {0,3}(#{1,6})[ \t]+(.+?)(?:[ \t]+#+)?[ \t]*$/;
const FENCE_OPEN = /^ {0,3}(`{3,}|~{3,})/;
const FALLBACK_SLUG = 'section';

/**
 * Prefix for rendered heading ids. Without it DOMPurify strips ids that match built-in DOM property
 * names (`part`, `title`, `name`, `location`, ...) and headings could collide with the app's own ids.
 */
const HEADING_ID_PREFIX = 'md-';

/** Element id used for a heading's slug in the rendered Preview. */
export function headingElementId(slug: string): string {
  return `${HEADING_ID_PREFIX}${slug}`;
}

/**
 * Reduces a heading's Markdown source to its visible text.
 *
 * Purpose: the TOC label and the slug must come from the same text as the rendered heading.
 * Params: raw - heading text as written (may contain links, emphasis, code spans, HTML).
 * Returns: plain text.
 */
export function plainHeadingText(raw: string): string {
  return raw
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/[*_`~]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Creates a slug generator that never repeats a slug (`intro`, `intro-1`, `intro-2`, ...).
 *
 * Returns: a function mapping heading text to its unique slug; call it once per heading, in document order.
 */
export function createSlugger(): (text: string) => string {
  const used = new Set<string>();
  return (text) => {
    const base = slugify(text) || FALLBACK_SLUG;
    let candidate = base;
    for (let suffix = 1; used.has(candidate); suffix++) candidate = `${base}-${suffix}`;
    used.add(candidate);
    return candidate;
  };
}

/**
 * Finds every ATX heading (`# ...` to `###### ...`) outside fenced code blocks.
 *
 * Params: markdown - the document source.
 * Returns: headings in document order with unique slugs, matching the ids the Preview renders.
 *   Setext headings (underlined with `===`) are not listed; the converters never produce them.
 */
export function extractHeadings(markdown: string): HeadingItem[] {
  const headings: HeadingItem[] = [];
  const slugFor = createSlugger();
  let openFence: string | null = null;

  markdown.split('\n').forEach((line, index) => {
    const fence = FENCE_OPEN.exec(line)?.[1];
    if (fence) {
      if (openFence === null) openFence = fence[0];
      else if (fence[0] === openFence) openFence = null;
      return;
    }
    if (openFence !== null) return;
    const match = ATX_HEADING.exec(line);
    if (!match) return;
    const text = plainHeadingText(match[2]);
    headings.push({ level: match[1].length, text, line: index, slug: slugFor(text) });
  });
  return headings;
}
