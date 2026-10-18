import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ProgressBar } from 'react-native-paper';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { fileScannerService, type FileScannerResult } from '@core/scanner';
import { initializeDatabaseSchema, mediaRepository, type ResumeRecord } from '@core/storage';
import { permissionManager } from '@core/permissions';
import { useMediaScannerStore } from '@core/store';
import { CATEGORY_ACCENT_COLORS, useAppTheme } from '@core/theme';

import { CategoryBentoCard } from './components/CategoryBentoCard';
import { ContinueWatchingCarousel } from './components/ContinueWatchingCarousel';
import { StorageAnalyzerWidget } from './components/StorageAnalyzerWidget';

import type { DashboardNavigationProp } from '@app/navigationTypes';
import type { MediaCategory } from '@core/storage/types';

export type CategoryKey = 'audio' | 'video' | 'photo' | 'pdf' | 'doc';
export type MediaDomainCategory = MediaCategory;

export interface CategoryDashboardScreenProps {
  navigation?:
    | DashboardNavigationProp
    | {
        navigate: (
          screen: 'FolderExplorer' | 'PermissionGatekeeper' | string,
          params?: Record<string, unknown>,
        ) => void;
      };
  onSelectCategory?: (category: MediaCategory | CategoryKey) => void;
  onRequirePermission?: () => void;
  onContinueItemPress?: (item: ResumeRecord) => void;
  scannerService?: {
    startScan: () => Promise<FileScannerResult>;
  };
  initDatabaseOnMount?: boolean;
}

export interface CategoryDefinition {
  key: CategoryKey;
  category: MediaDomainCategory;
  title: string;
  icon: string;
}

export const CATEGORY_DEFINITIONS: CategoryDefinition[] = [
  { key: 'audio', category: 'AUDIO', title: 'Audio', icon: 'music-note' },
  { key: 'video', category: 'VIDEO', title: 'Video', icon: 'video' },
  { key: 'photo', category: 'PHOTO', title: 'Photos', icon: 'image-multiple' },
  { key: 'pdf', category: 'PDF', title: 'PDF', icon: 'file-pdf-box' },
  { key: 'doc', category: 'OTHER_DOC', title: 'Other Docs', icon: 'file-document-multiple' },
];

export function CategoryDashboardScreen({
  navigation,
  onSelectCategory,
  onRequirePermission,
  onContinueItemPress,
  scannerService = fileScannerService,
  initDatabaseOnMount = true,
}: CategoryDashboardScreenProps): React.JSX.Element {
  const theme = useAppTheme();
  const categoryCounts = useMediaScannerStore((state) => state.categoryCounts);
  const status = useMediaScannerStore((state) => state.status);
  const phase = useMediaScannerStore((state) => state.phase);
  const progressPercent = useMediaScannerStore((state) => state.progressPercent);
  const lastScanStatus = useMediaScannerStore((state) => state.lastScanStatus);
  const scannerError = useMediaScannerStore((state) => state.error);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [localErrorMessage, setLocalErrorMessage] = useState<string | null>(null);
  const [storageReady, setStorageReady] = useState(false);
  const isRefreshingRef = useRef(false);

  useEffect(() => {
    let isMounted = true;

    const bootstrap = async () => {
      if (initDatabaseOnMount) {
        try {
          await initializeDatabaseSchema();
          if (isMounted) {
            setStorageReady(true);
          }
        } catch {
          if (isMounted) {
            setStorageReady(false);
          }
        }
      }

      // Load existing category counts from SQLite so they appear immediately on app restart
      try {
        const counts = await mediaRepository.getCategoryItemCounts();
        if (isMounted) {
          useMediaScannerStore.getState().setCategoryCounts(counts);
        }
      } catch {
        // Table may not have records yet
      }

      // Refresh device storage statistics (used/free/total bytes)
      try {
        await fileScannerService.refreshStorageStats();
      } catch {
        // Ignore storage stats error
      }

      // Check permissions in the background. If NOT granted, navigate to PermissionGatekeeper.
      try {
        const snapshot = await permissionManager.getPermissionSnapshot();
        if (isMounted) {
          useMediaScannerStore.getState().setPermissionSnapshot(snapshot, Date.now());
          if (!snapshot.mediaPermissionsReady) {
            onRequirePermission?.();
            navigation?.navigate('PermissionGatekeeper');
          }
        }
      } catch {
        // Ignore permission snapshot error
      }
    };

    void bootstrap();

    return () => {
      isMounted = false;
    };
  }, [initDatabaseOnMount, navigation, onRequirePermission]);

  const isScanning =
    status === 'scanning' || status === 'indexing' || status === 'checkingPermissions';
  const permissionNeeded =
    lastScanStatus === 'permission_required' ||
    (status === 'error' && scannerError?.code === 'ACCESS_DENIED');

  const handleSelectCategory = (def: CategoryDefinition): void => {
    onSelectCategory?.(def.category);
    navigation?.navigate('FolderExplorer', { category: def.category });
  };

  const handleGrantPermission = (): void => {
    onRequirePermission?.();
    navigation?.navigate('PermissionGatekeeper');
  };

  const handleRefresh = useCallback(async () => {
    if (isRefreshingRef.current || isScanning) {
      return;
    }

    isRefreshingRef.current = true;
    setIsRefreshing(true);
    setLocalErrorMessage(null);

    try {
      const result = await scannerService.startScan();
      try {
        await fileScannerService.refreshStorageStats();
      } catch {
        // Ignore storage stats refresh error
      }
      if (result.status === 'completed') {
        const counts = await mediaRepository.getCategoryItemCounts();
        useMediaScannerStore.getState().setCategoryCounts(counts);
      } else if (result.status === 'permission_required') {
        onRequirePermission?.();
        navigation?.navigate('PermissionGatekeeper');
      } else if (result.status === 'failed' || result.status === 'cancelled') {
        if (result.errors && result.errors.length > 0) {
          setLocalErrorMessage(result.errors[0].message);
        }
      }
    } catch (error) {
      console.error('[Dashboard] scan error:', error);
      const message = error instanceof Error ? error.message : 'Scan failed';
      setLocalErrorMessage(message);
    } finally {
      isRefreshingRef.current = false;
      setIsRefreshing(false);
    }
  }, [isScanning, navigation, onRequirePermission, scannerService]);

  const progressRatio =
    progressPercent != null && Number.isFinite(progressPercent)
      ? Math.min(1, Math.max(0, progressPercent / 100))
      : undefined;

  const activeErrorMessage =
    localErrorMessage || (status === 'error' ? scannerError?.message : null);

  return (
    <ScrollView
      testID="category-dashboard-screen"
      style={{ backgroundColor: theme.appColors.background }}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          colors={[theme.appColors.primary]}
          tintColor={theme.appColors.primary}
        />
      }
    >
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.eyebrow, { color: theme.appColors.textSecondary }]}>Home</Text>
            <Text style={[styles.title, { color: theme.appColors.textPrimary }]}>Kinetix</Text>
          </View>
          <View
            testID="db-status-badge"
            style={[styles.storageBadge, { backgroundColor: storageReady ? '#22C55E' : '#F59E0B' }]}
          >
            <Text style={styles.storageBadgeText}>
              {storageReady ? 'SQLite + MMKV Ready' : 'Initializing storage...'}
            </Text>
          </View>
        </View>
      </View>

      {/* Non-blocking scanner progress indicator */}
      {isScanning ? (
        <View style={styles.progressContainer} testID="scanner-progress-indicator">
          <ProgressBar
            progress={progressRatio}
            indeterminate={progressRatio == null}
            color={theme.appColors.primary}
            style={styles.progressBar}
          />
          <Text style={[styles.progressText, { color: theme.appColors.textSecondary }]}>
            {phase === 'indexing'
              ? `Indexing media files... ${
                  progressPercent != null ? `${Math.round(progressPercent)}%` : ''
                }`
              : phase === 'discovering' || phase === 'normalizing'
                ? 'Scanning device for media files...'
                : 'Checking permissions...'}
          </Text>
        </View>
      ) : null}

      {/* Permission required gatekeeper notice */}
      {permissionNeeded ? (
        <View
          style={[
            styles.banner,
            {
              backgroundColor: `${theme.appColors.error}18`,
              borderColor: theme.appColors.error,
            },
          ]}
          testID="permission-required-banner"
        >
          <View style={styles.bannerContent}>
            <Text style={[styles.bannerTitle, { color: theme.appColors.error }]}>
              Storage Permission Needed
            </Text>
            <Text style={[styles.bannerMessage, { color: theme.appColors.textSecondary }]}>
              Required permissions are missing to scan all folders on your device.
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Grant storage permission"
              style={[styles.bannerButton, { backgroundColor: theme.appColors.primary }]}
              onPress={handleGrantPermission}
              testID="grant-permission-button"
            >
              <Text style={[styles.bannerButtonText, { color: theme.appColors.onPrimary }]}>
                Grant Permission
              </Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {/* Scan error banner */}
      {activeErrorMessage && !permissionNeeded ? (
        <View
          style={[
            styles.banner,
            {
              backgroundColor: `${theme.appColors.error}15`,
              borderColor: theme.appColors.error,
            },
          ]}
          testID="scanner-error-banner"
        >
          <Text style={[styles.bannerTitle, { color: theme.appColors.error }]}>Scan Notice</Text>
          <Text style={[styles.bannerMessage, { color: theme.appColors.textSecondary }]}>
            {activeErrorMessage}
          </Text>
        </View>
      ) : null}

      {/* Storage Analyzer Widget */}
      <StorageAnalyzerWidget />

      {/* 5 Material 3 Bento Category Cards with staggered FadeInDown */}
      <View style={styles.grid}>
        {CATEGORY_DEFINITIONS.map((def, index) => {
          const count = categoryCounts[def.category] ?? 0;
          const color = CATEGORY_ACCENT_COLORS[def.key];

          return (
            <Animated.View
              key={def.key}
              entering={FadeInDown.delay(index * 70)
                .duration(350)
                .springify()}
              style={styles.cardCol}
              testID={`animated-card-${def.key}`}
            >
              <CategoryBentoCard
                category={def.key}
                title={def.title}
                count={count}
                color={color}
                icon={def.icon}
                delay={index * 70}
                onPress={() => handleSelectCategory(def)}
                testID={`category-card-${def.key}`}
              />
            </Animated.View>
          );
        })}
      </View>

      {/* Continue Watching Carousel */}
      <ContinueWatchingCarousel onItemPress={onContinueItemPress} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 36,
  },
  header: {
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  storageBadge: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  storageBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.4,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
  },
  progressContainer: {
    marginBottom: 16,
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 6,
  },
  banner: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
  },
  bannerContent: {
    gap: 8,
  },
  bannerTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  bannerMessage: {
    fontSize: 12,
    lineHeight: 16,
  },
  bannerButton: {
    alignSelf: 'flex-start',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 4,
  },
  bannerButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  cardCol: {
    width: '48%',
  },
});
