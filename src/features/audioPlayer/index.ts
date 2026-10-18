export { AudioPlaybackService, audioPlaybackService } from './services/AudioPlaybackService';
export { playbackService } from './services/playbackService';
export {
  VlcAudioFallbackService,
  vlcAudioFallbackService,
} from './services/VlcAudioFallbackService';
export {
  AudioEqualizerService,
  audioEqualizerService,
  DEFAULT_EQ_PRESETS,
  DEFAULT_EQ_BANDS,
  type EqualizerBand,
  type EqualizerConfig,
  type EqualizerState,
} from './services/AudioEqualizerService';
export type { AudioPlaybackState, AudioQueueState, AudioRepeatMode, AudioTrack } from './types';
export {
  buildAudioQueue,
  findTrackIndexById,
  getNextTrackIndex,
  getPreviousTrackIndex,
  mapMediaFileToTrack,
  shuffleQueue,
} from './utils/audioQueue';

export { PersistentMiniPlayer } from './components/PersistentMiniPlayer';
export { FullAudioPlayerSheet } from './components/FullAudioPlayerSheet';
export { AudioEqualizerSheet } from './components/AudioEqualizerSheet';
export { PlaybackSpeedModal, PLAYBACK_SPEEDS } from './components/PlaybackSpeedModal';
export { SleepTimerModal } from './components/SleepTimerModal';
export { AudioBookmarksModal } from './components/AudioBookmarksModal';
export { QueueBottomSheet } from './components/QueueBottomSheet';
