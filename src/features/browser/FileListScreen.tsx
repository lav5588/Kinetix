import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import Animated, { LinearTransition } from 'react-native-reanimated';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { RootStackParamList } from '@app/navigationTypes';
import { useAppTheme } from '@core/theme';
import { fileRepository } from '@core/storage/repositories/FileRepository';
import { useResumeHistoryStore } from '@core/storage/useResumeStore';
import { useBrowserFilterStore } from '@core/store/useBrowserFilterStore';
import type { MediaCategory, MediaFileRow, ResumeRecord } from '@core/storage/types';
import { audioPlaybackService } from '@features/audioPlayer';
import { FileItemCard } from './components/FileItemCard';
import { SmartSearchHeader } from './components/SmartSearchHeader';
import { SortBottomSheet, type SortBottomSheetRef } from './components/SortBottomSheet';
import { filterFiles } from './utils/fileFilters';
import { sortFiles } from './utils/fileSorting';
import { formatSearchPlaceholder, getCategoryColor } from './utils/formatters';

export interface FileListScreenProps extends Partial<
  NativeStackScreenProps<RootStackParamList, 'FileListScreen'>
> {
  folderPath?: string;
  folderName?: string;
  category?: MediaCategory;
  folderId?: string;
  onFilePress?: (file: MediaFileRow) => void;
  showBackButton?: boolean;
  testID?: string;
}

export function FileListScreen({
  route,
  navigation,
  folderPath: propFolderPath,
  folderName: propFolderName,
  category: propCategory,
  folderId: propFolderId,
  onFilePress,
  showBackButton: propShowBackButton,
  testID = 'file-list-screen',
}: FileListScreenProps): React.JSX.Element {
  const theme = useAppTheme();
  const isMountedRef = useRef(true);
  const sortSheetRef = useRef<SortBottomSheetRef>(null);

  // Apply theme styling to the top navigation header
  useEffect(() => {
    if (navigation?.setOptions) {
      navigation.setOptions({
        title: (route?.params?.folderName ?? propFolderName) || 'Files',
        headerStyle: {
          backgroundColor: theme.appColors.surface,
        },
        headerTintColor: theme.appColors.textPrimary,
        headerTitleStyle: {
          color: theme.appColors.textPrimary,
          fontWeight: '600',
        },
      });
    }
  }, [
    navigation,
    propFolderName,
    route?.params?.folderName,
    theme.appColors.surface,
    theme.appColors.textPrimary,
  ]);

  // Read typed route parameters (with props fallback for testing/custom usage)
  const folderPath = route?.params?.folderPath ?? propFolderPath ?? '';
  const folderName = route?.params?.folderName ?? propFolderName ?? 'Files';
  const category = (route?.params?.category ?? propCategory ?? 'AUDIO') as MediaCategory;
  const folderId = route?.params?.folderId ?? propFolderId ?? `${category}:${folderPath}`;

  // Per-category persisted preferences from MMKV via Zustand store
  const storePref = useBrowserFilterStore((state) => state.preferences[category]);
  const setViewMode = useBrowserFilterStore((state) => state.setViewMode);
  const setQuickFilter = useBrowserFilterStore((state) => state.setQuickFilter);
  const setSort = useBrowserFilterStore((state) => state.setSort);

  const viewMode = storePref?.viewMode ?? 'LIST';
  const isGrid = viewMode === 'GRID';
  const quickFilter = storePref?.quickFilter ?? 'ALL';
  const sortField = storePref?.sortField ?? 'NAME';
  const sortDirection = storePref?.sortDirection ?? 'ASC';

  // State for search query and repository results
  const [searchQuery, setSearchQuery] = useState('');
  const [folderFiles, setFolderFiles] = useState<MediaFileRow[]>([]);
  const [ftsFiles, setFtsFiles] = useState<MediaFileRow[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Resume history records lookup map for fast card indicators
  const resumeItems = useResumeHistoryStore((state) => state.items);
  const resumeMap = useMemo(() => {
    const map = new Map<string, ResumeRecord>();
    for (const item of resumeItems) {
      if (item.filePath) {
        map.set(item.filePath, item);
      }
    }
    return map;
  }, [resumeItems]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Query FileRepository for folder contents
  const loadFolderFiles = useCallback(async () => {
    if (!folderPath && !folderId) {
      setIsLoading(false);
      setFolderFiles([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const results = await fileRepository.getFilesByFolder({
        folderPath,
        folderId,
        category,
      });

      if (isMountedRef.current) {
        setFolderFiles(results);
        setIsLoading(false);
      }
    } catch (err) {
      if (isMountedRef.current) {
        const message = err instanceof Error ? err.message : 'Failed to load files';
        setError(message);
        setIsLoading(false);
      }
    }
  }, [category, folderId, folderPath]);

  useEffect(() => {
    loadFolderFiles();
  }, [loadFolderFiles]);

  // Query FTS when search query changes
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setFtsFiles(null);
      return;
    }

    let isEffectActive = true;

    fileRepository
      .searchFilesFts({
        query: trimmed,
        folderPath,
        folderId,
        category,
      })
      .then((results) => {
        if (isEffectActive && isMountedRef.current) {
          setFtsFiles(results);
        }
      })
      .catch((err) => {
        // Fallback gracefully to in-memory substring search on folder files
        console.warn('[FileListScreen] FTS search fallback to in-memory:', err);
      });

    return () => {
      isEffectActive = false;
    };
  }, [category, folderId, folderPath, searchQuery]);

  // Apply quick filter and stable sort with instant in-memory search resilience
  const displayedFiles = useMemo(() => {
    const trimmed = searchQuery.trim();

    // If FTS has returned results for the search, use them;
    // otherwise fallback to folderFiles so in-memory substring search always matches!
    const source = trimmed.length > 0 && ftsFiles && ftsFiles.length > 0 ? ftsFiles : folderFiles;

    const filtered = filterFiles(source, {
      quickFilter,
      searchQuery: trimmed,
      resumeRecordsMap: resumeMap,
    });

    return sortFiles(filtered, sortField, sortDirection);
  }, [folderFiles, ftsFiles, quickFilter, resumeMap, searchQuery, sortDirection, sortField]);

  // Handle file item press
  const handleFilePress = useCallback(
    (file: MediaFileRow) => {
      onFilePress?.(file);
      if (category === 'AUDIO') {
        const audioQueue = displayedFiles.filter((f) => f.category === 'AUDIO');
        const startIdx = audioQueue.findIndex((f) => f.id === file.id);
        void audioPlaybackService.loadQueue(audioQueue, Math.max(0, startIdx), true);
      }
      console.log('[FileListScreen] File selected:', file.file_name, file.file_path);
    },
    [category, onFilePress, displayedFiles],
  );

  const handleToggleViewMode = useCallback(() => {
    setViewMode(category, isGrid ? 'LIST' : 'GRID');
  }, [category, isGrid, setViewMode]);

  const handleOpenSortSheet = useCallback(() => {
    sortSheetRef.current?.present();
  }, []);

  const handleResetFilters = useCallback(() => {
    setSearchQuery('');
    setFtsFiles(null);
    setQuickFilter(category, 'ALL');
  }, [category, setQuickFilter]);

  const accentColor = getCategoryColor(category);
  const searchPlaceholder = formatSearchPlaceholder(folderName);

  // Render individual file card wrapped in an Animated.View with Reanimated LinearTransition
  const renderItem = useCallback(
    ({ item }: { item: MediaFileRow }) => {
      const resumeRecord = resumeMap.get(item.file_path);

      return (
        <Animated.View
          layout={LinearTransition.springify().damping(15)}
          style={isGrid ? styles.gridItemWrapper : styles.listItemWrapper}
        >
          <FileItemCard
            file={item}
            onPress={() => handleFilePress(item)}
            resumeRecord={resumeRecord}
            viewMode={isGrid ? 'grid' : 'list'}
          />
        </Animated.View>
      );
    },
    [handleFilePress, isGrid, resumeMap],
  );

  const keyExtractor = useCallback((item: MediaFileRow) => item.id || item.file_path, []);

  // Header right actions: View Mode toggle and Sort button
  const headerRightAction = (
    <View style={styles.headerRightActions}>
      <Pressable
        accessibilityLabel={isGrid ? 'Switch to list view' : 'Switch to grid view'}
        accessibilityRole="button"
        hitSlop={8}
        onPress={handleToggleViewMode}
        style={styles.actionIconButton}
        testID="view-mode-toggle"
      >
        <MaterialCommunityIcons
          color={theme.appColors.textPrimary}
          name={isGrid ? 'view-list' : 'view-grid'}
          size={22}
        />
      </Pressable>

      <Pressable
        accessibilityLabel="Open sort options"
        accessibilityRole="button"
        hitSlop={8}
        onPress={handleOpenSortSheet}
        style={styles.actionIconButton}
        testID="sort-button"
      >
        <MaterialCommunityIcons color={theme.appColors.textPrimary} name="sort-variant" size={22} />
      </Pressable>
    </View>
  );

  return (
    <View
      style={[styles.container, { backgroundColor: theme.appColors.background }]}
      testID={testID}
    >
      {/* Hidden route metadata test markers for navigation integration verification */}
      <View style={styles.testMetaContainer} testID="file-list-screen-placeholder">
        <Text testID="file-list-folder-id">{folderId}</Text>
        <Text testID="file-list-title">{folderName}</Text>
        <Text testID="file-list-folder-path">{folderPath}</Text>
        <Text testID="file-list-category">{category}</Text>
      </View>

      {/* Search Header with Debounce & Quick Filters */}
      <SmartSearchHeader
        category={category}
        onBackPress={() => navigation?.goBack?.()}
        onQuickFilterChange={(filter) => setQuickFilter(category, filter)}
        onSearchQueryChange={setSearchQuery}
        placeholder={searchPlaceholder}
        rightAction={headerRightAction}
        searchQuery={searchQuery}
        selectedQuickFilter={quickFilter}
        showBackButton={propShowBackButton ?? false}
      />

      {/* Main Content Area */}
      <View style={styles.content}>
        {isLoading ? (
          <View style={styles.centerContainer} testID="file-list-loading">
            <ActivityIndicator color={accentColor} size="large" />
            <Text style={[styles.loadingText, { color: theme.appColors.textSecondary }]}>
              Loading files...
            </Text>
          </View>
        ) : error ? (
          <View style={styles.centerContainer} testID="file-list-error">
            <MaterialCommunityIcons color="#EF4444" name="alert-circle-outline" size={48} />
            <Text style={[styles.emptyTitle, { color: theme.appColors.textPrimary }]}>
              Unable to load files
            </Text>
            <Text style={[styles.emptySubtitle, { color: theme.appColors.textSecondary }]}>
              {error}
            </Text>
            <Pressable
              accessibilityLabel="Retry loading files"
              accessibilityRole="button"
              onPress={loadFolderFiles}
              style={[styles.actionButton, { backgroundColor: accentColor }]}
              testID="file-list-retry-button"
            >
              <Text style={styles.actionButtonText}>Retry</Text>
            </Pressable>
          </View>
        ) : folderFiles.length === 0 ? (
          <View style={styles.centerContainer} testID="file-list-empty">
            <MaterialCommunityIcons
              color={theme.appColors.textSecondary}
              name="folder-open-outline"
              size={52}
            />
            <Text style={[styles.emptyTitle, { color: theme.appColors.textPrimary }]}>
              Folder is empty
            </Text>
            <Text style={[styles.emptySubtitle, { color: theme.appColors.textSecondary }]}>
              No {category.toLowerCase()} files found in this folder
            </Text>
          </View>
        ) : displayedFiles.length === 0 ? (
          <View style={styles.centerContainer} testID="file-list-no-results">
            <MaterialCommunityIcons
              color={theme.appColors.textSecondary}
              name="file-search-outline"
              size={52}
            />
            <Text style={[styles.emptyTitle, { color: theme.appColors.textPrimary }]}>
              No matching files
            </Text>
            <Text style={[styles.emptySubtitle, { color: theme.appColors.textSecondary }]}>
              Try adjusting your search query or quick filter
            </Text>
            <Pressable
              accessibilityLabel="Reset filters and search query"
              accessibilityRole="button"
              onPress={handleResetFilters}
              style={[styles.actionButton, { backgroundColor: accentColor }]}
              testID="reset-filters-button"
            >
              <Text style={styles.actionButtonText}>Reset Filters</Text>
            </Pressable>
          </View>
        ) : (
          <FlashList
            contentContainerStyle={isGrid ? styles.gridContent : styles.listContent}
            data={displayedFiles}
            estimatedItemSize={isGrid ? 170 : 72}
            extraData={[isGrid, resumeMap]}
            key={isGrid ? 'grid-2' : 'list-1'}
            keyExtractor={keyExtractor}
            numColumns={isGrid ? 2 : 1}
            renderItem={renderItem}
            testID="flash-list-files"
          />
        )}
      </View>

      {/* Sort Options Bottom Sheet */}
      <SortBottomSheet
        category={category}
        currentSortDirection={sortDirection}
        currentSortField={sortField}
        onSelectSort={(field, direction) => setSort(category, field, direction)}
        ref={sortSheetRef}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  testMetaContainer: {
    height: 0,
    width: 0,
    opacity: 0,
    overflow: 'hidden',
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionIconButton: {
    padding: 6,
    marginLeft: 4,
    borderRadius: 8,
  },
  content: {
    flex: 1,
  },
  listContent: {
    paddingVertical: 4,
  },
  gridContent: {
    padding: 6,
  },
  listItemWrapper: {
    width: '100%',
  },
  gridItemWrapper: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginTop: 14,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 18,
  },
  actionButton: {
    marginTop: 16,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
});

export default FileListScreen;
