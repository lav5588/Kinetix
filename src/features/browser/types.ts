import type { MediaCategory } from '@core/storage/types';

export type FolderExplorerViewMode = 'list' | 'grid';

export type FolderSortField = 'name' | 'date' | 'size' | 'count';
export type FolderSortOrder = 'ASC' | 'DESC';

export interface FolderItemViewModel {
  id: string;
  folderPath: string;
  folderName: string;
  category: MediaCategory;
  itemCount: number;
  totalSizeBytes: number;
  thumbnailUri: string | null;
  lastModified: number;
  isExcluded: boolean;
  isMessengerFolder: boolean;
  hasUnfinishedResume: boolean;
}

export interface FolderFilterOptions {
  hideMessenger?: boolean;
  excludeHidden?: boolean;
  sortBy?: FolderSortField;
  sortOrder?: FolderSortOrder;
}

export type BrowserViewMode = 'list' | 'grid';

export type FileSortField = 'NAME' | 'DATE' | 'SIZE' | 'DURATION';
export type FileSortDirection = 'ASC' | 'DESC';

export type FileQuickFilter = 'ALL' | 'IN_PROGRESS' | 'UNWATCHED' | 'FAVORITES' | 'LARGE_FILES';

export interface FileItemViewModel {
  id: string;
  filePath: string;
  fileName: string;
  extension: string;
  mimeType: string;
  category: MediaCategory;
  folderPath: string;
  folderName: string;
  sizeBytes: number;
  durationMs: number | null;
  width: number | null;
  height: number | null;
  artist: string | null;
  album: string | null;
  dateModified: number;
  dateAdded: number;
  isHidden: boolean;
  isMessengerMedia: boolean;
  isFavorite: boolean;
  isVaulted: boolean;
  resumePositionMs?: number;
  resumeDurationMs?: number;
  resumeProgressPercent?: number;
  isCompleted?: boolean;
}

export interface FileFilterOptions {
  quickFilter?: FileQuickFilter;
  getResumeRecord?: (
    filePath: string,
  ) => import('@core/storage/types').ResumeRecord | null | undefined;
  resumeRecordsMap?:
    | Map<string, import('@core/storage/types').ResumeRecord>
    | Record<string, import('@core/storage/types').ResumeRecord>;
  favoriteIds?: Set<string>;
  searchQuery?: string;
}
