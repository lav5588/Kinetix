import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppNavigator } from '@app/AppNavigator';
import { AppThemeProvider } from '@core/theme';

function App(): React.JSX.Element {
  return (
    <AppThemeProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <AppNavigator />
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </AppThemeProvider>
  );
}

export default App;
