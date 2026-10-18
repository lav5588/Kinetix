import type { FileSortDirection, FileSortField } from '../types';

export interface SortableFile {
  id?: string;
  file_name?: string;
  fileName?: string;
  date_modified?: number | null;
  dateModified?: number | null;
  date_added?: number | null;
  dateAdded?: number | null;
  size_bytes?: number | null;
  sizeBytes?: number | null;
  duration_ms?: number | null;
  durationMs?: number | null;
  file_path?: string;
  filePath?: string;
}

export function getFileName(file: SortableFile): string {
  return file.fileName ?? file.file_name ?? '';
}

export function getFileDate(file: SortableFile): number {
  const val = file.dateModified ?? file.date_modified ?? file.dateAdded ?? file.date_added;
  return typeof val === 'number' && !Number.isNaN(val) ? val : 0;
}

export function getFileSize(file: SortableFile): number {
  const val = file.sizeBytes ?? file.size_bytes;
  return typeof val === 'number' && !Number.isNaN(val) ? Math.max(0, val) : 0;
}

export function getFileDuration(file: SortableFile): number {
  const val = file.durationMs ?? file.duration_ms;
  return typeof val === 'number' && !Number.isNaN(val) ? Math.max(0, val) : 0;
}

export function getFileIdentifier(file: SortableFile): string {
  return file.id ?? file.filePath ?? file.file_path ?? '';
}

/**
 * Pure comparator for two files based on the chosen sort field and direction.
 * Uses deterministic secondary and tertiary tie-breakers:
 * - When sorting by NAME, ties break on file identifier (ID or path).
 * - When sorting by DATE, SIZE, or DURATION, ties break on file name (A-Z), then identifier.
 */
export function compareFiles<T extends SortableFile>(
  a: T,
  b: T,
  field: FileSortField | 'name' | 'date' | 'size' | 'duration' = 'NAME',
  direction: FileSortDirection | 'asc' | 'desc' = 'ASC',
): number {
  const normalizedField = (
    typeof field === 'string' ? field.toUpperCase() : 'NAME'
  ) as FileSortField;
  const isDesc = typeof direction === 'string' && direction.toUpperCase() === 'DESC';

  let primaryDiff = 0;

  switch (normalizedField) {
    case 'NAME': {
      const nameA = getFileName(a);
      const nameB = getFileName(b);
      primaryDiff = nameA.localeCompare(nameB, undefined, {
        sensitivity: 'base',
        numeric: true,
      });
      break;
    }
    case 'DATE': {
      const dateA = getFileDate(a);
      const dateB = getFileDate(b);
      primaryDiff = dateA - dateB;
      break;
    }
    case 'SIZE': {
      const sizeA = getFileSize(a);
      const sizeB = getFileSize(b);
      primaryDiff = sizeA - sizeB;
      break;
    }
    case 'DURATION': {
      const durA = getFileDuration(a);
      const durB = getFileDuration(b);
      primaryDiff = durA - durB;
      break;
    }
    default: {
      const nameA = getFileName(a);
      const nameB = getFileName(b);
      primaryDiff = nameA.localeCompare(nameB, undefined, {
        sensitivity: 'base',
        numeric: true,
      });
      break;
    }
  }

  if (primaryDiff !== 0) {
    return isDesc ? -primaryDiff : primaryDiff;
  }

  // Deterministic secondary tie-breaker: File name (alphabetical A-Z) for non-NAME fields
  if (normalizedField !== 'NAME') {
    const nameDiff = getFileName(a).localeCompare(getFileName(b), undefined, {
      sensitivity: 'base',
      numeric: true,
    });
    if (nameDiff !== 0) {
      return nameDiff;
    }
  }

  // Deterministic tertiary tie-breaker: Unique file ID or path
  const idA = getFileIdentifier(a);
  const idB = getFileIdentifier(b);
  return idA.localeCompare(idB);
}

/**
 * Pure sort function for file collections.
 * - Always returns a new array, preserving input immutability.
 * - Handles missing or nullish attributes safely with fallback defaults.
 * - Guarantees deterministic, stable order across runs.
 */
export function sortFiles<T extends SortableFile>(
  files: readonly T[],
  field: FileSortField | 'name' | 'date' | 'size' | 'duration' = 'NAME',
  direction: FileSortDirection | 'asc' | 'desc' = 'ASC',
): T[] {
  if (!files || files.length <= 1) {
    return files ? [...files] : [];
  }

  return [...files].sort((a, b) => compareFiles(a, b, field, direction));
}
