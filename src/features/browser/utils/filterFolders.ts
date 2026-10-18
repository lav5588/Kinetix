import { folderPrefsStorage } from '@core/storage/mmkv';
import type { FolderFilterOptions } from '../types';

export const HIDE_MESSENGER_PREF_KEY = 'hide_messenger_folders';

/**
 * Pure filter function for folder collections.
 *
 * - When `options.hideMessenger` is true, immediately excludes folders where `isMessengerFolder === true`
 *   or `is_messenger_folder` is truthy.
 * - When `options.hideMessenger` is false or omitted, returns all folders.
 * - Always returns a new array, preserving input immutability.
 */
export function filterFolders<
  T extends { isMessengerFolder?: boolean; is_messenger_folder?: number | boolean },
>(folders: readonly T[], options: FolderFilterOptions = {}): T[] {
  if (!options.hideMessenger) {
    return [...folders];
  }

  return folders.filter((folder) => {
    const isMessenger =
      folder.isMessengerFolder === true ||
      folder.is_messenger_folder === 1 ||
      folder.is_messenger_folder === true;

    return !isMessenger;
  });
}

/**
 * Reads the user's persisted preference for hiding messenger folders from MMKV.
 * Defaults to `false` (show messenger folders) if no preference has been saved yet.
 */
export function getStoredHideMessengerPreference(storage = folderPrefsStorage): boolean {
  return storage.getBoolean(HIDE_MESSENGER_PREF_KEY) ?? false;
}

/**
 * Persists the user's preference for hiding messenger folders into MMKV.
 */
export function setStoredHideMessengerPreference(
  hide: boolean,
  storage = folderPrefsStorage,
): void {
  storage.set(HIDE_MESSENGER_PREF_KEY, hide);
}
