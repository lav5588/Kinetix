import {
  mediaRepository,
  MediaRepository,
  type GetFoldersByCategoryOptions,
} from '@core/storage/mediaRepository';
import { resumeManager, ResumeManager } from '@core/storage/resumeManager';
import type { FolderIndexRow, MediaCategory } from '@core/storage/types';
import { isLikelyMessengerPath } from '@core/scanner/pathFilters';
import type { FolderExplorerViewMode, FolderFilterOptions, FolderItemViewModel } from '../types';
import {
  filterFolders,
  getStoredFolderViewMode,
  getStoredHideMessengerPreference,
  setStoredFolderViewMode,
  setStoredHideMessengerPreference,
} from '../utils/filterFolders';

export function normalizePath(p: string): string {
  return p.replace(/\\/g, '/').replace(/\/+$/, '');
}

export function extractParentFolderPath(filePath: string): string {
  if (!filePath) {
    return '';
  }
  const normalized = filePath.replace(/\\/g, '/').replace(/\/+$/, '');
  const lastSlash = normalized.lastIndexOf('/');
  if (lastSlash < 0) {
    return '';
  }
  if (lastSlash === 0) {
    return '/';
  }
  return normalized.slice(0, lastSlash);
}

export interface FolderExplorerServiceDependencies {
  mediaRepository?: MediaRepository;
  getHideMessengerPreference?: () => boolean;
  setHideMessengerPreference?: (hide: boolean) => void;
  getViewModePreference?: () => FolderExplorerViewMode;
  setViewModePreference?: (mode: FolderExplorerViewMode) => void;
  resumeManager?: typeof ResumeManager;
}

export class FolderExplorerService {
  private readonly mediaRepo: MediaRepository;
  private readonly getPref: () => boolean;
  private readonly setPref: (hide: boolean) => void;
  private readonly getViewMode: () => FolderExplorerViewMode;
  private readonly setViewMode: (mode: FolderExplorerViewMode) => void;
  private readonly resumeMgr: typeof ResumeManager;

  constructor(dependencies: FolderExplorerServiceDependencies = {}) {
    this.mediaRepo = dependencies.mediaRepository ?? mediaRepository;
    this.getPref = dependencies.getHideMessengerPreference ?? getStoredHideMessengerPreference;
    this.setPref = dependencies.setHideMessengerPreference ?? setStoredHideMessengerPreference;
    this.getViewMode = dependencies.getViewModePreference ?? getStoredFolderViewMode;
    this.setViewMode = dependencies.setViewModePreference ?? setStoredFolderViewMode;
    this.resumeMgr = dependencies.resumeManager ?? resumeManager;
  }

  async resolveUnfinishedFolderPaths(category: MediaCategory): Promise<Set<string>> {
    const rawRecords = this.resumeMgr.getUnfinishedRecords
      ? this.resumeMgr.getUnfinishedRecords()
      : this.resumeMgr.getRecentHistory(200).filter((r) => this.resumeMgr.isUnfinished(r));

    const unfinishedForCategory = rawRecords.filter((record) => {
      if (!this.resumeMgr.isUnfinished(record)) {
        return false;
      }
      if (!record.category) {
        return true;
      }
      const recCat = record.category.toUpperCase();
      return (
        recCat === category ||
        (category === 'OTHER_DOC' && (recCat === 'DOC' || recCat === 'OTHER_DOC')) ||
        (category === 'PDF' && recCat === 'PDF')
      );
    });

    if (unfinishedForCategory.length === 0) {
      return new Set();
    }

    const folderPaths = new Set<string>();
    const filePathsToQuery: string[] = [];

    for (const record of unfinishedForCategory) {
      if (record.filePath) {
        const parent = extractParentFolderPath(record.filePath);
        if (parent) {
          folderPaths.add(parent);
          folderPaths.add(normalizePath(parent));
        }
        filePathsToQuery.push(record.filePath);
      }
    }

    if (this.mediaRepo.getFolderPathsForFiles && filePathsToQuery.length > 0) {
      try {
        const dbFolders = await this.mediaRepo.getFolderPathsForFiles(category, filePathsToQuery);
        for (const f of dbFolders) {
          folderPaths.add(f);
          folderPaths.add(normalizePath(f));
        }
      } catch {
        // Precomputed paths in folderPaths set remain valid
      }
    }

    return folderPaths;
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
    const unfinishedFolderPaths = await this.resolveUnfinishedFolderPaths(category);

    return rows.map((row) => {
      const hasUnfinishedResume =
        unfinishedFolderPaths.has(row.folder_path) ||
        unfinishedFolderPaths.has(normalizePath(row.folder_path));
      return this.mapRowToViewModel(row, hasUnfinishedResume);
    });
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

  getViewModePreference(): FolderExplorerViewMode {
    return this.getViewMode();
  }

  setViewModePreference(mode: FolderExplorerViewMode): void {
    this.setViewMode(mode);
  }

  mapRowToViewModel(row: FolderIndexRow, hasUnfinishedResume = false): FolderItemViewModel {
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
      hasUnfinishedResume,
    };
  }
}

export const folderExplorerService = new FolderExplorerService();
export default folderExplorerService;
