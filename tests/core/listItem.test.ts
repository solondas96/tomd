import { describe, expect, it } from 'vitest';
import { isListItemText } from '../../src/core/listItem';

describe('isListItemText', () => {
  it.each(['1. First', '12) Twelfth', '999. Big', '- dash item', '• bullet', '– en dash item', '* star'])(
    'treats "%s" as a list item',
    (line) => expect(isListItemText(line)).toBe(true),
  );

  it.each([
    '2024 was a record year',
    '-5 degrees was the lowest temperature',
    '3 apples and 4 oranges',
    '1990. A year', // four digits: not a marker
    '1.5 million users',
    '10%',
    'plain text',
    '',
    '-',
    '1.',
  ])('treats "%s" as prose', (line) => expect(isListItemText(line)).toBe(false));
});
