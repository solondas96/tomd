export type HeadingSensitivity = 'low' | 'medium' | 'high';
export type PageSeparator = '---' | 'blank' | 'none';

export interface AppSettings {
  headingSensitivity: HeadingSensitivity;
  pageSeparator: PageSeparator;
  stripDecorations: boolean;
  tableDetection: boolean;
  extractImages: boolean;
  ocr: boolean;
  ocrLanguage: string;
  darkMode: boolean;
  frontmatter: boolean;
  syntaxHighlight: boolean;
}

export interface ConversionMetadata {
  Title?: string;
  Author?: string;
  Source?: string;
  CreationDate?: string;
  ModDate?: string;
  Producer?: string;
  Creator?: string;
  [key: string]: string | undefined;
}

export interface ConversionOptions extends AppSettings {
  pageFrom?: number;
  pageTo?: number;
}

export interface ConversionResult {
  markdown: string;
  pageCount?: number;
  metadata?: ConversionMetadata | null;
}

export type BatchStatus = 'pending' | 'processing' | 'done' | 'error';

export interface BatchItem {
  id: string;
  file: File;
  filename: string;
  size: number;
  markdown: string;
  status: BatchStatus;
  pageCount?: number;
  error?: string;
}

export interface HistoryEntry {
  id: string;
  filename: string;
  timestamp: number;
  wordCount: number;
  charCount: number;
  pageCount: number;
  markdown: string;
}

export type ToastType = 'success' | 'error' | 'info';

export interface ToastNotification {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

export type TabType = 'raw' | 'preview' | 'split' | 'source';

export interface HeadingItem {
  level: number;
  text: string;
  line: number;
}

export interface FindMatch {
  index: number;
  length: number;
}
