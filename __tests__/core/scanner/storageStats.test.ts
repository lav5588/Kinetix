jest.mock('react-native', () => ({
  NativeModules: {
    DeviceStorageStats: {
      getInternalStorageStats: jest.fn(),
    },
  },
  Platform: { OS: 'android' },
}));

import { NativeModules, Platform } from 'react-native';
import { formatBytesAsGigabytes, getDeviceStorageStats } from '@core/scanner/storageStats';

const nativeStats = NativeModules.DeviceStorageStats as {
  getInternalStorageStats: jest.Mock;
};

describe('storageStats', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Platform.OS = 'android';
  });

  it('returns reliable internal-volume stats from the native provider', async () => {
    nativeStats.getInternalStorageStats.mockResolvedValue({
      totalBytes: 256_000_000_000,
      freeBytes: 64_000_000_000,
    });

    await expect(getDeviceStorageStats()).resolves.toEqual({
      totalBytes: 256_000_000_000,
      freeBytes: 64_000_000_000,
      usedBytes: 192_000_000_000,
      scope: 'internal_data_volume',
    });
  });

  it('reports no stats when the native provider is unavailable', async () => {
    Platform.OS = 'ios';

    await expect(getDeviceStorageStats()).resolves.toBeNull();
    expect(nativeStats.getInternalStorageStats).not.toHaveBeenCalled();
  });

  it.each([
    { totalBytes: 0, freeBytes: 0 },
    { totalBytes: -1, freeBytes: 0 },
    { totalBytes: 100, freeBytes: -1 },
    { totalBytes: 100, freeBytes: 101 },
    { totalBytes: Number.NaN, freeBytes: 0 },
    { totalBytes: Number.MAX_SAFE_INTEGER + 1, freeBytes: 0 },
  ])('rejects invalid native capacity values %#', async (stats) => {
    Platform.OS = 'android';
    nativeStats.getInternalStorageStats.mockResolvedValue(stats);

    await expect(getDeviceStorageStats()).resolves.toBeNull();
  });

  it('formats valid byte counts as decimal GB and rejects invalid values', () => {
    expect(formatBytesAsGigabytes(1_500_000_000)).toBe('1.50 GB');
    expect(formatBytesAsGigabytes(0)).toBe('0.00 GB');
    expect(formatBytesAsGigabytes(-1)).toBeNull();
    expect(formatBytesAsGigabytes(Number.NaN)).toBeNull();
    expect(formatBytesAsGigabytes(undefined)).toBeNull();
  });
});
