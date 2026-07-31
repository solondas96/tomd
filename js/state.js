// Shared mutable application state

import { DEFAULT_SETTINGS, SETTINGS_KEY } from './config.js';

export const state = {
  currentMarkdown: '',
  currentFilename: '',
  isProcessing: false,
  isEditMode: false,
  batchResults: [],
  findMatches: [],
  findIdx: -1,
  abortController: null,
  undoStack: [],
  redoStack: [],
};

export function loadSettings() {
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings) {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); }
  catch { /* QuotaExceededError — settings not persisted */ }
}

export let settings = loadSettings();

export function updateSettings(patch) {
  Object.assign(settings, patch);
  saveSettings(settings);
}
