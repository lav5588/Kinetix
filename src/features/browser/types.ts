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
