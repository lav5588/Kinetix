import type { FolderIndexRow, MediaCategory, MediaFileRow } from '@core/storage/types';
import { isHiddenPath, isLikelyMessengerPath } from './pathFilters';

export interface FolderAggregate extends FolderIndexRow {
  is_messenger_folder: number;
}

const folderKey = (folderPath: string, category: MediaCategory): string =>
  `${category}\u0000${folderPath}`;

type MutableFolderAggregate = FolderAggregate & {
  fileIdentities: Set<string>;
  thumbnailModified: number;
};

export class FolderAggregationAccumulator {
  private readonly aggregates = new Map<string, MutableFolderAggregate>();
  private readonly seenIdentities = new Set<string>();

  add(file: MediaFileRow): boolean {
    if (!file.file_path) {
      return false;
    }

    const identity = `${file.category}\u0000${file.id || file.file_path}`;

    if (this.seenIdentities.has(identity) || this.seenIdentities.has(file.file_path)) {
      return false;
    }

    this.seenIdentities.add(identity);
    this.seenIdentities.add(file.file_path);

    const key = folderKey(file.folder_path, file.category);
    let aggregate = this.aggregates.get(key);

    if (!aggregate) {
      aggregate = {
        folder_path: file.folder_path,
        folder_name: file.folder_name,
        category: file.category,
        item_count: 0,
        total_size_bytes: 0,
        thumbnail_uri: null,
        last_modified: 0,
        is_excluded: 0,
        is_messenger_folder: Number(isLikelyMessengerPath(file.folder_path)),
        fileIdentities: new Set<string>(),
        thumbnailModified: -1,
      };
      this.aggregates.set(key, aggregate);
    }

    if (aggregate.fileIdentities.has(identity)) {
      return false;
    }

    aggregate.fileIdentities.add(identity);
    aggregate.item_count += 1;
    aggregate.total_size_bytes += Number.isFinite(file.size_bytes)
      ? Math.max(0, Math.trunc(file.size_bytes))
      : 0;
    aggregate.last_modified = Math.max(
      aggregate.last_modified,
      Number.isFinite(file.date_modified) ? Math.max(0, Math.trunc(file.date_modified)) : 0,
    );
    aggregate.is_excluded = Number(
      aggregate.is_excluded === 1 || isHiddenPath(file.folder_path) || file.is_hidden === 1,
    );

    if (
      (file.category === 'PHOTO' || file.category === 'VIDEO') &&
      file.file_path &&
      Number.isFinite(file.date_modified) &&
      file.date_modified >= aggregate.thumbnailModified
    ) {
      aggregate.thumbnail_uri = file.file_path;
      aggregate.thumbnailModified = file.date_modified;
    }

    return true;
  }

  getAggregates(): FolderAggregate[] {
    return Array.from(
      this.aggregates.values(),
      ({ fileIdentities: _fileIdentities, thumbnailModified: _thumbnailModified, ...aggregate }) =>
        aggregate,
    );
  }
}

export const aggregateFolders = (files: readonly MediaFileRow[]): FolderAggregate[] => {
  const accumulator = new FolderAggregationAccumulator();

  for (const file of files) {
    accumulator.add(file);
  }

  return accumulator.getAggregates();
};
