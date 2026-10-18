import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { FolderExplorerScreenProps } from '@app/navigationTypes';

/**
 * Temporary typed placeholder for FolderExplorerScreen.
 * Task 7 will replace this with the full FlashList-based universal folder explorer.
 */
export function FolderExplorerScreen({
  route,
}: Partial<FolderExplorerScreenProps>): React.JSX.Element {
  const category = route?.params?.category ?? 'AUDIO';

  return (
    <View style={styles.container} testID="folder-explorer-screen">
      <Text style={styles.title}>Folder Explorer</Text>
      <Text style={styles.category} testID="folder-explorer-category">
        Category: {category}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    marginBottom: 8,
  },
  category: {
    fontSize: 16,
  },
});
