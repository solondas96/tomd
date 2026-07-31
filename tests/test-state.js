import { describe, it, expect } from './framework.js';
import { DEFAULT_SETTINGS, SETTINGS_KEY } from '../js/config.js';
import { state, loadSettings, saveSettings, settings, updateSettings } from '../js/state.js';

export default function testState() {
  describe('state object', () => {
    it('has currentMarkdown as empty string', () => {
      expect(typeof state.currentMarkdown).toBe('string');
    });

    it('has currentFilename as empty string', () => {
      expect(typeof state.currentFilename).toBe('string');
    });

    it('has isProcessing as false', () => {
      expect(state.isProcessing).toBe(false);
    });

    it('has isEditMode as false', () => {
      expect(state.isEditMode).toBe(false);
    });

    it('has batchResults as array', () => {
      expect(Array.isArray(state.batchResults)).toBe(true);
    });

    it('has findMatches as array', () => {
      expect(Array.isArray(state.findMatches)).toBe(true);
    });

    it('has findIdx as -1', () => {
      expect(state.findIdx).toBe(-1);
    });

    it('has abortController as null', () => {
      expect(state.abortController).toBe(null);
    });

    it('has undoStack as array', () => {
      expect(Array.isArray(state.undoStack)).toBe(true);
    });

    it('has redoStack as array', () => {
      expect(Array.isArray(state.redoStack)).toBe(true);
    });

    it('state is mutable', () => {
      const prev = state.currentMarkdown;
      state.currentMarkdown = '__test__';
      expect(state.currentMarkdown).toBe('__test__');
      state.currentMarkdown = prev;
    });
  });

  describe('loadSettings', () => {
    it('returns defaults when localStorage is empty', () => {
      const backup = localStorage.getItem(SETTINGS_KEY);
      localStorage.removeItem(SETTINGS_KEY);
      const s = loadSettings();
      expect(s.headingSensitivity).toBe('medium');
      expect(s.pageSeparator).toBe('---');
      if (backup) localStorage.setItem(SETTINGS_KEY, backup);
    });

    it('merges stored settings with defaults', () => {
      const backup = localStorage.getItem(SETTINGS_KEY);
      localStorage.setItem(SETTINGS_KEY, JSON.stringify({ darkMode: true }));
      const s = loadSettings();
      expect(s.darkMode).toBe(true);
      expect(s.headingSensitivity).toBe('medium');
      if (backup) localStorage.setItem(SETTINGS_KEY, backup);
      else localStorage.removeItem(SETTINGS_KEY);
    });

    it('handles corrupted JSON gracefully', () => {
      const backup = localStorage.getItem(SETTINGS_KEY);
      localStorage.setItem(SETTINGS_KEY, '{invalid json!!!');
      const s = loadSettings();
      expect(s.headingSensitivity).toBe('medium');
      if (backup) localStorage.setItem(SETTINGS_KEY, backup);
      else localStorage.removeItem(SETTINGS_KEY);
    });
  });

  describe('saveSettings', () => {
    it('persists settings to localStorage', () => {
      const backup = localStorage.getItem(SETTINGS_KEY);
      saveSettings({ test: true });
      const stored = JSON.parse(localStorage.getItem(SETTINGS_KEY));
      expect(stored.test).toBe(true);
      if (backup) localStorage.setItem(SETTINGS_KEY, backup);
      else localStorage.removeItem(SETTINGS_KEY);
    });
  });

  describe('updateSettings', () => {
    it('patches settings object', () => {
      const prev = settings.darkMode;
      updateSettings({ darkMode: !prev });
      expect(settings.darkMode).toBe(!prev);
      updateSettings({ darkMode: prev });
    });

    it('persists changes', () => {
      updateSettings({ headingSensitivity: 'high' });
      const stored = JSON.parse(localStorage.getItem(SETTINGS_KEY));
      expect(stored.headingSensitivity).toBe('high');
      updateSettings({ headingSensitivity: 'medium' });
    });
  });
}
