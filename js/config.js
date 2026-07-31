// Application constants and configuration

export const HISTORY_KEY = 'tomd_history';
export const SETTINGS_KEY = 'tomd_settings';
export const MAX_HISTORY = 8;
export const MAX_MD_STORE = 60_000;
export const MAX_UNDO = 50;
export const MAX_FILE_SIZE = 100 * 1024 * 1024;
export const MAX_TOASTS = 5;
export const FETCH_TIMEOUT_MS = 30_000;

export const DEFAULT_SETTINGS = {
  headingSensitivity: 'medium',
  pageSeparator: '---',
  stripDecorations: true,
  tableDetection: true,
  extractImages: false,
  ocr: false,
  darkMode: false,
  frontmatter: false,
  syntaxHighlight: true,
};

export const FORMAT_MAP = {
  pdf: 'pdf', docx: 'docx', pptx: 'pptx',
  xlsx: 'xlsx', xls: 'xlsx', csv: 'csv', tsv: 'csv',
  html: 'html', htm: 'html',
  epub: 'epub', rtf: 'rtf',
  txt: 'text', md: 'text', markdown: 'text',
  tex: 'latex', latex: 'latex',
  xml: 'xml', json: 'json',
  png: 'image', jpg: 'image', jpeg: 'image', webp: 'image',
  gif: 'image', bmp: 'image', tiff: 'image', tif: 'image',
};

export const HEADING_THRESHOLDS = { low: 1.3, medium: 1.1, high: 1.05 };
