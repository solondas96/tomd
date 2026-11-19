import { useEffect, useLayoutEffect, useState } from 'react';
import { resolveIsDark } from '../lib/theme';
import type { ThemePreference } from '../types';

const DARK_SCHEME_QUERY = '(prefers-color-scheme: dark)';
const DARK_CLASS = 'dark';

function readSystemPrefersDark(): boolean {
  return window.matchMedia(DARK_SCHEME_QUERY).matches;
}

/**
 * Keeps the `dark` class on `<html>` in sync with the theme preference and the OS setting.
 *
 * Params: preference - system, light or dark.
 * Returns: whether dark styling is currently shown.
 */
export function useThemeClass(preference: ThemePreference): boolean {
  const [systemPrefersDark, setSystemPrefersDark] = useState(readSystemPrefersDark);

  useEffect(() => {
    const query = window.matchMedia(DARK_SCHEME_QUERY);
    const onChange = (event: MediaQueryListEvent) => setSystemPrefersDark(event.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  const isDark = resolveIsDark(preference, systemPrefersDark);

  // Layout effect so the class is set before paint and the page does not flash the wrong theme.
  useLayoutEffect(() => {
    document.documentElement.classList.toggle(DARK_CLASS, isDark);
  }, [isDark]);

  return isDark;
}
