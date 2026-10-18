import type { ResumeRecord } from '@core/storage/types';
import type { FileFilterOptions, FileQuickFilter } from '../types';

export const LARGE_FILE_THRESHOLD_BYTES = 100 * 1024 * 1024; // 100 MB = 104,857,600 bytes

export interface FilterableFile {
  id?: string;
  filePath?: string;
  file_path?: string;
  fileName?: string;
  file_name?: string;
  sizeBytes?: number | null;
  size_bytes?: number | null;
  durationMs?: number | null;
  duration_ms?: number | null;
  isFavorite?: boolean;
  is_favorite?: number | boolean;
  isCompleted?: boolean;
  resumePositionMs?: number | null;
  resumeDurationMs?: number | null;
  hasUnfinishedResume?: boolean;
  artist?: string | null;
  album?: string | null;
}

export function getFilterableFilePath(file: FilterableFile): string {
  return file.filePath ?? file.file_path ?? '';
}

export function getFilterableFileSize(file: FilterableFile): number {
  const val = file.sizeBytes ?? file.size_bytes;
  return typeof val === 'number' && !Number.isNaN(val) ? Math.max(0, val) : 0;
}

export function getFilterableFileId(file: FilterableFile): string {
  return file.id ?? getFilterableFilePath(file);
}

/**
 * Calculates resume progress percentage (0 - 100).
 * For example: 30,000 ms / 60,000 ms yields 50.
 * Safely handles zero, negative, nullish, or invalid durations without division errors.
 */
export function calculateResumeProgress(
  positionMs?: number | null,
  durationMs?: number | null,
): number {
  if (
    typeof positionMs !== 'number' ||
    typeof durationMs !== 'number' ||
    durationMs <= 0 ||
    positionMs <= 0 ||
    Number.isNaN(positionMs) ||
    Number.isNaN(durationMs)
  ) {
    return 0;
  }

  const ratio = positionMs / durationMs;
  const percent = Math.round(ratio * 100);
  return Math.min(100, Math.max(0, percent));
}

/**
 * Checks if a file is strictly greater than 100 MB (or a specified threshold).
 */
export function isFileLarge(
  file: FilterableFile,
  thresholdBytes: number = LARGE_FILE_THRESHOLD_BYTES,
): boolean {
  return getFilterableFileSize(file) > thresholdBytes;
}

/**
 * Checks if a file is marked as favorite, either in the file model (`is_favorite: 1` or `isFavorite: true`)
 * or through an optional `favoriteIds` set.
 */
export function isFileFavorite(
  file: FilterableFile,
  options?: Pick<FileFilterOptions, 'favoriteIds'>,
): boolean {
  if (options?.favoriteIds) {
    const id = getFilterableFileId(file);
    const path = getFilterableFilePath(file);
    if (id && options.favoriteIds.has(id)) {
      return true;
    }
    if (path && options.favoriteIds.has(path)) {
      return true;
    }
  }

  return file.is_favorite === 1 || file.is_favorite === true || file.isFavorite === true;
}

function resolveResumeRecord(
  file: FilterableFile,
  options?: Pick<FileFilterOptions, 'getResumeRecord' | 'resumeRecordsMap'>,
): ResumeRecord | null | undefined {
  const path = getFilterableFilePath(file);
  if (!path) {
    return undefined;
  }

  if (options?.getResumeRecord) {
    return options.getResumeRecord(path);
  }

  if (options?.resumeRecordsMap) {
    const map = options.resumeRecordsMap;
    if (map instanceof Map) {
      return map.get(path);
    }
    return map[path];
  }

  return undefined;
}

/**
 * Checks if a file has unfinished playback progress (started but not finished).
 */
export function isFileInProgress(
  file: FilterableFile,
  options?: Pick<FileFilterOptions, 'getResumeRecord' | 'resumeRecordsMap'>,
): boolean {
  const record = resolveResumeRecord(file, options);

  if (record) {
    if (record.isCompleted) {
      return false;
    }
    const pos = record.positionMs ?? 0;
    const dur = record.durationMs ?? 0;
    if (pos <= 0) {
      return false;
    }
    if (dur > 0) {
      const ratio = pos / dur;
      return ratio < 0.97;
    }
    return true;
  }

  // Fallback to properties embedded directly on the file object
  if (file.hasUnfinishedResume === true) {
    return true;
  }

  if (file.isCompleted) {
    return false;
  }

  const pos = file.resumePositionMs ?? 0;
  const dur = file.resumeDurationMs ?? file.durationMs ?? file.duration_ms ?? 0;
  if (pos <= 0) {
    return false;
  }
  if (dur > 0) {
    return pos / dur < 0.97;
  }
  return true;
}

/**
 * Checks if a file is unwatched (has not been started and is not completed).
 */
export function isFileUnwatched(
  file: FilterableFile,
  options?: Pick<FileFilterOptions, 'getResumeRecord' | 'resumeRecordsMap'>,
): boolean {
  const record = resolveResumeRecord(file, options);

  if (record) {
    if (record.isCompleted) {
      return false;
    }
    const pos = record.positionMs ?? 0;
    return pos === 0;
  }

  // Fallback to properties embedded directly on the file object
  if (file.isCompleted) {
    return false;
  }
  if (file.hasUnfinishedResume === true) {
    return false;
  }
  const pos = file.resumePositionMs ?? 0;
  return pos === 0;
}

/**
 * Pure search query matcher for in-memory file filtering.
 */
export function matchesSearchQuery(file: FilterableFile, query: string): boolean {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) {
    return true;
  }

  const name = (file.fileName ?? file.file_name ?? '').toLowerCase();
  const artist = (file.artist ?? '').toLowerCase();
  const album = (file.album ?? '').toLowerCase();

  return name.includes(trimmed) || artist.includes(trimmed) || album.includes(trimmed);
}

/**
 * Pure filter function for file collections based on quick-filter mode and optional search query.
 * Always returns a new array, preserving input immutability.
 */
export function filterFiles<T extends FilterableFile>(
  files: readonly T[],
  options: FileFilterOptions = {},
): T[] {
  if (!files || files.length === 0) {
    return [];
  }

  const quickFilter = (
    typeof options.quickFilter === 'string' ? options.quickFilter.toUpperCase() : 'ALL'
  ) as FileQuickFilter;

  return files.filter((file) => {
    // 1. Quick filter check
    switch (quickFilter) {
      case 'IN_PROGRESS':
        if (!isFileInProgress(file, options)) {
          return false;
        }
        break;
      case 'UNWATCHED':
        if (!isFileUnwatched(file, options)) {
          return false;
        }
        break;
      case 'FAVORITES':
        if (!isFileFavorite(file, options)) {
          return false;
        }
        break;
      case 'LARGE_FILES':
        if (!isFileLarge(file)) {
          return false;
        }
        break;
      case 'ALL':
      default:
        break;
    }

    // 2. Search query check (if provided)
    if (options.searchQuery && !matchesSearchQuery(file, options.searchQuery)) {
      return false;
    }

    return true;
  });
}
