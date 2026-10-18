import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import { appSettingsStorage, useResumeHistoryStore, type ResumeRecord } from '@core/storage';
import { CATEGORY_ACCENT_COLORS, useAppTheme } from '@core/theme';
import { PressableScale } from '@shared/components/PressableScale';

export interface ContinueWatchingCarouselProps {
  onItemPress?: (item: ResumeRecord) => void;
  enabled?: boolean;
  showContinueCarousel?: boolean;
  limit?: number;
  testID?: string;
}

const CATEGORY_ICONS: Record<string, string> = {
  audio: 'music-note',
  video: 'video',
  photo: 'image-multiple',
  pdf: 'file-pdf-box',
  doc: 'file-document-multiple',
  other_doc: 'file-document-multiple',
};

const CATEGORY_DISPLAY_NAMES: Record<string, string> = {
  audio: 'Audio',
  video: 'Video',
  photo: 'Photo',
  pdf: 'PDF',
  doc: 'Doc',
  other_doc: 'Doc',
};

export function formatDuration(ms?: number | null): string {
  if (ms == null || !Number.isFinite(ms) || ms < 0) {
    return '0:00';
  }
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const paddedSeconds = seconds < 10 ? `0${seconds}` : `${seconds}`;

  if (hours > 0) {
    const paddedMinutes = minutes < 10 ? `0${minutes}` : `${minutes}`;
    return `${hours}:${paddedMinutes}:${paddedSeconds}`;
  }
  return `${minutes}:${paddedSeconds}`;
}

export function ContinueWatchingCarousel({
  onItemPress,
  enabled = true,
  showContinueCarousel = true,
  limit = 10,
  testID = 'continue-watching-carousel',
}: ContinueWatchingCarouselProps): React.JSX.Element | null {
  const theme = useAppTheme();
  const items = useResumeHistoryStore((state) => state.items);

  // Explicit prop disable
  if (!enabled || !showContinueCarousel) {
    return null;
  }

  // MMKV user setting for show_continue_carousel
  try {
    const isSettingEnabled = appSettingsStorage.getBoolean('show_continue_carousel');
    if (isSettingEnabled === false) {
      return null;
    }
  } catch {
    // Graceful fallback if storage read fails
  }

  if (!items || items.length === 0) {
    return null;
  }

  const recentItems = items.slice(0, limit);
  if (recentItems.length === 0) {
    return null;
  }

  return (
    <View style={styles.container} testID={testID}>
      <View style={styles.headerRow}>
        <Text style={[styles.heading, { color: theme.appColors.textPrimary }]}>
          Continue Watching
        </Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {recentItems.map((item, index) => {
          const rawCategory = (item.category ?? 'video').toLowerCase();
          const categoryColorKey =
            rawCategory in CATEGORY_ACCENT_COLORS
              ? (rawCategory as keyof typeof CATEGORY_ACCENT_COLORS)
              : 'video';
          const accentColor = CATEGORY_ACCENT_COLORS[categoryColorKey] ?? theme.colors.primary;
          const categoryIcon = CATEGORY_ICONS[rawCategory] ?? 'play-circle-outline';
          const categoryLabel = CATEGORY_DISPLAY_NAMES[rawCategory] ?? rawCategory.toUpperCase();

          const fileName =
            item.fileName ||
            (item.filePath ? item.filePath.split(/[/\\]/).pop() : '') ||
            'Untitled';

          // Progress & Metadata calculations
          let progressRatio: number | null = null;
          let progressLabel: string | null = null;

          const pdfPage =
            item.pdfPage ?? (item as unknown as { pdfCurrentPage?: number }).pdfCurrentPage;
          const pdfTotalPages = item.pdfTotalPages;

          if (item.isCompleted) {
            progressRatio = 1;
            progressLabel = 'Completed';
          } else if (
            typeof item.positionMs === 'number' &&
            typeof item.durationMs === 'number' &&
            item.durationMs > 0
          ) {
            progressRatio = Math.min(1, Math.max(0, item.positionMs / item.durationMs));
            const percent = Math.round(progressRatio * 100);
            progressLabel = `${formatDuration(item.positionMs)} / ${formatDuration(item.durationMs)} (${percent}%)`;
          } else if (typeof pdfPage === 'number' && pdfPage > 0) {
            if (typeof pdfTotalPages === 'number' && pdfTotalPages > 0) {
              progressRatio = Math.min(1, Math.max(0, pdfPage / pdfTotalPages));
              const percent = Math.round(progressRatio * 100);
              progressLabel = `Page ${pdfPage} of ${pdfTotalPages} (${percent}%)`;
            } else {
              progressLabel = `Page ${pdfPage}`;
            }
          }

          const percentage =
            progressRatio !== null
              ? Math.min(100, Math.max(0, Math.round(progressRatio * 100)))
              : null;

          const accessibilityLabel = `${fileName}, ${categoryLabel}${
            progressLabel ? `, ${progressLabel}` : ''
          }`;

          return (
            <PressableScale
              key={`${item.filePath || index}-${item.lastOpenedAt ?? index}`}
              accessibilityLabel={accessibilityLabel}
              accessibilityRole="button"
              onPress={() => onItemPress?.(item)}
              scaleTo={0.97}
              style={styles.cardWrapper}
              testID={`continue-card-${item.filePath || index}`}
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
                <View style={styles.topRow}>
                  <View style={[styles.badge, { backgroundColor: `${accentColor}20` }]}>
                    <MaterialCommunityIcons
                      name={categoryIcon as never}
                      size={14}
                      color={accentColor}
                    />
                    <Text style={[styles.badgeText, { color: accentColor }]}>{categoryLabel}</Text>
                  </View>
                </View>

                <Text
                  numberOfLines={2}
                  style={[styles.title, { color: theme.appColors.textPrimary }]}
                >
                  {fileName}
                </Text>

                {progressLabel ? (
                  <Text
                    numberOfLines={1}
                    style={[styles.meta, { color: theme.appColors.textSecondary }]}
                  >
                    {progressLabel}
                  </Text>
                ) : null}

                {percentage !== null ? (
                  <View
                    accessibilityLabel={`Progress: ${percentage}%`}
                    accessibilityRole="progressbar"
                    style={[styles.track, { backgroundColor: theme.appColors.surfaceVariant }]}
                  >
                    <View
                      style={[
                        styles.fill,
                        {
                          width: `${percentage}%`,
                          backgroundColor: accentColor,
                        },
                      ]}
                    />
                  </View>
                ) : null}
              </View>
            </PressableScale>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
    marginBottom: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  heading: {
    fontSize: 20,
    fontWeight: '700',
  },
  row: {
    paddingRight: 8,
  },
  cardWrapper: {
    marginRight: 12,
  },
  card: {
    width: 200,
    minHeight: 124,
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    justifyContent: 'space-between',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 18,
    marginBottom: 6,
  },
  meta: {
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 8,
  },
  track: {
    height: 6,
    overflow: 'hidden',
    borderRadius: 999,
  },
  fill: {
    height: '100%',
    borderRadius: 999,
  },
});
