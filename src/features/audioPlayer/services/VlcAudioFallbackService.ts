import { NativeModules } from 'react-native';
import { useAudioPlayerStore } from '@core/store/useAudioPlayerStore';
import type { AudioPlaybackState, AudioTrack } from '../types';

export const VLC_FALLBACK_EXTENSIONS = new Set(['ape', 'wma', 'mpc']);

const CODEC_ERROR_PATTERNS = [
  /unsupported/i,
  /unrecognizedinputformat/i,
  /parserexception/i,
  /extractorexception/i,
  /decoder.*failed/i,
  /codec/i,
  /format.*not.*supported/i,
];

export interface VlcNativeDriver {
  play(url: string, positionMs?: number): Promise<void>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  seekTo(positionMs: number): Promise<void>;
  stop(): Promise<void>;
}

export class VlcAudioFallbackService {
  private activeTrack: AudioTrack | null = null;
  private state: AudioPlaybackState = 'idle';
  private nativeDriver: VlcNativeDriver | null = null;
  private fallbackAttemptedTrackIds = new Set<string>();

  constructor(customDriver?: VlcNativeDriver | null) {
    if (customDriver !== undefined) {
      this.nativeDriver = customDriver;
    } else {
      // Look for custom native headless VLC driver module if linked
      const vlcModule = NativeModules?.KinetixVlcPlayerModule ?? null;
      this.nativeDriver = vlcModule;
    }
  }

  /**
   * Sets or overrides the native driver (useful for tests or custom implementations).
   */
  setDriver(driver: VlcNativeDriver | null): void {
    this.nativeDriver = driver;
  }

  /**
   * Returns true if a native VLC driver is available for headless execution.
   */
  isAvailable(): boolean {
    return this.nativeDriver !== null;
  }

  /**
   * Returns true if file extension matches `.ape`, `.wma`, or `.mpc`.
   */
  isCandidateExtension(extension: string): boolean {
    return VLC_FALLBACK_EXTENSIONS.has(extension.toLowerCase().trim());
  }

  /**
   * Determines if a playback error indicates an unsupported codec / extractor failure.
   */
  isCodecError(errorMessage: string): boolean {
    if (!errorMessage) {
      return false;
    }
    return CODEC_ERROR_PATTERNS.some((pattern) => pattern.test(errorMessage));
  }

  /**
   * Checks whether fallback can and should be attempted for this track.
   * Prevents retry loops by tracking previously attempted track IDs.
   */
  canHandle(track: AudioTrack | null, errorMsg?: string): boolean {
    if (!track) {
      return false;
    }

    if (this.fallbackAttemptedTrackIds.has(track.id)) {
      return false;
    }

    const extension = track.originalFile?.extension ?? '';
    const isCandidate = this.isCandidateExtension(extension);

    if (errorMsg) {
      return isCandidate || this.isCodecError(errorMsg);
    }

    return isCandidate;
  }

  getActiveTrack(): AudioTrack | null {
    return this.activeTrack;
  }

  getState(): AudioPlaybackState {
    return this.state;
  }

  /**
   * Plays track through VLC fallback driver.
   * Surfaces a recoverable error if driver is unavailable or fails.
   */
  async play(track: AudioTrack, positionMs = 0): Promise<boolean> {
    this.fallbackAttemptedTrackIds.add(track.id);
    this.activeTrack = track;
    this.state = 'loading';
    useAudioPlayerStore.getState().setPlaybackState('loading');

    if (!this.nativeDriver) {
      const ext = (track.originalFile?.extension ?? 'media').toUpperCase();
      const errorMsg = `Native VLC audio driver is unavailable for .${ext} playback.`;
      this.state = 'error';
      useAudioPlayerStore.getState().setError(errorMsg);
      useAudioPlayerStore.getState().setPlaybackState('error');
      return false;
    }

    try {
      await this.nativeDriver.play(track.url, positionMs);
      this.state = 'playing';
      useAudioPlayerStore.getState().setPlaybackState('playing');
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'VLC playback failed';
      this.state = 'error';
      useAudioPlayerStore.getState().setError(msg);
      useAudioPlayerStore.getState().setPlaybackState('error');
      return false;
    }
  }

  async pause(): Promise<void> {
    if (!this.nativeDriver || this.state !== 'playing') {
      return;
    }
    try {
      await this.nativeDriver.pause();
      this.state = 'paused';
      useAudioPlayerStore.getState().setPlaybackState('paused');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to pause VLC playback';
      useAudioPlayerStore.getState().setError(msg);
    }
  }

  async resume(): Promise<void> {
    if (!this.nativeDriver || !this.activeTrack) {
      return;
    }
    try {
      await this.nativeDriver.resume();
      this.state = 'playing';
      useAudioPlayerStore.getState().setPlaybackState('playing');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to resume VLC playback';
      useAudioPlayerStore.getState().setError(msg);
    }
  }

  async seekTo(positionMs: number): Promise<void> {
    if (!this.nativeDriver) {
      return;
    }
    try {
      await this.nativeDriver.seekTo(Math.max(0, positionMs));
      useAudioPlayerStore.getState().setProgress(positionMs);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to seek VLC playback';
      useAudioPlayerStore.getState().setError(msg);
    }
  }

  async stop(): Promise<void> {
    if (this.nativeDriver) {
      try {
        await this.nativeDriver.stop();
      } catch {
        // no-op on stop failure
      }
    }
    this.state = 'stopped';
    useAudioPlayerStore.getState().setPlaybackState('stopped');
  }

  async reset(): Promise<void> {
    await this.stop();
    this.activeTrack = null;
    this.state = 'idle';
    this.fallbackAttemptedTrackIds.clear();
  }
}

export const vlcAudioFallbackService = new VlcAudioFallbackService();
export default vlcAudioFallbackService;
