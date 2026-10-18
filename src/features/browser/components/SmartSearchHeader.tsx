import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import { useAppTheme } from '@core/theme';
import { useBrowserFilterStore } from '@core/store/useBrowserFilterStore';
import type { MediaCategory } from '@core/storage/types';
import type { FileQuickFilter } from '../types';
import { getCategoryColor } from '../utils/formatters';

export const SEARCH_DEBOUNCE_MS = 150;

export interface QuickFilterChipItem {
  id: FileQuickFilter;
  label: string;
  icon: string;
}

export const QUICK_FILTER_CHIPS: QuickFilterChipItem[] = [
  { id: 'ALL', label: 'All', icon: 'all-inclusive' },
  { id: 'IN_PROGRESS', label: 'In Progress', icon: 'progress-clock' },
  { id: 'UNWATCHED', label: 'Unwatched', icon: 'eye-off-outline' },
  { id: 'FAVORITES', label: 'Favorites', icon: 'heart-outline' },
  { id: 'LARGE_FILES', label: 'Large Files > 100MB', icon: 'database-outline' },
];

export const MAX_PLACEHOLDER_CHARS = 24;

export function truncatePlaceholder(text?: string, maxLen = MAX_PLACEHOLDER_CHARS): string {
  if (!text) {
    return 'Search files...';
  }
  const clean = text.endsWith('...') ? text.slice(0, -3).trim() : text.trim();
  if (clean.length > maxLen) {
    return `${clean.slice(0, maxLen).trim()}...`;
  }
  return text.endsWith('...') ? text : `${text}...`;
}

export interface SmartSearchHeaderProps {
  category?: MediaCategory;
  searchQuery?: string;
  onSearchQueryChange?: (query: string) => void;
  selectedQuickFilter?: FileQuickFilter;
  onQuickFilterChange?: (filter: FileQuickFilter) => void;
  placeholder?: string;
  onBackPress?: () => void;
  showBackButton?: boolean;
  rightAction?: React.ReactNode;
  testID?: string;
}

export function SmartSearchHeader({
  category,
  searchQuery,
  onSearchQueryChange,
  selectedQuickFilter,
  onQuickFilterChange,
  placeholder = 'Search files...',
  onBackPress,
  showBackButton = false,
  rightAction,
  testID = 'smart-search-header',
}: SmartSearchHeaderProps): React.JSX.Element {
  const theme = useAppTheme();
  const inputRef = useRef<TextInput>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Store connection for active category
  const storeFilter = useBrowserFilterStore((state) =>
    category ? state.preferences[category]?.quickFilter : undefined,
  );
  const setStoreQuickFilter = useBrowserFilterStore((state) => state.setQuickFilter);

  // Active quick filter: props override > store > default 'ALL'
  const activeQuickFilter: FileQuickFilter = selectedQuickFilter ?? storeFilter ?? 'ALL';

  // Local text input state for immediate typing responsiveness
  const [inputText, setInputText] = useState(searchQuery ?? '');

  // Synchronize when external searchQuery prop changes
  useEffect(() => {
    if (searchQuery !== undefined && searchQuery !== inputText) {
      setInputText(searchQuery);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  // Clean up any pending debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const handleTextChange = useCallback(
    (text: string) => {
      setInputText(text);

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        onSearchQueryChange?.(text);
      }, SEARCH_DEBOUNCE_MS);
    },
    [onSearchQueryChange],
  );

  const handleClearQuery = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    setInputText('');
    onSearchQueryChange?.('');
    inputRef.current?.focus();
  }, [onSearchQueryChange]);

  const handleChipPress = useCallback(
    (filter: FileQuickFilter) => {
      onQuickFilterChange?.(filter);
      if (category) {
        setStoreQuickFilter(category, filter);
      }
    },
    [category, onQuickFilterChange, setStoreQuickFilter],
  );

  const accentColor = category ? getCategoryColor(category) : theme.colors.primary;

  const formattedPlaceholder = truncatePlaceholder(placeholder);

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.appColors.surface,
          borderBottomColor: theme.appColors.border,
        },
      ]}
      testID={testID}
    >
      {/* Search Input Row */}
      <View style={styles.inputRow}>
        {showBackButton ? (
          <Pressable
            accessibilityLabel="Go back"
            accessibilityRole="button"
            onPress={onBackPress}
            style={styles.backButton}
            testID="search-back-button"
          >
            <MaterialCommunityIcons
              color={theme.appColors.textPrimary}
              name="arrow-left"
              size={24}
            />
          </Pressable>
        ) : null}

        <Pressable
          accessibilityLabel="Search input area"
          onPress={() => inputRef.current?.focus()}
          style={[
            styles.inputWrapper,
            {
              backgroundColor: theme.appColors.surfaceVariant,
              borderColor: theme.appColors.border,
            },
          ]}
        >
          <MaterialCommunityIcons
            color={theme.appColors.textSecondary}
            name="magnify"
            size={20}
            style={styles.searchIcon}
          />

          <TextInput
            accessibilityLabel="Search files"
            autoCapitalize="none"
            autoCorrect={false}
            onChangeText={handleTextChange}
            placeholder={formattedPlaceholder}
            placeholderTextColor={theme.appColors.textSecondary}
            ref={inputRef}
            returnKeyType="search"
            style={[styles.input, { color: theme.appColors.textPrimary }]}
            testID="smart-search-input"
            value={inputText}
          />

          {inputText.length > 0 ? (
            <Pressable
              accessibilityLabel="Clear search text"
              accessibilityRole="button"
              hitSlop={8}
              onPress={handleClearQuery}
              style={styles.clearButton}
              testID="search-clear-button"
            >
              <MaterialCommunityIcons
                color={theme.appColors.textSecondary}
                name="close-circle"
                size={18}
              />
            </Pressable>
          ) : null}
        </Pressable>

        {rightAction ? <View style={styles.rightActionContainer}>{rightAction}</View> : null}
      </View>

      {/* Quick Filter Chips ScrollView */}
      <ScrollView
        accessibilityLabel="Quick filter chips"
        contentContainerStyle={styles.chipsContainer}
        horizontal
        showsHorizontalScrollIndicator={false}
        testID="quick-filters-scroll"
      >
        {QUICK_FILTER_CHIPS.map((chip) => {
          const isSelected = activeQuickFilter === chip.id;
          const chipColor = isSelected ? accentColor : theme.appColors.surfaceVariant;
          const textColor = isSelected ? '#FFFFFF' : theme.appColors.textSecondary;
          const iconColor = isSelected ? '#FFFFFF' : theme.appColors.textSecondary;

          return (
            <Pressable
              accessibilityLabel={chip.label}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              key={chip.id}
              onPress={() => handleChipPress(chip.id)}
              style={[
                styles.chip,
                {
                  backgroundColor: chipColor,
                  borderColor: isSelected ? accentColor : theme.appColors.border,
                },
              ]}
              testID={`filter-chip-${chip.id.toLowerCase()}`}
            >
              <MaterialCommunityIcons
                color={iconColor}
                name={chip.icon}
                size={16}
                style={styles.chipIcon}
              />
              <Text
                style={[
                  styles.chipText,
                  { color: textColor, fontWeight: isSelected ? '600' : '400' },
                ]}
              >
                {chip.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 8,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  backButton: {
    marginRight: 8,
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    height: 42,
  },
  searchIcon: {
    marginRight: 6,
  },
  input: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
    height: '100%',
  },
  clearButton: {
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rightActionContainer: {
    marginLeft: 8,
  },
  chipsContainer: {
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 8,
  },
  chipIcon: {
    marginRight: 6,
  },
  chipText: {
    fontSize: 12,
  },
});

export default SmartSearchHeader;
