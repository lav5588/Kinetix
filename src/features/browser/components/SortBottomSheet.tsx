import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { BackHandler, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetView,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import { useAppTheme } from '@core/theme';
import { useBrowserFilterStore } from '@core/store/useBrowserFilterStore';
import type { MediaCategory } from '@core/storage/types';
import type { FileSortDirection, FileSortField } from '../types';
import { getCategoryColor } from '../utils/formatters';

export interface SortOptionItem {
  id: string;
  field: FileSortField;
  direction: FileSortDirection;
  label: string;
  sublabel: string;
  icon: string;
}

export const SORT_OPTIONS: SortOptionItem[] = [
  {
    id: 'NAME_ASC',
    field: 'NAME',
    direction: 'ASC',
    label: 'Name (A–Z)',
    sublabel: 'Alphabetical order',
    icon: 'order-alphabetical-ascending',
  },
  {
    id: 'NAME_DESC',
    field: 'NAME',
    direction: 'DESC',
    label: 'Name (Z–A)',
    sublabel: 'Reverse alphabetical order',
    icon: 'order-alphabetical-descending',
  },
  {
    id: 'DATE_DESC',
    field: 'DATE',
    direction: 'DESC',
    label: 'Date (Newest)',
    sublabel: 'Recently modified first',
    icon: 'sort-calendar-descending',
  },
  {
    id: 'DATE_ASC',
    field: 'DATE',
    direction: 'ASC',
    label: 'Date (Oldest)',
    sublabel: 'Oldest modified first',
    icon: 'sort-calendar-ascending',
  },
  {
    id: 'SIZE_DESC',
    field: 'SIZE',
    direction: 'DESC',
    label: 'Size (Largest)',
    sublabel: 'Largest files first',
    icon: 'sort-numeric-descending',
  },
  {
    id: 'SIZE_ASC',
    field: 'SIZE',
    direction: 'ASC',
    label: 'Size (Smallest)',
    sublabel: 'Smallest files first',
    icon: 'sort-numeric-ascending',
  },
  {
    id: 'DURATION_DESC',
    field: 'DURATION',
    direction: 'DESC',
    label: 'Duration (Longest)',
    sublabel: 'Longest media first',
    icon: 'timer-outline',
  },
  {
    id: 'DURATION_ASC',
    field: 'DURATION',
    direction: 'ASC',
    label: 'Duration (Shortest)',
    sublabel: 'Shortest media first',
    icon: 'timer-off-outline',
  },
];

export interface SortBottomSheetRef {
  present: () => void;
  dismiss: () => void;
  expand: () => void;
  close: () => void;
}

export interface SortBottomSheetProps {
  category: MediaCategory;
  currentSortField?: FileSortField;
  currentSortDirection?: FileSortDirection;
  onSelectSort?: (field: FileSortField, direction: FileSortDirection) => void;
  onDismiss?: () => void;
  isOpen?: boolean;
  testID?: string;
}

export const SortBottomSheet = forwardRef<SortBottomSheetRef, SortBottomSheetProps>(
  function SortBottomSheet(
    {
      category,
      currentSortField,
      currentSortDirection,
      onSelectSort,
      onDismiss,
      isOpen,
      testID = 'sort-bottom-sheet',
    },
    ref,
  ) {
    const theme = useAppTheme();
    const sheetRef = useRef<BottomSheet>(null);

    // Read persisted store preference for this category
    const storePref = useBrowserFilterStore((state) => state.preferences[category]);
    const setStoreSort = useBrowserFilterStore((state) => state.setSort);

    // Active sort field and direction (props override > store)
    const activeField: FileSortField = currentSortField ?? storePref?.sortField ?? 'NAME';
    const activeDirection: FileSortDirection =
      currentSortDirection ?? storePref?.sortDirection ?? 'ASC';

    // State for controlled open / closed
    const [sheetIndex, setSheetIndex] = useState<number>(isOpen ? 0 : -1);

    // Sync when controlled isOpen prop changes
    useEffect(() => {
      if (isOpen !== undefined) {
        const nextIndex = isOpen ? 0 : -1;
        setSheetIndex(nextIndex);
        if (nextIndex >= 0) {
          sheetRef.current?.snapToIndex(nextIndex);
        } else {
          sheetRef.current?.close();
        }
      }
    }, [isOpen]);

    const handleDismiss = useCallback(() => {
      setSheetIndex(-1);
      sheetRef.current?.close();
      onDismiss?.();
    }, [onDismiss]);

    const handlePresent = useCallback(() => {
      setSheetIndex(0);
      sheetRef.current?.snapToIndex(0);
    }, []);

    // Expose imperative handle
    useImperativeHandle(
      ref,
      () => ({
        present: handlePresent,
        dismiss: handleDismiss,
        expand: () => {
          setSheetIndex(0);
          sheetRef.current?.expand();
        },
        close: handleDismiss,
      }),
      [handleDismiss, handlePresent],
    );

    // Android hardware back button handler when sheet is open
    useEffect(() => {
      if (sheetIndex < 0) {
        return;
      }

      const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
        handleDismiss();
        return true;
      });

      return () => backHandler.remove();
    }, [sheetIndex, handleDismiss]);

    const handleSelectOption = useCallback(
      (option: SortOptionItem) => {
        // 1. Update persisted store preference for this category
        setStoreSort(category, option.field, option.direction);

        // 2. Notify parent callback
        onSelectSort?.(option.field, option.direction);

        // 3. Dismiss sheet predictably
        handleDismiss();
      },
      [category, handleDismiss, onSelectSort, setStoreSort],
    );

    const snapPoints = useMemo(() => ['65%'], []);
    const accentColor = getCategoryColor(category);

    const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop
          {...props}
          appearsOnIndex={0}
          disappearsOnIndex={-1}
          opacity={0.5}
          pressBehavior="close"
        />
      ),
      [],
    );

    return (
      <BottomSheet
        backdropComponent={renderBackdrop}
        backgroundStyle={{
          backgroundColor: theme.appColors.surface,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
        }}
        enablePanDownToClose
        handleIndicatorStyle={{
          backgroundColor: theme.appColors.border,
          width: 40,
        }}
        index={sheetIndex}
        onChange={(idx) => {
          setSheetIndex(idx);
          if (idx < 0) {
            onDismiss?.();
          }
        }}
        ref={sheetRef}
        snapPoints={snapPoints}
      >
        <BottomSheetView
          style={[styles.sheetContent, { backgroundColor: theme.appColors.surface }]}
          testID={testID}
        >
          {/* Header */}
          <View style={[styles.headerRow, { borderBottomColor: theme.appColors.border }]}>
            <View>
              <Text style={[styles.headerTitle, { color: theme.appColors.textPrimary }]}>
                Sort Files
              </Text>
              <Text style={[styles.headerSubtitle, { color: theme.appColors.textSecondary }]}>
                Choose sorting order for {category.toLowerCase()} files
              </Text>
            </View>

            <Pressable
              accessibilityLabel="Close sort options"
              accessibilityRole="button"
              hitSlop={8}
              onPress={handleDismiss}
              style={styles.closeButton}
              testID="sort-sheet-close-button"
            >
              <MaterialCommunityIcons
                color={theme.appColors.textSecondary}
                name="close"
                size={22}
              />
            </Pressable>
          </View>

          {/* Options List */}
          <ScrollView
            accessibilityLabel="Sort choices"
            contentContainerStyle={styles.optionsList}
            showsVerticalScrollIndicator={false}
            testID="sort-options-list"
          >
            {SORT_OPTIONS.map((option) => {
              const isSelected =
                activeField === option.field && activeDirection === option.direction;

              return (
                <Pressable
                  accessibilityLabel={`${option.label}, ${option.sublabel}`}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: isSelected }}
                  key={option.id}
                  onPress={() => handleSelectOption(option)}
                  style={[
                    styles.optionItem,
                    {
                      backgroundColor: isSelected ? `${accentColor}14` : theme.appColors.surface,
                      borderColor: isSelected ? accentColor : theme.appColors.border,
                    },
                  ]}
                  testID={`sort-option-${option.id.toLowerCase()}`}
                >
                  <View
                    style={[
                      styles.iconCircle,
                      {
                        backgroundColor: isSelected ? accentColor : theme.appColors.surfaceVariant,
                      },
                    ]}
                  >
                    <MaterialCommunityIcons
                      color={isSelected ? '#FFFFFF' : theme.appColors.textSecondary}
                      name={option.icon}
                      size={20}
                    />
                  </View>

                  <View style={styles.optionTextContainer}>
                    <Text
                      style={[
                        styles.optionLabel,
                        {
                          color: isSelected ? accentColor : theme.appColors.textPrimary,
                          fontWeight: isSelected ? '700' : '500',
                        },
                      ]}
                    >
                      {option.label}
                    </Text>
                    <Text style={[styles.optionSublabel, { color: theme.appColors.textSecondary }]}>
                      {option.sublabel}
                    </Text>
                  </View>

                  <MaterialCommunityIcons
                    color={isSelected ? accentColor : theme.appColors.border}
                    name={isSelected ? 'radiobox-marked' : 'radiobox-blank'}
                    size={22}
                    testID={`sort-radio-${option.id.toLowerCase()}`}
                  />
                </Pressable>
              );
            })}
          </ScrollView>
        </BottomSheetView>
      </BottomSheet>
    );
  },
);

const styles = StyleSheet.create({
  sheetContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  closeButton: {
    padding: 6,
    borderRadius: 20,
  },
  optionsList: {
    paddingVertical: 6,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  optionTextContainer: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 14,
    lineHeight: 18,
  },
  optionSublabel: {
    fontSize: 11,
    marginTop: 1,
  },
});

export default SortBottomSheet;
