import { describe, expect, it } from 'vitest';
import { createSlugger, extractHeadings, headingElementId, plainHeadingText } from '../../src/lib/headings';
import { lineRange } from '../../src/lib/textarea';
import { slugify } from '../../src/lib/utils';

describe('slugify', () => {
  it('lower-cases and hyphenates', () => {
    expect(slugify('Hello, World! 2024')).toBe('hello-world-2024');
  });
  it('keeps letters from any script', () => {
    expect(slugify('日本語 Ελληνικά café')).toBe('日本語-ελληνικά-café');
  });
  it('returns an empty string when there is nothing to keep', () => {
    expect(slugify('!!!')).toBe('');
  });
});

describe('createSlugger', () => {
  it('de-duplicates repeated slugs in order', () => {
    const slugFor = createSlugger();
    expect([slugFor('Intro'), slugFor('Intro'), slugFor('intro'), slugFor('Other')]).toEqual([
      'intro',
      'intro-1',
      'intro-2',
      'other',
    ]);
  });
  it('does not collide with a literal "intro-1" heading', () => {
    const slugFor = createSlugger();
    expect([slugFor('Intro'), slugFor('Intro 1'), slugFor('Intro')]).toEqual(['intro', 'intro-1', 'intro-2']);
  });
  it('falls back for symbol-only headings', () => {
    const slugFor = createSlugger();
    expect([slugFor('???'), slugFor('!!!')]).toEqual(['section', 'section-1']);
  });
});

describe('plainHeadingText', () => {
  it('strips links, emphasis, code and html', () => {
    expect(plainHeadingText('A **bold** [link](http://x.y) and `code` <b>b</b>')).toBe('A bold link and code b');
  });
});

describe('extractHeadings', () => {
  const doc = [
    '# Title',
    '',
    'text',
    '## Part',
    '```md',
    '# not a heading',
    '```',
    '## Part',
    '####### seven',
    '### Deep ###',
  ].join('\n');

  it('lists ATX headings with level, line and unique slug', () => {
    expect(extractHeadings(doc)).toEqual([
      { level: 1, text: 'Title', line: 0, slug: 'title' },
      { level: 2, text: 'Part', line: 3, slug: 'part' },
      { level: 2, text: 'Part', line: 7, slug: 'part-1' },
      { level: 3, text: 'Deep', line: 9, slug: 'deep' },
    ]);
  });

  it('ignores headings inside ~~~ fences and unfenced "#hashtag" lines', () => {
    expect(extractHeadings('~~~\n# x\n~~~\n#hashtag')).toEqual([]);
  });
});

describe('lineRange', () => {
  it('returns the character range of a line without its newline', () => {
    expect(lineRange('ab\ncde\nf', 1)).toEqual([3, 6]);
    expect(lineRange('ab\ncde\nf', 2)).toEqual([7, 8]);
  });
  it('returns null past the end', () => {
    expect(lineRange('ab', 3)).toBeNull();
  });
});

describe('headingElementId', () => {
  it('namespaces slugs so they cannot be stripped as DOM property names or clash with app ids', () => {
    expect(headingElementId('part')).toBe('md-part');
    expect(headingElementId('root')).toBe('md-root');
  });
});
