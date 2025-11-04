'use client';

import * as React from 'react';
import { useTheme } from './ThemeProvider';

export default function MoonToggle() {
  const { theme, setTheme } = useTheme();
  const next = theme === 'dark' ? 'light' : 'dark';

  const btn: React.CSSProperties = {
    width: 34, height: 34, borderRadius: 9999,
    display: 'grid', placeItems: 'center',
    border: '1px solid var(--btn-border)',
    background: 'var(--btn-bg)', color: 'var(--btn-text)',
    cursor: 'pointer'
  };

  return (
    <button
      aria-label="Toggle color theme"
      title={`Switch to ${next} mode`}
      onClick={() => setTheme(next)}
      style={btn}
    >
      {theme === 'dark' ? '🌙' : '☀️'}
    </button>
  );
}
