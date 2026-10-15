import React from 'react';
import { act, render, waitFor } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';

jest.mock('@core/permissions', () => {
  const permissionManager = {
    getPermissionSnapshot: jest.fn(),
    requestMediaPermissions: jest.fn(),
  };

  return {
    permissionManager,
    openAllFilesAccessSettings: jest.fn(),
  };
});

const { permissionManager } = jest.requireMock('@core/permissions') as {
  permissionManager: {
    getPermissionSnapshot: jest.Mock;
    requestMediaPermissions: jest.Mock;
  };
};

const { openAllFilesAccessSettings } = jest.requireMock('@core/permissions') as {
  openAllFilesAccessSettings: jest.Mock;
};

jest.mock('@core/theme', () => ({
  useAppTheme: () => ({
    appColors: {
      background: '#ffffff',
      surface: '#f5f5f5',
      textPrimary: '#111111',
      textSecondary: '#444444',
      primary: '#2563eb',
      onPrimary: '#ffffff',
      surfaceVariant: '#e5e7eb',
    },
  }),
}));

import { PermissionGatekeeperScreen } from '@features/onboarding/PermissionGatekeeperScreen';
import { fileScannerService } from '@core/scanner';

describe('PermissionGatekeeperScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows the Grant Permission CTA when media access is denied', async () => {
    permissionManager.getPermissionSnapshot.mockResolvedValue({
      requiredPermissions: ['android.permission.READ_MEDIA_AUDIO'],
      grantedPermissions: [],
      deniedPermissions: ['android.permission.READ_MEDIA_AUDIO'],
      blockedPermissions: [],
      unavailablePermissions: [],
      limitedPermissions: [],
      allFilesAccessRequired: false,
      allFilesAccessEnabled: null,
      allFilesAccessStatus: 'not_applicable',
      mediaPermissionsReady: false,
      status: 'denied',
    });

    const { findByTestId } = render(<PermissionGatekeeperScreen />);

    expect(await findByTestId('grant-permission-button')).toBeTruthy();
  });

  it('shows the app-settings CTA when permissions are blocked', async () => {
    permissionManager.getPermissionSnapshot.mockResolvedValue({
      requiredPermissions: ['android.permission.READ_EXTERNAL_STORAGE'],
      grantedPermissions: [],
      deniedPermissions: [],
      blockedPermissions: ['android.permission.READ_EXTERNAL_STORAGE'],
      unavailablePermissions: [],
      limitedPermissions: [],
      allFilesAccessRequired: false,
      allFilesAccessEnabled: null,
      allFilesAccessStatus: 'not_applicable',
      mediaPermissionsReady: false,
      status: 'blocked',
    });

    const { findByTestId } = render(<PermissionGatekeeperScreen />);

    expect(await findByTestId('open-settings-button')).toBeTruthy();
  });

  it('shows the all-files access CTA when that special setting is required', async () => {
    permissionManager.getPermissionSnapshot.mockResolvedValue({
      requiredPermissions: ['android.permission.READ_MEDIA_AUDIO'],
      grantedPermissions: ['android.permission.READ_MEDIA_AUDIO'],
      deniedPermissions: [],
      blockedPermissions: [],
      unavailablePermissions: [],
      limitedPermissions: [],
      allFilesAccessRequired: true,
      allFilesAccessEnabled: false,
      allFilesAccessStatus: 'denied',
      mediaPermissionsReady: true,
      status: 'denied',
    });

    const { findByTestId } = render(<PermissionGatekeeperScreen />);

    expect(await findByTestId('open-all-files-access-button')).toBeTruthy();
  });

  it('calls onReady when the permission state is ready', async () => {
    const onReady = jest.fn();
    permissionManager.getPermissionSnapshot.mockResolvedValue({
      requiredPermissions: ['android.permission.READ_MEDIA_AUDIO'],
      grantedPermissions: ['android.permission.READ_MEDIA_AUDIO'],
      deniedPermissions: [],
      blockedPermissions: [],
      unavailablePermissions: [],
      limitedPermissions: [],
      allFilesAccessRequired: false,
      allFilesAccessEnabled: null,
      allFilesAccessStatus: 'not_applicable',
      mediaPermissionsReady: true,
      status: 'granted',
    });

    render(<PermissionGatekeeperScreen onReady={onReady} />);

    await waitFor(() => {
      expect(onReady).toHaveBeenCalledTimes(1);
    });
  });

  it('re-checks permission state when returning to active without repeated active checks', async () => {
    let stateListener: ((state: AppStateStatus) => void) | null = null;
    const startScan = jest.spyOn(fileScannerService, 'startScan');
    const addListener = jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, listener) => {
      stateListener = listener;
      return { remove: jest.fn() };
    });
    permissionManager.getPermissionSnapshot.mockResolvedValue({
      requiredPermissions: [],
      grantedPermissions: [],
      deniedPermissions: [],
      blockedPermissions: [],
      unavailablePermissions: [],
      limitedPermissions: [],
      allFilesAccessRequired: false,
      allFilesAccessEnabled: null,
      allFilesAccessStatus: 'not_applicable',
      mediaPermissionsReady: true,
      status: 'granted',
    });

    render(<PermissionGatekeeperScreen />);
    await waitFor(() => {
      expect(permissionManager.getPermissionSnapshot).toHaveBeenCalledTimes(1);
    });

    act(() => {
      stateListener?.('background');
      stateListener?.('active');
    });
    await waitFor(() => {
      expect(permissionManager.getPermissionSnapshot).toHaveBeenCalledTimes(2);
    });

    act(() => {
      stateListener?.('active');
    });
    expect(permissionManager.getPermissionSnapshot).toHaveBeenCalledTimes(2);
    expect(startScan).not.toHaveBeenCalled();
    addListener.mockRestore();
    startScan.mockRestore();
  });
});
