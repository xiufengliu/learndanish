import { useState, useEffect } from 'react';
import { STORAGE_KEYS } from '../constants/storage';

type ThemeMode = 'light' | 'dark' | 'system';
type ResolvedTheme = 'light' | 'dark';

interface UseThemeResult {
  theme: ResolvedTheme;
  themeMode: ThemeMode;
  toggleTheme: () => void;
  setTheme: (theme: ThemeMode) => void;
}

function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function resolveTheme(themeMode: ThemeMode): ResolvedTheme {
  if (themeMode === 'system') {
    return getSystemTheme();
  }
  return themeMode;
}

export function useTheme(): UseThemeResult {
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.THEME);
    return (stored as ThemeMode) || 'system';
  });

  const [theme, setResolvedTheme] = useState<ResolvedTheme>(() => 
    resolveTheme(themeMode)
  );

  useEffect(() => {
    const resolved = resolveTheme(themeMode);
    setResolvedTheme(resolved);
    
    // Apply theme to document
    document.documentElement.setAttribute('data-theme', resolved);
    
    // Save to localStorage
    localStorage.setItem(STORAGE_KEYS.THEME, themeMode);
  }, [themeMode]);

  useEffect(() => {
    // Listen for system theme changes when in system mode
    if (themeMode !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      setResolvedTheme(e.matches ? 'dark' : 'light');
      document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light');
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [themeMode]);

  const toggleTheme = () => {
    setThemeMode(current => {
      if (current === 'light') return 'dark';
      if (current === 'dark') return 'system';
      return 'light';
    });
  };

  const setTheme = (newTheme: ThemeMode) => {
    setThemeMode(newTheme);
  };

  return {
    theme,
    themeMode,
    toggleTheme,
    setTheme
  };
}
