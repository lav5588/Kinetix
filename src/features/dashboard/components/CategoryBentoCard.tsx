import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import { useAppTheme } from '@core/theme';
import { PressableScale } from '@shared/components/PressableScale';

export interface CategoryBentoCardProps {
  title: string;
  count: number;
  color: string;
  icon: string;
  onPress?: () => void;
  testID?: string;
}

export function CategoryBentoCard({
  title,
  count,
  color,
  icon,
  onPress,
  testID,
}: CategoryBentoCardProps): React.JSX.Element {
  const theme = useAppTheme();

  return (
    <PressableScale onPress={onPress} testID={testID} style={styles.cardWrapper}>
      <View
        style={[
          styles.card,
          {
            backgroundColor: theme.appColors.surface,
            borderColor: theme.appColors.border,
            shadowColor: color,
          },
        ]}
      >
        <View style={[styles.iconBadge, { backgroundColor: `${color}22` }]}>
          <MaterialCommunityIcons name={icon as never} size={24} color={color} />
        </View>
        <Text style={[styles.title, { color: theme.appColors.textPrimary }]}>{title}</Text>
        <Text style={[styles.count, { color: theme.appColors.textSecondary }]}>{count} items</Text>
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
