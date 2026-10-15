import 'react-native-gesture-handler/jestSetup';

jest.mock('react-native-mmkv', () => {
  const stores = new Map<string, Map<string, string | number | boolean>>();

  class MockMMKV {
    private readonly storage: Map<string, string | number | boolean>;

    constructor({ id = 'mmkv.default' }: { id?: string } = {}) {
      let storage = stores.get(id);
      if (!storage) {
        storage = new Map();
        stores.set(id, storage);
      }
      this.storage = storage;
    }

    set(key: string, value: string | number | boolean): void {
      this.storage.set(key, value);
    }

    getString(key: string): string | undefined {
      const value = this.storage.get(key);
      return typeof value === 'string' ? value : undefined;
    }

    getBoolean(key: string): boolean | undefined {
      const value = this.storage.get(key);
      return typeof value === 'boolean' ? value : undefined;
    }

    getNumber(key: string): number | undefined {
      const value = this.storage.get(key);
      return typeof value === 'number' ? value : undefined;
    }

    contains(key: string): boolean {
      return this.storage.has(key);
    }

    delete(key: string): void {
      this.storage.delete(key);
    }

    getAllKeys(): string[] {
      return [...this.storage.keys()];
    }

    clearAll(): void {
      this.storage.clear();
    }
  }

  return { MMKV: MockMMKV };
});

jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));
jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  const { View } = require('react-native');

  return {
    SafeAreaProvider: ({ children }: { children: React.ReactNode }) =>
      React.createElement(View, null, children),
    useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
  };
});

jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => {
  const React = require('react');
  const { Text } = require('react-native');

  return ({ name }: { name: string }) => React.createElement(Text, null, name);
});
