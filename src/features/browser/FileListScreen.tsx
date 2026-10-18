import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@app/navigationTypes';

export type FileListScreenProps = NativeStackScreenProps<RootStackParamList, 'FileListScreen'>;

/**
 * Placeholder for FileListScreen.
 * Task 8 will implement the full file browser, search, filter, and sort UI.
 */
export function FileListScreen({ route }: FileListScreenProps): React.JSX.Element {
  const { folderId, folderName, folderPath, category } = route.params;

  return (
    <View style={styles.container} testID="file-list-screen-placeholder">
      <Text testID="file-list-folder-id">{folderId}</Text>
      <Text testID="file-list-title">{folderName || 'Files'}</Text>
      <Text testID="file-list-folder-path">{folderPath}</Text>
      <Text testID="file-list-category">{category}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
});
