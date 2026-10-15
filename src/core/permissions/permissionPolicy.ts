import type { PermissionPolicyResult, RuntimeMediaPermission } from './types';

const ANDROID_API_LEVEL_MINIMUM_SUPPORTED = 24;

const legacyReadExternalStorage: RuntimeMediaPermission =
  'android.permission.READ_EXTERNAL_STORAGE';
const readMediaAudio: RuntimeMediaPermission = 'android.permission.READ_MEDIA_AUDIO';
const readMediaVideo: RuntimeMediaPermission = 'android.permission.READ_MEDIA_VIDEO';
const readMediaImages: RuntimeMediaPermission = 'android.permission.READ_MEDIA_IMAGES';

export function getMediaPermissionsForAndroidLevel(apiLevel: number): PermissionPolicyResult {
  if (!Number.isInteger(apiLevel) || apiLevel < 0) {
    return {
      apiLevel,
      isSupportedApi: false,
      runtimeMediaPermissions: [],
      allFilesAccessRequired: false,
      isLegacyStoragePermission: false,
      isGranularMediaPermission: false,
      notes: ['Unsupported or unknown Android API level value.'],
    };
  }

  if (apiLevel < ANDROID_API_LEVEL_MINIMUM_SUPPORTED) {
    return {
      apiLevel,
      isSupportedApi: false,
      runtimeMediaPermissions: [],
      allFilesAccessRequired: false,
      isLegacyStoragePermission: false,
      isGranularMediaPermission: false,
      notes: [
        'API level is below the app minimum supported Android version; no runtime media permission request is required.',
      ],
    };
  }

  if (apiLevel >= 33) {
    return {
      apiLevel,
      isSupportedApi: true,
      runtimeMediaPermissions: [readMediaAudio, readMediaVideo, readMediaImages],
      allFilesAccessRequired: apiLevel >= 30,
      isLegacyStoragePermission: false,
      isGranularMediaPermission: true,
      notes: [
        'Android 13+ uses granular media permissions. All Files Access is a separate settings-level requirement.',
      ],
    };
  }

  if (apiLevel >= 29) {
    return {
      apiLevel,
      isSupportedApi: true,
      runtimeMediaPermissions: [legacyReadExternalStorage],
      allFilesAccessRequired: apiLevel >= 30,
      isLegacyStoragePermission: true,
      isGranularMediaPermission: false,
      notes: [
        'Android 10-12 uses READ_EXTERNAL_STORAGE for legacy storage access. MANAGE_EXTERNAL_STORAGE remains separate from the runtime permission flow.',
      ],
    };
  }

  return {
    apiLevel,
    isSupportedApi: true,
    runtimeMediaPermissions: [],
    allFilesAccessRequired: false,
    isLegacyStoragePermission: false,
    isGranularMediaPermission: false,
    notes: [
      'Android API level is below the storage access floor for the media scanner workflow; no explicit runtime storage permission is required.',
    ],
  };
}

export function requiresAllFilesAccess(apiLevel: number): boolean {
  return apiLevel >= 30;
}
