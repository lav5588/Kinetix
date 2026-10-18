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
      return 'folder-play';
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
