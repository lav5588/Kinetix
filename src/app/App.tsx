import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppNavigator } from '@app/AppNavigator';
import { AppThemeProvider } from '@core/theme';
import { PersistentMiniPlayer, FullAudioPlayerSheet } from '@features/audioPlayer';

function App(): React.JSX.Element {
  return (
    <AppThemeProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <AppNavigator />
          <PersistentMiniPlayer />
          <FullAudioPlayerSheet />
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </AppThemeProvider>
  );
}

export default App;
