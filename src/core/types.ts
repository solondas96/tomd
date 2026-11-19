import type { ConversionOptions, ConversionResult } from '../types';

/** Stable identifiers for every supported input format. */
export enum FormatId {
  Pdf = 'pdf',
  Docx = 'docx',
  Pptx = 'pptx',
  Xlsx = 'xlsx',
  Csv = 'csv',
  Html = 'html',
  Epub = 'epub',
  Rtf = 'rtf',
  Image = 'image',
  Text = 'text',
  Latex = 'latex',
  Xml = 'xml',
  Json = 'json',
}

/** A file-like input. `File` satisfies this, as do Blobs with a name in Node. */
export type ConverterInput = Blob & { readonly name: string };

/** Progress report; `fraction` is in the range 0..1. */
export interface Progress {
  fraction: number;
  message: string;
}

/** Everything a converter needs besides the input itself. */
export interface ConversionContext {
  options: ConversionOptions;
  /** Converters must call `signal.throwIfAborted()` at every page, slide or chapter boundary. */
  signal: AbortSignal;
  onProgress(progress: Progress): void;
}

export interface Converter {
  id: FormatId;
  /** Lower-case extensions without the dot. */
  extensions: readonly string[];
  convert(input: ConverterInput, ctx: ConversionContext): Promise<ConversionResult>;
}
