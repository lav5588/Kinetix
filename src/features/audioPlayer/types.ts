import type { MediaFileRow } from '@core/storage/types';
import type { Track as RNTPTrack } from 'react-native-track-player';

export type AudioRepeatMode = 'OFF' | 'TRACK' | 'QUEUE';

export type AudioPlaybackState =
  'idle' | 'loading' | 'ready' | 'playing' | 'paused' | 'stopped' | 'buffering' | 'ended' | 'error';

/**
 * Domain representation of an audio track in Kinetix, compatible with react-native-track-player Track.
 */
export interface AudioTrack extends RNTPTrack {
  id: string;
  url: string;
  title: string;
  artist?: string;
  album?: string;
  duration?: number; // duration in seconds for TrackPlayer
  artwork?: string;
  contentType?: string;
  originalFile: MediaFileRow;
}

export interface AudioQueueState {
  queue: AudioTrack[];
  currentIndex: number;
  repeatMode: AudioRepeatMode;
  isShuffled: boolean;
  unshuffledQueue: AudioTrack[];
}
