import React, { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import { useAppTheme } from '@core/theme';
import { PressableScale } from '@shared/components/PressableScale';
import type { FolderItemViewModel } from '../types';
import {
  formatFolderSize,
  formatItemCount,
  getCategoryColor,
  getCategoryFallbackIcon,
} from '../utils/formatters';

export interface FolderListItemProps {
  folder: FolderItemViewModel;
  onPress?: (folder: FolderItemViewModel) => void;
  testID?: string;
  disabled?: boolean;
}

export function FolderListItem({
  folder,
  onPress,
  testID,
  disabled = false,
}: FolderListItemProps): React.JSX.Element {
  const theme = useAppTheme();
  const [imageError, setImageError] = useState(false);

  const categoryColor = getCategoryColor(folder.category);
  const fallbackIcon = getCategoryFallbackIcon(folder.category);
  const itemCountText = formatItemCount(folder.itemCount, folder.category);
  const sizeText = formatFolderSize(folder.totalSizeBytes);

  const hasValidThumbnail = Boolean(folder.thumbnailUri && !imageError);
  const thumbnailSource = folder.thumbnailUri
    ? {
        uri: folder.thumbnailUri.startsWith('file://')
          ? folder.thumbnailUri
          : `file://${folder.thumbnailUri}`,
      }
    : undefined;

  const handlePress = (): void => {
    onPress?.(folder);
  };

  const accessibilityLabel = [
    folder.folderName,
    itemCountText,
    sizeText,
    folder.isMessengerFolder ? 'Messenger folder' : null,
    folder.hasUnfinishedResume ? 'Contains in-progress files' : null,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <PressableScale
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      disabled={disabled}
      onPress={handlePress}
      scaleTo={0.98}
      style={[
        styles.container,
        {
          backgroundColor: theme.appColors.surface,
          borderBottomColor: theme.appColors.border,
        },
      ]}
      testID={testID ?? `folder-list-item-${folder.id}`}
    >
      {/* Thumbnail or Fallback Icon */}
      <View
        style={[
          styles.thumbnailContainer,
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
            style={styles.thumbnailImage}
            testID="folder-thumbnail-image"
          />
        ) : (
          <MaterialCommunityIcons
            color={categoryColor}
            name={fallbackIcon}
            size={28}
            testID="folder-fallback-icon"
          />
        )}

        {/* Active Progress Overlay Indicator on thumbnail */}
        {folder.hasUnfinishedResume && (
          <View
            accessibilityLabel="Active progress: contains in-progress files"
            style={[styles.activeDot, { backgroundColor: theme.appColors.primary }]}
            testID="folder-active-indicator"
          >
            <MaterialCommunityIcons color={theme.appColors.onPrimary} name="play" size={9} />
          </View>
        )}
      </View>

      {/* Main Info */}
      <View style={styles.infoContainer}>
        {/* Top row: folder name & badges */}
        <View style={styles.titleRow}>
          <Text
            ellipsizeMode="tail"
            numberOfLines={1}
            style={[styles.folderName, { color: theme.appColors.textPrimary }]}
            testID="folder-name-text"
          >
            {folder.folderName}
          </Text>

          {folder.isMessengerFolder && (
            <View
              style={[
                styles.messengerBadge,
                { backgroundColor: theme.appColors.secondaryContainer },
              ]}
              testID="folder-messenger-badge"
            >
              <Text
                style={[styles.messengerBadgeText, { color: theme.appColors.onSecondaryContainer }]}
              >
                Messenger
              </Text>
            </View>
          )}
        </View>

        {/* Subtitle row: count • size */}
        <View style={styles.subtitleRow}>
          <Text
            ellipsizeMode="tail"
            numberOfLines={1}
            style={[styles.subtitleText, { color: theme.appColors.textSecondary }]}
            testID="folder-metadata-text"
          >
            {itemCountText} • {sizeText}
          </Text>
        </View>
      </View>

      {/* Trailing chevron */}
      <MaterialCommunityIcons
        color={theme.appColors.textSecondary}
        name="chevron-right"
        size={22}
        style={styles.chevron}
      />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  thumbnailContainer: {
    width: 52,
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  activeDot: {
    position: 'absolute',
    top: 3,
    right: 3,
    width: 15,
    height: 15,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoContainer: {
    flex: 1,
    minWidth: 0,
    marginLeft: 14,
    marginRight: 8,
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
    marginBottom: 4,
  },
  folderName: {
    fontSize: 16,
    fontWeight: '600',
    flexShrink: 1,
  },
  messengerBadge: {
    marginLeft: 8,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'center',
  },
  messengerBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
  },
  subtitleText: {
    fontSize: 13,
    fontWeight: '400',
  },
  chevron: {
    opacity: 0.6,
  },
});

export default FolderListItem;
