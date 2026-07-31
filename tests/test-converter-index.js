import { describe, it, expect } from './framework.js';
import { FORMAT_MAP } from '../js/config.js';

// Import only pure functions that don't need DOM
const { getFileExt, isSupported } = await import('../js/converters/index.js');

export default function testConverterIndex() {
  describe('getFileExt', () => {
    it('extracts pdf extension', () => {
      expect(getFileExt({ name: 'document.pdf' })).toBe('pdf');
    });

    it('extracts docx extension', () => {
      expect(getFileExt({ name: 'file.docx' })).toBe('docx');
    });

    it('handles uppercase extensions', () => {
      expect(getFileExt({ name: 'FILE.PDF' })).toBe('pdf');
    });

    it('handles mixed case', () => {
      expect(getFileExt({ name: 'Doc.Xlsx' })).toBe('xlsx');
    });

    it('handles multiple dots', () => {
      expect(getFileExt({ name: 'my.file.name.csv' })).toBe('csv');
    });

    it('returns empty for no extension', () => {
      expect(getFileExt({ name: 'noext' })).toBe('noext');
    });

    it('returns empty for dot only', () => {
      expect(getFileExt({ name: '.' })).toBe('');
    });

    it('handles hidden files', () => {
      expect(getFileExt({ name: '.gitignore' })).toBe('gitignore');
    });
  });

  describe('isSupported', () => {
    it('returns true for PDF', () => {
      expect(isSupported({ name: 'doc.pdf' })).toBe(true);
    });

    it('returns true for DOCX', () => {
      expect(isSupported({ name: 'doc.docx' })).toBe(true);
    });

    it('returns true for images', () => {
      expect(isSupported({ name: 'img.png' })).toBe(true);
      expect(isSupported({ name: 'img.jpg' })).toBe(true);
      expect(isSupported({ name: 'img.webp' })).toBe(true);
    });

    it('returns true for text files', () => {
      expect(isSupported({ name: 'readme.md' })).toBe(true);
      expect(isSupported({ name: 'notes.txt' })).toBe(true);
    });

    it('returns false for unsupported formats', () => {
      expect(isSupported({ name: 'app.exe' })).toBe(false);
      expect(isSupported({ name: 'music.mp3' })).toBe(false);
      expect(isSupported({ name: 'archive.zip' })).toBe(false);
    });

    it('returns false for no extension', () => {
      expect(isSupported({ name: 'Makefile' })).toBe(false);
    });

    it('is case-insensitive', () => {
      expect(isSupported({ name: 'DOC.PDF' })).toBe(true);
      expect(isSupported({ name: 'Image.PNG' })).toBe(true);
    });

    it('checks all FORMAT_MAP entries', () => {
      for (const ext of Object.keys(FORMAT_MAP)) {
        expect(isSupported({ name: `test.${ext}` })).toBe(true);
      }
    });
  });
}
