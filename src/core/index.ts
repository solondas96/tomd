// Public surface of the conversion core. UI code imports from here only.
export {
  convertFile,
  findConverter,
  getFileExtension,
  isSupported,
  supportedExtensions,
  UnsupportedFormatError,
} from './registry';
export { htmlPageToMarkdown } from './html';
export { FormatId } from './types';
export type { ConversionContext, Converter, ConverterInput, Progress } from './types';
