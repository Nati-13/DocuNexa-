'use client';

import React, { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
}

export function ThemeToggle({ className = '', showLabel = false }: ThemeToggleProps) {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const isDark = document.documentElement.classList.contains('dark');
      setTheme(isDark ? 'dark' : 'light');
    } catch {
      // Safe fallback in restricted environments
    }
  }, []);

  const toggleTheme = () => {
    try {
      const nextTheme = theme === 'light' ? 'dark' : 'light';
      setTheme(nextTheme);
      if (nextTheme === 'dark') {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
      }
    } catch {
      // Ignore localStorage errors in restricted browsing environments
    }
  };

  // Stable placeholder to avoid layout shift before client hydration
  if (!mounted) {
    return (
      <button
        type="button"
        aria-label="Toggle visual theme"
        className={`inline-flex items-center justify-center gap-2 p-2 rounded-md border border-border text-muted transition-colors opacity-70 ${className}`}
        disabled
      >
        <span className="w-4 h-4" />
        {showLabel && <span className="text-xs font-medium">Theme</span>}
      </button>
    );
  }

  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light mode (paper)' : 'Switch to dark mode (espresso)'}
      title={isDark ? 'Switch to light mode (paper)' : 'Switch to dark mode (espresso)'}
      className={`inline-flex items-center justify-center gap-2 p-2 rounded-md border border-border bg-surface text-ink hover:border-ink/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand cursor-pointer ${className}`}
    >
      {isDark ? (
        <Sun size={16} className="text-accent" aria-hidden="true" />
      ) : (
        <Moon size={16} className="text-brand" aria-hidden="true" />
      )}
      {showLabel && (
        <span className="text-xs font-medium">
          {isDark ? 'Light Mode' : 'Dark Mode'}
        </span>
      )}
    </button>
  );
}
