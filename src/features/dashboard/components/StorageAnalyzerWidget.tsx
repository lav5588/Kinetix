import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useAppTheme } from '@core/theme';
import { useMediaScannerStore } from '@core/store';

export function StorageAnalyzerWidget(): React.JSX.Element {
  const theme = useAppTheme();
  const storageStats = useMediaScannerStore((state) => state.storageStats);

  const hasValidCapacity =
    storageStats.totalBytes != null &&
    storageStats.usedBytes != null &&
    Number.isFinite(storageStats.totalBytes) &&
    Number.isFinite(storageStats.usedBytes) &&
    storageStats.totalBytes > 0 &&
    storageStats.usedBytes >= 0 &&
    storageStats.usedBytes <= storageStats.totalBytes;

  const usedBytes = hasValidCapacity ? storageStats.usedBytes! : 0;
  const totalBytes = hasValidCapacity ? storageStats.totalBytes! : 1;
  const usedRatio = hasValidCapacity ? Math.min(1, Math.max(0, usedBytes / totalBytes)) : 0;
  const percent = Math.round(usedRatio * 100);

  const usedLabel = storageStats.usedGb ?? '0 GB';
  const freeLabel = storageStats.freeGb ?? '0 GB';

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
          {hasValidCapacity ? `${usedLabel} used` : 'No storage data available'}
        </Text>
      </View>

      <View
        accessibilityLabel={
          hasValidCapacity
            ? `Storage usage: ${usedLabel} used, ${freeLabel} free`
            : 'Storage data unavailable'
        }
        accessibilityRole="progressbar"
        style={[styles.track, { backgroundColor: theme.appColors.surfaceVariant }]}
        testID="storage-analyzer-bar"
      >
        {hasValidCapacity ? (
          <View
            style={[
              styles.fill,
              {
                width: `${percent}%`,
                backgroundColor: theme.appColors.primary,
              },
            ]}
          />
        ) : null}
      </View>

      <Text style={[styles.caption, { color: theme.appColors.textSecondary }]}>
        {hasValidCapacity
          ? `${percent}% of available storage is in use.`
          : 'Unable to calculate storage usage right now.'}
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
