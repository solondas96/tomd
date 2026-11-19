import { describe, expect, it } from 'vitest';
import { buildSearchRegex, findMatches, replaceAllMatches, stepIndex } from '../../src/lib/find';

const plain = { isRegex: false, caseSensitive: false };

describe('findMatches', () => {
  it('finds case-insensitive plain-text matches in order', () => {
    expect(findMatches('Foo foo FOO', 'foo', plain).matches).toEqual([
      { index: 0, length: 3 },
      { index: 4, length: 3 },
      { index: 8, length: 3 },
    ]);
  });

  it('honours the case-sensitive switch', () => {
    expect(findMatches('Foo foo FOO', 'foo', { ...plain, caseSensitive: true }).matches).toEqual([
      { index: 4, length: 3 },
    ]);
  });

  it('treats regex metacharacters literally in plain mode', () => {
    expect(findMatches('a.b axb', 'a.b', plain).matches).toHaveLength(1);
  });

  it('supports regex mode', () => {
    expect(findMatches('a1 b22', '\\d+', { ...plain, isRegex: true }).matches).toEqual([
      { index: 1, length: 1 },
      { index: 4, length: 2 },
    ]);
  });

  it('reports an invalid regex instead of silently returning no matches', () => {
    expect(findMatches('abc', '(', { ...plain, isRegex: true })).toEqual({
      matches: [],
      error: 'Invalid regular expression',
    });
  });

  it('skips zero-length regex matches', () => {
    expect(findMatches('baac', 'a*', { ...plain, isRegex: true }).matches).toEqual([{ index: 1, length: 2 }]);
  });

  it('returns nothing, without an error, for an empty query', () => {
    expect(findMatches('abc', '', plain)).toEqual({ matches: [], error: null });
  });

  it('matches non-ASCII text', () => {
    expect(findMatches('日本語 日本', '日本', plain).matches).toHaveLength(2);
  });
});

describe('buildSearchRegex', () => {
  it('uses the right flags', () => {
    expect(buildSearchRegex('x', plain).regex?.flags).toBe('gi');
    expect(buildSearchRegex('x', { ...plain, caseSensitive: true }).regex?.flags).toBe('g');
  });
});

describe('stepIndex', () => {
  it.each([
    [0, 1, 3, 1],
    [2, 1, 3, 0],
    [0, -1, 3, 2],
    [1, -1, 3, 0],
    [0, 1, 0, -1],
  ])('stepIndex(%s, %s, %s) = %s', (current, delta, size, expected) => {
    expect(stepIndex(current, delta, size)).toBe(expected);
  });
});

describe('replaceAllMatches', () => {
  it('replaces literally in plain mode, even if the replacement contains $ patterns', () => {
    expect(replaceAllMatches('a a', 'a', plain, '$&$&')).toEqual({ text: '$&$& $&$&', count: 2, error: null });
  });

  it('expands group references in regex mode', () => {
    expect(replaceAllMatches('k1 k2', 'k(\\d)', { ...plain, isRegex: true }, 'v$1')).toEqual({
      text: 'v1 v2',
      count: 2,
      error: null,
    });
  });

  it('leaves the text unchanged for an invalid regex', () => {
    expect(replaceAllMatches('abc', '(', { ...plain, isRegex: true }, 'x')).toEqual({
      text: 'abc',
      count: 0,
      error: 'Invalid regular expression',
    });
  });
});
