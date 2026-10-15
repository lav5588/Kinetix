import React, { useMemo } from 'react';
import { StatusBar, useColorScheme } from 'react-native';
import { PaperProvider } from 'react-native-paper';
import type { ReactNode } from 'react';
import { resolveAppTheme } from './resolveTheme';
import type { AppMD3Theme } from './resolveTheme';
import { useThemeStore } from './useThemeStore';

export const useAppTheme = (): AppMD3Theme => {
  const themeMode = useThemeStore((state) => state.themeMode);
  const isAmoledBlack = useThemeStore((state) => state.isAmoledBlack);
  const palette = useThemeStore((state) => state.palette);
  const systemScheme = useColorScheme();

  return useMemo(
    () => resolveAppTheme({ themeMode, systemScheme, isAmoledBlack, palette }),
    [themeMode, systemScheme, isAmoledBlack, palette],
  );
};

export interface AppThemeProviderProps {
  children: ReactNode;
}

export const AppThemeProvider = ({ children }: AppThemeProviderProps): React.JSX.Element => {
  const theme = useAppTheme();

  return (
    <PaperProvider theme={theme}>
      <StatusBar
        barStyle={theme.dark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.appColors.background}
      />
      {children}
    </PaperProvider>
  );
};
