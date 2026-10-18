import type { MediaCategory } from '@core/storage/types';
import { CATEGORY_ACCENT_COLORS } from '@core/theme';

export function formatItemCount(count: number, category: MediaCategory): string {
  const safeCount = Math.max(0, Math.trunc(count || 0));

  switch (category) {
    case 'AUDIO':
      return safeCount === 1 ? '1 Audio' : `${safeCount} Audios`;
    case 'VIDEO':
      return safeCount === 1 ? '1 Video' : `${safeCount} Videos`;
    case 'PHOTO':
      return safeCount === 1 ? '1 Photo' : `${safeCount} Photos`;
    case 'PDF':
      return safeCount === 1 ? '1 PDF' : `${safeCount} PDFs`;
    case 'OTHER_DOC':
      return safeCount === 1 ? '1 Document' : `${safeCount} Documents`;
    default:
      return safeCount === 1 ? '1 Item' : `${safeCount} Items`;
  }
}

export function formatFolderSize(bytes: number | null | undefined): string {
  if (bytes == null || !Number.isFinite(bytes) || bytes <= 0) {
    return '0 B';
  }

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);

  if (exponent === 0) {
    return `${Math.round(bytes)} B`;
  }

  const value = bytes / Math.pow(1024, exponent);
  const formatted =
    Number.isInteger(value) || value >= 100 ? Math.round(value).toString() : value.toFixed(1);

  return `${formatted} ${units[exponent]}`;
}

export function getCategoryFallbackIcon(category: MediaCategory): string {
  switch (category) {
    case 'AUDIO':
      return 'folder-music';
    case 'VIDEO':
      return 'video';
    case 'PHOTO':
      return 'folder-image';
    case 'PDF':
      return 'file-pdf-box';
    case 'OTHER_DOC':
      return 'file-document-multiple';
    default:
      return 'folder';
  }
}

export function getCategoryColor(category: MediaCategory): string {
  switch (category) {
    case 'AUDIO':
      return CATEGORY_ACCENT_COLORS.audio;
    case 'VIDEO':
      return CATEGORY_ACCENT_COLORS.video;
    case 'PHOTO':
      return CATEGORY_ACCENT_COLORS.photo;
    case 'PDF':
      return CATEGORY_ACCENT_COLORS.pdf;
    case 'OTHER_DOC':
      return CATEGORY_ACCENT_COLORS.doc;
    default:
      return '#8B5CF6';
  }
}

export function formatDuration(ms?: number | null): string {
  if (ms == null || !Number.isFinite(ms) || ms <= 0) {
    return '0:00';
  }
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const paddedSeconds = seconds < 10 ? `0${seconds}` : `${seconds}`;

  if (hours > 0) {
    const paddedMinutes = minutes < 10 ? `0${minutes}` : `${minutes}`;
    return `${hours}:${paddedMinutes}:${paddedSeconds}`;
  }
  return `${minutes}:${paddedSeconds}`;
}

export function getFileFallbackIcon(category: MediaCategory): string {
  switch (category) {
    case 'AUDIO':
      return 'music-note';
    case 'VIDEO':
      return 'play-box-outline';
    case 'PHOTO':
      return 'image';
    case 'PDF':
      return 'file-pdf-box';
    case 'OTHER_DOC':
      return 'file-document-outline';
    default:
      return 'file-outline';
  }
}

/**
 * Formats the search placeholder with a fixed max character length.
 * Appends '...' (ellipsis) if the folder name exceeds the fixed length threshold.
 */
export function formatSearchPlaceholder(folderName?: string, maxFolderLen = 14): string {
  const name = folderName?.trim() || '';
  if (!name || name.toLowerCase() === 'files') {
    return 'Search files...';
  }

  if (name.length > maxFolderLen) {
    return `Search in ${name.slice(0, maxFolderLen).trim()}...`;
  }

  return `Search in ${name}...`;
}
