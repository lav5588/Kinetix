import { MMKV } from 'react-native-mmkv';
import type { StateStorage } from 'zustand/middleware';

export const appSettingsStorage = new MMKV({ id: 'omniplay-settings-store' });
export const resumeStorage = new MMKV({ id: 'omniplay-resume-store' });
export const folderPrefsStorage = new MMKV({ id: 'omniplay-folder-prefs-store' });

export const getString = (storage: MMKV, key: string): string | undefined => storage.getString(key);

export const setString = (storage: MMKV, key: string, value: string): void => {
  storage.set(key, value);
};

export const getBoolean = (storage: MMKV, key: string): boolean | undefined =>
  storage.getBoolean(key);

export const setBoolean = (storage: MMKV, key: string, value: boolean): void => {
  storage.set(key, value);
};

export const getNumber = (storage: MMKV, key: string): number | undefined => storage.getNumber(key);

export const setNumber = (storage: MMKV, key: string, value: number): void => {
  storage.set(key, value);
};

export const mmkvZustandStorage: StateStorage = {
  getItem: (name) => appSettingsStorage.getString(name) ?? null,
  setItem: (name, value) => appSettingsStorage.set(name, value),
  removeItem: (name) => appSettingsStorage.delete(name),
};
