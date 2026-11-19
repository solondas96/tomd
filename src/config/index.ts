import { ThemePreference, type AppSettings, type HeadingSensitivity } from '../types';

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
  theme: ThemePreference.System,
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

/** Deepest heading level listed in the table of contents. */
export const TOC_MAX_LEVEL = 4;

export const HEADING_THRESHOLDS: Record<HeadingSensitivity, number> = {
  low: 1.3,
  medium: 1.1,
  high: 1.05,
};
