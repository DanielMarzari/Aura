'use client';
import { useCallback, useEffect, useState } from 'react';

export type Theme = 'dusk' | 'dawn';

const STORAGE_KEY = 'aura-theme';

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>('dusk');

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
      if (stored === 'dusk' || stored === 'dawn') {
        setThemeState(stored);
        document.documentElement.setAttribute('data-theme', stored);
      } else {
        document.documentElement.setAttribute('data-theme', 'dusk');
      }
    } catch {
      document.documentElement.setAttribute('data-theme', 'dusk');
    }
  }, []);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    document.documentElement.setAttribute('data-theme', t);
    try { localStorage.setItem(STORAGE_KEY, t); } catch {}
  }, []);

  const toggle = useCallback(() => {
    setTheme(theme === 'dusk' ? 'dawn' : 'dusk');
  }, [theme, setTheme]);

  return { theme, setTheme, toggle };
}
