import { sqliteClient } from './sqliteClient';

const schemaStatements = [
  `CREATE TABLE IF NOT EXISTS media_files (
    id TEXT PRIMARY KEY,
    file_path TEXT NOT NULL UNIQUE,
    file_name TEXT NOT NULL,
    extension TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    category TEXT NOT NULL CHECK(category IN ('AUDIO', 'VIDEO', 'PHOTO', 'PDF', 'OTHER_DOC')),
    folder_path TEXT NOT NULL,
    folder_name TEXT NOT NULL,
    size_bytes INTEGER NOT NULL DEFAULT 0,
    duration_ms INTEGER,
    width INTEGER,
    height INTEGER,
    artist TEXT,
    album TEXT,
    date_modified INTEGER NOT NULL DEFAULT 0,
    date_added INTEGER NOT NULL DEFAULT 0,
    is_hidden INTEGER NOT NULL DEFAULT 0,
    is_messenger_media INTEGER NOT NULL DEFAULT 0,
    is_favorite INTEGER NOT NULL DEFAULT 0,
    is_vaulted INTEGER NOT NULL DEFAULT 0
  );`,
  `CREATE TABLE IF NOT EXISTS folders_index (
    folder_path TEXT NOT NULL,
    folder_name TEXT NOT NULL,
    category TEXT NOT NULL CHECK(category IN ('AUDIO', 'VIDEO', 'PHOTO', 'PDF', 'OTHER_DOC')),
    item_count INTEGER NOT NULL DEFAULT 0,
    total_size_bytes INTEGER NOT NULL DEFAULT 0,
    thumbnail_uri TEXT,
    last_modified INTEGER NOT NULL DEFAULT 0,
    is_excluded INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (folder_path, category)
  );`,
  `CREATE TABLE IF NOT EXISTS playlists (
    playlist_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    track_count INTEGER NOT NULL DEFAULT 0
  );`,
  `CREATE TABLE IF NOT EXISTS playlist_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    playlist_id TEXT NOT NULL,
    file_id TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (playlist_id) REFERENCES playlists(playlist_id) ON DELETE CASCADE,
    UNIQUE (playlist_id, file_id)
  );`,
  `CREATE TABLE IF NOT EXISTS pdf_bookmarks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_path TEXT NOT NULL,
    page_number INTEGER NOT NULL,
    label TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS media_bookmarks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_path TEXT NOT NULL,
    timestamp_ms INTEGER NOT NULL,
    title TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );`,
  `CREATE VIRTUAL TABLE IF NOT EXISTS media_files_fts USING fts5(
    id UNINDEXED,
    file_name,
    folder_name,
    artist,
    album,
    content='media_files',
    content_rowid='rowid'
  );`,
  `CREATE INDEX IF NOT EXISTS idx_media_files_category_folder ON media_files(category, folder_path);`,
  `CREATE INDEX IF NOT EXISTS idx_media_files_date_modified_size ON media_files(date_modified DESC, size_bytes DESC);`,
  `CREATE TRIGGER IF NOT EXISTS media_files_fts_ai AFTER INSERT ON media_files BEGIN
    INSERT INTO media_files_fts(rowid, id, file_name, folder_name, artist, album)
    VALUES (new.rowid, new.id, new.file_name, new.folder_name, new.artist, new.album);
  END;`,
  `CREATE TRIGGER IF NOT EXISTS media_files_fts_ad AFTER DELETE ON media_files BEGIN
    INSERT INTO media_files_fts(media_files_fts, rowid, id, file_name, folder_name, artist, album)
    VALUES('delete', old.rowid, old.id, old.file_name, old.folder_name, old.artist, old.album);
  END;`,
  `CREATE TRIGGER IF NOT EXISTS media_files_fts_au AFTER UPDATE ON media_files BEGIN
    INSERT INTO media_files_fts(media_files_fts, rowid, id, file_name, folder_name, artist, album)
    VALUES('delete', old.rowid, old.id, old.file_name, old.folder_name, old.artist, old.album);
    INSERT INTO media_files_fts(rowid, id, file_name, folder_name, artist, album)
    VALUES (new.rowid, new.id, new.file_name, new.folder_name, new.artist, new.album);
  END;`,
];

export const initializeDatabaseSchema = async (): Promise<void> => {
  const db = sqliteClient.getDb();
  await db.executeBatch(schemaStatements.map((sql) => [sql] as [string]));
  try {
    await db.executeBatch([["INSERT INTO media_files_fts(media_files_fts) VALUES('rebuild')"]]);
  } catch {
    // If rebuild is not supported (e.g. mock or empty table), continue safely
  }
};

export default initializeDatabaseSchema;
