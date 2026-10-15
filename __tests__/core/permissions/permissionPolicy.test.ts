import {
  getMediaPermissionsForAndroidLevel,
  requiresAllFilesAccess,
} from '@core/permissions/permissionPolicy';

describe('permissionPolicy', () => {
  it('maps legacy Android storage APIs to READ_EXTERNAL_STORAGE only', () => {
    expect(getMediaPermissionsForAndroidLevel(29).runtimeMediaPermissions).toEqual([
      'android.permission.READ_EXTERNAL_STORAGE',
    ]);
    expect(getMediaPermissionsForAndroidLevel(30).runtimeMediaPermissions).toEqual([
      'android.permission.READ_EXTERNAL_STORAGE',
    ]);
    expect(getMediaPermissionsForAndroidLevel(32).runtimeMediaPermissions).toEqual([
      'android.permission.READ_EXTERNAL_STORAGE',
    ]);
  });

  it('uses granular media permissions on Android 13+', () => {
    expect(getMediaPermissionsForAndroidLevel(33).runtimeMediaPermissions).toEqual([
      'android.permission.READ_MEDIA_AUDIO',
      'android.permission.READ_MEDIA_VIDEO',
      'android.permission.READ_MEDIA_IMAGES',
    ]);
    expect(getMediaPermissionsForAndroidLevel(34).runtimeMediaPermissions).toEqual([
      'android.permission.READ_MEDIA_AUDIO',
      'android.permission.READ_MEDIA_VIDEO',
      'android.permission.READ_MEDIA_IMAGES',
    ]);
    expect(getMediaPermissionsForAndroidLevel(35).runtimeMediaPermissions).toEqual([
      'android.permission.READ_MEDIA_AUDIO',
      'android.permission.READ_MEDIA_VIDEO',
      'android.permission.READ_MEDIA_IMAGES',
    ]);
  });

  it('keeps all-files access separate from runtime media permissions', () => {
    expect(requiresAllFilesAccess(29)).toBe(false);
    expect(requiresAllFilesAccess(30)).toBe(true);
    expect(requiresAllFilesAccess(31)).toBe(true);
    expect(requiresAllFilesAccess(35)).toBe(true);

    expect(getMediaPermissionsForAndroidLevel(33).allFilesAccessRequired).toBe(true);
    expect(getMediaPermissionsForAndroidLevel(33).isLegacyStoragePermission).toBe(false);
    expect(getMediaPermissionsForAndroidLevel(33).isGranularMediaPermission).toBe(true);
  });
});
