import type { MediaFileRow } from '@core/storage/types';
import { classifyFile, normalizeExtension } from './extensionClassifier';
import { isHiddenPath, isLikelyMessengerPath } from './pathFilters';
import type { DiscoveredFileInput } from './types';

const normalizeNullableNumber = (value: number | null | undefined): number | null =>
  value != null && Number.isFinite(value) && value >= 0 ? Math.trunc(value) : null;

const normalizeTimestamp = (value: number | null | undefined): number =>
  normalizeNullableNumber(value) ?? 0;

const normalizeNullableText = (value: string | null | undefined): string | null => {
  const normalized = value?.trim();

  return normalized ? normalized : null;
};

const lastPathSegment = (path: string): string => {
  const segments = path.split(/[\\/]+/).filter(Boolean);

  return segments[segments.length - 1] ?? '';
};

const parentPath = (path: string): string => {
  const normalizedPath = path.replace(/[\\/]+$/, '');
  const separatorIndex = Math.max(
    normalizedPath.lastIndexOf('/'),
    normalizedPath.lastIndexOf('\\'),
  );

  if (separatorIndex < 0) {
    return '';
  }

  if (separatorIndex === 0) {
    return normalizedPath[0];
  }

  return normalizedPath.slice(0, separatorIndex);
};

export const normalizeDiscoveredFile = (input: DiscoveredFileInput): MediaFileRow | null => {
  const filePath = input.filePath.trim();

  if (!filePath) {
    throw new RangeError('filePath must not be empty');
  }

  const fileName = normalizeNullableText(input.fileName) ?? lastPathSegment(filePath);

  if (!fileName) {
    throw new RangeError('fileName must be available in the input or filePath');
  }

  const mimeType =
    normalizeNullableText(input.mimeType)?.split(';', 1)[0].trim().toLowerCase() ??
    'application/octet-stream';
  const category = classifyFile(fileName, mimeType);

  if (!category) {
    return null;
  }

  const folderPath = parentPath(filePath);
  const folderName = lastPathSegment(folderPath);

  return {
    id: normalizeNullableText(input.id) ?? filePath,
    file_path: filePath,
    file_name: fileName,
    extension: normalizeExtension(fileName) ?? '',
    mime_type: mimeType,
    category,
    folder_path: folderPath,
    folder_name: folderName,
    size_bytes: normalizeNullableNumber(input.sizeBytes) ?? 0,
    duration_ms: normalizeNullableNumber(input.durationMs),
    width: normalizeNullableNumber(input.width),
    height: normalizeNullableNumber(input.height),
    artist: normalizeNullableText(input.artist),
    album: normalizeNullableText(input.album),
    date_modified: normalizeTimestamp(input.dateModifiedMs),
    date_added: normalizeTimestamp(input.dateAddedMs),
    is_hidden: Number(isHiddenPath(filePath)),
    is_messenger_media: Number(isLikelyMessengerPath(folderPath)),
    is_favorite: 0,
    is_vaulted: 0,
  };
};
