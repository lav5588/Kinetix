import { create } from 'zustand';
import type { AudioPlaybackState, AudioRepeatMode, AudioTrack } from '@features/audioPlayer/types';

export interface AudioPlayerState {
  // Playback information
  activeTrack: AudioTrack | null;
  queue: AudioTrack[];
  currentIndex: number;
  playbackState: AudioPlaybackState;
  positionMs: number;
  durationMs: number;
  bufferedMs: number;
  repeatMode: AudioRepeatMode;
  isShuffled: boolean;
  unshuffledQueue: AudioTrack[];
  playbackRate: number;
  volume: number;
  isLoading: boolean;
  isInterrupted: boolean;
  error: string | null;

  // Store actions
  setQueue: (queue: AudioTrack[], startIndex?: number) => void;
  setActiveTrack: (track: AudioTrack | null, index?: number) => void;
  setPlaybackState: (state: AudioPlaybackState) => void;
  setProgress: (positionMs: number, durationMs?: number, bufferedMs?: number) => void;
  setRepeatMode: (mode: AudioRepeatMode) => void;
  setShuffled: (isShuffled: boolean, newQueue?: AudioTrack[]) => void;
  reorderQueue: (newQueue: AudioTrack[], newIndex?: number) => void;
  setPlaybackRate: (rate: number) => void;
  setVolume: (volume: number) => void;
  setIsLoading: (isLoading: boolean) => void;
  setIsInterrupted: (isInterrupted: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  resetPlayback: () => void;
}

export const INITIAL_AUDIO_PLAYER_STATE = {
  activeTrack: null,
  queue: [],
  currentIndex: -1,
  playbackState: 'idle' as AudioPlaybackState,
  positionMs: 0,
  durationMs: 0,
  bufferedMs: 0,
  repeatMode: 'OFF' as AudioRepeatMode,
  isShuffled: false,
  unshuffledQueue: [],
  playbackRate: 1.0,
  volume: 1.0,
  isLoading: false,
  isInterrupted: false,
  error: null,
};

export const useAudioPlayerStore = create<AudioPlayerState>((set, get) => ({
  ...INITIAL_AUDIO_PLAYER_STATE,

  setQueue: (queue: AudioTrack[], startIndex = 0) => {
    const clampedIndex =
      queue.length > 0 ? Math.max(0, Math.min(startIndex, queue.length - 1)) : -1;
    const activeTrack = clampedIndex >= 0 ? (queue[clampedIndex] ?? null) : null;
    const durationMs = activeTrack?.duration ? activeTrack.duration * 1000 : 0;

    set({
      queue: [...queue],
      unshuffledQueue: [...queue],
      isShuffled: false,
      currentIndex: clampedIndex,
      activeTrack,
      positionMs: 0,
      durationMs,
      bufferedMs: 0,
      error: null,
    });
  },

  setActiveTrack: (track: AudioTrack | null, index?: number) => {
    const currentQueue = get().queue;
    let resolvedIndex = index ?? -1;

    if (resolvedIndex === -1 && track) {
      resolvedIndex = currentQueue.findIndex((item) => item.id === track.id);
    }

    const durationMs = track?.duration ? track.duration * 1000 : get().durationMs;

    set({
      activeTrack: track,
      currentIndex: resolvedIndex,
      durationMs,
      positionMs: 0,
    });
  },

  setPlaybackState: (state: AudioPlaybackState) => {
    set({
      playbackState: state,
      isLoading: state === 'loading' || state === 'buffering',
    });
  },

  setProgress: (positionMs: number, durationMs?: number, bufferedMs?: number) => {
    set((state) => ({
      positionMs: Math.max(0, positionMs),
      durationMs: typeof durationMs === 'number' && durationMs > 0 ? durationMs : state.durationMs,
      bufferedMs: typeof bufferedMs === 'number' ? bufferedMs : state.bufferedMs,
    }));
  },

  setRepeatMode: (mode: AudioRepeatMode) => {
    set({ repeatMode: mode });
  },

  setShuffled: (isShuffled: boolean, newQueue?: AudioTrack[]) => {
    if (newQueue) {
      const activeTrack = get().activeTrack;
      const newIndex = activeTrack ? newQueue.findIndex((item) => item.id === activeTrack.id) : -1;

      set({
        isShuffled,
        queue: [...newQueue],
        currentIndex: newIndex,
      });
      return;
    }

    set({ isShuffled });
  },

  reorderQueue: (newQueue: AudioTrack[], newIndex?: number) => {
    const activeTrack = get().activeTrack;
    const resolvedIndex =
      typeof newIndex === 'number'
        ? newIndex
        : activeTrack
          ? newQueue.findIndex((item) => item.id === activeTrack.id)
          : get().currentIndex;

    set({
      queue: [...newQueue],
      currentIndex: resolvedIndex,
    });
  },

  setPlaybackRate: (rate: number) => {
    set({ playbackRate: Math.max(0.25, Math.min(rate, 4.0)) });
  },

  setVolume: (volume: number) => {
    set({ volume: Math.max(0, Math.min(volume, 1.0)) });
  },

  setIsLoading: (isLoading: boolean) => {
    set({ isLoading });
  },

  setIsInterrupted: (isInterrupted: boolean) => {
    set({ isInterrupted });
  },

  setError: (error: string | null) => {
    set({
      error,
      isLoading: false,
      playbackState: error ? 'error' : get().playbackState,
    });
  },

  clearError: () => {
    set({ error: null });
  },

  resetPlayback: () => {
    set({
      ...INITIAL_AUDIO_PLAYER_STATE,
    });
  },
}));

export default useAudioPlayerStore;
