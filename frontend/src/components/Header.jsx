import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function Header({ title, subtitle, actions, onMenuClick }) {
  const { isDark, toggle } = useTheme();

  return (
    <header
      className="sticky top-0 z-30 flex items-center justify-between px-4 lg:px-5 py-3 lg:py-4 border-b backdrop-blur-md"
      style={{ borderColor: 'var(--card-border)', backgroundColor: 'var(--header-bg)' }}
    >
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <div className="min-w-0">
          {title && (
            <h1 className="font-display font-semibold text-base lg:text-xl leading-none truncate"
              style={{ color: 'var(--input-text)' }}>
              {title}
            </h1>
          )}
          {subtitle && (
            <p className="text-xs mt-0.5 hidden sm:block truncate" style={{ color: 'var(--input-placeholder)' }}>
              {subtitle}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        {actions && <div className="flex items-center gap-1.5">{actions}</div>}
        <button
          onClick={toggle}
          className="p-2 rounded-xl border transition-all duration-150 min-w-[36px] min-h-[36px] flex items-center justify-center"
          style={{ borderColor: 'var(--card-border)', color: 'var(--input-placeholder)' }}
          title={isDark ? 'Light mode' : 'Dark mode'}
        >
          {isDark ? <Sun size={15} /> : <Moon size={15} />}
        </button>
      </div>
    </header>
  );
}
