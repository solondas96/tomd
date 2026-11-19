import { ThemePreference, type AppSettings, type HeadingSensitivity } from '../types';

export const HISTORY_KEY = 'tomd_history_v2';
export const SETTINGS_KEY = 'tomd_settings_v2';
export const MAX_HISTORY = 12;
export const MAX_MD_STORE = 80_000;
export const MAX_UNDO = 50;
export const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100 MB
export const MAX_TOASTS = 5;
export const FETCH_TIMEOUT_MS = 30_000;

/**
 * Third-party CORS proxies URL import tries in order. Browsers cannot fetch most pages directly,
 * so the page URL is sent to these services; the UI discloses this before every fetch.
 */
export const URL_IMPORT_PROXIES: readonly { host: string; buildUrl: (target: string) => string }[] = [
  { host: 'corsproxy.io', buildUrl: (target) => `https://corsproxy.io/?${encodeURIComponent(target)}` },
  {
    host: 'api.allorigins.win',
    buildUrl: (target) => `https://api.allorigins.win/raw?url=${encodeURIComponent(target)}`,
  },
  {
    host: 'api.codetabs.com',
    buildUrl: (target) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(target)}`,
  },
];

/** Host that serves OCR language models when OCR is used (the document itself is never uploaded). */
export const OCR_LANGUAGE_DATA_HOST = 'cdn.jsdelivr.net';

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

/**
 * Geometry thresholds for PDF layout analysis. Distances are fractions of the font size (em) so the
 * same values work for any text size.
 */
export const PDF_LAYOUT = {
  /** Runs whose baselines differ by at most this much belong to one line. */
  LINE_Y_TOLERANCE_EM: 0.25,
  /** Smallest line tolerance in points, for tiny text. */
  MIN_LINE_Y_TOLERANCE_PT: 1,
  /** A gap wider than this between runs starts a new span (a column, not a word space). */
  SPAN_GAP_EM: 0.3,
  /** A gap wider than this inside a span is rendered as a single space. */
  WORD_GAP_EM: 0.15,
} as const;
