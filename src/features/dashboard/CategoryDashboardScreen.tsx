import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { useMediaScannerStore } from '@core/store';
import { useAppTheme } from '@core/theme';
import { CATEGORY_ACCENT_COLORS } from '@core/theme';

import { CategoryBentoCard } from './components/CategoryBentoCard';
import { ContinueWatchingCarousel } from './components/ContinueWatchingCarousel';
import { StorageAnalyzerWidget } from './components/StorageAnalyzerWidget';

export interface CategoryDashboardScreenProps {
  navigation?: {
    navigate: (screen: string, params?: Record<string, unknown>) => void;
  };
  onSelectCategory?: (category: CategoryKey) => void;
}

export type CategoryKey = 'audio' | 'video' | 'photo' | 'pdf' | 'doc';

const CATEGORY_VALUE_MAP: Record<CategoryKey, 'AUDIO' | 'VIDEO' | 'PHOTO' | 'PDF' | 'OTHER_DOC'> = {
  audio: 'AUDIO',
  video: 'VIDEO',
  photo: 'PHOTO',
  pdf: 'PDF',
  doc: 'OTHER_DOC',
};

const CATEGORY_DEFINITIONS: Array<{
  key: CategoryKey;
  title: string;
  icon: string;
}> = [
  { key: 'audio', title: 'Audio', icon: 'music-note' },
  { key: 'video', title: 'Video', icon: 'video' },
  { key: 'photo', title: 'Photos', icon: 'image-multiple' },
  { key: 'pdf', title: 'PDF', icon: 'file-pdf-box' },
  { key: 'doc', title: 'Other Docs', icon: 'file-document-multiple' },
];

export function CategoryDashboardScreen({
  navigation,
  onSelectCategory,
}: CategoryDashboardScreenProps): React.JSX.Element {
  const theme = useAppTheme();
  const categoryCounts = useMediaScannerStore((state) => state.categoryCounts);

  const handleSelectCategory = (key: CategoryKey): void => {
    onSelectCategory?.(key);
    navigation?.navigate('FolderExplorer', { category: key });
  };

  return (
    <ScrollView
      testID="category-dashboard-screen"
      style={{ backgroundColor: theme.appColors.background }}
      contentContainerStyle={styles.content}
    >
      <View style={styles.header}>
        <Text style={[styles.eyebrow, { color: theme.appColors.textSecondary }]}>Home</Text>
        <Text style={[styles.title, { color: theme.appColors.textPrimary }]}>Kinetix</Text>
      </View>

      <StorageAnalyzerWidget />

      <View style={styles.grid}>
        {CATEGORY_DEFINITIONS.map(({ key, title, icon }) => {
          const categoryValue = CATEGORY_VALUE_MAP[key];
          const count = categoryCounts[categoryValue] ?? 0;
          const color = CATEGORY_ACCENT_COLORS[key];

          return (
            <CategoryBentoCard
              key={key}
              title={title}
              count={count}
              color={color}
              icon={icon}
              onPress={() => handleSelectCategory(key)}
              testID={`category-card-${key}`}
            />
          );
        })}
      </View>

      <ContinueWatchingCarousel />
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
    marginBottom: 18,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.4,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
});
