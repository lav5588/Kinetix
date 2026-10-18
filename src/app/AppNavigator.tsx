import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { CategoryDashboardScreen } from '@features/dashboard';
import { FolderExplorerScreen } from '@features/browser';
import { PermissionGatekeeperScreen } from '@features/onboarding';
import type { RootStackParamList } from './navigationTypes';

export type { RootStackParamList, AppNavigatorParamList } from './navigationTypes';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function AppNavigator(): React.JSX.Element {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Dashboard">
        <Stack.Screen
          name="Dashboard"
          component={CategoryDashboardScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="FolderExplorer"
          component={FolderExplorerScreen}
          options={({ route }) => ({
            title: `${route.params.category.toLowerCase()} folder`,
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
