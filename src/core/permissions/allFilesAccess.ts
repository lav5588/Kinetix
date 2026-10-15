import { NativeModules, Platform } from 'react-native';

import type { AllFilesAccessCapability } from './PermissionManager';

export type AllFilesAccessStatus = {
  supported: boolean;
  granted: boolean;
  error?: string;
  reason?: 'not_applicable' | 'native_unavailable' | 'launch_failed';
};

const nativeModule = NativeModules.AllFilesAccess as
  | {
      isAllFilesAccessGranted?: () => Promise<boolean>;
      openAllFilesAccessSettings?: () => Promise<boolean>;
    }
  | undefined;

export const allFilesAccess: AllFilesAccessCapability = {
  isSupported: () => Platform.OS === 'android' && Platform.Version >= 30,
  check: async () => {
    if (!allFilesAccess.isSupported()) {
      return false;
    }

    if (!nativeModule?.isAllFilesAccessGranted) {
      throw new Error('Native All Files Access module is unavailable.');
    }

    return nativeModule.isAllFilesAccessGranted();
  },
  openSettings: async () => {
    if (!allFilesAccess.isSupported()) {
      return false;
    }

    if (!nativeModule?.openAllFilesAccessSettings) {
      throw new Error('Native All Files Access module is unavailable.');
    }

    return nativeModule.openAllFilesAccessSettings();
  },
};

export async function checkAllFilesAccess(): Promise<AllFilesAccessStatus> {
  if (Platform.OS !== 'android' || Platform.Version < 30) {
    return {
      supported: false,
      granted: false,
      reason: 'not_applicable',
    };
  }

  try {
    const granted = await allFilesAccess.check();
    return {
      supported: true,
      granted,
    };
  } catch (error) {
    return {
      supported: true,
      granted: false,
      reason: 'native_unavailable',
      error: error instanceof Error ? error.message : 'Unknown native error',
    };
  }
}

export async function openAllFilesAccessSettings(): Promise<AllFilesAccessStatus> {
  if (Platform.OS !== 'android' || Platform.Version < 30) {
    return {
      supported: false,
      granted: false,
      reason: 'not_applicable',
    };
  }

  try {
    const launched = await allFilesAccess.openSettings();
    return {
      supported: true,
      granted: launched,
    };
  } catch (error) {
    return {
      supported: true,
      granted: false,
      reason: 'launch_failed',
      error: error instanceof Error ? error.message : 'Unable to open Android settings',
    };
  }
}
