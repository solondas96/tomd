import { AppSettings, HeadingSensitivity } from '../types';

export const HISTORY_KEY = 'tomd_history_v2';
export const SETTINGS_KEY = 'tomd_settings_v2';
export const MAX_HISTORY = 12;
export const MAX_MD_STORE = 80_000;
export const MAX_UNDO = 50;
export const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100 MB
export const MAX_TOASTS = 5;
export const FETCH_TIMEOUT_MS = 30_000;

export const DEFAULT_SETTINGS: AppSettings = {
  headingSensitivity: 'medium',
  pageSeparator: '---',
  stripDecorations: true,
  tableDetection: true,
  extractImages: false,
  ocr: false,
  ocrLanguage: 'eng',
  darkMode: false,
  frontmatter: false,
  syntaxHighlight: true,
};

export const OCR_LANGUAGES = [
  { code: 'eng', label: 'English' },
  { code: 'spa', label: 'Spanish' },
  { code: 'fra', label: 'French' },
  { code: 'deu', label: 'German' },
  { code: 'ita', label: 'Italian' },
  { code: 'por', label: 'Portuguese' },
  { code: 'chi_sim', label: 'Chinese (Simplified)' },
  { code: 'jpn', label: 'Japanese' },
  { code: 'kor', label: 'Korean' },
  { code: 'ara', label: 'Arabic' },
  { code: 'hin', label: 'Hindi' },
  { code: 'rus', label: 'Russian' },
] as const;

export const FORMAT_MAP: Record<string, string> = {
  pdf: 'pdf',
  docx: 'docx',
  pptx: 'pptx',
  xlsx: 'xlsx',
  xls: 'xlsx',
  csv: 'csv',
  tsv: 'csv',
  html: 'html',
  htm: 'html',
  epub: 'epub',
  rtf: 'rtf',
  txt: 'text',
  md: 'text',
  markdown: 'text',
  tex: 'latex',
  latex: 'latex',
  xml: 'xml',
  json: 'json',
  png: 'image',
  jpg: 'image',
  jpeg: 'image',
  webp: 'image',
  gif: 'image',
  bmp: 'image',
  tiff: 'image',
  tif: 'image',
};

export const HEADING_THRESHOLDS: Record<HeadingSensitivity, number> = {
  low: 1.3,
  medium: 1.1,
  high: 1.05,
};
