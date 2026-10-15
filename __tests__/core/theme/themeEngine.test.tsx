import { appSettingsStorage } from '@core/storage';
import { resolveAppTheme } from '@core/theme/resolveTheme';
import { useThemeStore } from '@core/theme/useThemeStore';

describe('resolveAppTheme', () => {
  it('resolves Indigo light and dark colors', () => {
    expect(
      resolveAppTheme({
        themeMode: 'light',
        systemScheme: 'dark',
        isAmoledBlack: false,
        palette: 'indigo',
      }).appColors.background,
    ).toBe('#F8FAFC');

    expect(
      resolveAppTheme({
        themeMode: 'dark',
        systemScheme: 'light',
        isAmoledBlack: false,
        palette: 'indigo',
      }).appColors.background,
    ).toBe('#0F172A');
  });

  it('applies AMOLED surfaces only in effective dark mode', () => {
    const darkTheme = resolveAppTheme({
      themeMode: 'dark',
      systemScheme: 'light',
      isAmoledBlack: true,
      palette: 'indigo',
    });
    expect(darkTheme.appColors.background).toBe('#000000');
    expect(darkTheme.appColors.surface).toBe('#0A0A0A');
    expect(darkTheme.appColors.surfaceVariant).toBe('#141414');

    const lightTheme = resolveAppTheme({
      themeMode: 'light',
      systemScheme: 'dark',
      isAmoledBlack: true,
      palette: 'indigo',
    });
    expect(lightTheme.appColors.background).toBe('#F8FAFC');
    expect(lightTheme.appColors.surface).toBe('#FFFFFF');
  });

  it('uses the system scheme and dynamic colors when selected', () => {
    const theme = resolveAppTheme({
      themeMode: 'system',
      systemScheme: 'dark',
      isAmoledBlack: false,
      palette: 'dynamic',
      dynamicColors: {
        dark: { primary: '#123456', background: '#101010' },
      },
    });

    expect(theme.dark).toBe(true);
    expect(theme.appColors.primary).toBe('#123456');
    expect(theme.appColors.background).toBe('#101010');
    expect(theme.categoryColors.audio).toBe('#8B5CF6');
  });
});

describe('useThemeStore persistence', () => {
  beforeEach(() => {
    appSettingsStorage.clearAll();
    useThemeStore.getState().resetThemeDefaults();
  });

  it('updates settings and persists only theme values synchronously', () => {
    const store = useThemeStore.getState();
    store.setThemeMode('dark');
    store.setAmoledBlack(true);
    store.setPalette('emerald');

    expect(useThemeStore.getState()).toMatchObject({
      themeMode: 'dark',
      isAmoledBlack: true,
      palette: 'emerald',
    });

    const persistedValue = appSettingsStorage.getString('omniplay-theme-storage');
    expect(persistedValue).toBeDefined();
    if (persistedValue === undefined) {
      throw new Error('Theme settings were not persisted synchronously');
    }

    expect(JSON.parse(persistedValue)).toEqual({
      state: {
        themeMode: 'dark',
        isAmoledBlack: true,
        palette: 'emerald',
      },
      version: 0,
    });
  });
});
