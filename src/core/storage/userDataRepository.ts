import { executeSql } from './sqliteClient';
import type { PdfBookmarkRow, PlaylistRow } from './types';

const makePlaylistId = (): string => {
  const random = Math.random().toString(36).slice(2, 10);
  return `playlist_${Date.now()}_${random}`;
};

export class UserDataRepository {
  async addPdfBookmark(filePath: string, pageNumber: number, label: string): Promise<void> {
    await executeSql(
      `INSERT INTO pdf_bookmarks (file_path, page_number, label, created_at)
       VALUES (?, ?, ?, ?);`,
      [filePath, pageNumber, label.trim(), Date.now()],
    );
  }

  async removePdfBookmark(filePath: string, pageNumber: number): Promise<void> {
    await executeSql(`DELETE FROM pdf_bookmarks WHERE file_path = ? AND page_number = ?;`, [
      filePath,
      pageNumber,
    ]);
  }

  async getPdfBookmarks(filePath: string): Promise<PdfBookmarkRow[]> {
    const result = (await executeSql(
      `SELECT id, file_path, page_number, label, created_at
       FROM pdf_bookmarks
       WHERE file_path = ?
       ORDER BY created_at DESC, id DESC;`,
      [filePath],
    )) as { rows?: PdfBookmarkRow[] };

    return result.rows ?? [];
  }

  async createPlaylist(name: string): Promise<PlaylistRow> {
    const trimmedName = name.trim();
    if (!trimmedName) {
      throw new Error('Playlist name cannot be empty');
    }

    const playlistId = makePlaylistId();
    const createdAt = Date.now();

    await executeSql(
      `INSERT INTO playlists (playlist_id, name, created_at, track_count)
       VALUES (?, ?, ?, 0);`,
      [playlistId, trimmedName, createdAt],
    );

    return {
      playlist_id: playlistId,
      name: trimmedName,
      created_at: createdAt,
      track_count: 0,
    };
  }

  async deletePlaylist(playlistId: string): Promise<void> {
    await executeSql(`DELETE FROM playlist_items WHERE playlist_id = ?;`, [playlistId]);
    await executeSql(`DELETE FROM playlists WHERE playlist_id = ?;`, [playlistId]);
  }

  async addTrackToPlaylist(playlistId: string, fileId: string): Promise<void> {
    await executeSql(
      `INSERT OR IGNORE INTO playlist_items (playlist_id, file_id, sort_order)
       VALUES (?, ?, (
         SELECT COALESCE(MAX(sort_order), 0) + 1 FROM playlist_items WHERE playlist_id = ?
       ));`,
      [playlistId, fileId, playlistId],
    );

    await executeSql(
      `UPDATE playlists
       SET track_count = (
         SELECT COUNT(*) FROM playlist_items WHERE playlist_id = ?
       )
       WHERE playlist_id = ?;`,
      [playlistId, playlistId],
    );
  }

  async removeTrackFromPlaylist(playlistId: string, fileId: string): Promise<void> {
    await executeSql(`DELETE FROM playlist_items WHERE playlist_id = ? AND file_id = ?;`, [
      playlistId,
      fileId,
    ]);

    await executeSql(
      `UPDATE playlists
       SET track_count = (
         SELECT COUNT(*) FROM playlist_items WHERE playlist_id = ?
       )
       WHERE playlist_id = ?;`,
      [playlistId, playlistId],
    );
  }

  async getPlaylists(): Promise<PlaylistRow[]> {
    const result = (await executeSql(
      `SELECT playlist_id, name, created_at, track_count
       FROM playlists
       ORDER BY created_at DESC;`,
    )) as { rows?: PlaylistRow[] };

    return result.rows ?? [];
  }

  async toggleFavorite(fileId: string, isFavorite: boolean): Promise<void> {
    await executeSql(`UPDATE media_files SET is_favorite = ? WHERE id = ?;`, [
      isFavorite ? 1 : 0,
      fileId,
    ]);
  }

  async setVaultStatus(fileId: string, isVaulted: boolean, newFilePath: string): Promise<void> {
    await executeSql(
      `UPDATE media_files
       SET is_vaulted = ?, file_path = ?
       WHERE id = ?;`,
      [isVaulted ? 1 : 0, newFilePath, fileId],
    );
  }
}

export const userDataRepository = new UserDataRepository();
export default userDataRepository;
