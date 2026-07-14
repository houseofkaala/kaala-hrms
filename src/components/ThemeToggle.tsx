import { Moon, Sun } from 'lucide-react';
import { cn } from '../utils';
import { useThemeStore } from '../theme';

type ThemeToggleProps = {
  className?: string;
  showLabel?: boolean;
  variant?: 'header' | 'settings';
};

export function ThemeToggle({ className, showLabel = false, variant = 'header' }: ThemeToggleProps) {
  const { theme, toggleTheme } = useThemeStore();
  const isLight = theme === 'light';

  const base =
    variant === 'header'
      ? 'flex items-center justify-center w-9 h-9 min-h-[36px] min-w-[36px] rounded-lg text-ivory-muted hover:text-ivory hover:bg-marble-light transition-colors'
      : 'inline-flex items-center gap-2 rounded-lg border border-slate px-3 py-2 text-sm font-medium text-ivory hover:bg-marble-light transition-colors';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={cn(base, className)}
      aria-label={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
      title={isLight ? 'Dark mode' : 'Light mode'}
    >
      {isLight ? <Moon className="w-[17px] h-[17px]" /> : <Sun className="w-[17px] h-[17px]" />}
      {showLabel && <span>{isLight ? 'Dark mode' : 'Light mode'}</span>}
    </button>
  );
}

export function AppearanceSettingsCard() {
  const { theme, setTheme } = useThemeStore();

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-gray-900">Appearance</h3>
        <p className="text-xs text-gray-500 mt-1">Choose how Kaala HRMS looks on your device.</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {(['light', 'dark'] as const).map(mode => {
          const active = theme === mode;
          return (
            <button
              key={mode}
              type="button"
              onClick={() => setTheme(mode)}
              className={cn(
                'rounded-xl border p-4 text-left transition-all',
                active
                  ? 'border-gold bg-gold/10 ring-1 ring-gold/30'
                  : 'border-gray-200 hover:border-gray-300 bg-white',
              )}
            >
              <div
                className={cn(
                  'h-14 rounded-lg mb-3 border',
                  mode === 'dark'
                    ? 'bg-black border-gray-700'
                    : 'bg-[#f5f5f7] border-gray-200',
                )}
              />
              <p className="text-sm font-semibold text-gray-900 capitalize">{mode} mode</p>
              <p className="text-[11px] text-gray-500 mt-0.5">
                {mode === 'dark' ? 'Dark, easy on the eyes' : 'Light, clean interface'}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}