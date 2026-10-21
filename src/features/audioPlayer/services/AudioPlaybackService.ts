import TrackPlayer, {
  AppKilledPlaybackBehavior,
  Capability,
  Event,
  RepeatMode as RNTPRepeatMode,
  State as RNTPState,
  type EventPayloadByEvent,
} from 'react-native-track-player';
import type { MediaFileRow } from '@core/storage/types';
import { useAudioPlayerStore } from '@core/store/useAudioPlayerStore';
import { useAudioControlsStore } from '@core/store/useAudioControlsStore';
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
import { cleanUpPlaybackServiceSubscriptions, playbackService } from './playbackService';

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
  readonly SEEK_SETTLE_WINDOW_MS = 600;
  private wasPlayingBeforeInterruption = false;
  private lastSeekTimestamp = 0;
  private pendingSeekPositionMs = -1;
  private isSyncingQueue = false;

  /**
   * Checks whether a reported playback position is stale following an active seek.
   * Prevents progress bar flickering/jumping during native Exoplayer seek settling.
   */
  private shouldIgnoreProgressUpdate(reportedPositionMs: number): boolean {
    if (this.pendingSeekPositionMs < 0) return false;
    const timeSinceSeek = Date.now() - this.lastSeekTimestamp;
    if (timeSinceSeek < 0 || timeSinceSeek > this.SEEK_SETTLE_WINDOW_MS) {
      this.pendingSeekPositionMs = -1;
      return false;
    }
    // If native progress has aligned with target seek position (within 1.5s), settle complete
    if (Math.abs(reportedPositionMs - this.pendingSeekPositionMs) < 1500) {
      this.pendingSeekPositionMs = -1;
      return false;
    }
    return true;
  }

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
        android: {
          appKilledPlaybackBehavior: AppKilledPlaybackBehavior.StopPlaybackAndRemoveNotification,
        },
        capabilities: [
          Capability.Play,
          Capability.Pause,
          Capability.SkipToNext,
          Capability.SkipToPrevious,
          Capability.SeekTo,
          Capability.Stop,
        ],
        notificationCapabilities: [
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

      try {
        await TrackPlayer.setVolume(1.0);
      } catch {
        // safe no-op if volume not yet available
      }

      this.setupEventListeners();
      await playbackService();
      this.isInitialized = true;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to initialize TrackPlayer';
      useAudioPlayerStore.getState().setError(errorMsg);
    } finally {
      this.isInitializing = false;
    }
  }

  private cleanUpInternalSubscriptions(): void {
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
   * Registers player native event subscriptions translating them to Zustand store.
   */
  private setupEventListeners(): void {
    this.cleanUpInternalSubscriptions();

    const stateSub = TrackPlayer.addEventListener(
      Event.PlaybackState,
      (event: EventPayloadByEvent[Event.PlaybackState]) => {
        if (this.isSyncingQueue) return;
        const mappedState = mapNativePlaybackState(event.state);
        useAudioPlayerStore.getState().setPlaybackState(mappedState);
      },
    );

    const trackSub = TrackPlayer.addEventListener(
      Event.PlaybackActiveTrackChanged,
      async (event: EventPayloadByEvent[Event.PlaybackActiveTrackChanged]) => {
        if (this.isSyncingQueue) return;
        const store = useAudioPlayerStore.getState();
        if (store.activeTrack) {
          this.flushResumeState();
        }
        this.lastSavedPositionMs = -1;
        this.lastSavedTimestamp = 0;

        let resolvedTrack: AudioTrack | null = null;
        let resolvedIndex: number = typeof event.index === 'number' ? event.index : -1;

        if (event.track) {
          const match = store.queue.find((t) => t.id === event.track?.id);
          if (match) {
            resolvedTrack = match;
            resolvedIndex = store.queue.findIndex((t) => t.id === match.id);
          } else {
            resolvedTrack = event.track as AudioTrack;
          }
        }

        if (!resolvedTrack) {
          try {
            const activeNativeTrack = await TrackPlayer.getActiveTrack();
            if (activeNativeTrack) {
              const match = store.queue.find((t) => t.id === activeNativeTrack.id);
              if (match) {
                resolvedTrack = match;
                resolvedIndex = store.queue.findIndex((t) => t.id === match.id);
              } else {
                resolvedTrack = activeNativeTrack as AudioTrack;
              }
            }
          } catch {
            // safe no-op
          }
        }

        if (!resolvedTrack && resolvedIndex >= 0 && resolvedIndex < store.queue.length) {
          resolvedTrack = store.queue[resolvedIndex];
        }

        if (resolvedTrack) {
          const finalIndex =
            resolvedIndex >= 0
              ? resolvedIndex
              : store.queue.findIndex((t) => t.id === resolvedTrack?.id);
          store.setActiveTrack(resolvedTrack, Math.max(0, finalIndex));
        }
      },
    );

    const progressSub = TrackPlayer.addEventListener(
      Event.PlaybackProgressUpdated,
      (event: EventPayloadByEvent[Event.PlaybackProgressUpdated]) => {
        const positionMs = event.position * 1000;
        const durationMs = event.duration * 1000;
        const bufferedMs = event.buffered * 1000;
        if (this.shouldIgnoreProgressUpdate(positionMs)) {
          return;
        }
        useAudioPlayerStore.getState().setProgress(positionMs, durationMs, bufferedMs);
        this.handleProgressForResume(positionMs, durationMs);
        this.handleAbLoop(positionMs);
      },
    );

    const queueEndedSub = TrackPlayer.addEventListener(Event.PlaybackQueueEnded, async () => {
      this.flushResumeState();
      const controlsStore = useAudioControlsStore.getState();
      if (controlsStore.sleepTimerMode === 'END_OF_TRACK') {
        controlsStore.clearSleepTimer();
        await this.pause();
        return;
      }
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
    this.pendingSeekPositionMs = -1;
    this.lastSeekTimestamp = 0;
    this.cleanUpInternalSubscriptions();
    cleanUpPlaybackServiceSubscriptions();
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
      try {
        await TrackPlayer.setVolume(1.0);
      } catch {
        // safe no-op
      }
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
    this.pendingSeekPositionMs = -1;
    this.lastSeekTimestamp = 0;
    const { queue, currentIndex } = buildAudioQueue(files, startIndex);
    const store = useAudioPlayerStore.getState();
    store.setQueue(queue, currentIndex);

    try {
      await TrackPlayer.reset();
      await TrackPlayer.add(queue);

      if (currentIndex > 0 && currentIndex < queue.length) {
        await TrackPlayer.skip(currentIndex);
      }

      const nativeRepeat = mapRepeatModeToNative(store.repeatMode);
      await TrackPlayer.setRepeatMode(nativeRepeat);
      try {
        await TrackPlayer.setVolume(1.0);
      } catch {
        // safe no-op
      }

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
      try {
        await TrackPlayer.setVolume(1.0);
      } catch {
        // safe no-op
      }
      await TrackPlayer.play();
      this.startSleepTimerMonitoring();
      this.startProgressMonitoring();
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
    this.stopSleepTimerMonitoring();
    this.stopProgressMonitoring();
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
    this.pendingSeekPositionMs = -1;
    this.lastSeekTimestamp = 0;

    try {
      const targetTrack = store.queue[index];
      store.setActiveTrack(targetTrack, index);

      let nativeIndex = index;
      try {
        const nativeQueue = await TrackPlayer.getQueue();
        if (Array.isArray(nativeQueue) && targetTrack) {
          const matchIdx = nativeQueue.findIndex((t) => t.id === targetTrack.id);
          if (matchIdx >= 0) {
            nativeIndex = matchIdx;
          }
        }
      } catch {
        // use default index
      }

      await TrackPlayer.skip(nativeIndex);
      await this.play();
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to skip to index';
      store.setError(errorMsg);
    }
  }

  async skipToNext(): Promise<void> {
    await this.initialize();
    const { currentIndex, queue, activeTrack, repeatMode } = useAudioPlayerStore.getState();
    if (queue.length === 0) return;

    let effectiveIndex = currentIndex;
    if (effectiveIndex < 0 && activeTrack) {
      effectiveIndex = queue.findIndex((t) => t.id === activeTrack.id);
    }
    if (effectiveIndex < 0) effectiveIndex = 0;

    const nextIndex = getNextTrackIndex(effectiveIndex, queue.length, repeatMode);

    if (nextIndex === null) {
      await this.stop();
      return;
    }

    await this.skipToIndex(nextIndex);
  }

  async skipToPrevious(forceTrack = false): Promise<void> {
    await this.initialize();
    const { currentIndex, queue, activeTrack, repeatMode, positionMs } =
      useAudioPlayerStore.getState();
    if (queue.length === 0) return;

    // If more than 3 seconds in and not forced, restart track like standard music players
    if (!forceTrack && positionMs > 3000) {
      await this.seekTo(0);
      return;
    }

    let effectiveIndex = currentIndex;
    if (effectiveIndex < 0 && activeTrack) {
      effectiveIndex = queue.findIndex((t) => t.id === activeTrack.id);
    }
    if (effectiveIndex < 0) effectiveIndex = 0;

    if (effectiveIndex <= 0 && repeatMode === 'OFF') {
      await this.seekTo(0);
      return;
    }

    const prevIndex = getPreviousTrackIndex(effectiveIndex, queue.length, repeatMode);
    if (prevIndex === null) {
      await this.seekTo(0);
      return;
    }

    await this.skipToIndex(prevIndex);
  }

  async seekTo(positionMs: number): Promise<void> {
    const clampedMs = Math.max(0, positionMs);
    this.lastSeekTimestamp = Date.now();
    this.pendingSeekPositionMs = clampedMs;
    useAudioPlayerStore.getState().setProgress(clampedMs);

    if (vlcAudioFallbackService.getActiveTrack()) {
      await vlcAudioFallbackService.seekTo(clampedMs);
      return;
    }
    await this.initialize();
    try {
      await TrackPlayer.seekTo(clampedMs / 1000);
      if (useAudioPlayerStore.getState().playbackState === 'playing') {
        await TrackPlayer.play();
      }
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
      const currentQueue = store.queue;
      const activeId = store.activeTrack?.id;
      const shuffled = shuffleQueue(currentQueue, activeId);
      store.setShuffled(true, shuffled);
    } else {
      const originalQueue =
        store.unshuffledQueue && store.unshuffledQueue.length > 0
          ? store.unshuffledQueue
          : store.queue;
      store.setShuffled(false, originalQueue);
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
    this.stopSleepTimerMonitoring();
    this.stopProgressMonitoring();
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
    this.stopSleepTimerMonitoring();
    this.stopProgressMonitoring();
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

  private isAbLoopSeeking = false;

  handleAbLoop(positionMs: number): void {
    const { isAbLoopActive, pointAMs, pointBMs } = useAudioControlsStore.getState();
    if (
      isAbLoopActive &&
      pointAMs !== null &&
      pointBMs !== null &&
      positionMs >= pointBMs &&
      !this.isAbLoopSeeking
    ) {
      this.isAbLoopSeeking = true;
      this.seekTo(pointAMs).finally(() => {
        setTimeout(() => {
          this.isAbLoopSeeking = false;
        }, 300);
      });
    }
  }

  private progressIntervalId: ReturnType<typeof setInterval> | null = null;

  startProgressMonitoring(): void {
    if (this.progressIntervalId) return;
    this.progressIntervalId = setInterval(async () => {
      try {
        if (!this.isInitialized) return;
        const progress = await TrackPlayer.getProgress();
        if (progress && typeof progress.position === 'number') {
          const positionMs = progress.position * 1000;
          const durationMs = (progress.duration || 0) * 1000;
          const bufferedMs = (progress.buffered || 0) * 1000;
          if (!this.shouldIgnoreProgressUpdate(positionMs)) {
            useAudioPlayerStore.getState().setProgress(positionMs, durationMs, bufferedMs);
            this.handleProgressForResume(positionMs, durationMs);
            this.handleAbLoop(positionMs);
          }
        }

        // Active Track & Index synchronization check (ensures UI sync when songs transition naturally)
        try {
          const activeNativeTrack = await TrackPlayer.getActiveTrack();
          if (activeNativeTrack?.id) {
            const store = useAudioPlayerStore.getState();
            const queueIdx = store.queue.findIndex((t) => t.id === activeNativeTrack.id);
            if (queueIdx >= 0) {
              if (
                store.activeTrack?.id !== activeNativeTrack.id ||
                store.currentIndex !== queueIdx
              ) {
                store.setActiveTrack(store.queue[queueIdx], queueIdx);
              }
            }
          }
        } catch {
          // safe no-op
        }
      } catch {
        // safe no-op if track player busy
      }
    }, 250);
  }

  stopProgressMonitoring(): void {
    if (this.progressIntervalId) {
      clearInterval(this.progressIntervalId);
      this.progressIntervalId = null;
    }
  }

  private sleepTimerIntervalId: ReturnType<typeof setInterval> | null = null;

  startSleepTimerMonitoring(): void {
    if (this.sleepTimerIntervalId) return;
    this.sleepTimerIntervalId = setInterval(async () => {
      const expired = useAudioControlsStore.getState().tickSleepTimer();
      if (expired) {
        await this.pause();
      }
    }, 1000);
  }

  stopSleepTimerMonitoring(): void {
    if (this.sleepTimerIntervalId) {
      clearInterval(this.sleepTimerIntervalId);
      this.sleepTimerIntervalId = null;
    }
  }

  /**
   * Synchronizes native TrackPlayer queue with reordered or shuffled tracks
   * while keeping the current playing track and position intact.
   */
  async syncNativeQueue(newQueue: AudioTrack[], newIndex?: number): Promise<void> {
    const store = useAudioPlayerStore.getState();
    const isPlaying = store.playbackState === 'playing';
    // If playing, avoid TrackPlayer.reset() to prevent audio stutter and flickering
    if (isPlaying) {
      return;
    }
    const activeTrack = store.activeTrack;
    const targetIndex =
      typeof newIndex === 'number'
        ? newIndex
        : activeTrack
          ? newQueue.findIndex((t) => t.id === activeTrack.id)
          : 0;

    this.isSyncingQueue = true;
    try {
      await TrackPlayer.reset();
      await TrackPlayer.add(newQueue);
      if (targetIndex >= 0 && targetIndex < newQueue.length) {
        await TrackPlayer.skip(targetIndex);
      }
    } catch (e) {
      console.warn('[AudioPlaybackService] Failed to sync native queue:', e);
    } finally {
      this.isSyncingQueue = false;
    }
  }

  async reorderQueue(newQueue: AudioTrack[]): Promise<void> {
    const store = useAudioPlayerStore.getState();
    const activeTrack = store.activeTrack;
    const newIndex = activeTrack ? newQueue.findIndex((t) => t.id === activeTrack.id) : 0;
    store.reorderQueue(newQueue, newIndex);
  }

  async removeFromQueue(index: number): Promise<void> {
    const store = useAudioPlayerStore.getState();
    if (index < 0 || index >= store.queue.length) return;
    const updatedQueue = [...store.queue];
    updatedQueue.splice(index, 1);
    if (updatedQueue.length === 0) {
      await this.reset();
      return;
    }
    await this.reorderQueue(updatedQueue);
  }
}

export const audioPlaybackService = new AudioPlaybackService();
export { AudioPlaybackService };
export default audioPlaybackService;
