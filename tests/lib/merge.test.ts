import { describe, expect, it } from 'vitest';
import { extractHeadings } from '../../src/lib/headings';
import { buildMergedMarkdown } from '../../src/lib/merge';

const items = [
  { filename: 'a.pdf', markdown: '# Intro\n\nBody A' },
  { filename: 'b.docx', markdown: '## a-pdf\n\nBody B' },
];

describe('buildMergedMarkdown', () => {
  it('returns an empty string for no items', () => {
    expect(buildMergedMarkdown([])).toBe('');
  });

  it('emits plain "## name" headings with no {#id} syntax', () => {
    const merged = buildMergedMarkdown(items);
    expect(merged).not.toContain('{#');
    expect(merged).toContain('\n## a.pdf\n');
    expect(merged).toContain('\n## b.docx\n');
  });

  it('links every TOC entry to the slug of its own section heading', () => {
    const merged = buildMergedMarkdown(items);
    const headings = extractHeadings(merged);
    const sections = headings.filter((heading) => heading.level === 2 && ['a.pdf', 'b.docx'].includes(heading.text));
    const links = [...merged.matchAll(/^\d+\. \[[^\]]+\]\(#([^)]*)\)$/gm)].map((match) => match[1]);
    expect(links).toEqual(sections.map((section) => section.slug));
  });

  it('de-duplicates links when document headings collide with filename slugs', () => {
    // "## a-pdf" inside b.docx is slugified before nothing else, but a second "a.pdf" must become a-pdf-N.
    const merged = buildMergedMarkdown([...items, { filename: 'a.pdf', markdown: 'again' }]);
    const links = [...merged.matchAll(/^\d+\. \[[^\]]+\]\(#([^)]*)\)$/gm)].map((match) => match[1]);
    expect(new Set(links).size).toBe(links.length);
    expect(links).toHaveLength(3);
  });

  it('keeps each document body intact, separated by rules', () => {
    const merged = buildMergedMarkdown(items);
    expect(merged).toContain('## a.pdf\n\n# Intro\n\nBody A\n\n---\n\n## b.docx');
  });
});
