import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { ConversionMetadata } from '../types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function escHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function escRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function wordCount(md: string): number {
  return md.trim() ? md.trim().split(/\s+/).length : 0;
}

export function charCount(md: string): number {
  return md.length;
}

export function readingTime(words: number): number {
  return Math.max(1, Math.ceil(words / 200));
}

export function formatBytes(b: number): string {
  if (b < 1024) return b + ' B';
  if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
  return (b / 1048576).toFixed(1) + ' MB';
}

export function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function parsePdfDate(s?: string): string {
  if (!s) return '';
  const m = s.match(/D:(\d{4})(\d{2})(\d{2})(\d{2})?(\d{2})?/);
  return m ? `${m[1]}-${m[2]}-${m[3]}${m[4] ? ' ' + m[4] + ':' + (m[5] || '00') : ''}` : s;
}

/**
 * Turns text into a URL-fragment slug: lower-case letters and digits (any script) joined by hyphens.
 *
 * Params: s - arbitrary text.
 * Returns: the slug, or an empty string if the text has no letters or digits.
 */
export function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '');
}

export function friendlyError(err: unknown): string {
  if (err instanceof Error) {
    if (err.name === 'PasswordException') return 'PDF is password-protected.';
    if (err.name === 'InvalidPDFException') return 'Invalid or corrupted PDF file.';
    if (err.name === 'AbortError') return 'Operation was cancelled.';
    return err.message || 'An unknown error occurred.';
  }
  return typeof err === 'string' ? err : 'An unknown error occurred.';
}

/**
 * Returns the 2D drawing context of a canvas.
 *
 * Purpose: replace nullable `getContext('2d')` calls with one explicit failure.
 * Params: canvas - the canvas to draw on.
 * Returns: its 2D rendering context.
 * Throws: Error if the browser refuses to create a 2D context (e.g. out of memory).
 */
export function require2dContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Could not create a canvas context to render the page.');
  return context;
}

export function fileToBase64(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => {
      const result = fr.result as string;
      resolve(result.split(',')[1] || '');
    };
    fr.onerror = () => reject(new Error('Failed to read file'));
    fr.readAsDataURL(file);
  });
}

export function generateFrontmatter(meta: ConversionMetadata | null | undefined, filename: string): string {
  const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  const lines = ['---'];
  const title = meta?.Title || filename.replace(/\.[^.]+$/, '') || 'Untitled';
  lines.push(`title: "${esc(title)}"`);
  lines.push(`date: ${new Date().toISOString().split('T')[0]}`);
  if (meta?.Author) lines.push(`author: "${esc(meta.Author)}"`);
  if (meta?.Source) lines.push(`source: "${esc(meta.Source)}"`);
  lines.push('---\n\n');
  return lines.join('\n');
}

export function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export function downloadAs(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  triggerDownload(blob, filename);
}
