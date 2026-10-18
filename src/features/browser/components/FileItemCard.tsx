import React, { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import { useAppTheme } from '@core/theme';
import { PressableScale } from '@shared/components/PressableScale';
import type { MediaCategory, MediaFileRow, ResumeRecord } from '@core/storage/types';
import type { FileItemViewModel } from '../types';
import {
  formatDuration,
  formatFolderSize,
  getCategoryColor,
  getFileFallbackIcon,
} from '../utils/formatters';
import { calculateResumeProgress } from '../utils/fileFilters';

export interface FileItemCardProps {
  file: FileItemViewModel | MediaFileRow;
  viewMode?: 'list' | 'grid' | 'LIST' | 'GRID';
  resumeRecord?: ResumeRecord | null;
  resumeProgressPercent?: number | null;
  onPress?: (file: FileItemViewModel | MediaFileRow) => void;
  onLongPress?: (file: FileItemViewModel | MediaFileRow) => void;
  testID?: string;
  disabled?: boolean;
}

export function FileItemCard({
  file,
  viewMode = 'list',
  resumeRecord,
  resumeProgressPercent,
  onPress,
  onLongPress,
  testID,
  disabled = false,
}: FileItemCardProps): React.JSX.Element {
  const theme = useAppTheme();
  const [imageError, setImageError] = useState(false);

  const isGrid = viewMode.toUpperCase() === 'GRID';
  const category = file.category as MediaCategory;
  const categoryColor = getCategoryColor(category);
  const fallbackIcon = getFileFallbackIcon(category);

  const fileName =
    ('fileName' in file && file.fileName) || ('file_name' in file && file.file_name) || 'Untitled';

  const filePath =
    ('filePath' in file && file.filePath) || ('file_path' in file && file.file_path) || '';

  const fileId = file.id || filePath;

  const sizeBytes =
    ('sizeBytes' in file && typeof file.sizeBytes === 'number' ? file.sizeBytes : null) ??
    ('size_bytes' in file && typeof file.size_bytes === 'number' ? file.size_bytes : null) ??
    0;

  const durationMs =
    ('durationMs' in file && typeof file.durationMs === 'number' ? file.durationMs : null) ??
    ('duration_ms' in file && typeof file.duration_ms === 'number' ? file.duration_ms : null) ??
    null;

  const isFavorite =
    Boolean('isFavorite' in file && file.isFavorite) ||
    Boolean('is_favorite' in file && file.is_favorite === 1);

  // Derive thumbnail URI
  const rawThumbnailUri =
    (file as { thumbnailUri?: string | null }).thumbnailUri ??
    (category === 'PHOTO' && filePath ? filePath : null);

  const hasValidThumbnail = Boolean(rawThumbnailUri && !imageError);
  const thumbnailSource = rawThumbnailUri
    ? {
        uri: rawThumbnailUri.startsWith('file://') ? rawThumbnailUri : `file://${rawThumbnailUri}`,
      }
    : undefined;

  // Calculate resume progress percentage (0 - 100)
  let progress: number | null = null;

  if (typeof resumeProgressPercent === 'number' && Number.isFinite(resumeProgressPercent)) {
    progress = Math.min(100, Math.max(0, Math.round(resumeProgressPercent)));
  } else if (resumeRecord) {
    if (resumeRecord.isCompleted) {
      progress = 100;
    } else {
      const effectiveDuration =
        typeof resumeRecord.durationMs === 'number' ? resumeRecord.durationMs : durationMs;

      if (
        typeof resumeRecord.positionMs === 'number' &&
        typeof effectiveDuration === 'number' &&
        effectiveDuration > 0
      ) {
        progress = calculateResumeProgress(resumeRecord.positionMs, effectiveDuration);
      }
    }
  } else {
    const fileResumePos =
      ('resumePositionMs' in file && typeof file.resumePositionMs === 'number'
        ? file.resumePositionMs
        : null) ??
      ('position_ms' in file && typeof (file as { position_ms?: number }).position_ms === 'number'
        ? (file as { position_ms: number }).position_ms
        : null);

    const fileResumeDur =
      ('resumeDurationMs' in file && typeof file.resumeDurationMs === 'number'
        ? file.resumeDurationMs
        : null) ?? durationMs;

    if (
      typeof fileResumePos === 'number' &&
      fileResumePos > 0 &&
      typeof fileResumeDur === 'number' &&
      fileResumeDur > 0
    ) {
      progress = calculateResumeProgress(fileResumePos, fileResumeDur);
    }
  }

  // Clamped between 0 and 100, progress indicator rendered only when valid and > 0
  const showProgressBar = typeof progress === 'number' && progress > 0;
  const clampedProgress =
    typeof progress === 'number' && progress > 0 ? Math.min(100, Math.max(0, progress)) : 0;

  const sizeText = formatFolderSize(sizeBytes);
  const durationText =
    durationMs && durationMs > 0 && (category === 'AUDIO' || category === 'VIDEO')
      ? formatDuration(durationMs)
      : null;

  const handlePress = (): void => {
    onPress?.(file);
  };

  const handleLongPress = (): void => {
    onLongPress?.(file);
  };

  const accessibilityLabel = [
    fileName,
    category,
    sizeText,
    durationText ? `Duration: ${durationText}` : null,
    isFavorite ? 'Favorite' : null,
    showProgressBar ? `Progress: ${clampedProgress}%` : null,
  ]
    .filter(Boolean)
    .join(', ');

  if (isGrid) {
    return (
      <PressableScale
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button"
        disabled={disabled}
        onLongPress={handleLongPress}
        onPress={handlePress}
        scaleTo={0.97}
        style={styles.gridWrapper}
        testID={testID ?? `file-grid-item-${fileId}`}
      >
        <View
          style={[
            styles.gridCard,
            {
              backgroundColor: theme.appColors.surface,
              borderColor: theme.appColors.border,
            },
          ]}
        >
          {/* Grid Thumbnail / Icon Container */}
          <View
            style={[
              styles.gridThumbnailContainer,
              {
                backgroundColor: hasValidThumbnail
                  ? theme.appColors.surfaceVariant
                  : `${categoryColor}18`,
              },
            ]}
          >
            {hasValidThumbnail && thumbnailSource ? (
              <Image
                onError={() => setImageError(true)}
                resizeMode="cover"
                source={thumbnailSource}
                style={styles.gridThumbnailImage}
                testID="file-thumbnail-image"
              />
            ) : (
              <MaterialCommunityIcons
                color={categoryColor}
                name={fallbackIcon}
                size={36}
                testID="file-fallback-icon"
              />
            )}

            {isFavorite ? (
              <View
                style={[styles.favoriteBadge, { backgroundColor: theme.appColors.surface }]}
                testID="file-favorite-badge"
              >
                <MaterialCommunityIcons color="#EF4444" name="heart" size={14} />
              </View>
            ) : null}

            {durationText ? (
              <View style={styles.durationBadge} testID="file-duration-badge">
                <Text style={styles.durationText}>{durationText}</Text>
              </View>
            ) : null}
          </View>

          {/* Grid Info */}
          <View style={styles.gridInfoContainer}>
            <Text
              ellipsizeMode="middle"
              numberOfLines={2}
              style={[styles.gridTitle, { color: theme.appColors.textPrimary }]}
              testID="file-name"
            >
              {fileName}
            </Text>

            <View style={styles.gridMetaRow}>
              <Text
                style={[styles.gridMetaText, { color: theme.appColors.textSecondary }]}
                testID="file-size"
              >
                {sizeText}
              </Text>
            </View>
          </View>

          {/* Bottom Progress Bar */}
          {showProgressBar ? (
            <View
              accessibilityLabel={`Progress: ${clampedProgress}%`}
              accessibilityRole="progressbar"
              style={[styles.progressBarTrack, { backgroundColor: theme.appColors.surfaceVariant }]}
              testID="file-progress-bar"
            >
              <View
                style={[
                  styles.progressBarFill,
                  {
                    width: `${clampedProgress}%`,
                    backgroundColor: categoryColor,
                  },
                ]}
                testID="file-progress-fill"
              />
            </View>
          ) : null}
        </View>
      </PressableScale>
    );
  }

  // List Presentation
  return (
    <PressableScale
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      disabled={disabled}
      onLongPress={handleLongPress}
      onPress={handlePress}
      scaleTo={0.98}
      style={[
        styles.listContainer,
        {
          backgroundColor: theme.appColors.surface,
          borderBottomColor: theme.appColors.border,
        },
      ]}
      testID={testID ?? `file-list-item-${fileId}`}
    >
      <View style={styles.listContentRow}>
        {/* List Thumbnail or Icon */}
        <View
          style={[
            styles.listThumbnailContainer,
            {
              backgroundColor: hasValidThumbnail
                ? theme.appColors.surfaceVariant
                : `${categoryColor}18`,
            },
          ]}
        >
          {hasValidThumbnail && thumbnailSource ? (
            <Image
              onError={() => setImageError(true)}
              resizeMode="cover"
              source={thumbnailSource}
              style={styles.listThumbnailImage}
              testID="file-thumbnail-image"
            />
          ) : (
            <MaterialCommunityIcons
              color={categoryColor}
              name={fallbackIcon}
              size={26}
              testID="file-fallback-icon"
            />
          )}

          {isFavorite ? (
            <View
              style={[styles.favoriteBadgeList, { backgroundColor: theme.appColors.surface }]}
              testID="file-favorite-badge"
            >
              <MaterialCommunityIcons color="#EF4444" name="heart" size={12} />
            </View>
          ) : null}
        </View>

        {/* List Details */}
        <View style={styles.listDetailsContainer}>
          <Text
            ellipsizeMode="middle"
            numberOfLines={1}
            style={[styles.listTitle, { color: theme.appColors.textPrimary }]}
            testID="file-name"
          >
            {fileName}
          </Text>

          <View style={styles.listSubtitleRow}>
            <Text
              style={[styles.listMetaText, { color: theme.appColors.textSecondary }]}
              testID="file-size"
            >
              {sizeText}
            </Text>

            {durationText ? (
              <>
                <Text style={[styles.metaSeparator, { color: theme.appColors.textSecondary }]}>
                  •
                </Text>
                <Text
                  style={[styles.listMetaText, { color: theme.appColors.textSecondary }]}
                  testID="file-duration"
                >
                  {durationText}
                </Text>
              </>
            ) : null}

            {showProgressBar ? (
              <>
                <Text style={[styles.metaSeparator, { color: theme.appColors.textSecondary }]}>
                  •
                </Text>
                <Text
                  style={[styles.listProgressText, { color: categoryColor }]}
                  testID="file-progress-label"
                >
                  {clampedProgress}%
                </Text>
              </>
            ) : null}
          </View>
        </View>
      </View>

      {/* Bottom Progress Bar */}
      {showProgressBar ? (
        <View
          accessibilityLabel={`Progress: ${clampedProgress}%`}
          accessibilityRole="progressbar"
          style={[styles.progressBarTrack, { backgroundColor: theme.appColors.surfaceVariant }]}
          testID="file-progress-bar"
        >
          <View
            style={[
              styles.progressBarFill,
              {
                width: `${clampedProgress}%`,
                backgroundColor: categoryColor,
              },
            ]}
            testID="file-progress-fill"
          />
        </View>
      ) : null}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  // List Styles
  listContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  listContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 12,
  },
  listThumbnailContainer: {
    width: 48,
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  listThumbnailImage: {
    width: '100%',
    height: '100%',
  },
  listDetailsContainer: {
    flex: 1,
    marginLeft: 14,
    justifyContent: 'center',
  },
  listTitle: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 20,
  },
  listSubtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  listMetaText: {
    fontSize: 12,
    fontWeight: '400',
  },
  listProgressText: {
    fontSize: 12,
    fontWeight: '600',
  },
  metaSeparator: {
    marginHorizontal: 5,
    fontSize: 12,
  },
  favoriteBadgeList: {
    position: 'absolute',
    top: 2,
    right: 2,
    borderRadius: 6,
    padding: 2,
  },

  // Grid Styles
  gridWrapper: {
    flex: 1,
    margin: 6,
  },
  gridCard: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  gridThumbnailContainer: {
    width: '100%',
    aspectRatio: 1.3,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  gridThumbnailImage: {
    width: '100%',
    height: '100%',
  },
  gridInfoContainer: {
    padding: 10,
  },
  gridTitle: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
    minHeight: 36,
  },
  gridMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  gridMetaText: {
    fontSize: 11,
    fontWeight: '400',
  },
  favoriteBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    borderRadius: 10,
    padding: 4,
  },
  durationBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  durationText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },

  // Progress Bar
  progressBarTrack: {
    height: 3,
    width: '100%',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
  },
});

export default FileItemCard;
