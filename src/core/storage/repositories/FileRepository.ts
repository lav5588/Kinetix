import { executeSql } from '../sqliteClient';
import type { MediaCategory, MediaFileRow } from '../types';

export type SortField = 'name' | 'date' | 'size' | 'duration';
export type SortOrder = 'ASC' | 'DESC';

export interface GetFilesByFolderParams {
  folderPath?: string;
  folderId?: string;
  category?: MediaCategory;
  sortField?: SortField;
  sortOrder?: SortOrder;
  hideShortAudio?: boolean;
  hideHiddenFiles?: boolean;
}

export interface SearchFilesFtsParams {
  query: string;
  folderPath?: string;
  folderId?: string;
  category?: MediaCategory;
  limit?: number;
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

/**
 * Safely sanitizes user search queries for SQLite FTS5.
 * - Strips syntax operators: brackets [ ], parentheses ( ), braces { }, hyphens -, colons :,
 *   quotes "", '', carets ^, asterisks *, plus +, tildes ~, slashes, and punctuation.
 * - Encloses each non-empty alphanumeric token into double quotes with prefix matching: "token"*
 * - Returns an empty string for empty, whitespace-only, or purely special-character inputs.
 */
export function sanitizeFts5Query(query: string): string {
  if (!query || typeof query !== 'string') {
    return '';
  }

  const cleaned = query.replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

  if (!cleaned) {
    return '';
  }

  const tokens = cleaned
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean);

  if (tokens.length === 0) {
    return '';
  }

  return tokens.map((token) => `"${token}"*`).join(' ');
}

export class FileRepository {
  /**
   * Retrieves indexed media files for a selected folder.
   * Scopes strictly to folderPath (or extracts from folderId if provided).
   */
  async getFilesByFolder(params: GetFilesByFolderParams): Promise<MediaFileRow[]> {
    let folderPath = params.folderPath;
    let category = params.category;

    if (!folderPath && params.folderId) {
      const colonIndex = params.folderId.indexOf(':');
      if (colonIndex > 0) {
        if (!category) {
          category = params.folderId.slice(0, colonIndex) as MediaCategory;
        }
        folderPath = params.folderId.slice(colonIndex + 1);
      } else {
        folderPath = params.folderId;
      }
    }

    if (!folderPath) {
      return [];
    }

    const sortField = params.sortField ?? 'date';
    const sortByColumn = sortFieldMap[sortField] ?? sortFieldMap.date;
    const orderDirection = normalizeSortOrder(params.sortOrder);

    const whereClauses: string[] = ['folder_path = ?'];
    const queryParams: Array<string | number | null> = [folderPath];

    if (category) {
      whereClauses.push('category = ?');
      queryParams.push(category);
    }

    if (params.hideShortAudio && category === 'AUDIO') {
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
    return (result.rows ?? []) as MediaFileRow[];
  }

  /**
   * Executes a parameterized FTS5 query against media_files_fts joined with media_files.
   * Can constrain search results to a specific folder and/or media category.
   * Handles brackets, hyphens, apostrophes, empty queries, and malformed syntax safely.
   */
  async searchFilesFts(params: SearchFilesFtsParams): Promise<MediaFileRow[]> {
    const sanitized = sanitizeFts5Query(params.query);
    if (!sanitized) {
      return [];
    }

    let folderPath = params.folderPath;
    let category = params.category;

    if (!folderPath && params.folderId) {
      const colonIndex = params.folderId.indexOf(':');
      if (colonIndex > 0) {
        if (!category) {
          category = params.folderId.slice(0, colonIndex) as MediaCategory;
        }
        folderPath = params.folderId.slice(colonIndex + 1);
      } else {
        folderPath = params.folderId;
      }
    }

    const whereClauses: string[] = ['fts.id = m.id', 'media_files_fts MATCH ?'];
    const queryParams: Array<string | number> = [sanitized];

    if (category) {
      whereClauses.push('m.category = ?');
      queryParams.push(category);
    }

    if (folderPath) {
      whereClauses.push('m.folder_path = ?');
      queryParams.push(folderPath);
    }

    const limit = Math.max(1, Math.min(params.limit ?? 50, 200));
    const sql = `
      SELECT m.*
      FROM media_files_fts AS fts
      JOIN media_files AS m ON ${whereClauses[0]}
      WHERE ${whereClauses.slice(1).join(' AND ')}
      LIMIT ?
    `;

    const result = (await executeSql(sql, queryParams.concat(limit))) as {
      rows?: MediaFileRow[];
    };
    return (result.rows ?? []) as MediaFileRow[];
  }

  /**
   * Retrieves a single media file by ID.
   */
  async getFileById(id: string): Promise<MediaFileRow | null> {
    const result = (await executeSql(`SELECT * FROM media_files WHERE id = ? LIMIT 1;`, [id])) as {
      rows?: MediaFileRow[];
    };
    return result.rows?.[0] ?? null;
  }

  /**
   * Retrieves a single media file by file path.
   */
  async getFileByPath(filePath: string): Promise<MediaFileRow | null> {
    const result = (await executeSql(`SELECT * FROM media_files WHERE file_path = ? LIMIT 1;`, [
      filePath,
    ])) as { rows?: MediaFileRow[] };
    return result.rows?.[0] ?? null;
  }
}

export const fileRepository = new FileRepository();
export default fileRepository;
