import { create } from 'zustand';

export type ThemePreference = 'system' | 'light' | 'dark';

type UiState = {
  themePreference: ThemePreference;
  setThemePreference: (preference: ThemePreference) => void;
};

/** Estado de UI simple. La preferencia se persistirá en `settings` (fase 3). */
export const useUiStore = create<UiState>((set) => ({
  themePreference: 'system',
  setThemePreference: (themePreference) => set({ themePreference }),
}));
