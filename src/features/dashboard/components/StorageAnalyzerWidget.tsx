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

  const zone = hasValidCapacity
    ? percent >= 85
      ? { color: '#EF4444', label: 'Critical', bgColor: 'rgba(239, 68, 68, 0.15)' }
      : percent >= 70
        ? { color: '#F59E0B', label: 'Moderate', bgColor: 'rgba(245, 158, 11, 0.15)' }
        : { color: '#10B981', label: 'Optimal', bgColor: 'rgba(16, 185, 129, 0.15)' }
    : { color: theme.appColors.primary, label: '', bgColor: 'transparent' };

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
        <View style={styles.metaContainer}>
          <Text style={[styles.meta, { color: theme.appColors.textSecondary }]}>
            {hasValidCapacity ? `${usedLabel} used` : 'No storage data available'}
          </Text>
          {hasValidCapacity ? (
            <View style={[styles.zoneBadge, { backgroundColor: zone.bgColor }]}>
              <View style={[styles.zoneDot, { backgroundColor: zone.color }]} />
              <Text style={[styles.zoneText, { color: zone.color }]}>{zone.label}</Text>
            </View>
          ) : null}
        </View>
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
                backgroundColor: zone.color,
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
  metaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  meta: {
    fontSize: 12,
    fontWeight: '600',
  },
  zoneBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    gap: 4,
  },
  zoneDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  zoneText: {
    fontSize: 11,
    fontWeight: '700',
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
