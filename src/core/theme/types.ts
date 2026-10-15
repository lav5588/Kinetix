export type ThemeMode = 'system' | 'light' | 'dark';

export type ThemePalette = 'dynamic' | 'indigo' | 'orange' | 'emerald' | 'crimson';

export interface CategoryColors {
  audio: string;
  video: string;
  photo: string;
  pdf: string;
  doc: string;
}

export interface AppThemeColors {
  background: string;
  surface: string;
  surfaceVariant: string;
  primary: string;
  onPrimary: string;
  secondaryContainer: string;
  onSecondaryContainer: string;
  textPrimary: string;
  textSecondary: string;
  border: string;
  error: string;
  scrim: string;
}

export interface ThemePaletteTokens {
  light: AppThemeColors;
  dark: AppThemeColors;
  amoled: AppThemeColors;
}
