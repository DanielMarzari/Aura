'use client';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';

export function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, toggle } = useTheme();
  const Icon = theme === 'dusk' ? Sun : Moon;
  return (
    <button
      onClick={toggle}
      className={`w-9 h-9 rounded-full border border-[var(--ui-border)] text-[var(--ui-text-muted)] hover:text-[var(--ui-text)] hover:bg-[var(--ui-panel)] flex items-center justify-center transition-colors ${className}`}
      aria-label={theme === 'dusk' ? 'Switch to dawn mode' : 'Switch to dusk mode'}
      title={theme === 'dusk' ? 'Dawn mode' : 'Dusk mode'}
    >
      <Icon size={14} strokeWidth={1.6} />
    </button>
  );
}
