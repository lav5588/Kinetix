import type { PermissionStatus } from 'react-native-permissions';

export type RuntimeMediaPermission =
  | 'android.permission.READ_EXTERNAL_STORAGE'
  | 'android.permission.READ_MEDIA_AUDIO'
  | 'android.permission.READ_MEDIA_VIDEO'
  | 'android.permission.READ_MEDIA_IMAGES';

export type PermissionState = PermissionStatus | 'restricted';
export type AllFilesAccessState =
  'not_applicable' | 'pending' | 'granted' | 'denied' | 'unavailable' | 'error';

export type PermissionStatusRecord = Partial<Record<RuntimeMediaPermission, PermissionState>>;

export type PermissionSnapshot = {
  requiredPermissions: RuntimeMediaPermission[];
  grantedPermissions: RuntimeMediaPermission[];
  deniedPermissions: RuntimeMediaPermission[];
  blockedPermissions: RuntimeMediaPermission[];
  unavailablePermissions: RuntimeMediaPermission[];
  limitedPermissions: RuntimeMediaPermission[];
  allFilesAccessRequired: boolean;
  allFilesAccessEnabled: boolean | null;
  allFilesAccessStatus: AllFilesAccessState;
  mediaPermissionsReady: boolean;
  status: PermissionState;
};

export type PermissionPolicyResult = {
  apiLevel: number;
  isSupportedApi: boolean;
  runtimeMediaPermissions: RuntimeMediaPermission[];
  allFilesAccessRequired: boolean;
  isLegacyStoragePermission: boolean;
  isGranularMediaPermission: boolean;
  notes: string[];
};
