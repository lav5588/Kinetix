import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { useResumeStore } from '@core/storage';
import { useAppTheme } from '@core/theme';

export function ContinueWatchingCarousel(): React.JSX.Element | null {
  const theme = useAppTheme();
  const recentItems = useResumeStore((state) => state.items).slice(0, 5);

  if (recentItems.length === 0) {
    return null;
  }

  return (
    <View style={styles.container} testID="continue-watching-carousel">
      <Text style={[styles.heading, { color: theme.appColors.textPrimary }]}>
        Continue Watching
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {recentItems.map((item) => {
          const progress =
            item.durationMs && item.positionMs ? item.positionMs / item.durationMs : 0;
          const percentage = Math.min(100, Math.max(0, progress * 100));

          return (
            <View
              key={`${item.filePath}-${item.lastOpenedAt}`}
              style={[
                styles.card,
                { backgroundColor: theme.appColors.surface, borderColor: theme.appColors.border },
              ]}
            >
              <Text
                style={[styles.title, { color: theme.appColors.textPrimary }]}
                numberOfLines={2}
              >
                {item.fileName}
              </Text>
              <Text style={[styles.meta, { color: theme.appColors.textSecondary }]}>
                {item.category.toUpperCase()}
              </Text>
              <View style={[styles.track, { backgroundColor: theme.appColors.surfaceVariant }]}>
                <View
                  style={[
                    styles.fill,
                    {
                      width: `${Math.round(percentage)}%`,
                      backgroundColor: theme.appColors.primary,
                    },
                  ]}
                />
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
    marginBottom: 18,
  },
  heading: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
  },
  row: {
    paddingRight: 8,
  },
  card: {
    width: 180,
    minHeight: 118,
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    marginRight: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 6,
  },
  meta: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  track: {
    height: 8,
    overflow: 'hidden',
    borderRadius: 999,
  },
  fill: {
    height: '100%',
    borderRadius: 999,
  },
});
