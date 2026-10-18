import { executeBatch, executeSql } from './sqliteClient';
import type { FolderIndexRow, MediaCategory, MediaFileRow } from './types';

export type SortField = 'name' | 'date' | 'size' | 'duration';
export type SortOrder = 'ASC' | 'DESC';

export interface GetFoldersByCategoryOptions {
  hideMessenger?: boolean;
  excludeHidden?: boolean;
  sortBy?: 'name' | 'date' | 'size' | 'count';
  sortOrder?: 'ASC' | 'DESC';
}

const sortFieldMap: Record<SortField, string> = {
  name: 'file_name COLLATE NOCASE',
  date: 'date_modified',
  size: 'size_bytes',
  duration: 'duration_ms',
};

const normalizeSortOrder = (value?: string): SortOrder => {
  const normalized = value?.toUpperCase();
  return normalized === 'DESC' ? 'DESC' : 'ASC';
};

const toMediaRows = (rows: unknown[]): MediaFileRow[] => rows as MediaFileRow[];

export class MediaRepository {
  async upsertMediaFilesBatch(files: MediaFileRow[]): Promise<void> {
    if (files.length === 0) {
      return;
    }

    const commands: Array<[string, Array<string | number | null>]> = files.map((file) => [
      `INSERT OR REPLACE INTO media_files (
        id,
        file_path,
        file_name,
        extension,
        mime_type,
        category,
        folder_path,
        folder_name,
        size_bytes,
        duration_ms,
        width,
        height,
        artist,
        album,
        date_modified,
        date_added,
        is_hidden,
        is_messenger_media,
        is_favorite,
        is_vaulted
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        file.id,
        file.file_path,
        file.file_name,
        file.extension,
        file.mime_type,
        file.category,
        file.folder_path,
        file.folder_name,
        file.size_bytes,
        file.duration_ms,
        file.width,
        file.height,
        file.artist,
        file.album,
        file.date_modified,
        file.date_added,
        file.is_hidden,
        file.is_messenger_media,
        file.is_favorite,
        file.is_vaulted,
      ],
    ]);

    await executeBatch(commands);

    const groupedByFolder = new Map<
      string,
      { folderPath: string; folderName: string; category: MediaCategory }
    >();
    for (const file of files) {
      groupedByFolder.set(`${file.category}:${file.folder_path}`, {
        folderPath: file.folder_path,
        folderName: file.folder_name,
        category: file.category,
      });
    }

    const folderAggregateSql = `
      SELECT
        folder_path,
        folder_name,
        category,
        COUNT(*) AS item_count,
        COALESCE(SUM(size_bytes), 0) AS total_size_bytes,
        MAX(date_modified) AS last_modified
      FROM media_files
      WHERE category = ? AND folder_path = ?
      GROUP BY folder_path, folder_name, category
    `;

    for (const summary of groupedByFolder.values()) {
      const rows = (await executeSql(folderAggregateSql, [
        summary.category,
        summary.folderPath,
      ])) as {
        rows?: Array<{
          folder_path: string;
          folder_name: string;
          category: MediaCategory;
          item_count: number;
          total_size_bytes: number;
          last_modified: number;
        }>;
      };

      const records = rows?.rows ?? [];
      const aggregate = records[0];
      if (!aggregate) {
        continue;
      }

      await executeSql(
        `INSERT INTO folders_index (folder_path, folder_name, category, item_count, total_size_bytes, thumbnail_uri, last_modified, is_excluded)
         VALUES (?, ?, ?, ?, ?, NULL, ?, 0)
         ON CONFLICT(folder_path, category)
         DO UPDATE SET
           folder_name = excluded.folder_name,
           item_count = excluded.item_count,
           total_size_bytes = excluded.total_size_bytes,
           last_modified = excluded.last_modified;`,
        [
          aggregate.folder_path,
          aggregate.folder_name,
          aggregate.category,
          aggregate.item_count,
          aggregate.total_size_bytes,
          aggregate.last_modified,
        ],
      );
    }
  }

  async getFoldersByCategory(
    category: MediaCategory,
    optionsOrHideMessenger: boolean | GetFoldersByCategoryOptions = false,
  ): Promise<FolderIndexRow[]> {
    const options: GetFoldersByCategoryOptions =
      typeof optionsOrHideMessenger === 'boolean'
        ? { hideMessenger: optionsOrHideMessenger }
        : optionsOrHideMessenger;

    const whereClauses = ['category = ?'];
    const params: Array<string | number> = [category];

    if (options.excludeHidden) {
      whereClauses.push('is_excluded = ?');
      params.push(0);
    }

    if (options.hideMessenger) {
      whereClauses.push('folder_path NOT LIKE ? AND folder_path NOT LIKE ?');
      params.push('%WhatsApp%', '%Telegram%');
    }

    let orderColumn = 'folder_name COLLATE NOCASE';
    if (options.sortBy === 'date') {
      orderColumn = 'last_modified';
    } else if (options.sortBy === 'size') {
      orderColumn = 'total_size_bytes';
    } else if (options.sortBy === 'count') {
      orderColumn = 'item_count';
    }

    const direction = options.sortOrder?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

    const sql = `
      SELECT folder_path, folder_name, category, item_count, total_size_bytes, thumbnail_uri, last_modified, is_excluded
      FROM folders_index
      WHERE ${whereClauses.join(' AND ')}
      ORDER BY ${orderColumn} ${direction}, folder_name COLLATE NOCASE ASC
    `;

    const result = (await executeSql(sql, params)) as { rows?: FolderIndexRow[] };
    return result.rows ?? [];
  }

  async getFilesByFolder(params: {
    category: MediaCategory;
    folderPath: string;
    sortField?: SortField;
    sortOrder?: SortOrder;
    hideShortAudio?: boolean;
    hideHiddenFiles?: boolean;
  }): Promise<MediaFileRow[]> {
    const sortField = params.sortField ?? 'date';
    const sortByColumn = sortFieldMap[sortField] ?? sortFieldMap.date;
    const orderDirection = normalizeSortOrder(params.sortOrder);

    const whereClauses = ['category = ?', 'folder_path = ?'];
    const queryParams: Array<string | number | null> = [params.category, params.folderPath];

    if (params.hideShortAudio && params.category === 'AUDIO') {
      whereClauses.push('COALESCE(duration_ms, 0) >= ?');
      queryParams.push(30000);
    }

    if (params.hideHiddenFiles) {
      whereClauses.push('is_hidden = ?');
      queryParams.push(0);
    }

    const sql = `
      SELECT *
      FROM media_files
      WHERE ${whereClauses.join(' AND ')}
      ORDER BY ${sortByColumn} ${orderDirection}
    `;

    const result = (await executeSql(sql, queryParams)) as { rows?: MediaFileRow[] };
    return result.rows ?? [];
  }

  async getFolderPathsForFiles(category: MediaCategory, filePaths: string[]): Promise<Set<string>> {
    if (filePaths.length === 0) {
      return new Set();
    }

    const CHUNK_SIZE = 500;
    const folderPaths = new Set<string>();

    for (let i = 0; i < filePaths.length; i += CHUNK_SIZE) {
      const chunk = filePaths.slice(i, i + CHUNK_SIZE);
      const placeholders = chunk.map(() => '?').join(', ');
      const sql = `
        SELECT DISTINCT folder_path
        FROM media_files
        WHERE category = ? AND file_path IN (${placeholders})
      `;
      const result = (await executeSql(sql, [category, ...chunk])) as {
        rows?: Array<{ folder_path: string }>;
      };

      for (const row of result.rows ?? []) {
        if (row.folder_path) {
          folderPaths.add(row.folder_path);
        }
      }
    }

    return folderPaths;
  }

  async searchFilesFts(params: {
    query: string;
    category?: MediaCategory;
    folderPath?: string;
    limit?: number;
  }): Promise<MediaFileRow[]> {
    const queryText = params.query.trim();
    if (!queryText) {
      return [];
    }

    const escapedTerms = queryText
      .replace(/"/g, '')
      .replace(/'/g, '')
      .split(/\s+/)
      .filter(Boolean)
      .map((term) => `"${term.replace(/[*?]/g, '')}"*`)
      .join(' ');

    if (!escapedTerms) {
      return [];
    }

    const whereClauses: string[] = ['fts.id = m.id', 'fts MATCH ?'];
    const queryParams: Array<string | number> = [escapedTerms];

    if (params.category) {
      whereClauses.push('m.category = ?');
      queryParams.push(params.category);
    }

    if (params.folderPath) {
      whereClauses.push('m.folder_path = ?');
      queryParams.push(params.folderPath);
    }

    const limit = Math.max(1, Math.min(params.limit ?? 50, 200));
    const sql = `
      SELECT m.*
      FROM media_files_fts AS fts
      JOIN media_files AS m ON ${whereClauses[0]}
      WHERE ${whereClauses.slice(1).join(' AND ')}
      LIMIT ?
    `;

    const result = (await executeSql(sql, queryParams.concat(limit))) as { rows?: MediaFileRow[] };
    return toMediaRows(result.rows ?? []);
  }

  async getCategoryItemCounts(): Promise<Record<MediaCategory, number>> {
    const counts: Record<MediaCategory, number> = {
      AUDIO: 0,
      VIDEO: 0,
      PHOTO: 0,
      PDF: 0,
      OTHER_DOC: 0,
    };

    try {
      const result = (await executeSql(
        `SELECT category, COUNT(*) AS count FROM media_files GROUP BY category;`,
      )) as { rows?: Array<{ category: MediaCategory; count: number }> };

      for (const row of result.rows ?? []) {
        if (row.category in counts) {
          counts[row.category] = Number(row.count) || 0;
        }
      }
    } catch {
      // Table might not be created yet on first start
    }

    return counts;
  }
}

export const mediaRepository = new MediaRepository();
export default mediaRepository;
