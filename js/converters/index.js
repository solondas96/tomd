// Converter dispatch — routes files to the appropriate engine

import { FORMAT_MAP } from '../config.js';
import { settings } from '../state.js';
import { dom } from '../dom.js';
import { convertPdf } from './pdf.js';
import {
  convertDocx, convertPptx, convertXlsx, convertCsv,
  convertHtml, convertEpub, convertRtf, convertImage,
  convertText, convertLatex, convertXml, convertJson,
} from './formats.js';

export function getFileExt(file) {
  return (file.name.split('.').pop() || '').toLowerCase();
}

export function isSupported(file) {
  return !!FORMAT_MAP[getFileExt(file)];
}

export function getConversionOptions() {
  return {
    ...settings,
    pageFrom: parseInt(dom.pageFrom.value, 10) || 1,
    pageTo: parseInt(dom.pageTo.value, 10) || Infinity,
  };
}

export async function convertFile(file, format, onProgress) {
  const opts = getConversionOptions();
  switch (format) {
    case 'pdf':   return convertPdf(file, onProgress, opts);
    case 'docx':  return convertDocx(file, onProgress);
    case 'pptx':  return convertPptx(file, onProgress);
    case 'xlsx':  return convertXlsx(file, onProgress);
    case 'csv':   return convertCsv(file, onProgress);
    case 'html':  return convertHtml(file, onProgress);
    case 'epub':  return convertEpub(file, onProgress);
    case 'rtf':   return convertRtf(file, onProgress);
    case 'image': return convertImage(file, onProgress);
    case 'text':  return convertText(file, onProgress);
    case 'latex': return convertLatex(file, onProgress);
    case 'xml':   return convertXml(file, onProgress);
    case 'json':  return convertJson(file, onProgress);
    default: throw new Error('Unsupported format: ' + format);
  }
}
