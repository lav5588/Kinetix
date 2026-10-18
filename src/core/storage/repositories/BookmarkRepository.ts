import { executeSql } from '../sqliteClient';
import type { MediaBookmarkRow } from '../types';

export class BookmarkRepository {
  static async addBookmark(
    filePath: string,
    timestampMs: number,
    title: string,
  ): Promise<MediaBookmarkRow> {
    const trimmedTitle = title.trim() || 'Bookmark';
    const createdAt = Date.now();

    const result = (await executeSql(
      `INSERT INTO media_bookmarks (file_path, timestamp_ms, title, created_at)
       VALUES (?, ?, ?, ?);`,
      [filePath, Math.round(timestampMs), trimmedTitle, createdAt],
    )) as { insertId?: number };

    return {
      id: result.insertId ?? Date.now(),
      file_path: filePath,
      timestamp_ms: Math.round(timestampMs),
      title: trimmedTitle,
      created_at: createdAt,
    };
  }

  static async getBookmarks(filePath: string): Promise<MediaBookmarkRow[]> {
    const result = (await executeSql(
      `SELECT id, file_path, timestamp_ms, title, created_at
       FROM media_bookmarks
       WHERE file_path = ?
       ORDER BY timestamp_ms ASC;`,
      [filePath],
    )) as { rows?: MediaBookmarkRow[] };

    return result.rows ?? [];
  }

  static async removeBookmark(bookmarkId: number): Promise<void> {
    await executeSql(`DELETE FROM media_bookmarks WHERE id = ?;`, [bookmarkId]);
  }

  static async clearBookmarks(filePath: string): Promise<void> {
    await executeSql(`DELETE FROM media_bookmarks WHERE file_path = ?;`, [filePath]);
  }
}

export default BookmarkRepository;
