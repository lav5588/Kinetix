import TrackPlayer, {
  Capability,
  Event,
  RepeatMode as RNTPRepeatMode,
  State as RNTPState,
  type EventPayloadByEvent,
} from 'react-native-track-player';
import type { MediaFileRow } from '@core/storage/types';
import { useAudioPlayerStore } from '@core/store/useAudioPlayerStore';
import type { AudioPlaybackState, AudioRepeatMode, AudioTrack } from '../types';
import {
  buildAudioQueue,
  getNextTrackIndex,
  getPreviousTrackIndex,
  shuffleQueue,
} from '../utils/audioQueue';
import { appSettingsStorage } from '@core/storage/mmkv';
import { ResumeRepository } from '@core/storage/repositories/ResumeRepository';
import { vlcAudioFallbackService } from './VlcAudioFallbackService';

export function mapNativePlaybackState(state: RNTPState | string): AudioPlaybackState {
  switch (state) {
    case RNTPState.Playing:
    case 'playing':
      return 'playing';
    case RNTPState.Paused:
    case 'paused':
      return 'paused';
    case RNTPState.Stopped:
    case 'stopped':
      return 'stopped';
    case RNTPState.Buffering:
    case 'buffering':
      return 'buffering';
    case RNTPState.Loading:
    case 'loading':
      return 'loading';
    case RNTPState.Ready:
    case 'ready':
      return 'ready';
    case RNTPState.Ended:
    case 'ended':
      return 'ended';
    case RNTPState.Error:
    case 'error':
      return 'error';
    case RNTPState.None:
    case 'none':
    default:
      return 'idle';
  }
}

export function mapRepeatModeToNative(mode: AudioRepeatMode): RNTPRepeatMode {
  switch (mode) {
    case 'TRACK':
      return RNTPRepeatMode.Track;
    case 'QUEUE':
      return RNTPRepeatMode.Queue;
    case 'OFF':
    default:
      return RNTPRepeatMode.Off;
  }
}

class AudioPlaybackService {
  private isInitialized = false;
  private isInitializing = false;
  private subscriptions: Array<{ remove: () => void }> = [];
  private lastSavedPositionMs = -1;
  private lastSavedTimestamp = 0;
  readonly RESUME_THROTTLE_MS = 2000;
  readonly DEFAULT_MIN_AUDIO_DURATION_SEC = 600;
  private wasPlayingBeforeInterruption = false;

  /**
   * Initializes react-native-track-player and subscribes to events once.
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }
    if (this.isInitializing) {
      return;
    }

    this.isInitializing = true;

    try {
      await TrackPlayer.setupPlayer({
        autoHandleInterruptions: true,
      });

      await TrackPlayer.updateOptions({
        capabilities: [
          Capability.Play,
          Capability.Pause,
          Capability.SkipToNext,
          Capability.SkipToPrevious,
          Capability.SeekTo,
          Capability.Stop,
        ],
        compactCapabilities: [
          Capability.Play,
          Capability.Pause,
          Capability.SkipToNext,
          Capability.SkipToPrevious,
        ],
        progressUpdateEventInterval: 1,
      });

      this.setupEventListeners();
      this.isInitialized = true;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to initialize TrackPlayer';
      useAudioPlayerStore.getState().setError(errorMsg);
    } finally {
      this.isInitializing = false;
    }
  }

  /**
   * Registers player native event subscriptions translating them to Zustand store.
   */
  private setupEventListeners(): void {
    this.cleanUpEventListeners();

    const stateSub = TrackPlayer.addEventListener(
      Event.PlaybackState,
      (event: EventPayloadByEvent[Event.PlaybackState]) => {
        const mappedState = mapNativePlaybackState(event.state);
        useAudioPlayerStore.getState().setPlaybackState(mappedState);
      },
    );

    const trackSub = TrackPlayer.addEventListener(
      Event.PlaybackActiveTrackChanged,
      (event: EventPayloadByEvent[Event.PlaybackActiveTrackChanged]) => {
        const store = useAudioPlayerStore.getState();
        if (store.activeTrack) {
          this.flushResumeState();
        }
        this.lastSavedPositionMs = -1;
        this.lastSavedTimestamp = 0;

        if (event.track) {
          const matched =
            store.queue.find((t) => t.id === event.track?.id) ?? (event.track as AudioTrack);
          store.setActiveTrack(matched, event.index);
        } else {
          store.setActiveTrack(null, -1);
        }
      },
    );

    const progressSub = TrackPlayer.addEventListener(
      Event.PlaybackProgressUpdated,
      (event: EventPayloadByEvent[Event.PlaybackProgressUpdated]) => {
        const positionMs = event.position * 1000;
        const durationMs = event.duration * 1000;
        const bufferedMs = event.buffered * 1000;
        useAudioPlayerStore.getState().setProgress(positionMs, durationMs, bufferedMs);
        this.handleProgressForResume(positionMs, durationMs);
      },
    );

    const queueEndedSub = TrackPlayer.addEventListener(Event.PlaybackQueueEnded, async () => {
      this.flushResumeState();
      const { repeatMode, queue } = useAudioPlayerStore.getState();
      if (repeatMode === 'QUEUE' && queue.length > 0) {
        await this.skipToIndex(0);
      } else {
        useAudioPlayerStore.getState().setPlaybackState('ended');
      }
    });

    const errorSub = TrackPlayer.addEventListener(
      Event.PlaybackError,
      async (event: EventPayloadByEvent[Event.PlaybackError]) => {
        const store = useAudioPlayerStore.getState();
        const activeTrack = store.activeTrack;

        if (activeTrack && vlcAudioFallbackService.canHandle(activeTrack, event.message)) {
          try {
            await TrackPlayer.stop();
          } catch {
            // no-op
          }
          await vlcAudioFallbackService.play(activeTrack, store.positionMs);
          return;
        }

        store.setError(event.message);
      },
    );

    this.subscriptions = [stateSub, trackSub, progressSub, queueEndedSub, errorSub];
  }

  /**
   * Cleans up registered event subscriptions and flushes pending resume state.
   */
  cleanUpEventListeners(): void {
    this.flushResumeState();
    this.lastSavedPositionMs = -1;
    this.lastSavedTimestamp = 0;
    this.subscriptions.forEach((sub) => {
      try {
        sub.remove();
      } catch {
        // no-op if already removed
      }
    });
    this.subscriptions = [];
  }

  /**
   * Checks whether the track meets the minimum duration required to save resume state.
   * Respects appSettingsStorage 'audio_resume_min_duration_sec' (default 600s).
   * If minDurationSec is 0, all audio files are persisted.
   */
  shouldPersistResume(track: AudioTrack | null, durationMs?: number): boolean {
    if (!track) {
      return false;
    }

    const minDurationSec =
      appSettingsStorage.getNumber('audio_resume_min_duration_sec') ??
      this.DEFAULT_MIN_AUDIO_DURATION_SEC;

    if (minDurationSec <= 0) {
      return true;
    }

    const totalDurationMs =
      typeof durationMs === 'number' && durationMs > 0
        ? durationMs
        : typeof track.duration === 'number' && track.duration > 0
          ? track.duration * 1000
          : 0;

    return totalDurationMs / 1000 >= minDurationSec;
  }

  /**
   * Persists resume state safely using ResumeRepository.
   */
  saveResumeState(track: AudioTrack, positionMs: number, durationMs: number): void {
    try {
      const filePath = track.originalFile?.file_path ?? track.url.replace(/^file:\/\//, '');
      const fileName = track.originalFile?.file_name ?? track.title ?? 'Audio Track';
      const totalDuration =
        durationMs > 0 ? durationMs : track.duration ? track.duration * 1000 : 0;

      ResumeRepository.saveState({
        filePath,
        fileName,
        category: 'audio',
        lastOpenedAt: Date.now(),
        positionMs: Math.round(positionMs),
        durationMs: Math.round(totalDuration),
      });

      this.lastSavedPositionMs = positionMs;
      this.lastSavedTimestamp = Date.now();
    } catch {
      // safe no-op on persistence error
    }
  }

  /**
   * Called on high-frequency progress updates. Throttles writes to ~2 seconds
   * and ignores position updates that have not meaningfully changed (< 1s).
   */
  handleProgressForResume(positionMs: number, durationMs: number): void {
    const activeTrack = useAudioPlayerStore.getState().activeTrack;
    if (!activeTrack || !this.shouldPersistResume(activeTrack, durationMs)) {
      return;
    }

    const now = Date.now();
    const timeElapsed = now - this.lastSavedTimestamp;
    const distanceMoved = Math.abs(positionMs - this.lastSavedPositionMs);

    if (timeElapsed >= this.RESUME_THROTTLE_MS && distanceMoved >= 1000) {
      this.saveResumeState(activeTrack, positionMs, durationMs);
    }
  }

  /**
   * Flushes current progress to ResumeRepository immediately (on pause, stop, track change).
   */
  flushResumeState(): void {
    const store = useAudioPlayerStore.getState();
    const activeTrack = store.activeTrack;
    if (!activeTrack || !this.shouldPersistResume(activeTrack, store.durationMs)) {
      return;
    }

    if (store.positionMs > 0) {
      this.saveResumeState(activeTrack, store.positionMs, store.durationMs);
    }
  }

  getWasPlayingBeforeInterruption(): boolean {
    return this.wasPlayingBeforeInterruption;
  }

  clearInterruptionState(): void {
    this.wasPlayingBeforeInterruption = false;
    useAudioPlayerStore.getState().setIsInterrupted(false);
  }

  /**
   * Handles audio focus interruptions and headset disconnects.
   * - Permanent loss: stops playback, flushes resume state, and clears interruption state.
   * - Transient pause (phone call, notification, headset unplug): pauses only if playing, sets wasPlayingBeforeInterruption.
   * - Focus regained: resumes ONLY if playback was interrupted while playing. Never auto-resumes if the user had already paused.
   */
  async handleInterruption(event: { paused: boolean; permanent: boolean }): Promise<void> {
    if (event.permanent) {
      this.clearInterruptionState();
      await this.stop();
      return;
    }

    if (event.paused) {
      const isCurrentlyPlaying = useAudioPlayerStore.getState().playbackState === 'playing';
      if (isCurrentlyPlaying) {
        this.wasPlayingBeforeInterruption = true;
        useAudioPlayerStore.getState().setIsInterrupted(true);
        await this.pause();
      }
      return;
    }

    // Interruption ended / focus regained (paused === false)
    if (this.wasPlayingBeforeInterruption) {
      this.wasPlayingBeforeInterruption = false;
      useAudioPlayerStore.getState().setIsInterrupted(false);
      await this.play();
    }
  }

  /**
   * Loads a queue of media files and starts playback at startIndex.
   */
  async loadQueue(files: MediaFileRow[], startIndex = 0, autoPlay = true): Promise<void> {
    await this.initialize();

    if (!files || files.length === 0) {
      await this.reset();
      return;
    }

    this.clearInterruptionState();
    const { queue, currentIndex } = buildAudioQueue(files, startIndex);
    const store = useAudioPlayerStore.getState();
    store.setQueue(queue, currentIndex);

    try {
      await TrackPlayer.reset();
      await TrackPlayer.add(queue);

      if (currentIndex >= 0 && currentIndex < queue.length) {
        await TrackPlayer.skip(currentIndex);
      }

      const nativeRepeat = mapRepeatModeToNative(store.repeatMode);
      await TrackPlayer.setRepeatMode(nativeRepeat);

      if (autoPlay) {
        await this.play();
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to load audio queue';
      store.setError(errorMsg);
    }
  }

  async play(): Promise<void> {
    if (vlcAudioFallbackService.getActiveTrack()) {
      await vlcAudioFallbackService.resume();
      return;
    }
    await this.initialize();
    try {
      await TrackPlayer.play();
      useAudioPlayerStore.getState().setPlaybackState('playing');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to play track';
      const activeTrack = useAudioPlayerStore.getState().activeTrack;
      if (activeTrack && vlcAudioFallbackService.canHandle(activeTrack, errorMsg)) {
        try {
          await TrackPlayer.stop();
        } catch {
          // no-op
        }
        await vlcAudioFallbackService.play(activeTrack);
        return;
      }
      useAudioPlayerStore.getState().setError(errorMsg);
    }
  }

  async pause(): Promise<void> {
    this.flushResumeState();
    if (vlcAudioFallbackService.getActiveTrack()) {
      await vlcAudioFallbackService.pause();
      return;
    }
    await this.initialize();
    try {
      await TrackPlayer.pause();
      useAudioPlayerStore.getState().setPlaybackState('paused');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to pause track';
      useAudioPlayerStore.getState().setError(errorMsg);
    }
  }

  async togglePlayPause(): Promise<void> {
    const currentState = useAudioPlayerStore.getState().playbackState;
    if (currentState === 'playing') {
      await this.pause();
    } else {
      await this.play();
    }
  }

  async skipToIndex(index: number): Promise<void> {
    await this.initialize();
    const store = useAudioPlayerStore.getState();
    if (index < 0 || index >= store.queue.length) {
      return;
    }

    await vlcAudioFallbackService.reset();

    try {
      await TrackPlayer.skip(index);
      store.setActiveTrack(store.queue[index], index);
      await this.play();
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to skip to index';
      store.setError(errorMsg);
    }
  }

  async skipToNext(): Promise<void> {
    await this.initialize();
    const { currentIndex, queue, repeatMode } = useAudioPlayerStore.getState();
    const nextIndex = getNextTrackIndex(currentIndex, queue.length, repeatMode);

    if (nextIndex === null) {
      await this.stop();
      return;
    }

    await this.skipToIndex(nextIndex);
  }

  async skipToPrevious(): Promise<void> {
    await this.initialize();
    const { currentIndex, queue, repeatMode, positionMs } = useAudioPlayerStore.getState();

    // If more than 3 seconds in, restart the current track like standard music players
    if (positionMs > 3000) {
      await this.seekTo(0);
      return;
    }

    if (currentIndex <= 0 && repeatMode === 'OFF') {
      await this.seekTo(0);
      return;
    }

    const prevIndex = getPreviousTrackIndex(currentIndex, queue.length, repeatMode);
    if (prevIndex === null) {
      await this.seekTo(0);
      return;
    }

    await this.skipToIndex(prevIndex);
  }

  async seekTo(positionMs: number): Promise<void> {
    const clampedMs = Math.max(0, positionMs);
    if (vlcAudioFallbackService.getActiveTrack()) {
      await vlcAudioFallbackService.seekTo(clampedMs);
      return;
    }
    await this.initialize();
    try {
      await TrackPlayer.seekTo(clampedMs / 1000);
      useAudioPlayerStore.getState().setProgress(clampedMs);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to seek position';
      useAudioPlayerStore.getState().setError(errorMsg);
    }
  }

  async setRepeatMode(mode: AudioRepeatMode): Promise<void> {
    await this.initialize();
    try {
      const nativeRepeat = mapRepeatModeToNative(mode);
      await TrackPlayer.setRepeatMode(nativeRepeat);
      useAudioPlayerStore.getState().setRepeatMode(mode);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to set repeat mode';
      useAudioPlayerStore.getState().setError(errorMsg);
    }
  }

  async toggleShuffle(): Promise<void> {
    await this.initialize();
    const store = useAudioPlayerStore.getState();
    const willShuffle = !store.isShuffled;

    if (willShuffle) {
      const shuffled = shuffleQueue(store.queue, store.activeTrack?.id);
      store.setShuffled(true, shuffled);
    } else {
      store.setShuffled(false, store.unshuffledQueue);
    }
  }

  async setPlaybackRate(rate: number): Promise<void> {
    await this.initialize();
    try {
      await TrackPlayer.setRate(rate);
      useAudioPlayerStore.getState().setPlaybackRate(rate);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to set rate';
      useAudioPlayerStore.getState().setError(errorMsg);
    }
  }

  async setVolume(volume: number): Promise<void> {
    await this.initialize();
    try {
      await TrackPlayer.setVolume(volume);
      useAudioPlayerStore.getState().setVolume(volume);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to set volume';
      useAudioPlayerStore.getState().setError(errorMsg);
    }
  }

  async stop(): Promise<void> {
    this.flushResumeState();
    if (vlcAudioFallbackService.getActiveTrack()) {
      await vlcAudioFallbackService.stop();
    }
    await this.initialize();
    try {
      await TrackPlayer.stop();
      useAudioPlayerStore.getState().setPlaybackState('stopped');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to stop track';
      useAudioPlayerStore.getState().setError(errorMsg);
    }
  }

  async reset(): Promise<void> {
    this.clearInterruptionState();
    await vlcAudioFallbackService.reset();
    try {
      if (this.isInitialized) {
        await TrackPlayer.reset();
      }
    } catch {
      // ignore reset errors
    } finally {
      useAudioPlayerStore.getState().resetPlayback();
    }
  }
}

export const audioPlaybackService = new AudioPlaybackService();
export { AudioPlaybackService };
export default audioPlaybackService;
