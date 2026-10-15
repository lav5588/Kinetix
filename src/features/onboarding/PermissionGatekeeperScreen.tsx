import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Linking, ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button, Surface, Text } from 'react-native-paper';

import {
  openAllFilesAccessSettings,
  permissionManager,
  type PermissionSnapshot,
} from '@core/permissions';
import { useAppTheme } from '@core/theme';

export interface PermissionGatekeeperScreenProps {
  onReady?: () => void;
}

export function PermissionGatekeeperScreen({
  onReady,
}: PermissionGatekeeperScreenProps): React.JSX.Element {
  const theme = useAppTheme();
  const [snapshot, setSnapshot] = useState<PermissionSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const readyNotifiedRef = useRef(false);

  const refreshPermissions = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const nextSnapshot = await permissionManager.getPermissionSnapshot();
      setSnapshot(nextSnapshot);
    } catch {
      setError('Unable to check permission state right now.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshPermissions();

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void refreshPermissions();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [refreshPermissions]);

  const isReady = useMemo(() => {
    if (!snapshot) {
      return false;
    }

    const mediaReady = snapshot.mediaPermissionsReady;
    const allFilesReady =
      !snapshot.allFilesAccessRequired || snapshot.allFilesAccessEnabled === true;

    return mediaReady && allFilesReady;
  }, [snapshot]);

  useEffect(() => {
    if (isReady && !readyNotifiedRef.current) {
      readyNotifiedRef.current = true;
      onReady?.();
    }
  }, [isReady, onReady]);

  const handleGrantPermission = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const nextSnapshot = await permissionManager.requestMediaPermissions();
      setSnapshot(nextSnapshot);
    } catch {
      setError('Unable to request the required storage permissions.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleOpenSettings = useCallback(async () => {
    try {
      await Linking.openSettings();
      await refreshPermissions();
    } catch {
      setError('Unable to open Android app settings.');
    }
  }, [refreshPermissions]);

  const handleOpenAllFilesAccessSettings = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      await openAllFilesAccessSettings();
      await refreshPermissions();
    } catch {
      setError('Unable to open All Files Access settings.');
    } finally {
      setIsLoading(false);
    }
  }, [refreshPermissions]);

  const statusText = useMemo(() => {
    if (isLoading) {
      return 'Checking your device permissions…';
    }

    if (error) {
      return error;
    }

    if (!snapshot) {
      return 'Permission status is unavailable.';
    }

    if (snapshot.allFilesAccessRequired && snapshot.allFilesAccessEnabled === false) {
      return 'Broad document access is required for PDFs and other files in folders that are not surfaced by the media APIs.';
    }

    if (snapshot.blockedPermissions.length > 0) {
      return 'One or more required permissions are blocked. Please allow access in Android Settings.';
    }

    if (snapshot.deniedPermissions.length > 0) {
      return 'Access is needed so Kinetix can index your media and documents.';
    }

    if (snapshot.mediaPermissionsReady) {
      return 'All required permissions are ready.';
    }

    return 'Storage access is required to continue.';
  }, [error, isLoading, snapshot]);

  const renderActionButtons = () => {
    if (isLoading) {
      return (
        <View style={styles.loaderWrap}>
          <ActivityIndicator animating size="small" />
          <Text style={[styles.helperText, { color: theme.appColors.textSecondary }]}>
            Checking permissions…
          </Text>
        </View>
      );
    }

    if (!snapshot) {
      return (
        <Button
          mode="contained"
          onPress={() => void refreshPermissions()}
          testID="retry-permission-check"
        >
          Retry check
        </Button>
      );
    }

    if (
      snapshot.mediaPermissionsReady &&
      (!snapshot.allFilesAccessRequired || snapshot.allFilesAccessEnabled === true)
    ) {
      return (
        <View style={styles.buttonStack}>
          <Text
            style={[styles.successText, { color: theme.appColors.primary }]}
            testID="permission-ready-state"
          >
            Ready
          </Text>
        </View>
      );
    }

    if (snapshot.blockedPermissions.length > 0) {
      return (
        <View style={styles.buttonStack}>
          <Button mode="contained" onPress={handleOpenSettings} testID="open-settings-button">
            Open App Settings
          </Button>
        </View>
      );
    }

    if (snapshot.deniedPermissions.length > 0) {
      return (
        <View style={styles.buttonStack}>
          <Button mode="contained" onPress={handleGrantPermission} testID="grant-permission-button">
            Grant Permission
          </Button>
        </View>
      );
    }

    if (snapshot.allFilesAccessRequired && snapshot.allFilesAccessEnabled !== true) {
      return (
        <View style={styles.buttonStack}>
          <Button
            mode="contained"
            onPress={handleOpenAllFilesAccessSettings}
            testID="open-all-files-access-button"
          >
            Open All Files Access Settings
          </Button>
        </View>
      );
    }

    return (
      <Button
        mode="contained"
        onPress={() => void refreshPermissions()}
        testID="permission-refresh-button"
      >
        Refresh status
      </Button>
    );
  };

  return (
    <ScrollView
      contentContainerStyle={[styles.container, { backgroundColor: theme.appColors.background }]}
      testID="permission-gatekeeper-screen"
    >
      <Surface style={[styles.card, { backgroundColor: theme.appColors.surface }]} elevation={1}>
        <Text
          variant="headlineMedium"
          style={[styles.title, { color: theme.appColors.textPrimary }]}
        >
          Storage access
        </Text>
        <Text style={[styles.helperText, { color: theme.appColors.textSecondary }]}>
          {statusText}
        </Text>

        <View style={styles.badgeRow}>
          <View
            style={[
              styles.statusPill,
              {
                backgroundColor:
                  isReady && !error ? theme.appColors.primary : theme.appColors.surfaceVariant,
              },
            ]}
          >
            <Text
              style={[
                styles.statusPillText,
                {
                  color:
                    isReady && !error ? theme.appColors.onPrimary : theme.appColors.textPrimary,
                },
              ]}
              testID="permission-status-text"
            >
              {isReady && !error ? 'Ready' : 'Needs attention'}
            </Text>
          </View>
        </View>

        <Text style={[styles.bodyText, { color: theme.appColors.textPrimary }]}>
          Kinetix needs access to your files and media so it can index audio, video, photos, PDFs,
          and other documents from your device without disrupting every folder in the system.
        </Text>

        {renderActionButtons()}
      </Surface>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 32,
  },
  card: {
    borderRadius: 24,
    padding: 24,
  },
  title: {
    fontWeight: '700',
    marginBottom: 12,
  },
  helperText: {
    fontSize: 16,
    lineHeight: 22,
  },
  bodyText: {
    marginTop: 16,
    fontSize: 15,
    lineHeight: 22,
  },
  badgeRow: {
    marginTop: 20,
    marginBottom: 8,
    flexDirection: 'row',
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  buttonStack: {
    marginTop: 20,
  },
  successText: {
    marginTop: 20,
    fontWeight: '700',
    fontSize: 20,
  },
  loaderWrap: {
    marginTop: 20,
    alignItems: 'center',
    gap: 8,
  },
});

export default PermissionGatekeeperScreen;
