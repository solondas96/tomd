import { describe, expect, it } from 'vitest';
import { arrayToMdTable, parseCsv } from '../../../src/lib/converters/formats';

describe('parseCsv', () => {
  it('parses simple comma-separated rows', () => {
    expect(parseCsv('a,b\n1,2')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });

  it('keeps separators and newlines inside quoted cells', () => {
    expect(parseCsv('a,b\n"x,y","line1\nline2"')).toEqual([
      ['a', 'b'],
      ['x,y', 'line1\nline2'],
    ]);
  });

  it('unescapes doubled quotes', () => {
    expect(parseCsv('"say ""hi"""')).toEqual([['say "hi"']]);
  });

  it('handles CRLF line endings and skips blank lines', () => {
    expect(parseCsv('a,b\r\n\r\n1,2\r\n')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });

  it('supports a custom separator and non-ASCII text', () => {
    expect(parseCsv('名前;値\nä;ö', ';')).toEqual([
      ['名前', '値'],
      ['ä', 'ö'],
    ]);
  });

  it('returns no rows for empty input', () => {
    expect(parseCsv('')).toEqual([]);
  });
});

describe('arrayToMdTable', () => {
  it('renders a header, separator and body rows', () => {
    expect(arrayToMdTable([['a', 'b'], ['1', '2']])).toBe('| a | b |\n| --- | --- |\n| 1 | 2 |');
  });

  it('pads short rows to the widest row', () => {
    expect(arrayToMdTable([['a', 'b', 'c'], ['1']])).toBe('| a | b | c |\n| --- | --- | --- |\n| 1 |  |  |');
  });

  it('escapes pipes and tolerates null cells', () => {
    expect(arrayToMdTable([['a|b'], [null]])).toBe('| a\\|b |\n| --- |\n|  |');
  });

  it('returns an empty string for no rows', () => {
    expect(arrayToMdTable([])).toBe('');
  });
});
