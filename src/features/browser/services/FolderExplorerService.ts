import {
  mediaRepository,
  MediaRepository,
  type GetFoldersByCategoryOptions,
} from '@core/storage/mediaRepository';
import type { FolderIndexRow, MediaCategory } from '@core/storage/types';
import { isLikelyMessengerPath } from '@core/scanner/pathFilters';
import type { FolderFilterOptions, FolderItemViewModel } from '../types';
import {
  filterFolders,
  getStoredHideMessengerPreference,
  setStoredHideMessengerPreference,
} from '../utils/filterFolders';

export interface FolderExplorerServiceDependencies {
  mediaRepository?: MediaRepository;
  getHideMessengerPreference?: () => boolean;
  setHideMessengerPreference?: (hide: boolean) => void;
}

export class FolderExplorerService {
  private readonly mediaRepo: MediaRepository;
  private readonly getPref: () => boolean;
  private readonly setPref: (hide: boolean) => void;

  constructor(dependencies: FolderExplorerServiceDependencies = {}) {
    this.mediaRepo = dependencies.mediaRepository ?? mediaRepository;
    this.getPref = dependencies.getHideMessengerPreference ?? getStoredHideMessengerPreference;
    this.setPref = dependencies.setHideMessengerPreference ?? setStoredHideMessengerPreference;
  }

  async getFolders(
    category: MediaCategory,
    options: FolderFilterOptions = {},
  ): Promise<FolderItemViewModel[]> {
    const queryOptions: GetFoldersByCategoryOptions = {
      hideMessenger: options.hideMessenger,
      excludeHidden: options.excludeHidden,
      sortBy: options.sortBy,
      sortOrder: options.sortOrder,
    };

    const rows = await this.mediaRepo.getFoldersByCategory(category, queryOptions);
    return rows.map((row) => this.mapRowToViewModel(row));
  }

  filterFolders(
    folders: readonly FolderItemViewModel[],
    options: FolderFilterOptions = {},
  ): FolderItemViewModel[] {
    return filterFolders(folders, options);
  }

  getHideMessengerPreference(): boolean {
    return this.getPref();
  }

  setHideMessengerPreference(hide: boolean): void {
    this.setPref(hide);
  }

  mapRowToViewModel(row: FolderIndexRow): FolderItemViewModel {
    return {
      id: `${row.category}:${row.folder_path}`,
      folderPath: row.folder_path,
      folderName: row.folder_name,
      category: row.category,
      itemCount: row.item_count,
      totalSizeBytes: row.total_size_bytes,
      thumbnailUri: row.thumbnail_uri,
      lastModified: row.last_modified,
      isExcluded: row.is_excluded === 1,
      isMessengerFolder: isLikelyMessengerPath(row.folder_path),
      hasUnfinishedResume: false,
    };
  }
}

export const folderExplorerService = new FolderExplorerService();
export default folderExplorerService;
