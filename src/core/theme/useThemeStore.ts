import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { mmkvZustandStorage } from '@core/storage';
import type { ThemeMode, ThemePalette } from './types';

interface ThemeSettings {
  themeMode: ThemeMode;
  isAmoledBlack: boolean;
  palette: ThemePalette;
}

interface ThemeStore extends ThemeSettings {
  setThemeMode: (mode: ThemeMode) => void;
  setAmoledBlack: (enabled: boolean) => void;
  setPalette: (palette: ThemePalette) => void;
  resetThemeDefaults: () => void;
}

const DEFAULT_THEME_SETTINGS: ThemeSettings = {
  themeMode: 'system',
  isAmoledBlack: false,
  palette: 'indigo',
};

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      ...DEFAULT_THEME_SETTINGS,
      setThemeMode: (themeMode) => set({ themeMode }),
      setAmoledBlack: (isAmoledBlack) => set({ isAmoledBlack }),
      setPalette: (palette) => set({ palette }),
      resetThemeDefaults: () => set(DEFAULT_THEME_SETTINGS),
    }),
    {
      name: 'omniplay-theme-storage',
      storage: createJSONStorage(() => mmkvZustandStorage),
      partialize: ({ themeMode, isAmoledBlack, palette }) => ({
        themeMode,
        isAmoledBlack,
        palette,
      }),
    },
  ),
);
