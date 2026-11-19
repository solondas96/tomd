import { escRegex } from './utils';
import type { FindMatch } from '../types';

export interface SearchOptions {
  isRegex: boolean;
  caseSensitive: boolean;
}

export type SearchRegexResult = { regex: RegExp; error: null } | { regex: null; error: string };

/**
 * Compiles the user's query into a global regular expression.
 *
 * Params: query - the text typed in the find box; options - regex and case-sensitivity switches.
 * Returns: the regex, or a human-readable error when a regex query does not compile or is empty.
 */
export function buildSearchRegex(query: string, { isRegex, caseSensitive }: SearchOptions): SearchRegexResult {
  if (!query) return { regex: null, error: 'Empty query' };
  const flags = caseSensitive ? 'g' : 'gi';
  try {
    return { regex: new RegExp(isRegex ? query : escRegex(query), flags), error: null };
  } catch (error) {
    return { regex: null, error: error instanceof SyntaxError ? 'Invalid regular expression' : 'Invalid search' };
  }
}

export interface FindResult {
  matches: FindMatch[];
  /** Set only when a regex query is invalid; an empty query is not an error. */
  error: string | null;
}

/**
 * Finds every non-empty match of a query in a text.
 *
 * Params: text - the document; query and options as for `buildSearchRegex`.
 * Returns: matches in document order, plus an error message for an invalid regex.
 *   Zero-length matches (e.g. the regex `a*` between letters) are skipped: there is nothing to select.
 */
export function findMatches(text: string, query: string, options: SearchOptions): FindResult {
  if (!query) return { matches: [], error: null };
  const { regex, error } = buildSearchRegex(query, options);
  if (!regex) return { matches: [], error };
  const matches: FindMatch[] = [];
  for (const match of text.matchAll(regex)) {
    if (match[0].length > 0) matches.push({ index: match.index, length: match[0].length });
  }
  return { matches, error: null };
}

/**
 * Moves an index around a list of the given size, wrapping at both ends.
 *
 * Params: current - present index; delta - steps (negative goes back); size - list length.
 * Returns: the new index, or -1 when the list is empty.
 */
export function stepIndex(current: number, delta: number, size: number): number {
  if (size === 0) return -1;
  return (((current + delta) % size) + size) % size;
}

/**
 * Replaces every match of a query.
 *
 * Params: text - the document; query/options as above; replacement - the text to insert.
 * Returns: the new text and the number of replacements. In plain-text mode the replacement is
 *   literal (so `$&` stays `$&`); in regex mode `$1`-style group references work.
 *   An invalid regex leaves the text unchanged and reports the error.
 */
export function replaceAllMatches(
  text: string,
  query: string,
  options: SearchOptions,
  replacement: string,
): { text: string; count: number; error: string | null } {
  const { regex, error } = buildSearchRegex(query, options);
  if (!regex) return { text, count: 0, error };
  const count = findMatches(text, query, options).matches.length;
  // A function replacer inserts text literally; a string replacer expands `$1`, `$&` (regex mode only).
  const replaced = options.isRegex ? text.replace(regex, replacement) : text.replace(regex, () => replacement);
  return { text: replaced, count, error: null };
}
