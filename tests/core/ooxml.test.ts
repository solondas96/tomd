import { describe, expect, it } from 'vitest';
import { extractSlideParagraphs } from '../../src/core/ooxml';

const wrap = (body: string) =>
  `<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:cSld><p:spTree>${body}</p:spTree></p:cSld></p:sld>`;

describe('extractSlideParagraphs', () => {
  it('decodes XML entities', () => {
    expect(
      extractSlideParagraphs(wrap('<a:p><a:r><a:t>R&amp;D &lt;draft&gt; &#169; &quot;q&quot;</a:t></a:r></a:p>')),
    ).toEqual(['R&D <draft> © "q"']);
  });

  it('reads <a:t> elements that carry attributes', () => {
    expect(extractSlideParagraphs(wrap('<a:p><a:r><a:t xml:space="preserve"> padded </a:t></a:r></a:p>'))).toEqual([
      ' padded ',
    ]);
  });

  it('joins runs of one paragraph and separates paragraphs', () => {
    const xml = wrap(
      '<a:p><a:r><a:t>Hello </a:t></a:r><a:r><a:t>world</a:t></a:r></a:p><a:p><a:r><a:t>Next</a:t></a:r></a:p>',
    );
    expect(extractSlideParagraphs(xml)).toEqual(['Hello world', 'Next']);
  });

  it('works whatever namespace prefix the file uses', () => {
    const xml = `<s:sld xmlns:d="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:s="http://schemas.openxmlformats.org/presentationml/2006/main"><d:p><d:r><d:t>Prefixed</d:t></d:r></d:p></s:sld>`;
    expect(extractSlideParagraphs(xml)).toEqual(['Prefixed']);
  });

  it('skips empty paragraphs and ignores look-alike tags in other namespaces', () => {
    const xml = wrap('<a:p><a:r><a:t></a:t></a:r></a:p><x:p xmlns:x="urn:other"><x:t>nope</x:t></x:p>');
    expect(extractSlideParagraphs(xml)).toEqual([]);
  });

  it('throws a clear error for malformed XML instead of returning garbage', () => {
    expect(() => extractSlideParagraphs('<a:p><a:t>oops')).toThrow(/not valid XML/);
  });
});
