import type { MediaFileRow } from '@core/storage/types';
import type { AudioRepeatMode, AudioTrack } from '../types';

/**
 * Maps a SQLite indexed MediaFileRow into an AudioTrack compatible with react-native-track-player.
 * Uses file.id as the primary unique identifier and local file:// URI.
 */
export function mapMediaFileToTrack(file: MediaFileRow): AudioTrack {
  const filePath = file.file_path ?? '';
  let normalizedUrl = filePath;
  if (
    !filePath.startsWith('content://') &&
    !filePath.startsWith('file://') &&
    !filePath.startsWith('http://') &&
    !filePath.startsWith('https://')
  ) {
    normalizedUrl = `file://${filePath}`;
  }

  let artwork: string | undefined = undefined;
  if (file.file_path && file.file_path.startsWith('content://media/external/audio/media/')) {
    const id = file.file_path.replace('content://media/external/audio/media/', '');
    artwork = `content://media/external/audio/media/${id}/albumart`;
  } else if (
    file.file_path &&
    (file.file_path.startsWith('http://') || file.file_path.startsWith('https://'))
  ) {
    artwork = file.file_path;
  }

  return {
    id: file.id,
    url: normalizedUrl,
    title: file.file_name,
    artist: file.artist ?? undefined,
    album: file.album ?? undefined,
    duration:
      typeof file.duration_ms === 'number' && file.duration_ms > 0
        ? file.duration_ms / 1000
        : undefined,
    artwork,
    contentType: file.mime_type || undefined,
    originalFile: file,
  };
}

/**
 * Builds an AudioTrack array from an array of MediaFileRow entities.
 */
export function buildAudioQueue(
  files: MediaFileRow[],
  startIndex = 0,
): { queue: AudioTrack[]; currentIndex: number } {
  if (!files || files.length === 0) {
    return { queue: [], currentIndex: -1 };
  }

  const queue = files.map(mapMediaFileToTrack);
  const clampedIndex = Math.max(0, Math.min(startIndex, queue.length - 1));

  return { queue, currentIndex: clampedIndex };
}

/**
 * Determines the next track index given the current index, queue length, and repeat mode.
 * Returns null if the end of the queue is reached and repeat mode is OFF.
 */
export function getNextTrackIndex(
  currentIndex: number,
  queueLength: number,
  repeatMode: AudioRepeatMode,
): number | null {
  if (queueLength <= 0) {
    return null;
  }

  if (repeatMode === 'TRACK') {
    return currentIndex >= 0 && currentIndex < queueLength ? currentIndex : 0;
  }

  if (repeatMode === 'QUEUE') {
    if (currentIndex + 1 >= queueLength || currentIndex < 0) {
      return 0;
    }
    return currentIndex + 1;
  }

  // repeatMode === 'OFF'
  if (currentIndex + 1 >= queueLength || currentIndex < 0) {
    return null;
  }

  return currentIndex + 1;
}

/**
 * Determines the previous track index given the current index, queue length, and repeat mode.
 */
export function getPreviousTrackIndex(
  currentIndex: number,
  queueLength: number,
  repeatMode: AudioRepeatMode,
): number | null {
  if (queueLength <= 0) {
    return null;
  }

  if (repeatMode === 'TRACK') {
    return currentIndex >= 0 && currentIndex < queueLength ? currentIndex : 0;
  }

  if (repeatMode === 'QUEUE') {
    if (currentIndex <= 0 || currentIndex >= queueLength) {
      return queueLength - 1;
    }
    return currentIndex - 1;
  }

  // repeatMode === 'OFF'
  if (currentIndex <= 0) {
    return 0;
  }

  if (currentIndex >= queueLength) {
    return queueLength - 1;
  }

  return currentIndex - 1;
}

/**
 * Pure Fisher-Yates shuffle implementation that returns a new array without mutating input.
 */
function fisherYatesShuffle<T>(array: readonly T[], randomFn = Math.random): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(randomFn() * (i + 1));
    const temp = result[i];
    result[i] = result[j];
    result[j] = temp;
  }
  return result;
}

/**
 * Shuffles an AudioTrack queue.
 * - Does not mutate the original queue array.
 * - If currentTrackId is specified and exists, retains the current track at index 0
 *   so active playback is not interrupted, and randomizes all other items.
 */
export function shuffleQueue(
  queue: readonly AudioTrack[],
  currentTrackId?: string,
  randomFn = Math.random,
): AudioTrack[] {
  if (queue.length <= 1) {
    return [...queue];
  }

  if (currentTrackId) {
    const currentTrack = queue.find((t) => t.id === currentTrackId);
    if (currentTrack) {
      const remainingTracks = queue.filter((t) => t.id !== currentTrackId);
      const shuffledRemaining = fisherYatesShuffle(remainingTracks, randomFn);
      return [currentTrack, ...shuffledRemaining];
    }
  }

  return fisherYatesShuffle(queue, randomFn);
}

/**
 * Finds track index by stable file ID.
 */
export function findTrackIndexById(queue: readonly AudioTrack[], trackId?: string): number {
  if (!trackId || queue.length === 0) {
    return -1;
  }
  return queue.findIndex((item) => item.id === trackId);
}
