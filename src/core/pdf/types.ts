/** Emphasis flags of a font. */
export interface FontStyle {
  bold: boolean;
  italic: boolean;
}

/** A piece of text as PDF.js reports it: one font, one position. Coordinates are PDF points, y grows upward. */
export interface TextRun {
  text: string;
  x: number;
  y: number;
  width: number;
  fontSize: number;
  fontName: string;
}

/** Consecutive characters sharing one style. */
export interface Fragment {
  text: string;
  style: FontStyle;
}

/**
 * Text of a line that sits close together (word gaps only). Separate spans on a line are separated
 * by a visible gap, which is what table-column detection looks at.
 */
export interface Span {
  x: number;
  width: number;
  fontSize: number;
  fragments: Fragment[];
}

/** One visual line of text, spans ordered left to right. */
export interface Line {
  y: number;
  fontSize: number;
  spans: Span[];
}
