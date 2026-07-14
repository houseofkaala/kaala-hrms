import { create } from 'zustand';

export type ThemeMode = 'light';

const STORAGE_KEY = 'kaala_theme';

export function getPreferredTheme(): ThemeMode {
  return 'light';
}

export function applyTheme(_theme: ThemeMode = 'light') {
  const root = document.documentElement;
  root.classList.add('light');
  root.classList.remove('dark');
  root.style.colorScheme = 'light';

  const meta = document.querySelector('meta[name="theme-color"]');
  meta?.setAttribute('content', '#f5f5f7');

  try {
    localStorage.setItem(STORAGE_KEY, 'light');
  } catch {
    /* ignore */
  }
}

export function initTheme() {
  applyTheme('light');
}

interface ThemeState {
  theme: ThemeMode;
}

export const useThemeStore = create<ThemeState>(() => ({
  theme: 'light',
}));

export function syncThemeStore() {
  applyTheme('light');
  useThemeStore.setState({ theme: 'light' });
}