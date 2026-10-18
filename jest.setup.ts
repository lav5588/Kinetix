import 'react-native-gesture-handler/jestSetup';
import '@shopify/flash-list/jestSetup';

type SqlValue = string | number | boolean | null;
type SqlParams = SqlValue[];
type SqlExecutionRecord = { query: string; params: SqlParams };

type SqlRow = Record<string, SqlValue>;

jest.mock('@op-engineering/op-sqlite', () => {
  const sqliteMockState = {
    executedQueries: [] as SqlExecutionRecord[],
    rowsByQuery: new Map<string, SqlRow[]>(),
    reset: () => {
      sqliteMockState.executedQueries = [];
      sqliteMockState.rowsByQuery.clear();
    },
  };

  (globalThis as { __sqliteMockState?: typeof sqliteMockState }).__sqliteMockState = sqliteMockState;

  const executeSqlMock = jest.fn(async (query: string, params: SqlParams = []) => {
    sqliteMockState.executedQueries.push({ query, params });
    const rows = sqliteMockState.rowsByQuery.get(query) ?? [];

    return {
      rows,
      rowsAffected: 0,
      insertId: undefined,
      columnNames: rows[0] ? Object.keys(rows[0]) : [],
      rawRows: [],
      metadata: [],
    };
  });

  const executeBatchMock = jest.fn(async (commands: Array<[string, SqlParams?]>) => {
    commands.forEach(([query, params]) => {
      sqliteMockState.executedQueries.push({ query, params: params ?? [] });
    });

    return { rowsAffected: commands.length };
  });

  const openMock = jest.fn(() => ({
    execute: executeSqlMock,
    executeBatch: executeBatchMock,
    executeSync: jest.fn((query: string, params: SqlParams = []) => {
      sqliteMockState.executedQueries.push({ query, params });
      return {
        rows: sqliteMockState.rowsByQuery.get(query) ?? [],
        rowsAffected: 0,
        insertId: undefined,
        columnNames: [],
        rawRows: [],
        metadata: [],
      };
    }),
    close: jest.fn(),
    closeAsync: jest.fn(async () => undefined),
    interrupt: jest.fn(),
    delete: jest.fn(),
    attach: jest.fn(),
    detach: jest.fn(),
    transaction: jest.fn(async () => undefined),
    setReservedBytes: jest.fn(),
    getReservedBytes: jest.fn(() => 0),
    flushPendingReactiveQueries: jest.fn(async () => undefined),
    commitHook: jest.fn(),
    rollbackHook: jest.fn(),
    updateHook: jest.fn(),
    loadFile: jest.fn(async () => ({ commands: 0, rowsAffected: 0 })),
    prepareStatement: jest.fn(),
    executeRaw: jest.fn(async (query: string, params: SqlParams = []) => ({
      rawRows: [],
      columnNames: [],
      rowsAffected: 0,
      insertId: undefined,
      rows: sqliteMockState.rowsByQuery.get(query) ?? [],
      params,
    })),
    executeRawSync: jest.fn((query: string, params: SqlParams = []) => ({
      rawRows: [],
      columnNames: [],
      rowsAffected: 0,
      insertId: undefined,
      rows: sqliteMockState.rowsByQuery.get(query) ?? [],
      params,
    })),
    getDbPath: jest.fn(() => ':memory:'),
    reactiveExecute: jest.fn(() => () => undefined),
    sync: jest.fn(),
    loadExtension: jest.fn(),
  }));

  return {
    __esModule: true,
    open: openMock,
    executeSql: executeSqlMock,
    executeBatch: executeBatchMock,
    __sqliteMockState: sqliteMockState,
  };
});

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
jest.mock('@gorhom/bottom-sheet', () => {
  const mock = require('@gorhom/bottom-sheet/mock');
  return {
    __esModule: true,
    ...mock,
    default: mock.default,
  };
});

jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  const { createContext } = React;
  const { View } = require('react-native');
  const insets = { top: 0, right: 0, bottom: 0, left: 0 };
  const SafeAreaInsetsContext = createContext(insets);
  const SafeAreaFrameContext = createContext({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  });

  return {
    SafeAreaProvider: ({ children }: { children: React.ReactNode }) =>
      React.createElement(
        SafeAreaInsetsContext.Provider,
        { value: insets },
        React.createElement(View, null, children),
      ),
    SafeAreaInsetsContext,
    SafeAreaFrameContext,
    initialWindowMetrics: {
      frame: { x: 0, y: 0, width: 0, height: 0 },
      insets,
    },
    useSafeAreaInsets: () => insets,
    SafeAreaView: ({ children, style, ...props }: { children?: React.ReactNode; style?: unknown; [key: string]: unknown }) =>
      React.createElement(View, { style, ...props }, children),
  };
});

jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => {
  const React = require('react');
  const { Text } = require('react-native');

  return ({ name, ...props }: { name: string; [key: string]: unknown }) =>
    React.createElement(Text, props, name);
});

jest.mock('react-native-track-player', () => {
  const State = {
    None: 'none',
    Ready: 'ready',
    Playing: 'playing',
    Paused: 'paused',
    Stopped: 'stopped',
    Loading: 'loading',
    Buffering: 'buffering',
    Error: 'error',
    Ended: 'ended',
  };

  const Capability = {
    Play: 0,
    PlayFromId: 1,
    PlayFromSearch: 2,
    Pause: 3,
    Stop: 4,
    SeekTo: 5,
    Skip: 6,
    SkipToNext: 7,
    SkipToPrevious: 8,
    SetRating: 9,
    JumpForward: 10,
    JumpBackward: 11,
    Like: 12,
    Dislike: 13,
    Bookmark: 14,
  };

  const RepeatMode = {
    Off: 0,
    Track: 1,
    Queue: 2,
  };

  const Event = {
    PlaybackState: 'playback-state',
    PlaybackError: 'playback-error',
    PlaybackQueueEnded: 'playback-queue-ended',
    PlaybackTrackChanged: 'playback-track-changed',
    PlaybackActiveTrackChanged: 'playback-active-track-changed',
    PlaybackProgressUpdated: 'playback-progress-updated',
    RemotePlay: 'remote-play',
    RemotePause: 'remote-pause',
    RemoteStop: 'remote-stop',
    RemoteNext: 'remote-next',
    RemotePrevious: 'remote-previous',
    RemoteSeek: 'remote-seek',
    RemoteDuck: 'remote-duck',
    RemoteJumpForward: 'remote-jump-forward',
    RemoteJumpBackward: 'remote-jump-backward',
    RemoteSetRating: 'remote-set-rating',
    RemoteLike: 'remote-like',
    RemoteDislike: 'remote-dislike',
    RemoteBookmark: 'remote-bookmark',
  };

  const AppKilledPlaybackBehavior = {
    ContinuePlayback: 'continue-playback',
    PausePlayback: 'pause-playback',
    StopPlaybackAndRemoveNotification: 'stop-playback-and-remove-notification',
  };

  const mockTrackPlayer = {
    setupPlayer: jest.fn().mockResolvedValue(undefined),
    registerPlaybackService: jest.fn(),
    add: jest.fn().mockResolvedValue(undefined),
    remove: jest.fn().mockResolvedValue(undefined),
    skip: jest.fn().mockResolvedValue(undefined),
    skipToNext: jest.fn().mockResolvedValue(undefined),
    skipToPrevious: jest.fn().mockResolvedValue(undefined),
    reset: jest.fn().mockResolvedValue(undefined),
    play: jest.fn().mockResolvedValue(undefined),
    pause: jest.fn().mockResolvedValue(undefined),
    stop: jest.fn().mockResolvedValue(undefined),
    seekTo: jest.fn().mockResolvedValue(undefined),
    setVolume: jest.fn().mockResolvedValue(undefined),
    getVolume: jest.fn().mockResolvedValue(1),
    setRate: jest.fn().mockResolvedValue(undefined),
    getRate: jest.fn().mockResolvedValue(1),
    getTrack: jest.fn().mockResolvedValue(null),
    getQueue: jest.fn().mockResolvedValue([]),
    getActiveTrack: jest.fn().mockResolvedValue(null),
    getActiveTrackIndex: jest.fn().mockResolvedValue(undefined),
    getProgress: jest.fn().mockResolvedValue({ position: 0, duration: 0, buffered: 0 }),
    getPlaybackState: jest.fn().mockResolvedValue({ state: State.None }),
    updateOptions: jest.fn().mockResolvedValue(undefined),
    setRepeatMode: jest.fn().mockResolvedValue(undefined),
    getRepeatMode: jest.fn().mockResolvedValue(RepeatMode.Off),
    addEventListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
    CAPABILITY_PLAY: 0,
    CAPABILITY_PLAY_FROM_ID: 1,
    CAPABILITY_PLAY_FROM_SEARCH: 2,
    CAPABILITY_PAUSE: 3,
    CAPABILITY_STOP: 4,
    CAPABILITY_SEEK_TO: 5,
    CAPABILITY_SKIP: 6,
    CAPABILITY_SKIP_TO_NEXT: 7,
    CAPABILITY_SKIP_TO_PREVIOUS: 8,
    CAPABILITY_SET_RATING: 9,
    CAPABILITY_JUMP_FORWARD: 10,
    CAPABILITY_JUMP_BACKWARD: 11,
    REPEAT_OFF: 0,
    REPEAT_TRACK: 1,
    REPEAT_QUEUE: 2,
  };

  return {
    __esModule: true,
    default: mockTrackPlayer,
    ...mockTrackPlayer,
    useProgress: jest.fn().mockReturnValue({ position: 0, duration: 0, buffered: 0 }),
    usePlaybackState: jest.fn().mockReturnValue({ state: State.None }),
    useActiveTrack: jest.fn().mockReturnValue(undefined),
    useIsPlaying: jest.fn().mockReturnValue({ playing: false, bufferingDuringPlay: false }),
    State,
    Capability,
    RepeatMode,
    Event,
    AppKilledPlaybackBehavior,
  };
});

