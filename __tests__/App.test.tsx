import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import App from '@app';
import { permissionManager } from '@core/permissions';
import { useThemeStore } from '@core/theme/useThemeStore';

jest.mock('@core/permissions', () => ({
  permissionManager: {
    getPermissionSnapshot: jest.fn(),
    requestMediaPermissions: jest.fn(),
  },
  openAllFilesAccessSettings: jest.fn(),
}));

describe('App', () => {
  beforeEach(() => {
    useThemeStore.getState().resetThemeDefaults();
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
  });

  it('renders the preview and updates its background from theme controls after permission readiness', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('SQLite + MMKV Ready')).toBeTruthy();
    });

    const appShell = screen.getByTestId('app-root-shell');
    expect(screen.getByTestId('theme-preview-card')).toBeTruthy();
    expect(screen.getByText('Audio')).toBeTruthy();
    expect(StyleSheet.flatten(appShell.props.contentContainerStyle).backgroundColor).toBe(
      '#F8FAFC',
    );

    fireEvent.press(screen.getByText('Dark'));
    expect(StyleSheet.flatten(appShell.props.contentContainerStyle).backgroundColor).toBe(
      '#0F172A',
    );

    fireEvent.press(screen.getByText('AMOLED Off'));
    expect(StyleSheet.flatten(appShell.props.contentContainerStyle).backgroundColor).toBe(
      '#000000',
    );

    fireEvent.press(screen.getByText('Light'));
    expect(StyleSheet.flatten(appShell.props.contentContainerStyle).backgroundColor).toBe(
      '#F8FAFC',
    );
  });
});
