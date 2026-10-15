import { DEFAULT_MIN_AUDIO_DURATION_MS } from './types';
import type { DiscoveredFileInput, ScanOptions } from './types';
import type { MediaCategory } from '@shared/types';

export const isHiddenPath = (path: string | null | undefined): boolean => {
  if (!path) {
    return false;
  }

  return path.split(/[\\/]+/).some((segment) => {
    const normalizedSegment = segment.toLowerCase();

    return (
      normalizedSegment === '.nomedia' ||
      (normalizedSegment.startsWith('.') && normalizedSegment !== '.' && normalizedSegment !== '..')
    );
  });
};

export const isLikelyMessengerPath = (path: string | null | undefined): boolean => {
  if (!path) {
    return false;
  }

  return path
    .split(/[\\/]+/)
    .some((segment) => /(^|[^a-z0-9])(?:whats\s?app|telegram)(?=$|[^a-z0-9])/i.test(segment));
};

export const shouldIncludeAudioFile = (
  category: MediaCategory,
  durationMs: number | null | undefined,
  options: ScanOptions = {},
): boolean => {
  if (category !== 'AUDIO' || options.excludeShortAudio === false || durationMs == null) {
    return true;
  }

  const thresholdMs = options.minAudioDurationMs ?? DEFAULT_MIN_AUDIO_DURATION_MS;

  if (!Number.isFinite(thresholdMs) || thresholdMs < 0) {
    throw new RangeError('minAudioDurationMs must be a finite, non-negative number');
  }

  return durationMs >= thresholdMs;
};

export const shouldIncludeDiscoveredFile = (
  file: Pick<DiscoveredFileInput, 'filePath' | 'durationMs'> & {
    category: MediaCategory;
  },
  options: ScanOptions = {},
): boolean => {
  if (options.excludeHiddenPaths !== false && isHiddenPath(file.filePath)) {
    return false;
  }

  return shouldIncludeAudioFile(file.category, file.durationMs, options);
};
