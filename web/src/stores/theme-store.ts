/**
 * Shared theme state — single source of truth for dark mode.
 * Persisted to localStorage via Zustand persist middleware.
 * Falls back to system preference on first load.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const STORAGE_KEY = 'codex.webui.theme';

function getSystemPrefersDark(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function applyDarkClass(dark: boolean) {
  document.documentElement.classList.toggle('dark', dark);
}

/**
 * Migrate legacy plain-string storage (`"dark"` / `"light"`) to
 * Zustand persist JSON format. Must run before store creation.
 */
function migrateLegacyStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === 'dark' || raw === 'light') {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ state: { dark: raw === 'dark' }, version: 0 }),
      );
    }
  } catch {
    // Storage unavailable — skip silently.
  }
}

migrateLegacyStorage();

interface ThemeState {
  dark: boolean;
  setDark: (dark: boolean) => void;
  toggleDark: () => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      dark: getSystemPrefersDark(),

      setDark: (dark) => {
        applyDarkClass(dark);
        set({ dark });
      },

      toggleDark: () =>
        set((state) => {
          const dark = !state.dark;
          applyDarkClass(dark);
          return { dark };
        }),
    }),
    {
      name: STORAGE_KEY,
      partialize: (state) => ({ dark: state.dark }),
      onRehydrateStorage: () => (state) => {
        if (state) applyDarkClass(state.dark);
      },
    },
  ),
);

// Apply initial theme immediately (before rehydration completes)
applyDarkClass(useThemeStore.getState().dark);
