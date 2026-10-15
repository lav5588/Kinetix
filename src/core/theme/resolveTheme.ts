import { MD3DarkTheme, MD3LightTheme } from 'react-native-paper';
import type { MD3Theme } from 'react-native-paper';
import { CATEGORY_ACCENT_COLORS, THEME_PALETTES } from './palettes';
import type { AppThemeColors, ThemeMode, ThemePalette } from './types';

export interface ResolveAppThemeParams {
  themeMode: ThemeMode;
  systemScheme: 'light' | 'dark' | null | undefined;
  isAmoledBlack: boolean;
  palette: ThemePalette;
  dynamicColors?: {
    light?: Partial<AppThemeColors>;
    dark?: Partial<AppThemeColors>;
  };
}

export type AppMD3Theme = MD3Theme & {
  appColors: AppThemeColors;
  categoryColors: typeof CATEGORY_ACCENT_COLORS;
};

export const resolveAppTheme = ({
  themeMode,
  systemScheme,
  isAmoledBlack,
  palette,
  dynamicColors,
}: ResolveAppThemeParams): AppMD3Theme => {
  const isDark = themeMode === 'dark' || (themeMode === 'system' && systemScheme === 'dark');
  const useAmoledColors = isDark && isAmoledBlack;
  const baseTheme = isDark ? MD3DarkTheme : MD3LightTheme;
  const staticPalette = THEME_PALETTES[palette === 'dynamic' ? 'indigo' : palette];
  const paletteColors = isDark ? staticPalette.dark : staticPalette.light;
  const dynamicPalette = isDark ? dynamicColors?.dark : dynamicColors?.light;
  const appColors: AppThemeColors = {
    ...paletteColors,
    ...(palette === 'dynamic' ? dynamicPalette : undefined),
    ...(useAmoledColors
      ? {
          background: staticPalette.amoled.background,
          surface: staticPalette.amoled.surface,
          surfaceVariant: staticPalette.amoled.surfaceVariant,
        }
      : undefined),
  };

  return {
    ...baseTheme,
    dark: isDark,
    colors: {
      ...baseTheme.colors,
      primary: appColors.primary,
      onPrimary: appColors.onPrimary,
      secondaryContainer: appColors.secondaryContainer,
      onSecondaryContainer: appColors.onSecondaryContainer,
      background: appColors.background,
      surface: appColors.surface,
      surfaceVariant: appColors.surfaceVariant,
      error: appColors.error,
      scrim: appColors.scrim,
      onBackground: appColors.textPrimary,
      onSurface: appColors.textPrimary,
      onSurfaceVariant: appColors.textSecondary,
      outline: appColors.border,
      outlineVariant: appColors.border,
    },
    appColors,
    categoryColors: CATEGORY_ACCENT_COLORS,
  };
};
