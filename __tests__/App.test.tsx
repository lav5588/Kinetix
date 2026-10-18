import { act, render, screen, waitFor } from '@testing-library/react-native';
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

  it('renders CategoryDashboardScreen and responds to theme controls after permission readiness', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('category-dashboard-screen')).toBeTruthy();
    });

    expect(screen.getByText('Kinetix')).toBeTruthy();
    expect(screen.getByText('Audio')).toBeTruthy();
    expect(screen.getByText('Video')).toBeTruthy();
    expect(screen.getByText('Photos')).toBeTruthy();
    expect(screen.getByText('PDF')).toBeTruthy();
    expect(screen.getByText('Other Docs')).toBeTruthy();

    const dashboard = screen.getByTestId('category-dashboard-screen');
    expect(StyleSheet.flatten(dashboard.props.style).backgroundColor).toBe('#F8FAFC');

    act(() => {
      useThemeStore.getState().setThemeMode('dark');
    });
    expect(StyleSheet.flatten(dashboard.props.style).backgroundColor).toBe('#0F172A');

    act(() => {
      useThemeStore.getState().setAmoledBlack(true);
    });
    expect(StyleSheet.flatten(dashboard.props.style).backgroundColor).toBe('#000000');

    act(() => {
      useThemeStore.getState().setThemeMode('light');
    });
    expect(StyleSheet.flatten(dashboard.props.style).backgroundColor).toBe('#F8FAFC');
  });
});
