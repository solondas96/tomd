import type { FontStyle } from './types';

const SUBSET_PREFIX = /^[A-Z]{6}\+/;
const BOLD_NAME = /bold|black|heavy|semibold|demibold|extrabold|ultrabold/i;
const ITALIC_NAME = /italic|oblique|-it\b|-ital\b/i;

/** Style used when a font's real name is unknown. */
export const PLAIN_STYLE: FontStyle = { bold: false, italic: false };

/**
 * Works out bold/italic from a PDF font's real name, e.g. `ABCDEF+Arial-BoldItalicMT`.
 *
 * Purpose: PDF.js hides fonts behind opaque ids (`g_d0_f2`); the real name only appears once the
 * page's operator list has been evaluated, and the name is the only reliable emphasis signal.
 * Params: fontName - the PostScript name, with or without the subset prefix.
 * Returns: the flags; plain when the name says nothing.
 */
export function classifyFont(fontName: string): FontStyle {
  const name = fontName.replace(SUBSET_PREFIX, '');
  return { bold: BOLD_NAME.test(name), italic: ITALIC_NAME.test(name) };
}
