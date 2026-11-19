import { extractHeadings } from './headings';

/** A converted document to include in a merged file. */
export interface MergeItem {
  filename: string;
  markdown: string;
}

const MERGED_TITLE = '# Merged Documents';
const SECTION_SEPARATOR = '\n\n---\n\n';

function buildDocument(
  items: readonly MergeItem[],
  hrefs: readonly string[],
): { text: string; sectionLines: number[] } {
  const toc = items.map((item, index) => `${index + 1}. [${item.filename}](${hrefs[index]})`).join('\n');
  const prefix = `${MERGED_TITLE}\n\n${toc}${SECTION_SEPARATOR}`;
  const sectionLines: number[] = [];
  let text = prefix;
  items.forEach((item, index) => {
    if (index > 0) text += SECTION_SEPARATOR;
    sectionLines.push(text.split('\n').length - 1);
    text += `## ${item.filename}\n\n${item.markdown}`;
  });
  return { text, sectionLines };
}

/**
 * Merges several documents into one Markdown file with a linked table of contents.
 *
 * Purpose: each document gets a plain `## filename` heading (no `{#id}` syntax, which Markdown
 * renderers print literally); TOC links use the same de-duplicated slugs the headings get.
 * Params: items - the documents, in output order.
 * Returns: the merged Markdown; an empty string when there is nothing to merge.
 */
export function buildMergedMarkdown(items: readonly MergeItem[]): string {
  if (items.length === 0) return '';
  // Two passes: link text length never changes line numbers, so the draft tells us each section's slug.
  const draft = buildDocument(
    items,
    items.map(() => '#'),
  );
  const slugByLine = new Map(extractHeadings(draft.text).map((heading) => [heading.line, heading.slug]));
  const hrefs = draft.sectionLines.map((line) => `#${slugByLine.get(line) ?? ''}`);
  return buildDocument(items, hrefs).text;
}
