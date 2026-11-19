import { FORMAT_MAP } from '../../config';
import { ConversionOptions, ConversionResult } from '../../types';
import { convertPdf } from './pdf';
import {
  convertDocx,
  convertPptx,
  convertXlsx,
  convertCsv,
  convertHtml,
  convertEpub,
  convertRtf,
  convertImage,
  convertText,
  convertLatex,
  convertXml,
  convertJson,
} from './formats';

export function getFileExt(file: { name: string }): string {
  return (file.name.split('.').pop() || '').toLowerCase();
}

export function isSupported(file: { name: string }): boolean {
  return !!FORMAT_MAP[getFileExt(file)];
}

export async function convertFile(
  file: File,
  format: string,
  onProgress: (pct: number, msg: string) => void,
  options: ConversionOptions,
): Promise<ConversionResult> {
  switch (format) {
    case 'pdf':
      return convertPdf(file, onProgress, options);
    case 'docx':
      return convertDocx(file, onProgress);
    case 'pptx':
      return convertPptx(file, onProgress);
    case 'xlsx':
      return convertXlsx(file, onProgress);
    case 'csv':
      return convertCsv(file, onProgress);
    case 'html':
      return convertHtml(file, onProgress);
    case 'epub':
      return convertEpub(file, onProgress);
    case 'rtf':
      return convertRtf(file, onProgress);
    case 'image':
      return convertImage(file, onProgress, options);
    case 'text':
      return convertText(file, onProgress);
    case 'latex':
      return convertLatex(file, onProgress);
    case 'xml':
      return convertXml(file, onProgress);
    case 'json':
      return convertJson(file, onProgress);
    default:
      throw new Error(`Unsupported format: .${getFileExt(file)}`);
  }
}
