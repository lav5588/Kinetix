import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export interface FolderExplorerScreenProps {
  route?: {
    params?: {
      category?: string;
    };
  };
}

export function FolderExplorerScreen({ route }: FolderExplorerScreenProps): React.JSX.Element {
  const category = route?.params?.category ?? 'audio';

  return (
    <View style={styles.container} testID="folder-explorer-screen">
      <Text style={styles.title}>Folder Explorer</Text>
      <Text style={styles.category}>Category: {category}</Text>
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
