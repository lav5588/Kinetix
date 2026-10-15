import type { AppThemeColors, CategoryColors, ThemePalette, ThemePaletteTokens } from './types';

export const CATEGORY_ACCENT_COLORS: CategoryColors = {
  audio: '#8B5CF6',
  video: '#F97316',
  photo: '#10B981',
  pdf: '#EF4444',
  doc: '#3B82F6',
};

type StaticThemePalette = Exclude<ThemePalette, 'dynamic'>;

const createPalette = (
  lightPrimary: string,
  darkPrimary: string,
  lightSecondaryContainer: string,
  lightOnSecondaryContainer: string,
  darkSecondaryContainer: string,
  darkOnSecondaryContainer: string,
): ThemePaletteTokens => {
  const createTokens = (
    colors: Omit<
      AppThemeColors,
      'primary' | 'onPrimary' | 'secondaryContainer' | 'onSecondaryContainer'
    >,
    primary: string,
    secondaryContainer: string,
    onSecondaryContainer: string,
  ): AppThemeColors => ({
    ...colors,
    primary,
    onPrimary: '#FFFFFF',
    secondaryContainer,
    onSecondaryContainer,
  });

  return {
    light: createTokens(
      {
        background: '#F8FAFC',
        surface: '#FFFFFF',
        surfaceVariant: '#F1F5F9',
        textPrimary: '#0F172A',
        textSecondary: '#475569',
        border: '#CBD5E1',
        error: '#B91C1C',
        scrim: '#000000',
      },
      lightPrimary,
      lightSecondaryContainer,
      lightOnSecondaryContainer,
    ),
    dark: createTokens(
      {
        background: '#0F172A',
        surface: '#1E293B',
        surfaceVariant: '#334155',
        textPrimary: '#F8FAFC',
        textSecondary: '#CBD5E1',
        border: '#475569',
        error: '#F87171',
        scrim: '#000000',
      },
      darkPrimary,
      darkSecondaryContainer,
      darkOnSecondaryContainer,
    ),
    amoled: createTokens(
      {
        background: '#000000',
        surface: '#0A0A0A',
        surfaceVariant: '#141414',
        textPrimary: '#F8FAFC',
        textSecondary: '#A3A3A3',
        border: '#262626',
        error: '#F87171',
        scrim: '#000000',
      },
      darkPrimary,
      darkSecondaryContainer,
      darkOnSecondaryContainer,
    ),
  };
};

export const THEME_PALETTES: Record<StaticThemePalette, ThemePaletteTokens> = {
  indigo: createPalette('#4F46E5', '#818CF8', '#E0E7FF', '#312E81', '#3730A3', '#E0E7FF'),
  orange: createPalette('#EA580C', '#FB923C', '#FFEDD5', '#7C2D12', '#9A3412', '#FFEDD5'),
  emerald: createPalette('#059669', '#34D399', '#D1FAE5', '#064E3B', '#065F46', '#D1FAE5'),
  crimson: createPalette('#E11D48', '#FB7185', '#FFE4E6', '#881337', '#9F1239', '#FFE4E6'),
};
