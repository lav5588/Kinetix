import { folderPrefsStorage } from '@core/storage/mmkv';
import {
  filterFolders,
  getStoredHideMessengerPreference,
  setStoredHideMessengerPreference,
  HIDE_MESSENGER_PREF_KEY,
} from '@features/browser/utils/filterFolders';
import { FolderExplorerService } from '@features/browser/services/FolderExplorerService';
import type { FolderItemViewModel } from '@features/browser/types';

describe('Messenger Folder Filtering', () => {
  beforeEach(() => {
    folderPrefsStorage.clearAll();
  });

  const createMockFolder = (
    folderName: string,
    isMessengerFolder: boolean,
    overrides: Partial<FolderItemViewModel> = {},
  ): FolderItemViewModel => ({
    id: `AUDIO:/storage/emulated/0/${folderName}`,
    folderPath: `/storage/emulated/0/${folderName}`,
    folderName,
    category: 'AUDIO',
    itemCount: 10,
    totalSizeBytes: 1024,
    thumbnailUri: null,
    lastModified: 1000,
    isExcluded: false,
    isMessengerFolder,
    hasUnfinishedResume: false,
    ...overrides,
  });

  const mixedFolders: FolderItemViewModel[] = [
    createMockFolder('Music', false),
    createMockFolder('WhatsApp Audio', true),
    createMockFolder('Podcasts', false),
    createMockFolder('Telegram Audio', true),
    createMockFolder('Recordings', false),
  ];

  describe('filterFolders pure function', () => {
    it('returns all folders when hideMessenger is false or omitted', () => {
      const resultDefault = filterFolders(mixedFolders);
      expect(resultDefault).toHaveLength(5);
      expect(resultDefault.map((f) => f.folderName)).toEqual([
        'Music',
        'WhatsApp Audio',
        'Podcasts',
        'Telegram Audio',
        'Recordings',
      ]);

      const resultExplicitFalse = filterFolders(mixedFolders, { hideMessenger: false });
      expect(resultExplicitFalse).toHaveLength(5);
    });

    it('excludes messenger folders when hideMessenger is true', () => {
      const result = filterFolders(mixedFolders, { hideMessenger: true });

      expect(result).toHaveLength(3);
      expect(result.map((f) => f.folderName)).toEqual(['Music', 'Podcasts', 'Recordings']);
      expect(result.some((f) => f.isMessengerFolder)).toBe(false);
    });

    it('preserves non-messenger folders when hideMessenger is true', () => {
      const nonMessengerFolders = [
        createMockFolder('Camera', false),
        createMockFolder('Downloads', false),
      ];

      const result = filterFolders(nonMessengerFolders, { hideMessenger: true });
      expect(result).toHaveLength(2);
      expect(result.map((f) => f.folderName)).toEqual(['Camera', 'Downloads']);
    });

    it('returns an empty array when all folders are messenger folders and hideMessenger is true', () => {
      const messengerOnly = [
        createMockFolder('WhatsApp Voice Notes', true),
        createMockFolder('Telegram Audio', true),
      ];

      const result = filterFolders(messengerOnly, { hideMessenger: true });
      expect(result).toHaveLength(0);
    });

    it('handles an empty folder list gracefully', () => {
      expect(filterFolders([], { hideMessenger: true })).toEqual([]);
      expect(filterFolders([], { hideMessenger: false })).toEqual([]);
    });

    it('does not mutate the original folder array', () => {
      const original = [...mixedFolders];
      filterFolders(mixedFolders, { hideMessenger: true });

      expect(mixedFolders).toEqual(original);
    });

    it('supports toggling back and forth without rescanning or losing data', () => {
      // 1. Initial state: all folders visible
      let currentDisplay = filterFolders(mixedFolders, { hideMessenger: false });
      expect(currentDisplay).toHaveLength(5);

      // 2. User toggles "Hide WhatsApp/Telegram Folders" ON
      currentDisplay = filterFolders(mixedFolders, { hideMessenger: true });
      expect(currentDisplay).toHaveLength(3);
      expect(currentDisplay.map((f) => f.folderName)).toEqual(['Music', 'Podcasts', 'Recordings']);

      // 3. User toggles "Hide WhatsApp/Telegram Folders" OFF
      // Restores messenger folders immediately from the cached collection
      currentDisplay = filterFolders(mixedFolders, { hideMessenger: false });
      expect(currentDisplay).toHaveLength(5);
      expect(currentDisplay.map((f) => f.folderName)).toEqual([
        'Music',
        'WhatsApp Audio',
        'Podcasts',
        'Telegram Audio',
        'Recordings',
      ]);
    });

    it('supports raw database rows with is_messenger_folder property', () => {
      const rawRows = [
        { folder_name: 'Regular', is_messenger_folder: 0 },
        { folder_name: 'WhatsApp', is_messenger_folder: 1 },
      ];

      const filtered = filterFolders(rawRows, { hideMessenger: true });
      expect(filtered).toHaveLength(1);
      expect(filtered[0].folder_name).toBe('Regular');
    });
  });

  describe('Stored preference persistence', () => {
    it('defaults to false when no preference is stored', () => {
      expect(getStoredHideMessengerPreference()).toBe(false);
    });

    it('saves and reads true preference from storage', () => {
      setStoredHideMessengerPreference(true);
      expect(getStoredHideMessengerPreference()).toBe(true);
      expect(folderPrefsStorage.getBoolean(HIDE_MESSENGER_PREF_KEY)).toBe(true);
    });

    it('saves and reads false preference from storage', () => {
      setStoredHideMessengerPreference(true);
      expect(getStoredHideMessengerPreference()).toBe(true);

      setStoredHideMessengerPreference(false);
      expect(getStoredHideMessengerPreference()).toBe(false);
      expect(folderPrefsStorage.getBoolean(HIDE_MESSENGER_PREF_KEY)).toBe(false);
    });

    it('delegates preference access through FolderExplorerService', () => {
      const service = new FolderExplorerService();

      expect(service.getHideMessengerPreference()).toBe(false);

      service.setHideMessengerPreference(true);
      expect(service.getHideMessengerPreference()).toBe(true);

      const filtered = service.filterFolders(mixedFolders, {
        hideMessenger: service.getHideMessengerPreference(),
      });
      expect(filtered).toHaveLength(3);
    });
  });
});
