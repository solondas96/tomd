/** Bullet glyphs PDF producers commonly emit as text. */
const BULLET_GLYPHS = '-•*–—·▪◦‣';

/** `1.` / `12)` style ordered markers (at most 3 digits, so a year like `2024 ` is never a marker). */
const ORDERED_MARKER = /^\d{1,3}[.)]\s/;

const BULLET_MARKER = new RegExp(`^[${BULLET_GLYPHS}]\\s`);

/**
 * Tells whether a line of text starts a list item.
 *
 * Purpose: a line that merely begins with a digit or a minus sign ("2024 was a record year",
 * "-5 degrees") is prose, not a list item.
 * Params: text - one line, already trimmed.
 * Returns: true for `1. `, `2) `, or a bullet glyph followed by a space.
 */
export function isListItemText(text: string): boolean {
  return ORDERED_MARKER.test(text) || BULLET_MARKER.test(text);
}
