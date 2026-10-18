import { DefaultTheme, DarkTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { useAppTheme } from '@core/theme';
import { CategoryDashboardScreen } from '@features/dashboard';
import { FolderExplorerScreen, FileListScreen, getCategoryTitle } from '@features/browser';
import { PermissionGatekeeperScreen } from '@features/onboarding';
import type { RootStackParamList } from './navigationTypes';

export type { RootStackParamList, AppNavigatorParamList } from './navigationTypes';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function AppNavigator(): React.JSX.Element {
  const theme = useAppTheme();

  const navTheme = {
    ...(theme.dark ? DarkTheme : DefaultTheme),
    colors: {
      ...(theme.dark ? DarkTheme.colors : DefaultTheme.colors),
      primary: theme.appColors.primary,
      background: theme.appColors.background,
      card: theme.appColors.surface,
      text: theme.appColors.textPrimary,
      border: theme.appColors.border,
      notification: theme.appColors.primary,
    },
  };

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator
        initialRouteName="Dashboard"
        screenOptions={{
          headerStyle: {
            backgroundColor: theme.appColors.surface,
          },
          headerTintColor: theme.appColors.textPrimary,
          headerTitleStyle: {
            color: theme.appColors.textPrimary,
            fontWeight: '600',
          },
          headerShadowVisible: false,
          contentStyle: {
            backgroundColor: theme.appColors.background,
          },
        }}
      >
        <Stack.Screen
          name="Dashboard"
          component={CategoryDashboardScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="FolderExplorer"
          component={FolderExplorerScreen}
          options={({ route }) => ({
            title: getCategoryTitle(route.params.category),
          })}
        />
        <Stack.Screen
          name="FileListScreen"
          component={FileListScreen}
          options={({ route }) => ({
            title: route.params.folderName || 'Files',
          })}
        />
        <Stack.Screen
          name="PermissionGatekeeper"
          component={PermissionGatekeeperScreen}
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default AppNavigator;
