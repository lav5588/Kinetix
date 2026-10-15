import { NativeModules, Platform } from 'react-native';

export interface DeviceStorageStats {
  totalBytes: number;
  freeBytes: number;
  usedBytes: number;
  /** Primary internal data partition; removable and adopted volumes are not combined. */
  scope: 'internal_data_volume';
}

interface NativeStorageStatsModule {
  getInternalStorageStats(): Promise<{
    totalBytes: number;
    freeBytes: number;
  }>;
}

const nativeStorageStats = NativeModules.DeviceStorageStats as NativeStorageStatsModule | undefined;

export async function getDeviceStorageStats(): Promise<DeviceStorageStats | null> {
  if (Platform.OS !== 'android' || !nativeStorageStats) {
    return null;
  }

  const stats = await nativeStorageStats.getInternalStorageStats();
  if (
    !Number.isSafeInteger(stats.totalBytes) ||
    !Number.isSafeInteger(stats.freeBytes) ||
    stats.totalBytes <= 0 ||
    stats.freeBytes < 0 ||
    stats.freeBytes > stats.totalBytes
  ) {
    return null;
  }

  return {
    totalBytes: stats.totalBytes,
    freeBytes: stats.freeBytes,
    usedBytes: stats.totalBytes - stats.freeBytes,
    scope: 'internal_data_volume',
  };
}

export function formatBytesAsGigabytes(bytes: number | null | undefined): string | null {
  if (bytes == null || !Number.isSafeInteger(bytes) || bytes < 0) {
    return null;
  }

  return `${(bytes / 1_000_000_000).toFixed(2)} GB`;
}
