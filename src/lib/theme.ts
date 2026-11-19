import { DEFAULT_SETTINGS } from '../config';
import { ThemePreference, type AppSettings } from '../types';

/** Settings as they may exist in storage, including fields from older app versions. */
type StoredSettings = Partial<AppSettings> & { darkMode?: boolean };

/**
 * Decides whether the dark palette should be shown.
 *
 * Params: preference - the user's choice; systemPrefersDark - the OS colour scheme.
 * Returns: true when dark styling applies.
 */
export function resolveIsDark(preference: ThemePreference, systemPrefersDark: boolean): boolean {
  if (preference === ThemePreference.System) return systemPrefersDark;
  return preference === ThemePreference.Dark;
}

/**
 * Preference to store when the user flips the theme from what they currently see.
 *
 * Params: isDark - whether dark styling is currently shown.
 * Returns: the explicit opposite choice, so the flip is visible whatever the OS setting is.
 */
export function flippedPreference(isDark: boolean): ThemePreference {
  return isDark ? ThemePreference.Light : ThemePreference.Dark;
}

/**
 * Merges stored settings over the defaults and upgrades the pre-B-01 `darkMode` flag.
 *
 * Params: stored - parsed localStorage value (may be from an older version).
 * Returns: complete, current-shape settings.
 */
export function migrateSettings(stored: StoredSettings): AppSettings {
  const { darkMode, ...current } = stored;
  const merged: AppSettings = { ...DEFAULT_SETTINGS, ...current };
  // `darkMode: false` was the default, so only an explicit `true` expresses a real choice.
  if (current.theme === undefined && darkMode === true) merged.theme = ThemePreference.Dark;
  return merged;
}
