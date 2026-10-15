import type { FolderIndexRow, MediaCategory, MediaFileRow } from '@core/storage/types';
import { isHiddenPath, isLikelyMessengerPath } from './pathFilters';

export interface FolderAggregate extends FolderIndexRow {
  is_messenger_folder: number;
}

const folderKey = (folderPath: string, category: MediaCategory): string =>
  `${category}\u0000${folderPath}`;

export const aggregateFolders = (files: readonly MediaFileRow[]): FolderAggregate[] => {
  const aggregates = new Map<
    string,
    FolderAggregate & { fileIdentities: Set<string>; thumbnailModified: number }
  >();
  const seenIdentities = new Set<string>();

  for (const file of files) {
    if (!file.file_path) {
      continue;
    }

    const identity = file.id || file.file_path;

    if (seenIdentities.has(identity) || seenIdentities.has(file.file_path)) {
      continue;
    }

    seenIdentities.add(identity);
    seenIdentities.add(file.file_path);

    const key = folderKey(file.folder_path, file.category);
    let aggregate = aggregates.get(key);

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
      aggregates.set(key, aggregate);
    }

    if (aggregate.fileIdentities.has(identity)) {
      continue;
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
  }

  return Array.from(
    aggregates.values(),
    ({ fileIdentities: _fileIdentities, thumbnailModified: _thumbnailModified, ...aggregate }) =>
      aggregate,
  );
};
