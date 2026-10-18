import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@core/theme';
import type { FolderExplorerViewMode } from '../types';

export interface FolderListSkeletonProps {
  viewMode?: FolderExplorerViewMode;
  itemCount?: number;
  testID?: string;
}

const DEFAULT_ITEM_COUNT = 8;

export function FolderListSkeleton({
  viewMode = 'list',
  itemCount = DEFAULT_ITEM_COUNT,
  testID = 'folder-explorer-loading',
}: FolderListSkeletonProps): React.JSX.Element {
  const theme = useAppTheme();
  const pulseAnim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    if (process.env.NODE_ENV === 'test') {
      return;
    }

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.85,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.4,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    );

    animation.start();

    return () => {
      animation.stop();
    };
  }, [pulseAnim]);

  const items = Array.from({ length: itemCount }, (_, index) => index);
  const placeholderColor = theme.appColors.surfaceVariant ?? theme.appColors.border;

  return (
    <View
      accessibilityLabel="Loading folders"
      accessibilityRole="progressbar"
      style={styles.container}
      testID={testID}
    >
      {/* Accessible text for screen readers and test assertions */}
      <Text style={styles.accessibleAnchor}>Loading folders...</Text>

      {viewMode === 'grid' ? (
        <View style={styles.gridContainer} testID="folder-skeleton-grid">
          {items.map((key) => (
            <Animated.View
              key={key}
              style={[
                styles.gridCard,
                {
                  backgroundColor: theme.appColors.surface,
                  borderColor: theme.appColors.border,
                  opacity: pulseAnim,
                },
              ]}
              testID="folder-skeleton-item"
            >
              <View style={[styles.gridThumbnail, { backgroundColor: placeholderColor }]} />
              <View style={styles.gridMeta}>
                <View
                  style={[
                    styles.titlePlaceholder,
                    {
                      backgroundColor: placeholderColor,
                      width: key % 2 === 0 ? '75%' : '60%',
                    },
                  ]}
                />
                <View
                  style={[
                    styles.subtitlePlaceholder,
                    { backgroundColor: placeholderColor, width: '45%' },
                  ]}
                />
              </View>
            </Animated.View>
          ))}
        </View>
      ) : (
        <View style={styles.listContainer} testID="folder-skeleton-list">
          {items.map((key) => (
            <Animated.View
              key={key}
              style={[
                styles.listItem,
                {
                  borderBottomColor: theme.appColors.border,
                  opacity: pulseAnim,
                },
              ]}
              testID="folder-skeleton-item"
            >
              <View style={[styles.listThumbnail, { backgroundColor: placeholderColor }]} />
              <View style={styles.listMeta}>
                <View
                  style={[
                    styles.titlePlaceholder,
                    {
                      backgroundColor: placeholderColor,
                      width: key % 3 === 0 ? '70%' : key % 2 === 0 ? '55%' : '80%',
                    },
                  ]}
                />
                <View
                  style={[
                    styles.subtitlePlaceholder,
                    {
                      backgroundColor: placeholderColor,
                      width: key % 2 === 0 ? '40%' : '30%',
                    },
                  ]}
                />
              </View>
              <View style={[styles.chevronPlaceholder, { backgroundColor: placeholderColor }]} />
            </Animated.View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  accessibleAnchor: {
    position: 'absolute',
    opacity: 0,
    height: 0,
    width: 0,
  },
  listContainer: {
    paddingVertical: 4,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  listThumbnail: {
    width: 52,
    height: 52,
    borderRadius: 12,
  },
  listMeta: {
    flex: 1,
    marginLeft: 16,
    justifyContent: 'center',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 8,
    paddingTop: 8,
  },
  gridCard: {
    width: '47%',
    margin: '1.5%',
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
  },
  gridThumbnail: {
    width: '100%',
    aspectRatio: 1.2,
    borderRadius: 12,
  },
  gridMeta: {
    marginTop: 10,
  },
  titlePlaceholder: {
    height: 16,
    borderRadius: 4,
    marginBottom: 8,
  },
  subtitlePlaceholder: {
    height: 12,
    borderRadius: 4,
  },
  chevronPlaceholder: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginLeft: 12,
    opacity: 0.5,
  },
});
