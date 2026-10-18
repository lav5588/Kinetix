import type { MediaCategory } from '@core/storage/types';

export type FolderExplorerViewMode = 'list' | 'grid';

export interface FolderItemViewModel {
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
}
