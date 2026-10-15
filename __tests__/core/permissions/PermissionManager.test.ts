import { Platform } from 'react-native';

jest.mock('react-native-permissions', () => {
  const mockCheckMultiple = jest.fn();
  const mockRequestMultiple = jest.fn();

  return {
    __esModule: true,
    checkMultiple: mockCheckMultiple,
    requestMultiple: mockRequestMultiple,
    RESULTS: {
      GRANTED: 'granted',
      DENIED: 'denied',
      BLOCKED: 'blocked',
      UNAVAILABLE: 'unavailable',
      LIMITED: 'limited',
    },
  };
});

import { RESULTS } from 'react-native-permissions';
import { PermissionManager } from '@core/permissions/PermissionManager';

const { checkMultiple, requestMultiple } = jest.requireMock('react-native-permissions') as {
  checkMultiple: jest.Mock;
  requestMultiple: jest.Mock;
};

describe('PermissionManager', () => {
  const originalOS = Platform.OS;
  const originalVersion = Platform.Version;

  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(Platform, 'OS', { value: 'android', configurable: true });
    Object.defineProperty(Platform, 'Version', { value: 33, configurable: true });
  });

  afterAll(() => {
    Object.defineProperty(Platform, 'OS', { value: originalOS, configurable: true });
    Object.defineProperty(Platform, 'Version', { value: originalVersion, configurable: true });
  });

  it('checks and reports denied media permissions for Android 13+', async () => {
    checkMultiple.mockResolvedValue({
      'android.permission.READ_MEDIA_AUDIO': RESULTS.GRANTED,
      'android.permission.READ_MEDIA_VIDEO': RESULTS.DENIED,
      'android.permission.READ_MEDIA_IMAGES': RESULTS.GRANTED,
    });

    const manager = new PermissionManager({
      allFilesAccessCapability: {
        isSupported: () => true,
        check: async () => false,
        openSettings: async () => true,
      },
    });

    const snapshot = await manager.checkPermissions();

    expect(checkMultiple).toHaveBeenCalledWith([
      'android.permission.READ_MEDIA_AUDIO',
      'android.permission.READ_MEDIA_VIDEO',
      'android.permission.READ_MEDIA_IMAGES',
    ]);
    expect(snapshot.deniedPermissions).toEqual(['android.permission.READ_MEDIA_VIDEO']);
    expect(snapshot.grantedPermissions).toEqual([
      'android.permission.READ_MEDIA_AUDIO',
      'android.permission.READ_MEDIA_IMAGES',
    ]);
    expect(snapshot.allFilesAccessRequired).toBe(true);
    expect(snapshot.allFilesAccessEnabled).toBe(false);
    expect(snapshot.mediaPermissionsReady).toBe(false);
  });

  it('requests only applicable permissions for Android 10 and surfaces blocked status', async () => {
    Object.defineProperty(Platform, 'Version', { value: 30, configurable: true });

    requestMultiple.mockResolvedValue({
      'android.permission.READ_EXTERNAL_STORAGE': RESULTS.BLOCKED,
    });

    const manager = new PermissionManager({
      allFilesAccessCapability: {
        isSupported: () => true,
        check: async () => true,
        openSettings: async () => true,
      },
    });

    const snapshot = await manager.requestMediaPermissions();

    expect(requestMultiple).toHaveBeenCalledWith(['android.permission.READ_EXTERNAL_STORAGE']);
    expect(snapshot.blockedPermissions).toEqual(['android.permission.READ_EXTERNAL_STORAGE']);
    expect(snapshot.allFilesAccessRequired).toBe(true);
    expect(snapshot.allFilesAccessEnabled).toBe(true);
    expect(snapshot.status).toBe('blocked');
  });
});
