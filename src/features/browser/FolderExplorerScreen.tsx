import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { FlashList } from '@shopify/flash-list';

import type { FolderExplorerScreenProps } from '@app/navigationTypes';
import { permissionManager } from '@core/permissions/PermissionManager';
import { useAppTheme } from '@core/theme';
import type { MediaCategory } from '@core/storage/types';
import { PressableScale } from '@shared/components/PressableScale';
import { FolderListItem } from './components/FolderListItem';
import { FolderGridItem } from './components/FolderGridItem';
import { FolderListSkeleton } from './components/FolderListSkeleton';
import {
  folderExplorerService as defaultFolderService,
  FolderExplorerService,
} from './services/FolderExplorerService';
import type { FolderExplorerViewMode, FolderItemViewModel } from './types';
import { filterFolders } from './utils/filterFolders';

export interface FolderExplorerScreenExtendedProps extends Partial<FolderExplorerScreenProps> {
  folderService?: FolderExplorerService;
  onFolderPress?: (folder: FolderItemViewModel) => void;
  checkPermissionsOnInit?: boolean;
}

export function getCategoryTitle(category: MediaCategory): string {
  switch (category) {
    case 'AUDIO':
      return 'Audio Folders';
    case 'VIDEO':
      return 'Video Folders';
    case 'PHOTO':
      return 'Photo Folders';
    case 'PDF':
      return 'PDF Folders';
    case 'OTHER_DOC':
      return 'Document Folders';
    default:
      return 'Folders';
  }
}

export function FolderExplorerScreen({
  route,
  navigation,
  folderService = defaultFolderService,
  onFolderPress,
  checkPermissionsOnInit = true,
}: FolderExplorerScreenExtendedProps): React.JSX.Element {
  const theme = useAppTheme();
  const category: MediaCategory = route?.params?.category ?? 'AUDIO';

  const [rawFolders, setRawFolders] = useState<FolderItemViewModel[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasPermissionError, setHasPermissionError] = useState<boolean>(false);
  const [hideMessenger, setHideMessenger] = useState<boolean>(() =>
    folderService.getHideMessengerPreference(),
  );
  const [menuVisible, setMenuVisible] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<FolderExplorerViewMode>(() =>
    folderService?.getViewModePreference ? folderService.getViewModePreference() : 'list',
  );

  const activeCategoryRef = useRef<MediaCategory>(category);
  activeCategoryRef.current = category;

  const screenTitle = getCategoryTitle(category);

  const handleToggleHideMessenger = useCallback((): void => {
    const nextVal = !hideMessenger;
    setHideMessenger(nextVal);
    folderService?.setHideMessengerPreference?.(nextVal);
    setMenuVisible(false);
  }, [hideMessenger, folderService]);

  const handleToggleViewMode = useCallback((): void => {
    const nextMode = viewMode === 'grid' ? 'list' : 'grid';
    setViewMode(nextMode);
    folderService?.setViewModePreference?.(nextMode);
    setMenuVisible(false);
  }, [viewMode, folderService]);

  const renderHeaderRight = useCallback(
    () => (
      <PressableScale
        accessibilityLabel="Folder options"
        accessibilityRole="button"
        onPress={() => setMenuVisible((prev) => !prev)}
        style={styles.headerMenuButton}
        testID="folder-explorer-menu-button"
      >
        <MaterialCommunityIcons
          color={theme.appColors.textPrimary}
          name="dots-vertical"
          size={24}
        />
      </PressableScale>
    ),
    [theme.appColors.textPrimary],
  );

  useEffect(() => {
    if (navigation?.setOptions) {
      navigation.setOptions({
        title: screenTitle,
        headerRight: renderHeaderRight,
      });
    }
  }, [navigation, renderHeaderRight, screenTitle]);

  const loadFolders = useCallback(
    async (targetCategory: MediaCategory, isRefresh = false) => {
      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setErrorMessage(null);
      setHasPermissionError(false);

      try {
        if (checkPermissionsOnInit) {
          const snapshot = await permissionManager.getPermissionSnapshot();
          if (snapshot && !snapshot.mediaPermissionsReady) {
            if (activeCategoryRef.current === targetCategory) {
              setHasPermissionError(true);
              setIsLoading(false);
              setIsRefreshing(false);
            }
            return;
          }
        }

        const items = await folderService.getFolders(targetCategory);
        if (activeCategoryRef.current === targetCategory) {
          setRawFolders(items);
        }
      } catch (err: unknown) {
        if (activeCategoryRef.current === targetCategory) {
          const errorText =
            err instanceof Error ? err.message : 'Unable to query folders from database.';
          setErrorMessage(errorText);
        }
      } finally {
        if (activeCategoryRef.current === targetCategory) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    },
    [checkPermissionsOnInit, folderService],
  );

  // Reload when category changes and clean up stale state
  useEffect(() => {
    setRawFolders([]);
    setIsLoading(true);
    setErrorMessage(null);
    setHasPermissionError(false);

    loadFolders(category);
  }, [category, loadFolders]);

  const handleRefresh = (): void => {
    loadFolders(category, true);
  };

  const handleRetry = (): void => {
    loadFolders(category, false);
  };

  const handleGrantPermission = (): void => {
    if (navigation?.navigate) {
      navigation.navigate('PermissionGatekeeper');
    }
  };

  const handleFolderPress = (folder: FolderItemViewModel): void => {
    onFolderPress?.(folder);
    if (navigation?.navigate) {
      navigation.navigate('FileListScreen', {
        folderId: folder.id,
        folderPath: folder.folderPath,
        folderName: folder.folderName,
        category: folder.category,
      });
    }
  };

  // Immediate in-memory filtering for responsive toggle behavior
  const displayedFolders = useMemo(() => {
    return filterFolders(rawFolders, { hideMessenger });
  }, [rawFolders, hideMessenger]);

  return (
    <SafeAreaView
      edges={['left', 'right']}
      style={[styles.container, { backgroundColor: theme.appColors.background }]}
      testID="folder-explorer-screen"
    >
      {/* Off-screen accessible anchor for header testing */}
      <View pointerEvents="box-none" style={styles.accessibleAnchor}>
        <Text testID="folder-explorer-title">{screenTitle}</Text>
        <Text testID="folder-explorer-category">Category: {category}</Text>
        <PressableScale
          accessibilityLabel="Go back"
          accessibilityRole="button"
          onPress={() => navigation?.goBack?.()}
          testID="folder-explorer-back-button"
        >
          <MaterialCommunityIcons color={theme.appColors.textPrimary} name="arrow-left" size={24} />
        </PressableScale>
        {renderHeaderRight()}
      </View>

      {/* Overflow Menu Modal for Triple-Dot options */}
      <Modal
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
        transparent
        visible={menuVisible}
        testID="folder-explorer-menu-modal"
      >
        <Pressable
          onPress={() => setMenuVisible(false)}
          style={styles.modalBackdrop}
          testID="folder-menu-backdrop"
        >
          <View
            style={[
              styles.menuPopover,
              {
                backgroundColor: theme.appColors.surface,
                borderColor: theme.appColors.border,
              },
            ]}
          >
            {/* View Mode Toggle: List or Grid */}
            <PressableScale
              accessibilityLabel={
                viewMode === 'grid' ? 'Switch to list view' : 'Switch to grid view'
              }
              accessibilityRole="button"
              onPress={handleToggleViewMode}
              style={styles.menuItem}
              testID="toggle-view-mode-menu-item"
            >
              <MaterialCommunityIcons
                color={theme.appColors.textPrimary}
                name={viewMode === 'grid' ? 'view-list-outline' : 'view-grid-outline'}
                size={22}
                style={styles.menuItemIcon}
              />
              <Text style={[styles.menuItemText, { color: theme.appColors.textPrimary }]}>
                {viewMode === 'grid' ? 'Switch to List View' : 'Switch to Grid View'}
              </Text>
            </PressableScale>

            <View style={[styles.menuDivider, { backgroundColor: theme.appColors.border }]} />

            {/* Hide WhatsApp & Telegram Toggle */}
            <PressableScale
              accessibilityLabel="Hide WhatsApp and Telegram folders"
              accessibilityRole="checkbox"
              accessibilityState={{ checked: hideMessenger }}
              onPress={handleToggleHideMessenger}
              style={styles.menuItem}
              testID="hide-messenger-toggle-chip"
            >
              <MaterialCommunityIcons
                color={hideMessenger ? theme.appColors.primary : theme.appColors.textSecondary}
                name={hideMessenger ? 'eye-off-outline' : 'eye-outline'}
                size={22}
                style={styles.menuItemIcon}
              />
              <Text style={[styles.menuItemText, { color: theme.appColors.textPrimary }]}>
                Hide WhatsApp/Telegram
              </Text>
              {hideMessenger && (
                <MaterialCommunityIcons color={theme.appColors.primary} name="check" size={20} />
              )}
            </PressableScale>
          </View>
        </Pressable>
      </Modal>

      {/* Content Area: Loading / Permission Required / Error / Empty / FlashList */}
      <View style={styles.content}>
        {isLoading && !isRefreshing ? (
          <FolderListSkeleton viewMode={viewMode} />
        ) : hasPermissionError ? (
          <View style={styles.centeredState} testID="folder-explorer-permission-required">
            <MaterialCommunityIcons
              color={theme.appColors.error}
              name="shield-alert-outline"
              size={64}
            />
            <Text style={[styles.stateTitle, { color: theme.appColors.textPrimary }]}>
              Permission Required
            </Text>
            <Text style={[styles.stateMessage, { color: theme.appColors.textSecondary }]}>
              Storage access is required to view your media folders.
            </Text>
            <PressableScale
              accessibilityLabel="Grant storage permissions"
              accessibilityRole="button"
              onPress={handleGrantPermission}
              style={[styles.primaryButton, { backgroundColor: theme.appColors.primary }]}
              testID="grant-permission-button"
            >
              <Text style={[styles.primaryButtonText, { color: theme.appColors.onPrimary }]}>
                Grant Permission
              </Text>
            </PressableScale>
          </View>
        ) : errorMessage ? (
          <View style={styles.centeredState} testID="folder-explorer-error">
            <MaterialCommunityIcons
              color={theme.appColors.error}
              name="alert-circle-outline"
              size={64}
            />
            <Text style={[styles.stateTitle, { color: theme.appColors.textPrimary }]}>
              Failed to load folders
            </Text>
            <Text style={[styles.stateMessage, { color: theme.appColors.textSecondary }]}>
              {errorMessage}
            </Text>
            <PressableScale
              accessibilityLabel="Retry loading folders"
              accessibilityRole="button"
              onPress={handleRetry}
              style={[styles.primaryButton, { backgroundColor: theme.appColors.primary }]}
              testID="folder-explorer-retry-button"
            >
              <Text style={[styles.primaryButtonText, { color: theme.appColors.onPrimary }]}>
                Retry
              </Text>
            </PressableScale>
          </View>
        ) : displayedFolders.length === 0 ? (
          <View style={styles.centeredState} testID="folder-explorer-empty">
            <MaterialCommunityIcons
              color={theme.appColors.textSecondary}
              name="folder-outline"
              size={64}
            />
            <Text style={[styles.stateTitle, { color: theme.appColors.textPrimary }]}>
              No Folders Found
            </Text>
            <Text style={[styles.stateMessage, { color: theme.appColors.textSecondary }]}>
              {hideMessenger && rawFolders.length > 0
                ? 'All folders in this category are hidden by the messenger filter.'
                : 'No folders containing files for this category were found.'}
            </Text>
          </View>
        ) : (
          <FlashList
            key={viewMode}
            contentContainerStyle={viewMode === 'grid' ? styles.gridContent : styles.listContent}
            data={displayedFolders}
            estimatedItemSize={viewMode === 'grid' ? 180 : 76}
            keyExtractor={(item) => item.id}
            numColumns={viewMode === 'grid' ? 2 : 1}
            refreshControl={
              <RefreshControl
                colors={[theme.appColors.primary]}
                onRefresh={handleRefresh}
                refreshing={isRefreshing}
                tintColor={theme.appColors.primary}
              />
            }
            renderItem={({ item }) =>
              viewMode === 'grid' ? (
                <FolderGridItem folder={item} onPress={handleFolderPress} />
              ) : (
                <FolderListItem folder={item} onPress={handleFolderPress} />
              )
            }
            testID="folder-explorer-list"
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerMenuButton: {
    padding: 8,
    marginRight: 4,
    borderRadius: 20,
  },
  accessibleAnchor: {
    position: 'absolute',
    top: -9999,
    left: -9999,
    width: 1,
    height: 1,
    opacity: 0,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  menuPopover: {
    position: 'absolute',
    top: 56,
    right: 16,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 6,
    minWidth: 240,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  menuItemIcon: {
    marginRight: 12,
  },
  menuItemText: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  menuDivider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 4,
  },
  content: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 24,
  },
  gridContent: {
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 24,
  },
  centeredState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  stateTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  stateMessage: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 4,
  },
  primaryButton: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

export default FolderExplorerScreen;
