export type HeadingSensitivity = 'low' | 'medium' | 'high';
export enum ThemePreference {
  System = 'system',
  Light = 'light',
  Dark = 'dark',
}
export type PageSeparator = '---' | 'blank' | 'none';

export interface AppSettings {
  headingSensitivity: HeadingSensitivity;
  pageSeparator: PageSeparator;
  stripDecorations: boolean;
  tableDetection: boolean;
  extractImages: boolean;
  ocr: boolean;
  ocrLanguage: string;
  theme: ThemePreference;
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

export type BatchStatus = 'pending' | 'processing' | 'done' | 'error' | 'cancelled';

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
  /** Zero-based line of the heading in the Markdown source. */
  line: number;
  /** Unique element id of the heading in the rendered Preview. */
  slug: string;
}

/** Request to reveal a heading in whichever of the editor and preview are mounted. */
export interface HeadingJump {
  line: number;
  slug: string;
  /** Increments on every request so jumping to the same heading twice still fires. */
  nonce: number;
}

/** Request to select a character range in the editor without moving keyboard focus. */
export interface SelectionRequest {
  start: number;
  end: number;
  /** Increments on every request so selecting the same range twice still fires. */
  nonce: number;
}

export interface FindMatch {
  index: number;
  length: number;
}
