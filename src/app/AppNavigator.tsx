import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { FolderExplorerScreen } from '@features/browser';
import { CategoryDashboardScreen, type CategoryKey } from '@features/dashboard';

export type AppNavigatorParamList = {
  Dashboard: undefined;
  FolderExplorer: { category: CategoryKey };
};

const Stack = createNativeStackNavigator<AppNavigatorParamList>();

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
            title: `${route.params.category[0].toUpperCase()}${route.params.category.slice(1)} folder`,
          })}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default AppNavigator;
