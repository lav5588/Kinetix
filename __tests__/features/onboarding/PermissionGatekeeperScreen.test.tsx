import React from 'react';
import { render, waitFor } from '@testing-library/react-native';

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
});
