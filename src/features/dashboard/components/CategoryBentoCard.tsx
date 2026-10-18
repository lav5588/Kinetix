import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import { CATEGORY_ACCENT_COLORS, useAppTheme } from '@core/theme';
import { PressableScale } from '@shared/components/PressableScale';

export type CategoryBentoKey = 'audio' | 'video' | 'photo' | 'pdf' | 'doc';

export interface CategoryBentoCardProps {
  category?: CategoryBentoKey;
  title: string;
  count: number;
  color?: string;
  icon?: string;
  onPress?: () => void;
  testID?: string;
  accessibilityLabel?: string;
  delay?: number;
  disabled?: boolean;
}

const DEFAULT_ICONS: Record<CategoryBentoKey, string> = {
  audio: 'music-note',
  video: 'video',
  photo: 'image-multiple',
  pdf: 'file-pdf-box',
  doc: 'file-document-multiple',
};

export function CategoryBentoCard({
  category,
  title,
  count,
  color,
  icon,
  onPress,
  testID,
  accessibilityLabel,
  delay,
  disabled,
}: CategoryBentoCardProps): React.JSX.Element {
  const theme = useAppTheme();
  const resolvedColor =
    color ?? (category ? CATEGORY_ACCENT_COLORS[category] : theme.colors.primary);
  const resolvedIcon = icon ?? (category ? DEFAULT_ICONS[category] : 'folder');
  const itemText = count === 1 ? '1 item' : `${count} items`;
  const entryOffset = delay ? 6 : 0;

  return (
    <PressableScale
      accessibilityLabel={accessibilityLabel ?? `${title}, ${itemText}`}
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      scaleTo={0.98}
      style={styles.cardWrapper}
      testID={testID}
    >
      <View
        style={[
          styles.card,
          {
            backgroundColor: theme.appColors.surface,
            borderColor: theme.appColors.border,
            shadowColor: resolvedColor,
            opacity: disabled ? 0.6 : 1,
            transform: [{ translateY: entryOffset }],
          },
        ]}
      >
        <View style={[styles.iconBadge, { backgroundColor: `${resolvedColor}22` }]}>
          <MaterialCommunityIcons name={resolvedIcon as never} size={24} color={resolvedColor} />
        </View>

        <Text style={[styles.title, { color: theme.appColors.textPrimary }]}>{title}</Text>
        <Text style={[styles.count, { color: theme.appColors.textSecondary }]}>{itemText}</Text>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  cardWrapper: {
    flex: 1,
    minWidth: '45%',
    marginBottom: 14,
  },
  card: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 16,
    minHeight: 136,
    shadowOpacity: 0.14,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  iconBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  count: {
    fontSize: 13,
    fontWeight: '600',
  },
});
