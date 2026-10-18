import { create } from 'zustand';
import { sortFilterStorage } from '@core/storage/mmkv';
import type { MediaCategory } from '@core/storage/types';
import type { FileQuickFilter, FileSortDirection, FileSortField } from '@features/browser/types';

export type BrowserViewMode = 'LIST' | 'GRID';

export interface CategoryFilterPreference {
  viewMode: BrowserViewMode;
  quickFilter: FileQuickFilter;
  sortField: FileSortField;
  sortDirection: FileSortDirection;
}

export const ALL_MEDIA_CATEGORIES: MediaCategory[] = [
  'AUDIO',
  'VIDEO',
  'PHOTO',
  'PDF',
  'OTHER_DOC',
];

export const DEFAULT_CATEGORY_PREFERENCES: Record<MediaCategory, CategoryFilterPreference> = {
  AUDIO: { viewMode: 'LIST', quickFilter: 'ALL', sortField: 'NAME', sortDirection: 'ASC' },
  VIDEO: { viewMode: 'GRID', quickFilter: 'ALL', sortField: 'DATE', sortDirection: 'DESC' },
  PHOTO: { viewMode: 'GRID', quickFilter: 'ALL', sortField: 'DATE', sortDirection: 'DESC' },
  PDF: { viewMode: 'LIST', quickFilter: 'ALL', sortField: 'NAME', sortDirection: 'ASC' },
  OTHER_DOC: { viewMode: 'LIST', quickFilter: 'ALL', sortField: 'NAME', sortDirection: 'ASC' },
};

export const getCategoryPrefStorageKey = (category: MediaCategory): string =>
  `browser_filter_pref_${category}`;

/**
 * Validates untrusted or persisted JSON and safely falls back to defaults.
 */
export function validateCategoryPreference(
  data: unknown,
  category: MediaCategory,
): CategoryFilterPreference {
  const fallback = DEFAULT_CATEGORY_PREFERENCES[category] ?? {
    viewMode: 'LIST',
    quickFilter: 'ALL',
    sortField: 'DATE',
    sortDirection: 'DESC',
  };

  if (!data || typeof data !== 'object') {
    return { ...fallback };
  }

  const d = data as Record<string, unknown>;

  const viewMode: BrowserViewMode =
    typeof d.viewMode === 'string' &&
    (d.viewMode.toUpperCase() === 'GRID' || d.viewMode.toUpperCase() === 'LIST')
      ? (d.viewMode.toUpperCase() as BrowserViewMode)
      : fallback.viewMode;

  const validQuickFilters: FileQuickFilter[] = [
    'ALL',
    'IN_PROGRESS',
    'UNWATCHED',
    'FAVORITES',
    'LARGE_FILES',
  ];
  const quickFilter: FileQuickFilter =
    typeof d.quickFilter === 'string' &&
    validQuickFilters.includes(d.quickFilter.toUpperCase() as FileQuickFilter)
      ? (d.quickFilter.toUpperCase() as FileQuickFilter)
      : fallback.quickFilter;

  const validSortFields: FileSortField[] = ['NAME', 'DATE', 'SIZE', 'DURATION'];
  const sortField: FileSortField =
    typeof d.sortField === 'string' &&
    validSortFields.includes(d.sortField.toUpperCase() as FileSortField)
      ? (d.sortField.toUpperCase() as FileSortField)
      : fallback.sortField;

  const validSortDirections: FileSortDirection[] = ['ASC', 'DESC'];
  const sortDirection: FileSortDirection =
    typeof d.sortDirection === 'string' &&
    validSortDirections.includes(d.sortDirection.toUpperCase() as FileSortDirection)
      ? (d.sortDirection.toUpperCase() as FileSortDirection)
      : fallback.sortDirection;

  return {
    viewMode,
    quickFilter,
    sortField,
    sortDirection,
  };
}

export function loadCategoryPreferenceFromStorage(
  category: MediaCategory,
  storage = sortFilterStorage,
): CategoryFilterPreference {
  try {
    const raw = storage.getString(getCategoryPrefStorageKey(category));
    if (!raw) {
      return { ...DEFAULT_CATEGORY_PREFERENCES[category] };
    }
    const parsed = JSON.parse(raw);
    return validateCategoryPreference(parsed, category);
  } catch {
    return { ...DEFAULT_CATEGORY_PREFERENCES[category] };
  }
}

export function saveCategoryPreferenceToStorage(
  category: MediaCategory,
  pref: CategoryFilterPreference,
  storage = sortFilterStorage,
): void {
  try {
    storage.set(getCategoryPrefStorageKey(category), JSON.stringify(pref));
  } catch {
    // Graceful no-op on storage errors
  }
}

export function loadAllPreferencesFromStorage(
  storage = sortFilterStorage,
): Record<MediaCategory, CategoryFilterPreference> {
  const result = {} as Record<MediaCategory, CategoryFilterPreference>;
  for (const cat of ALL_MEDIA_CATEGORIES) {
    result[cat] = loadCategoryPreferenceFromStorage(cat, storage);
  }
  return result;
}

export interface BrowserFilterStore {
  preferences: Record<MediaCategory, CategoryFilterPreference>;

  // Actions
  getPreferences: (category: MediaCategory) => CategoryFilterPreference;
  setViewMode: (category: MediaCategory, viewMode: 'LIST' | 'GRID' | 'list' | 'grid') => void;
  setQuickFilter: (category: MediaCategory, quickFilter: FileQuickFilter) => void;
  setSort: (
    category: MediaCategory,
    sortField: FileSortField | 'name' | 'date' | 'size' | 'duration',
    sortDirection: FileSortDirection | 'asc' | 'desc',
  ) => void;
  setSortField: (
    category: MediaCategory,
    sortField: FileSortField | 'name' | 'date' | 'size' | 'duration',
  ) => void;
  setSortDirection: (
    category: MediaCategory,
    sortDirection: FileSortDirection | 'asc' | 'desc',
  ) => void;
  resetCategoryPreferences: (category: MediaCategory) => void;
  resetAllPreferences: () => void;
  hydrateFromStorage: () => void;
}

export const useBrowserFilterStore = create<BrowserFilterStore>((set, get) => ({
  preferences: loadAllPreferencesFromStorage(),

  getPreferences: (category: MediaCategory) => {
    return get().preferences[category] ?? DEFAULT_CATEGORY_PREFERENCES[category];
  },

  setViewMode: (category, viewMode) => {
    const normalized = viewMode.toUpperCase() as BrowserViewMode;
    const current = get().getPreferences(category);
    const updated: CategoryFilterPreference = { ...current, viewMode: normalized };

    saveCategoryPreferenceToStorage(category, updated);
    set((state) => ({
      preferences: {
        ...state.preferences,
        [category]: updated,
      },
    }));
  },

  setQuickFilter: (category, quickFilter) => {
    const normalized = quickFilter.toUpperCase() as FileQuickFilter;
    const current = get().getPreferences(category);
    const updated: CategoryFilterPreference = { ...current, quickFilter: normalized };

    saveCategoryPreferenceToStorage(category, updated);
    set((state) => ({
      preferences: {
        ...state.preferences,
        [category]: updated,
      },
    }));
  },

  setSort: (category, sortField, sortDirection) => {
    const normalizedField = sortField.toUpperCase() as FileSortField;
    const normalizedDirection = sortDirection.toUpperCase() as FileSortDirection;
    const current = get().getPreferences(category);
    const updated: CategoryFilterPreference = {
      ...current,
      sortField: normalizedField,
      sortDirection: normalizedDirection,
    };

    saveCategoryPreferenceToStorage(category, updated);
    set((state) => ({
      preferences: {
        ...state.preferences,
        [category]: updated,
      },
    }));
  },

  setSortField: (category, sortField) => {
    const normalizedField = sortField.toUpperCase() as FileSortField;
    const current = get().getPreferences(category);
    const updated: CategoryFilterPreference = { ...current, sortField: normalizedField };

    saveCategoryPreferenceToStorage(category, updated);
    set((state) => ({
      preferences: {
        ...state.preferences,
        [category]: updated,
      },
    }));
  },

  setSortDirection: (category, sortDirection) => {
    const normalizedDirection = sortDirection.toUpperCase() as FileSortDirection;
    const current = get().getPreferences(category);
    const updated: CategoryFilterPreference = { ...current, sortDirection: normalizedDirection };

    saveCategoryPreferenceToStorage(category, updated);
    set((state) => ({
      preferences: {
        ...state.preferences,
        [category]: updated,
      },
    }));
  },

  resetCategoryPreferences: (category) => {
    const fallback = { ...DEFAULT_CATEGORY_PREFERENCES[category] };
    saveCategoryPreferenceToStorage(category, fallback);
    set((state) => ({
      preferences: {
        ...state.preferences,
        [category]: fallback,
      },
    }));
  },

  resetAllPreferences: () => {
    for (const cat of ALL_MEDIA_CATEGORIES) {
      saveCategoryPreferenceToStorage(cat, { ...DEFAULT_CATEGORY_PREFERENCES[cat] });
    }
    set({ preferences: { ...DEFAULT_CATEGORY_PREFERENCES } });
  },

  hydrateFromStorage: () => {
    set({ preferences: loadAllPreferencesFromStorage() });
  },
}));

export default useBrowserFilterStore;
