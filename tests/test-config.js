import { describe, it, expect } from './framework.js';
import {
  HISTORY_KEY, SETTINGS_KEY, MAX_HISTORY, MAX_MD_STORE, MAX_UNDO,
  DEFAULT_SETTINGS, FORMAT_MAP, HEADING_THRESHOLDS,
} from '../js/config.js';

export default function testConfig() {
  describe('config constants', () => {
    it('HISTORY_KEY is a string', () => {
      expect(typeof HISTORY_KEY).toBe('string');
      expect(HISTORY_KEY.length).toBeGreaterThan(0);
    });

    it('SETTINGS_KEY is a string', () => {
      expect(typeof SETTINGS_KEY).toBe('string');
      expect(SETTINGS_KEY.length).toBeGreaterThan(0);
    });

    it('MAX_HISTORY is a positive number', () => {
      expect(MAX_HISTORY).toBeGreaterThan(0);
    });

    it('MAX_MD_STORE is a positive number', () => {
      expect(MAX_MD_STORE).toBeGreaterThan(0);
    });

    it('MAX_UNDO is a positive number', () => {
      expect(MAX_UNDO).toBeGreaterThan(0);
    });
  });

  describe('DEFAULT_SETTINGS', () => {
    it('has headingSensitivity', () => {
      expect(DEFAULT_SETTINGS.headingSensitivity).toBe('medium');
    });

    it('has pageSeparator', () => {
      expect(DEFAULT_SETTINGS.pageSeparator).toBe('---');
    });

    it('has stripDecorations enabled', () => {
      expect(DEFAULT_SETTINGS.stripDecorations).toBe(true);
    });

    it('has tableDetection enabled', () => {
      expect(DEFAULT_SETTINGS.tableDetection).toBe(true);
    });

    it('has extractImages disabled', () => {
      expect(DEFAULT_SETTINGS.extractImages).toBe(false);
    });

    it('has ocr disabled', () => {
      expect(DEFAULT_SETTINGS.ocr).toBe(false);
    });

    it('has darkMode disabled', () => {
      expect(DEFAULT_SETTINGS.darkMode).toBe(false);
    });

    it('has frontmatter disabled', () => {
      expect(DEFAULT_SETTINGS.frontmatter).toBe(false);
    });

    it('has syntaxHighlight enabled', () => {
      expect(DEFAULT_SETTINGS.syntaxHighlight).toBe(true);
    });
  });

  describe('FORMAT_MAP', () => {
    it('maps pdf', () => { expect(FORMAT_MAP.pdf).toBe('pdf'); });
    it('maps docx', () => { expect(FORMAT_MAP.docx).toBe('docx'); });
    it('maps pptx', () => { expect(FORMAT_MAP.pptx).toBe('pptx'); });
    it('maps xlsx', () => { expect(FORMAT_MAP.xlsx).toBe('xlsx'); });
    it('maps xls to xlsx', () => { expect(FORMAT_MAP.xls).toBe('xlsx'); });
    it('maps csv', () => { expect(FORMAT_MAP.csv).toBe('csv'); });
    it('maps tsv to csv', () => { expect(FORMAT_MAP.tsv).toBe('csv'); });
    it('maps html', () => { expect(FORMAT_MAP.html).toBe('html'); });
    it('maps htm to html', () => { expect(FORMAT_MAP.htm).toBe('html'); });
    it('maps epub', () => { expect(FORMAT_MAP.epub).toBe('epub'); });
    it('maps rtf', () => { expect(FORMAT_MAP.rtf).toBe('rtf'); });
    it('maps txt to text', () => { expect(FORMAT_MAP.txt).toBe('text'); });
    it('maps md to text', () => { expect(FORMAT_MAP.md).toBe('text'); });
    it('maps markdown to text', () => { expect(FORMAT_MAP.markdown).toBe('text'); });
    it('maps tex to latex', () => { expect(FORMAT_MAP.tex).toBe('latex'); });
    it('maps latex', () => { expect(FORMAT_MAP.latex).toBe('latex'); });
    it('maps xml', () => { expect(FORMAT_MAP.xml).toBe('xml'); });
    it('maps json', () => { expect(FORMAT_MAP.json).toBe('json'); });
    it('maps png to image', () => { expect(FORMAT_MAP.png).toBe('image'); });
    it('maps jpg to image', () => { expect(FORMAT_MAP.jpg).toBe('image'); });
    it('maps jpeg to image', () => { expect(FORMAT_MAP.jpeg).toBe('image'); });
    it('maps webp to image', () => { expect(FORMAT_MAP.webp).toBe('image'); });
    it('maps gif to image', () => { expect(FORMAT_MAP.gif).toBe('image'); });
    it('maps bmp to image', () => { expect(FORMAT_MAP.bmp).toBe('image'); });
    it('maps tiff to image', () => { expect(FORMAT_MAP.tiff).toBe('image'); });
    it('maps tif to image', () => { expect(FORMAT_MAP.tif).toBe('image'); });

    it('does not include unsupported extensions', () => {
      expect(FORMAT_MAP.exe).toBe(undefined);
      expect(FORMAT_MAP.zip).toBe(undefined);
      expect(FORMAT_MAP.mp3).toBe(undefined);
    });
  });

  describe('HEADING_THRESHOLDS', () => {
    it('low is 1.3', () => { expect(HEADING_THRESHOLDS.low).toBe(1.3); });
    it('medium is 1.1', () => { expect(HEADING_THRESHOLDS.medium).toBe(1.1); });
    it('high is 1.05', () => { expect(HEADING_THRESHOLDS.high).toBe(1.05); });
    it('low > medium > high', () => {
      expect(HEADING_THRESHOLDS.low).toBeGreaterThan(HEADING_THRESHOLDS.medium);
      expect(HEADING_THRESHOLDS.medium).toBeGreaterThan(HEADING_THRESHOLDS.high);
    });
  });
}
