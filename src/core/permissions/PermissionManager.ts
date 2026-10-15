import { Platform } from 'react-native';

import { allFilesAccess } from './allFilesAccess';
import { getMediaPermissionsForAndroidLevel } from './permissionPolicy';
import type {
  AllFilesAccessState,
  PermissionSnapshot,
  PermissionState,
  RuntimeMediaPermission,
} from './types';

export interface AllFilesAccessCapability {
  isSupported(): boolean;
  check(): Promise<boolean>;
  openSettings(): Promise<boolean>;
}

export type PermissionManagerOptions = {
  allFilesAccessCapability?: AllFilesAccessCapability;
};

type RNPermissionsModule = {
  checkMultiple: (
    permissions: RuntimeMediaPermission[],
  ) => Promise<Record<string, PermissionState>>;
  requestMultiple: (
    permissions: RuntimeMediaPermission[],
  ) => Promise<Record<string, PermissionState>>;
};

function getNativePermissionModule(): RNPermissionsModule | null {
  try {
    // Lazy loading lets the permission gate handle binaries missing the native module.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const permissionsModule = require('react-native-permissions') as RNPermissionsModule & {
      checkMultiple?: (
        permissions: RuntimeMediaPermission[],
      ) => Promise<Record<string, PermissionState>>;
      requestMultiple?: (
        permissions: RuntimeMediaPermission[],
      ) => Promise<Record<string, PermissionState>>;
    };

    if (
      !permissionsModule ||
      typeof permissionsModule.checkMultiple !== 'function' ||
      typeof permissionsModule.requestMultiple !== 'function'
    ) {
      return null;
    }

    return permissionsModule as RNPermissionsModule;
  } catch {
    return null;
  }
}

export class PermissionManager {
  private readonly allFilesAccessCapability?: AllFilesAccessCapability;

  constructor(options: PermissionManagerOptions = {}) {
    this.allFilesAccessCapability = options.allFilesAccessCapability;
  }

  getApiLevel(): number {
    if (Platform.OS !== 'android') {
      return 0;
    }

    const apiLevel = Number(Platform.Version ?? 0);
    return Number.isFinite(apiLevel) ? apiLevel : 0;
  }

  private buildPermissionSnapshot(
    requiredPermissions: RuntimeMediaPermission[],
    permissionResults: Record<string, PermissionState>,
    allFilesAccessState: AllFilesAccessState,
  ): PermissionSnapshot {
    const grantedPermissions: RuntimeMediaPermission[] = [];
    const deniedPermissions: RuntimeMediaPermission[] = [];
    const blockedPermissions: RuntimeMediaPermission[] = [];
    const unavailablePermissions: RuntimeMediaPermission[] = [];
    const limitedPermissions: RuntimeMediaPermission[] = [];

    const grantedResult = 'granted' as const;
    const deniedResult = 'denied' as const;
    const blockedResult = 'blocked' as const;
    const unavailableResult = 'unavailable' as const;
    const limitedResult = 'limited' as const;

    for (const permission of requiredPermissions) {
      const status = permissionResults[permission] ?? unavailableResult;

      switch (status) {
        case grantedResult:
          grantedPermissions.push(permission);
          break;
        case deniedResult:
          deniedPermissions.push(permission);
          break;
        case blockedResult:
          blockedPermissions.push(permission);
          break;
        case unavailableResult:
          unavailablePermissions.push(permission);
          break;
        case limitedResult:
          limitedPermissions.push(permission);
          break;
        case 'restricted':
          deniedPermissions.push(permission);
          break;
        default:
          unavailablePermissions.push(permission);
          break;
      }
    }

    const allFilesAccessRequired =
      this.getRequiredPermissions().length > 0 && this.getApiLevel() >= 30;
    const allFilesAccessEnabled =
      allFilesAccessRequired && allFilesAccessState === 'granted'
        ? true
        : allFilesAccessRequired && allFilesAccessState === 'denied'
          ? false
          : null;

    const mediaPermissionsReady =
      requiredPermissions.length === 0 ||
      (grantedPermissions.length === requiredPermissions.length &&
        blockedPermissions.length === 0 &&
        deniedPermissions.length === 0 &&
        unavailablePermissions.length === 0 &&
        limitedPermissions.length === 0);

    const status: PermissionState =
      requiredPermissions.length === 0
        ? 'granted'
        : deniedPermissions.length > 0
          ? 'denied'
          : blockedPermissions.length > 0
            ? 'blocked'
            : unavailablePermissions.length > 0
              ? 'unavailable'
              : limitedPermissions.length > 0
                ? 'limited'
                : 'granted';

    return {
      requiredPermissions,
      grantedPermissions,
      deniedPermissions,
      blockedPermissions,
      unavailablePermissions,
      limitedPermissions,
      allFilesAccessRequired,
      allFilesAccessEnabled,
      allFilesAccessStatus: allFilesAccessState,
      mediaPermissionsReady,
      status,
    };
  }

  getRequiredPermissions(): RuntimeMediaPermission[] {
    return getMediaPermissionsForAndroidLevel(this.getApiLevel()).runtimeMediaPermissions;
  }

  async getAllFilesAccessStatus(): Promise<AllFilesAccessState> {
    if (Platform.OS !== 'android' || this.getApiLevel() < 30) {
      return 'not_applicable';
    }

    if (!this.allFilesAccessCapability) {
      return 'pending';
    }

    try {
      const granted = await this.allFilesAccessCapability.check();
      return granted ? 'granted' : 'denied';
    } catch {
      return 'error';
    }
  }

  async checkPermissions(): Promise<PermissionSnapshot> {
    const requiredPermissions = this.getRequiredPermissions();

    if (Platform.OS !== 'android' || requiredPermissions.length === 0) {
      const allFilesAccessState = await this.getAllFilesAccessStatus();
      return this.buildPermissionSnapshot(
        requiredPermissions,
        Object.fromEntries(requiredPermissions.map((permission) => [permission, 'unavailable'])),
        allFilesAccessState,
      );
    }

    const permissionModule = getNativePermissionModule();
    const fallbackResults = Object.fromEntries(
      requiredPermissions.map((permission) => [permission, 'unavailable' as const]),
    );

    if (!permissionModule) {
      const allFilesAccessState = await this.getAllFilesAccessStatus();
      return this.buildPermissionSnapshot(
        requiredPermissions,
        fallbackResults as Record<string, PermissionState>,
        allFilesAccessState,
      );
    }

    const permissionResults = await permissionModule.checkMultiple(requiredPermissions);
    const allFilesAccessState = await this.getAllFilesAccessStatus();
    return this.buildPermissionSnapshot(
      requiredPermissions,
      permissionResults as Record<string, PermissionState>,
      allFilesAccessState,
    );
  }

  async requestMediaPermissions(): Promise<PermissionSnapshot> {
    const requiredPermissions = this.getRequiredPermissions();

    if (Platform.OS !== 'android' || requiredPermissions.length === 0) {
      return this.checkPermissions();
    }

    const permissionModule = getNativePermissionModule();
    if (!permissionModule) {
      return this.checkPermissions();
    }

    try {
      const requestedResults = await permissionModule.requestMultiple(requiredPermissions);
      const allFilesAccessState = await this.getAllFilesAccessStatus();
      return this.buildPermissionSnapshot(
        requiredPermissions,
        requestedResults as Record<string, PermissionState>,
        allFilesAccessState,
      );
    } catch {
      return {
        ...(await this.checkPermissions()),
        status: 'unavailable',
      };
    }
  }

  async getPermissionSnapshot(): Promise<PermissionSnapshot> {
    return this.checkPermissions();
  }
}

export const permissionManager = new PermissionManager({
  allFilesAccessCapability: allFilesAccess,
});
