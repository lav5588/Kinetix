import {
  useBrowserFilterStore,
  validateCategoryPreference,
  loadCategoryPreferenceFromStorage,
  getCategoryPrefStorageKey,
  DEFAULT_CATEGORY_PREFERENCES,
} from '@core/store/useBrowserFilterStore';
import { sortFilterStorage } from '@core/storage/mmkv';
import type { MediaCategory } from '@core/storage/types';

describe('Task 8 Subtask 4: useBrowserFilterStore', () => {
  beforeEach(() => {
    sortFilterStorage.clearAll();
    useBrowserFilterStore.getState().resetAllPreferences();
  });

  describe('Default preferences', () => {
    it('initializes with default preferences for all categories', () => {
      const store = useBrowserFilterStore.getState();

      const audio = store.getPreferences('AUDIO');
      expect(audio).toEqual(DEFAULT_CATEGORY_PREFERENCES.AUDIO);
      expect(audio.viewMode).toBe('LIST');
      expect(audio.quickFilter).toBe('ALL');
      expect(audio.sortField).toBe('NAME');
      expect(audio.sortDirection).toBe('ASC');

      const video = store.getPreferences('VIDEO');
      expect(video).toEqual(DEFAULT_CATEGORY_PREFERENCES.VIDEO);
      expect(video.viewMode).toBe('GRID');
      expect(video.quickFilter).toBe('ALL');
      expect(video.sortField).toBe('DATE');
      expect(video.sortDirection).toBe('DESC');

      const photo = store.getPreferences('PHOTO');
      expect(photo).toEqual(DEFAULT_CATEGORY_PREFERENCES.PHOTO);
      expect(photo.viewMode).toBe('GRID');

      const pdf = store.getPreferences('PDF');
      expect(pdf).toEqual(DEFAULT_CATEGORY_PREFERENCES.PDF);
      expect(pdf.viewMode).toBe('LIST');
    });
  });

  describe('Updating viewMode, quickFilter, and sort preferences', () => {
    it('updates viewMode and persists to MMKV', () => {
      const store = useBrowserFilterStore.getState();

      store.setViewMode('AUDIO', 'GRID');
      expect(useBrowserFilterStore.getState().getPreferences('AUDIO').viewMode).toBe('GRID');

      // Verify persisted to MMKV
      const raw = sortFilterStorage.getString(getCategoryPrefStorageKey('AUDIO'));
      expect(raw).toBeTruthy();
      const parsed = JSON.parse(raw!);
      expect(parsed.viewMode).toBe('GRID');

      // Case insensitive support
      store.setViewMode('AUDIO', 'list');
      expect(useBrowserFilterStore.getState().getPreferences('AUDIO').viewMode).toBe('LIST');
    });

    it('updates quickFilter and persists to MMKV', () => {
      const store = useBrowserFilterStore.getState();

      store.setQuickFilter('AUDIO', 'IN_PROGRESS');
      expect(useBrowserFilterStore.getState().getPreferences('AUDIO').quickFilter).toBe('IN_PROGRESS');

      const raw = sortFilterStorage.getString(getCategoryPrefStorageKey('AUDIO'));
      const parsed = JSON.parse(raw!);
      expect(parsed.quickFilter).toBe('IN_PROGRESS');

      store.setQuickFilter('AUDIO', 'LARGE_FILES');
      expect(useBrowserFilterStore.getState().getPreferences('AUDIO').quickFilter).toBe('LARGE_FILES');
    });

    it('updates sortField and sortDirection together with setSort', () => {
      const store = useBrowserFilterStore.getState();

      store.setSort('AUDIO', 'SIZE', 'DESC');
      const pref = useBrowserFilterStore.getState().getPreferences('AUDIO');
      expect(pref.sortField).toBe('SIZE');
      expect(pref.sortDirection).toBe('DESC');

      const raw = sortFilterStorage.getString(getCategoryPrefStorageKey('AUDIO'));
      const parsed = JSON.parse(raw!);
      expect(parsed.sortField).toBe('SIZE');
      expect(parsed.sortDirection).toBe('DESC');
    });

    it('updates sortField independently with setSortField', () => {
      const store = useBrowserFilterStore.getState();
      store.setSort('AUDIO', 'NAME', 'ASC');

      store.setSortField('AUDIO', 'DURATION');
      const pref = useBrowserFilterStore.getState().getPreferences('AUDIO');
      expect(pref.sortField).toBe('DURATION');
      expect(pref.sortDirection).toBe('ASC'); // preserved
    });

    it('updates sortDirection independently with setSortDirection', () => {
      const store = useBrowserFilterStore.getState();
      store.setSort('AUDIO', 'DATE', 'DESC');

      store.setSortDirection('AUDIO', 'ASC');
      const pref = useBrowserFilterStore.getState().getPreferences('AUDIO');
      expect(pref.sortField).toBe('DATE'); // preserved
      expect(pref.sortDirection).toBe('ASC');
    });
  });

  describe('Category preference independence', () => {
    it('modifying Audio preferences does not alter Video or Photo preferences', () => {
      const store = useBrowserFilterStore.getState();

      // Modify AUDIO settings heavily
      store.setViewMode('AUDIO', 'GRID');
      store.setQuickFilter('AUDIO', 'FAVORITES');
      store.setSort('AUDIO', 'DURATION', 'DESC');

      const audioPref = useBrowserFilterStore.getState().getPreferences('AUDIO');
      expect(audioPref.viewMode).toBe('GRID');
      expect(audioPref.quickFilter).toBe('FAVORITES');
      expect(audioPref.sortField).toBe('DURATION');
      expect(audioPref.sortDirection).toBe('DESC');

      // Verify VIDEO remains at its default settings
      const videoPref = useBrowserFilterStore.getState().getPreferences('VIDEO');
      expect(videoPref).toEqual(DEFAULT_CATEGORY_PREFERENCES.VIDEO);
      expect(videoPref.viewMode).toBe('GRID');
      expect(videoPref.quickFilter).toBe('ALL');
      expect(videoPref.sortField).toBe('DATE');
      expect(videoPref.sortDirection).toBe('DESC');

      // Verify PHOTO remains at its default settings
      const photoPref = useBrowserFilterStore.getState().getPreferences('PHOTO');
      expect(photoPref).toEqual(DEFAULT_CATEGORY_PREFERENCES.PHOTO);

      // Now modify VIDEO settings and verify AUDIO is untouched
      store.setSort('VIDEO', 'SIZE', 'ASC');
      expect(useBrowserFilterStore.getState().getPreferences('VIDEO').sortField).toBe('SIZE');
      expect(useBrowserFilterStore.getState().getPreferences('AUDIO').sortField).toBe('DURATION');
    });
  });

  describe('Malformed and corrupted persisted data resilience', () => {
    it('tolerates invalid/corrupted JSON in MMKV without crashing', () => {
      // Intentionally insert corrupted JSON string
      sortFilterStorage.set(getCategoryPrefStorageKey('AUDIO'), '{{bad-json:broken');

      const pref = loadCategoryPreferenceFromStorage('AUDIO');
      expect(pref).toEqual(DEFAULT_CATEGORY_PREFERENCES.AUDIO);
    });

    it('validates partial or invalid field types and falls back to safe defaults', () => {
      const malformedData = {
        viewMode: 'INVALID_VIEW_MODE',
        quickFilter: 'NON_EXISTENT_FILTER',
        sortField: 12345,
        sortDirection: null,
      };

      const validated = validateCategoryPreference(malformedData, 'AUDIO');
      expect(validated).toEqual(DEFAULT_CATEGORY_PREFERENCES.AUDIO);
    });

    it('preserves valid fields while falling back on invalid fields', () => {
      const mixedData = {
        viewMode: 'GRID', // valid
        quickFilter: 'FAVORITES', // valid
        sortField: 'INVALID_SORT', // invalid -> fallback to 'NAME'
        sortDirection: 'DESC', // valid
      };

      const validated = validateCategoryPreference(mixedData, 'AUDIO');
      expect(validated.viewMode).toBe('GRID');
      expect(validated.quickFilter).toBe('FAVORITES');
      expect(validated.sortField).toBe('NAME'); // fallback
      expect(validated.sortDirection).toBe('DESC');
    });

    it('safely tolerates null, undefined, and non-object values', () => {
      expect(validateCategoryPreference(null, 'VIDEO')).toEqual(DEFAULT_CATEGORY_PREFERENCES.VIDEO);
      expect(validateCategoryPreference(undefined, 'VIDEO')).toEqual(DEFAULT_CATEGORY_PREFERENCES.VIDEO);
      expect(validateCategoryPreference('a string', 'VIDEO')).toEqual(DEFAULT_CATEGORY_PREFERENCES.VIDEO);
      expect(validateCategoryPreference(42, 'VIDEO')).toEqual(DEFAULT_CATEGORY_PREFERENCES.VIDEO);
    });
  });

  describe('Reset actions', () => {
    it('resets a single category preference back to defaults', () => {
      const store = useBrowserFilterStore.getState();
      store.setSort('AUDIO', 'SIZE', 'DESC');
      store.setViewMode('AUDIO', 'GRID');

      store.resetCategoryPreferences('AUDIO');
      expect(useBrowserFilterStore.getState().getPreferences('AUDIO')).toEqual(
        DEFAULT_CATEGORY_PREFERENCES.AUDIO,
      );
    });

    it('resets all category preferences back to defaults', () => {
      const store = useBrowserFilterStore.getState();
      store.setSort('AUDIO', 'SIZE', 'DESC');
      store.setSort('VIDEO', 'NAME', 'ASC');

      store.resetAllPreferences();

      expect(useBrowserFilterStore.getState().getPreferences('AUDIO')).toEqual(
        DEFAULT_CATEGORY_PREFERENCES.AUDIO,
      );
      expect(useBrowserFilterStore.getState().getPreferences('VIDEO')).toEqual(
        DEFAULT_CATEGORY_PREFERENCES.VIDEO,
      );
    });
  });

  describe('Hydration from storage', () => {
    it('hydrates stored preferences when hydrateFromStorage is called', () => {
      const customPref = {
        viewMode: 'GRID',
        quickFilter: 'UNWATCHED',
        sortField: 'DURATION',
        sortDirection: 'DESC',
      };
      sortFilterStorage.set(getCategoryPrefStorageKey('VIDEO'), JSON.stringify(customPref));

      useBrowserFilterStore.getState().hydrateFromStorage();

      const pref = useBrowserFilterStore.getState().getPreferences('VIDEO');
      expect(pref.viewMode).toBe('GRID');
      expect(pref.quickFilter).toBe('UNWATCHED');
      expect(pref.sortField).toBe('DURATION');
      expect(pref.sortDirection).toBe('DESC');
    });
  });
});
