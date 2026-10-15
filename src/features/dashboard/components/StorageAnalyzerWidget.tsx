import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useAppTheme } from '@core/theme';
import { useMediaScannerStore } from '@core/store';

export function StorageAnalyzerWidget(): React.JSX.Element {
  const theme = useAppTheme();
  const storageStats = useMediaScannerStore((state) => state.storageStats);
  const usedBytes = storageStats.usedBytes ?? 0;
  const totalBytes = storageStats.totalBytes ?? (usedBytes || 1);
  const usedRatio = Math.min(1, Math.max(0, totalBytes > 0 ? usedBytes / totalBytes : 0));

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.appColors.surface,
          borderColor: theme.appColors.border,
        },
      ]}
      testID="storage-analyzer-widget"
    >
      <View style={styles.headerRow}>
        <Text style={[styles.label, { color: theme.appColors.textPrimary }]}>Storage</Text>
        <Text style={[styles.meta, { color: theme.appColors.textSecondary }]}>
          {storageStats.usedGb ?? '0 GB'} used
        </Text>
      </View>

      <View style={[styles.track, { backgroundColor: theme.appColors.surfaceVariant }]}>
        <View
          style={[
            styles.fill,
            {
              width: `${Math.round(usedRatio * 100)}%`,
              backgroundColor: theme.appColors.primary,
            },
          ]}
        />
      </View>

      <Text style={[styles.caption, { color: theme.appColors.textSecondary }]}>
        {Math.round(usedRatio * 100)}% of available storage is in use.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: 18,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
  },
  meta: {
    fontSize: 12,
    fontWeight: '600',
  },
  track: {
    height: 10,
    borderRadius: 999,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 999,
  },
  caption: {
    marginTop: 10,
    fontSize: 12,
  },
});
