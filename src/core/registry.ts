import { convertPdf } from './converters/pdf';
import {
  convertCsv,
  convertDocx,
  convertEpub,
  convertHtml,
  convertImage,
  convertJson,
  convertLatex,
  convertPptx,
  convertRtf,
  convertText,
  convertXlsx,
  convertXml,
} from './converters/formats';
import type { ConversionResult } from '../types';
import { FormatId, type ConversionContext, type Converter, type ConverterInput } from './types';

const CONVERTERS: readonly Converter[] = [
  { id: FormatId.Pdf, extensions: ['pdf'], convert: convertPdf },
  { id: FormatId.Docx, extensions: ['docx'], convert: convertDocx },
  { id: FormatId.Pptx, extensions: ['pptx'], convert: convertPptx },
  { id: FormatId.Xlsx, extensions: ['xlsx', 'xls'], convert: convertXlsx },
  { id: FormatId.Csv, extensions: ['csv', 'tsv'], convert: convertCsv },
  { id: FormatId.Html, extensions: ['html', 'htm'], convert: convertHtml },
  { id: FormatId.Epub, extensions: ['epub'], convert: convertEpub },
  { id: FormatId.Rtf, extensions: ['rtf'], convert: convertRtf },
  { id: FormatId.Text, extensions: ['txt', 'md', 'markdown'], convert: convertText },
  { id: FormatId.Latex, extensions: ['tex', 'latex'], convert: convertLatex },
  { id: FormatId.Xml, extensions: ['xml'], convert: convertXml },
  { id: FormatId.Json, extensions: ['json'], convert: convertJson },
  {
    id: FormatId.Image,
    extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'tiff', 'tif'],
    convert: convertImage,
  },
];

const CONVERTER_BY_EXTENSION: ReadonlyMap<string, Converter> = new Map(
  CONVERTERS.flatMap((converter) => converter.extensions.map((extension) => [extension, converter] as const)),
);

/** Raised when no converter is registered for a file's extension. */
export class UnsupportedFormatError extends Error {
  constructor(filename: string) {
    super(`Unsupported format: ${filename}`);
    this.name = 'UnsupportedFormatError';
  }
}

/**
 * Returns the lower-case extension of a file name, without the dot.
 *
 * Params: file - anything with a `name`.
 * Returns: the extension, or an empty string when the name has none.
 */
export function getFileExtension(file: { name: string }): string {
  const dot = file.name.lastIndexOf('.');
  return dot < 0 ? '' : file.name.slice(dot + 1).toLowerCase();
}

/**
 * Looks up the converter for a file by extension.
 *
 * Returns: the converter, or `undefined` if the format is unsupported.
 */
export function findConverter(file: { name: string }): Converter | undefined {
  return CONVERTER_BY_EXTENSION.get(getFileExtension(file));
}

/** Returns true when a converter is registered for the file's extension. */
export function isSupported(file: { name: string }): boolean {
  return findConverter(file) !== undefined;
}

/** All registered extensions (lower-case, no dot), for building file-picker filters. */
export function supportedExtensions(): string[] {
  return [...CONVERTER_BY_EXTENSION.keys()];
}

/**
 * Converts a file to Markdown with the converter registered for its extension.
 *
 * Params: input - the file; ctx - options, abort signal and progress callback.
 * Returns: the conversion result.
 * Throws: UnsupportedFormatError for unknown extensions; the signal's reason
 *   (an `AbortError`) when cancelled; any converter-specific Error.
 */
export async function convertFile(input: ConverterInput, ctx: ConversionContext): Promise<ConversionResult> {
  const converter = findConverter(input);
  if (!converter) throw new UnsupportedFormatError(input.name);
  ctx.signal.throwIfAborted();
  return converter.convert(input, ctx);
}
