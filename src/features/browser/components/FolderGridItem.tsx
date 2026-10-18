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

export interface FolderGridItemProps {
  folder: FolderItemViewModel;
  onPress?: (folder: FolderItemViewModel) => void;
  testID?: string;
  disabled?: boolean;
}

export function FolderGridItem({
  folder,
  onPress,
  testID,
  disabled = false,
}: FolderGridItemProps): React.JSX.Element {
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
      scaleTo={0.97}
      style={styles.wrapper}
      testID={testID ?? `folder-grid-item-${folder.id}`}
    >
      <View
        style={[
          styles.card,
          {
            backgroundColor: theme.appColors.surface,
            borderColor: theme.appColors.border,
          },
        ]}
      >
        {/* Thumbnail or Fallback Icon Container */}
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
              testID="folder-grid-thumbnail-image"
            />
          ) : (
            <MaterialCommunityIcons
              color={categoryColor}
              name={fallbackIcon}
              size={44}
              testID="folder-grid-fallback-icon"
            />
          )}

          {/* Active Progress Overlay Indicator */}
          {folder.hasUnfinishedResume && (
            <View
              accessibilityLabel="Active progress: contains in-progress files"
              style={[styles.activeDot, { backgroundColor: theme.appColors.primary }]}
              testID="folder-grid-active-indicator"
            >
              <MaterialCommunityIcons color={theme.appColors.onPrimary} name="play" size={11} />
            </View>
          )}

          {/* Messenger Badge Overlay */}
          {folder.isMessengerFolder && (
            <View
              style={[
                styles.messengerBadge,
                { backgroundColor: theme.appColors.secondaryContainer },
              ]}
              testID="folder-grid-messenger-badge"
            >
              <Text
                style={[styles.messengerBadgeText, { color: theme.appColors.onSecondaryContainer }]}
              >
                Messenger
              </Text>
            </View>
          )}
        </View>

        {/* Info Section */}
        <View style={styles.infoContainer}>
          <Text
            ellipsizeMode="tail"
            numberOfLines={1}
            style={[styles.folderName, { color: theme.appColors.textPrimary }]}
            testID="folder-grid-name-text"
          >
            {folder.folderName}
          </Text>

          <Text
            ellipsizeMode="tail"
            numberOfLines={1}
            style={[styles.metadataText, { color: theme.appColors.textSecondary }]}
            testID="folder-grid-metadata-text"
          >
            {itemCountText} • {sizeText}
          </Text>
        </View>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    minWidth: 0,
    margin: 6,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  thumbnailContainer: {
    width: '100%',
    aspectRatio: 1.25,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  activeDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messengerBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  messengerBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  infoContainer: {
    padding: 10,
  },
  folderName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  metadataText: {
    fontSize: 12,
    fontWeight: '400',
  },
});

export default FolderGridItem;
