import { create } from 'zustand';
import { BookmarkRepository } from '@core/storage/repositories/BookmarkRepository';
import type { MediaBookmarkRow } from '@core/storage/types';
import { audioEqualizerService } from '@features/audioPlayer/services/AudioEqualizerService';
import { useAudioPlayerStore } from './useAudioPlayerStore';

export type SleepTimerMode =
  | 'OFF'
  | '15M'
  | '30M'
  | '45M'
  | '60M'
  | '75M'
  | '90M'
  | '105M'
  | '120M'
  | '135M'
  | '150M'
  | '165M'
  | '180M'
  | 'END_OF_TRACK'
  | 'CUSTOM';

export interface AudioControlsState {
  // Modal & Sheet Visibilities
  isFullPlayerVisible: boolean;
  isEqualizerVisible: boolean;
  isQueueVisible: boolean;
  isBookmarksVisible: boolean;
  isSpeedSelectorVisible: boolean;
  isSleepTimerModalVisible: boolean;

  // A-B Loop
  isAbLoopActive: boolean;
  pointAMs: number | null;
  pointBMs: number | null;

  // Sleep Timer
  sleepTimerMode: SleepTimerMode;
  sleepTimerRemainingSeconds: number;
  isSleepTimerActive: boolean;

  // Bookmarks
  bookmarks: MediaBookmarkRow[];
  isLoadingBookmarks: boolean;

  // Equalizer State
  isEqEnabled: boolean;
  activeEqPreset: number;
  eqBandLevels: number[];
  eqBassBoost: number;
  eqVirtualizer: number;

  // Sheet Controls
  setFullPlayerVisible: (visible: boolean) => void;
  setEqualizerVisible: (visible: boolean) => void;
  setQueueVisible: (visible: boolean) => void;
  setBookmarksVisible: (visible: boolean) => void;
  setSpeedSelectorVisible: (visible: boolean) => void;
  setSleepTimerModalVisible: (visible: boolean) => void;

  // A-B Loop Actions
  setPointA: (positionMs?: number) => void;
  setPointB: (positionMs?: number) => void;
  clearAbLoop: () => void;
  toggleAbLoop: () => void;

  // Sleep Timer Actions
  setSleepTimer: (mode: SleepTimerMode, customMinutes?: number) => void;
  clearSleepTimer: () => void;
  tickSleepTimer: () => boolean; // returns true if expired

  // Bookmarks Actions
  loadBookmarks: (filePath: string) => Promise<void>;
  addBookmark: (filePath: string, timestampMs: number, title?: string) => Promise<void>;
  removeBookmark: (bookmarkId: number, filePath: string) => Promise<void>;

  // Equalizer Actions
  initEqualizer: () => Promise<void>;
  setEqEnabled: (enabled: boolean) => Promise<void>;
  setEqPreset: (presetIndex: number) => Promise<void>;
  setEqBandLevel: (band: number, level: number) => Promise<void>;
  setEqBassBoost: (val: number) => Promise<void>;
  setEqVirtualizer: (val: number) => Promise<void>;
  resetEq: () => Promise<void>;
}

let sleepTimerInterval: ReturnType<typeof setInterval> | null = null;

export const useAudioControlsStore = create<AudioControlsState>((set, get) => ({
  // Visibilities
  isFullPlayerVisible: false,
  isEqualizerVisible: false,
  isQueueVisible: false,
  isBookmarksVisible: false,
  isSpeedSelectorVisible: false,
  isSleepTimerModalVisible: false,

  // A-B Loop
  isAbLoopActive: false,
  pointAMs: null,
  pointBMs: null,

  // Sleep Timer
  sleepTimerMode: 'OFF',
  sleepTimerRemainingSeconds: 0,
  isSleepTimerActive: false,

  // Bookmarks
  bookmarks: [],
  isLoadingBookmarks: false,

  // Equalizer
  isEqEnabled: false,
  activeEqPreset: 0,
  eqBandLevels: [0, 0, 0, 0, 0],
  eqBassBoost: 0,
  eqVirtualizer: 0,

  // Sheet Controls
  setFullPlayerVisible: (visible: boolean) => set({ isFullPlayerVisible: visible }),
  setEqualizerVisible: (visible: boolean) => set({ isEqualizerVisible: visible }),
  setQueueVisible: (visible: boolean) => set({ isQueueVisible: visible }),
  setBookmarksVisible: (visible: boolean) => set({ isBookmarksVisible: visible }),
  setSpeedSelectorVisible: (visible: boolean) => set({ isSpeedSelectorVisible: visible }),
  setSleepTimerModalVisible: (visible: boolean) => set({ isSleepTimerModalVisible: visible }),

  // A-B Loop Actions
  setPointA: (positionMs?: number) => {
    const pos =
      typeof positionMs === 'number'
        ? positionMs
        : (useAudioPlayerStore.getState().positionMs ?? 0);
    const currentB = get().pointBMs;
    const clampedA = Math.max(0, pos);
    // If point B already set and A >= B, clear B
    const updatedB = currentB !== null && clampedA >= currentB ? null : currentB;
    set({
      pointAMs: clampedA,
      pointBMs: updatedB,
      isAbLoopActive: updatedB !== null,
    });
  },

  setPointB: (positionMs?: number) => {
    const pos =
      typeof positionMs === 'number'
        ? positionMs
        : (useAudioPlayerStore.getState().positionMs ?? 0);
    const currentA = get().pointAMs ?? 0;
    const clampedB = Math.max(currentA + 500, pos);
    set({
      pointAMs: currentA,
      pointBMs: clampedB,
      isAbLoopActive: true,
    });
  },

  clearAbLoop: () => {
    set({
      pointAMs: null,
      pointBMs: null,
      isAbLoopActive: false,
    });
  },

  toggleAbLoop: () => {
    const { isAbLoopActive, pointAMs, pointBMs } = get();
    if (pointAMs !== null && pointBMs !== null) {
      set({ isAbLoopActive: !isAbLoopActive });
    }
  },

  // Sleep Timer Actions
  setSleepTimer: (mode: SleepTimerMode, customMinutes?: number) => {
    if (sleepTimerInterval) {
      clearInterval(sleepTimerInterval);
      sleepTimerInterval = null;
    }

    if (mode === 'OFF') {
      set({
        sleepTimerMode: 'OFF',
        sleepTimerRemainingSeconds: 0,
        isSleepTimerActive: false,
      });
      return;
    }

    if (mode === 'END_OF_TRACK') {
      set({
        sleepTimerMode: 'END_OF_TRACK',
        sleepTimerRemainingSeconds: 0,
        isSleepTimerActive: true,
      });
      return;
    }

    let seconds = 0;
    if (mode.endsWith('M') && mode !== 'CUSTOM') {
      const minutes = parseInt(mode.replace('M', ''), 10);
      if (!isNaN(minutes)) {
        seconds = minutes * 60;
      }
    } else if (mode === 'CUSTOM') {
      seconds = Math.max(1, (customMinutes ?? 10) * 60);
    }

    set({
      sleepTimerMode: mode,
      sleepTimerRemainingSeconds: seconds,
      isSleepTimerActive: true,
    });
  },

  clearSleepTimer: () => {
    if (sleepTimerInterval) {
      clearInterval(sleepTimerInterval);
      sleepTimerInterval = null;
    }
    set({
      sleepTimerMode: 'OFF',
      sleepTimerRemainingSeconds: 0,
      isSleepTimerActive: false,
    });
  },

  tickSleepTimer: () => {
    const { isSleepTimerActive, sleepTimerRemainingSeconds, sleepTimerMode } = get();
    if (!isSleepTimerActive || sleepTimerMode === 'END_OF_TRACK' || sleepTimerMode === 'OFF') {
      return false;
    }

    const nextSeconds = sleepTimerRemainingSeconds - 1;
    if (nextSeconds <= 0) {
      set({
        sleepTimerMode: 'OFF',
        sleepTimerRemainingSeconds: 0,
        isSleepTimerActive: false,
      });
      return true; // Expired
    }

    set({ sleepTimerRemainingSeconds: nextSeconds });
    return false;
  },

  // Bookmarks Actions
  loadBookmarks: async (filePath: string) => {
    set({ isLoadingBookmarks: true });
    try {
      const records = await BookmarkRepository.getBookmarks(filePath);
      set({ bookmarks: records, isLoadingBookmarks: false });
    } catch {
      set({ bookmarks: [], isLoadingBookmarks: false });
    }
  },

  addBookmark: async (filePath: string, timestampMs: number, title?: string) => {
    const defaultLabel = `Bookmark at ${formatSecondsToTime(Math.round(timestampMs / 1000))}`;
    const newBookmark = await BookmarkRepository.addBookmark(
      filePath,
      timestampMs,
      title || defaultLabel,
    );
    set((state) => ({
      bookmarks: [...state.bookmarks, newBookmark].sort((a, b) => a.timestamp_ms - b.timestamp_ms),
    }));
  },

  removeBookmark: async (bookmarkId: number, _filePath?: string) => {
    await BookmarkRepository.removeBookmark(bookmarkId);
    set((state) => ({
      bookmarks: state.bookmarks.filter((b) => b.id !== bookmarkId),
    }));
  },

  // Equalizer Actions
  initEqualizer: async () => {
    try {
      await audioEqualizerService.initialize();
      const eqState = audioEqualizerService.getState();
      set({
        isEqEnabled: eqState.isEnabled,
        activeEqPreset: eqState.activePresetIndex,
        eqBandLevels: eqState.bandLevels,
        eqBassBoost: eqState.bassBoostStrength,
        eqVirtualizer: eqState.virtualizerStrength,
      });
    } catch {
      // ignore
    }
  },

  setEqEnabled: async (enabled: boolean) => {
    await audioEqualizerService.setEnabled(enabled);
    set({ isEqEnabled: enabled });
  },

  setEqPreset: async (presetIndex: number) => {
    await audioEqualizerService.applyPreset(presetIndex);
    const eqState = audioEqualizerService.getState();
    set({
      activeEqPreset: presetIndex,
      eqBandLevels: eqState.bandLevels,
    });
  },

  setEqBandLevel: async (band: number, level: number) => {
    await audioEqualizerService.setBandLevel(band, level);
    const eqState = audioEqualizerService.getState();
    set({
      activeEqPreset: -1,
      eqBandLevels: [...eqState.bandLevels],
    });
  },

  setEqBassBoost: async (val: number) => {
    const clamped = await audioEqualizerService.setBassBoost(val);
    set({ eqBassBoost: clamped });
  },

  setEqVirtualizer: async (val: number) => {
    const clamped = await audioEqualizerService.setVirtualizer(val);
    set({ eqVirtualizer: clamped });
  },

  resetEq: async () => {
    await audioEqualizerService.resetToFlat();
    set({
      activeEqPreset: 0,
      eqBandLevels: [0, 0, 0, 0, 0],
      eqBassBoost: 0,
      eqVirtualizer: 0,
    });
  },
}));

function formatSecondsToTime(totalSec: number): string {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export default useAudioControlsStore;
