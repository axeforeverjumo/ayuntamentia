'use client';

import { useEffect, useState } from 'react';

export type Theme = 'dark' | 'light';

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>('dark');

  useEffect(() => {
    if (!localStorage.getItem('ajuntamentia_theme') && localStorage.getItem('ayuntamentia_theme')) {
      localStorage.setItem('ajuntamentia_theme', localStorage.getItem('ayuntamentia_theme')!);
      localStorage.removeItem('ayuntamentia_theme');
    }
    const stored = localStorage.getItem('ajuntamentia_theme') as Theme | null;
    if (stored) {
      setThemeState(stored);
      document.documentElement.setAttribute('data-theme', stored);
    }
  }, []);

  const setTheme = (t: Theme) => {
    setThemeState(t);
    localStorage.setItem('ajuntamentia_theme', t);
    document.documentElement.setAttribute('data-theme', t);
    document.body.style.backgroundColor = t === 'light' ? '#f2ece0' : '#0d1117';
    document.body.style.color = t === 'light' ? '#14110d' : '#e6edf3';
  };

  const toggle = () => setTheme(theme === 'dark' ? 'light' : 'dark');

  return { theme, setTheme, toggle };
}
