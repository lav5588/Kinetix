import React, { useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppNavigator } from '@app/AppNavigator';
import { AppThemeProvider } from '@core/theme';
import { PermissionGatekeeperScreen } from '@features/onboarding';

function App(): React.JSX.Element {
  const [permissionsReady, setPermissionsReady] = useState(false);

  return (
    <AppThemeProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          {permissionsReady ? (
            <AppNavigator />
          ) : (
            <PermissionGatekeeperScreen onReady={() => setPermissionsReady(true)} />
          )}
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </AppThemeProvider>
  );
}

export default App;
