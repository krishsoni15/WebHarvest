'use client';

import * as React from 'react';
import { Sun, Moon } from 'lucide-react';

export function ThemeToggle({ className }: { className?: string }) {
  const [theme, setTheme] = React.useState<'dark' | 'light'>('dark');

  React.useEffect(() => {
    try {
      const saved = localStorage.getItem('webharvest_theme');
      if (saved === 'light' || (!saved && window.matchMedia('(prefers-color-scheme: light)').matches)) {
        setTheme('light');
        document.documentElement.classList.remove('dark');
        document.documentElement.classList.add('light');
      } else {
        setTheme('dark');
        document.documentElement.classList.remove('light');
        document.documentElement.classList.add('dark');
      }
    } catch {}
  }, []);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    if (next === 'light') {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
      document.documentElement.classList.add('dark');
    }
    try {
      localStorage.setItem('webharvest_theme', next);
    } catch {}
  };

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`h-8 w-8 rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted flex items-center justify-center transition-colors cursor-pointer ${className || ''}`}
      title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-label="Toggle theme"
    >
      {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
