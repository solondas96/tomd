import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from '../../src/config';
import { flippedPreference, migrateSettings, resolveIsDark } from '../../src/lib/theme';
import { ThemePreference } from '../../src/types';

describe('resolveIsDark', () => {
  it.each([
    [ThemePreference.System, true, true],
    [ThemePreference.System, false, false],
    [ThemePreference.Light, true, false],
    [ThemePreference.Dark, false, true],
  ])('%s with system dark=%s is dark=%s', (preference, systemDark, expected) => {
    expect(resolveIsDark(preference, systemDark)).toBe(expected);
  });
});

describe('flippedPreference', () => {
  it('always returns the explicit opposite of what is shown', () => {
    expect(flippedPreference(true)).toBe(ThemePreference.Light);
    expect(flippedPreference(false)).toBe(ThemePreference.Dark);
  });
});

describe('migrateSettings', () => {
  it('defaults the theme to system', () => {
    expect(migrateSettings({}).theme).toBe(ThemePreference.System);
    expect(DEFAULT_SETTINGS.theme).toBe(ThemePreference.System);
  });

  it('upgrades a stored darkMode:true to the dark theme and drops the old key', () => {
    const migrated = migrateSettings({ darkMode: true });
    expect(migrated.theme).toBe(ThemePreference.Dark);
    expect('darkMode' in migrated).toBe(false);
  });

  it('treats the old default darkMode:false as no preference', () => {
    expect(migrateSettings({ darkMode: false }).theme).toBe(ThemePreference.System);
  });

  it('keeps an explicit theme over a leftover darkMode flag', () => {
    expect(migrateSettings({ theme: ThemePreference.Light, darkMode: true }).theme).toBe(ThemePreference.Light);
  });

  it('keeps unrelated stored settings', () => {
    expect(migrateSettings({ ocr: true }).ocr).toBe(true);
  });
});
