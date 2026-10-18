import {
  mediaRepository,
  MediaRepository,
  type GetFoldersByCategoryOptions,
} from '@core/storage/mediaRepository';
import type { FolderIndexRow, MediaCategory } from '@core/storage/types';
import { isLikelyMessengerPath } from '@core/scanner/pathFilters';
import type { FolderFilterOptions, FolderItemViewModel } from '../types';

export interface FolderExplorerServiceDependencies {
  mediaRepository?: MediaRepository;
}

export class FolderExplorerService {
  private readonly mediaRepo: MediaRepository;

  constructor(dependencies: FolderExplorerServiceDependencies = {}) {
    this.mediaRepo = dependencies.mediaRepository ?? mediaRepository;
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
