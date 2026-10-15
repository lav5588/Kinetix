import { executeBatch, executeSql } from '@core/storage/sqliteClient';
import type { FolderIndexRow, MediaFileRow } from '@core/storage/types';

type SqlValue = string | number | null;
type SqlCommand = [string, SqlValue[]?];

export interface CompletedScanScope {
  folderPath: string;
  category: MediaFileRow['category'];
  fullyScanned: boolean;
}

export interface ScannerIndexWriterOptions {
  batchSize?: number;
}

export interface ScannerIndexWriteResult {
  filesUpserted: number;
  foldersUpserted: number;
  staleFilesRemoved: number;
  staleScopesReconciled: number;
}

export interface ScannerIndexScanSummary {
  filesStaged: number;
  foldersStaged: number;
  staleFilesRemoved: number;
}

export interface ScannerIndexWriterDependencies {
  executeBatch: (commands: Array<[string, SqlValue[]?]>) => Promise<unknown>;
  executeSql: (query: string, params?: SqlValue[]) => Promise<unknown>;
}

const DEFAULT_BATCH_SIZE = 100;
const MAX_BATCH_SIZE = 500;

const FILE_UPSERT_SQL = `
  INSERT INTO media_files (
    id, file_path, file_name, extension, mime_type, category, folder_path, folder_name,
    size_bytes, duration_ms, width, height, artist, album, date_modified, date_added,
    is_hidden, is_messenger_media, is_favorite, is_vaulted
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(file_path) DO UPDATE SET
    id = excluded.id,
    file_name = excluded.file_name,
    extension = excluded.extension,
    mime_type = excluded.mime_type,
    category = excluded.category,
    folder_path = excluded.folder_path,
    folder_name = excluded.folder_name,
    size_bytes = excluded.size_bytes,
    duration_ms = excluded.duration_ms,
    width = excluded.width,
    height = excluded.height,
    artist = excluded.artist,
    album = excluded.album,
    date_modified = excluded.date_modified,
    date_added = excluded.date_added,
    is_hidden = excluded.is_hidden,
    is_messenger_media = excluded.is_messenger_media;
`;

const FOLDER_UPSERT_SQL = `
  INSERT INTO folders_index (
    folder_path, folder_name, category, item_count, total_size_bytes,
    thumbnail_uri, last_modified, is_excluded
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(folder_path, category) DO UPDATE SET
    folder_name = excluded.folder_name,
    item_count = excluded.item_count,
    total_size_bytes = excluded.total_size_bytes,
    thumbnail_uri = excluded.thumbnail_uri,
    last_modified = excluded.last_modified,
    is_excluded = excluded.is_excluded;
`;

const CREATE_STAGING_TABLES = [
  `CREATE TEMP TABLE IF NOT EXISTS scanner_staged_files (
    id TEXT NOT NULL,
    file_path TEXT NOT NULL UNIQUE,
    file_name TEXT NOT NULL,
    extension TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    category TEXT NOT NULL,
    folder_path TEXT NOT NULL,
    folder_name TEXT NOT NULL,
    size_bytes INTEGER NOT NULL,
    duration_ms INTEGER,
    width INTEGER,
    height INTEGER,
    artist TEXT,
    album TEXT,
    date_modified INTEGER NOT NULL,
    date_added INTEGER NOT NULL,
    is_hidden INTEGER NOT NULL,
    is_messenger_media INTEGER NOT NULL,
    is_favorite INTEGER NOT NULL,
    is_vaulted INTEGER NOT NULL
  );`,
  `CREATE TEMP TABLE IF NOT EXISTS scanner_staged_folders (
    folder_path TEXT NOT NULL,
    folder_name TEXT NOT NULL,
    category TEXT NOT NULL,
    item_count INTEGER NOT NULL,
    total_size_bytes INTEGER NOT NULL,
    thumbnail_uri TEXT,
    last_modified INTEGER NOT NULL,
    is_excluded INTEGER NOT NULL,
    PRIMARY KEY (folder_path, category)
  );`,
];

const STAGED_FILE_UPSERT_SQL = `
  INSERT INTO scanner_staged_files (
    id, file_path, file_name, extension, mime_type, category, folder_path, folder_name,
    size_bytes, duration_ms, width, height, artist, album, date_modified, date_added,
    is_hidden, is_messenger_media, is_favorite, is_vaulted
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(file_path) DO UPDATE SET
    id = excluded.id,
    file_name = excluded.file_name,
    extension = excluded.extension,
    mime_type = excluded.mime_type,
    category = excluded.category,
    folder_path = excluded.folder_path,
    folder_name = excluded.folder_name,
    size_bytes = excluded.size_bytes,
    duration_ms = excluded.duration_ms,
    width = excluded.width,
    height = excluded.height,
    artist = excluded.artist,
    album = excluded.album,
    date_modified = excluded.date_modified,
    date_added = excluded.date_added,
    is_hidden = excluded.is_hidden,
    is_messenger_media = excluded.is_messenger_media;
`;

const STAGED_FOLDER_UPSERT_SQL = `
  INSERT INTO scanner_staged_folders (
    folder_path, folder_name, category, item_count, total_size_bytes,
    thumbnail_uri, last_modified, is_excluded
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(folder_path, category) DO UPDATE SET
    folder_name = excluded.folder_name,
    item_count = excluded.item_count,
    total_size_bytes = excluded.total_size_bytes,
    thumbnail_uri = excluded.thumbnail_uri,
    last_modified = excluded.last_modified,
    is_excluded = excluded.is_excluded;
`;

const toUniqueFiles = (files: readonly MediaFileRow[]): MediaFileRow[] => {
  const byPath = new Map<string, MediaFileRow>();

  for (const file of files) {
    if (!file.file_path || !file.id) {
      continue;
    }

    byPath.set(file.file_path, file);
  }

  return Array.from(byPath.values());
};

const toUniqueFolders = (folders: readonly FolderIndexRow[]): FolderIndexRow[] => {
  const byKey = new Map<string, FolderIndexRow>();

  for (const folder of folders) {
    byKey.set(`${folder.category}\u0000${folder.folder_path}`, folder);
  }

  return Array.from(byKey.values());
};

const chunk = <T>(items: readonly T[], size: number): T[][] => {
  const result: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size));
  }

  return result;
};

const fileParams = (file: MediaFileRow): SqlValue[] => [
  file.file_path,
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
];

const folderParams = (folder: FolderIndexRow): SqlValue[] => [
  folder.folder_path,
  folder.folder_name,
  folder.category,
  folder.item_count,
  folder.total_size_bytes,
  folder.thumbnail_uri,
  folder.last_modified,
  folder.is_excluded,
];

const readFilePaths = async (
  execute: ScannerIndexWriterDependencies['executeSql'],
  folderPath: string,
  category: MediaFileRow['category'],
): Promise<string[]> => {
  const result = (await execute(
    'SELECT file_path FROM media_files WHERE folder_path = ? AND category = ?',
    [folderPath, category],
  )) as { rows?: Array<{ file_path: string }> };

  return (result.rows ?? []).map(({ file_path }) => file_path);
};

export class ScannerIndexWriter {
  private readonly dependencies: ScannerIndexWriterDependencies;
  private readonly batchSize: number;

  constructor(
    options: ScannerIndexWriterOptions = {},
    dependencies: ScannerIndexWriterDependencies = { executeBatch, executeSql },
  ) {
    this.batchSize = options.batchSize ?? DEFAULT_BATCH_SIZE;
    this.dependencies = dependencies;

    if (
      !Number.isInteger(this.batchSize) ||
      this.batchSize < 1 ||
      this.batchSize > MAX_BATCH_SIZE
    ) {
      throw new RangeError(
        `Scanner index batchSize must be an integer between 1 and ${MAX_BATCH_SIZE}`,
      );
    }
  }

  async writeIndex(params: {
    files: readonly MediaFileRow[];
    folders: readonly FolderIndexRow[];
    completedScopes?: readonly CompletedScanScope[];
  }): Promise<ScannerIndexWriteResult> {
    const files = toUniqueFiles(params.files);
    const folders = toUniqueFolders(params.folders);
    const completedScopes = (params.completedScopes ?? []).filter((scope) => scope.fullyScanned);
    let staleFilesRemoved = 0;
    let staleScopesReconciled = 0;

    for (const batch of chunk(files, this.batchSize)) {
      await this.runTransaction(
        batch.map((file): SqlCommand => [FILE_UPSERT_SQL, fileParams(file)]),
      );
    }

    for (const batch of chunk(folders, this.batchSize)) {
      await this.runTransaction(
        batch.map((folder): SqlCommand => [FOLDER_UPSERT_SQL, folderParams(folder)]),
      );
    }

    for (const scope of completedScopes) {
      const existingPaths = await readFilePaths(
        this.dependencies.executeSql,
        scope.folderPath,
        scope.category,
      );
      const currentPaths = new Set(
        files
          .filter(
            (file) => file.folder_path === scope.folderPath && file.category === scope.category,
          )
          .map((file) => file.file_path),
      );
      const stalePaths = existingPaths.filter((path) => !currentPaths.has(path));
      const staleDeleteCommands: SqlCommand[] = stalePaths.map((filePath) => [
        'DELETE FROM media_files WHERE file_path = ? AND folder_path = ? AND category = ?',
        [filePath, scope.folderPath, scope.category],
      ]);

      for (const batch of chunk(staleDeleteCommands, this.batchSize)) {
        await this.runTransaction(batch);
      }

      const folderExists = folders.some(
        (folder) => folder.folder_path === scope.folderPath && folder.category === scope.category,
      );
      if (!folderExists) {
        await this.runTransaction([
          [
            'DELETE FROM folders_index WHERE folder_path = ? AND category = ?',
            [scope.folderPath, scope.category],
          ],
        ]);
      }

      staleFilesRemoved += stalePaths.length;
      staleScopesReconciled += 1;
    }

    return {
      filesUpserted: files.length,
      foldersUpserted: folders.length,
      staleFilesRemoved,
      staleScopesReconciled,
    };
  }

  async beginScanStaging(): Promise<void> {
    await this.dependencies.executeBatch([
      ...CREATE_STAGING_TABLES.map((query): SqlCommand => [query]),
      ['DELETE FROM scanner_staged_files'],
      ['DELETE FROM scanner_staged_folders'],
    ]);
  }

  async stageIndex(params: {
    files: readonly MediaFileRow[];
    folders: readonly FolderIndexRow[];
  }): Promise<{ filesStaged: number; foldersStaged: number }> {
    const files = toUniqueFiles(params.files);
    const folders = toUniqueFolders(params.folders);

    for (const batch of chunk(files, this.batchSize)) {
      await this.runTransaction(
        batch.map((file): SqlCommand => [STAGED_FILE_UPSERT_SQL, fileParams(file)]),
      );
    }

    for (const batch of chunk(folders, this.batchSize)) {
      await this.runTransaction(
        batch.map((folder): SqlCommand => [STAGED_FOLDER_UPSERT_SQL, folderParams(folder)]),
      );
    }

    return { filesStaged: files.length, foldersStaged: folders.length };
  }

  async commitScanStaging(): Promise<ScannerIndexScanSummary> {
    const stagedFilesResult = (await this.dependencies.executeSql(
      'SELECT COUNT(*) AS count FROM scanner_staged_files',
    )) as { rows?: Array<{ count: number }> };
    const stagedFoldersResult = (await this.dependencies.executeSql(
      'SELECT COUNT(*) AS count FROM scanner_staged_folders',
    )) as { rows?: Array<{ count: number }> };
    const staleFilesResult = (await this.dependencies.executeSql(
      `SELECT COUNT(*) AS count FROM media_files AS existing
      WHERE NOT EXISTS (
        SELECT 1 FROM scanner_staged_files AS staged
        WHERE staged.file_path = existing.file_path
      )`,
    )) as { rows?: Array<{ count: number }> };
    const filesStaged = stagedFilesResult.rows?.[0]?.count ?? 0;
    const foldersStaged = stagedFoldersResult.rows?.[0]?.count ?? 0;
    const staleFilesRemoved = staleFilesResult.rows?.[0]?.count ?? 0;

    await this.runTransaction([
      [
        `INSERT INTO media_files (
          id, file_path, file_name, extension, mime_type, category, folder_path, folder_name,
          size_bytes, duration_ms, width, height, artist, album, date_modified, date_added,
          is_hidden, is_messenger_media, is_favorite, is_vaulted
        )
        SELECT id, file_path, file_name, extension, mime_type, category, folder_path, folder_name,
          size_bytes, duration_ms, width, height, artist, album, date_modified, date_added,
          is_hidden, is_messenger_media, is_favorite, is_vaulted
        FROM scanner_staged_files WHERE 1
        ON CONFLICT(file_path) DO UPDATE SET
          id = excluded.id,
          file_name = excluded.file_name,
          extension = excluded.extension,
          mime_type = excluded.mime_type,
          category = excluded.category,
          folder_path = excluded.folder_path,
          folder_name = excluded.folder_name,
          size_bytes = excluded.size_bytes,
          duration_ms = excluded.duration_ms,
          width = excluded.width,
          height = excluded.height,
          artist = excluded.artist,
          album = excluded.album,
          date_modified = excluded.date_modified,
          date_added = excluded.date_added,
          is_hidden = excluded.is_hidden,
          is_messenger_media = excluded.is_messenger_media;`,
      ],
      [
        `DELETE FROM media_files
        WHERE NOT EXISTS (
          SELECT 1 FROM scanner_staged_files AS staged
          WHERE staged.file_path = media_files.file_path
        );`,
      ],
      [
        `INSERT INTO folders_index (
          folder_path, folder_name, category, item_count, total_size_bytes,
          thumbnail_uri, last_modified, is_excluded
        )
        SELECT folder_path, folder_name, category, item_count, total_size_bytes,
          thumbnail_uri, last_modified, is_excluded
        FROM scanner_staged_folders WHERE 1
        ON CONFLICT(folder_path, category) DO UPDATE SET
          folder_name = excluded.folder_name,
          item_count = excluded.item_count,
          total_size_bytes = excluded.total_size_bytes,
          thumbnail_uri = excluded.thumbnail_uri,
          last_modified = excluded.last_modified,
          is_excluded = excluded.is_excluded;`,
      ],
      [
        `DELETE FROM folders_index
        WHERE NOT EXISTS (
          SELECT 1 FROM scanner_staged_folders AS staged
          WHERE staged.folder_path = folders_index.folder_path
            AND staged.category = folders_index.category
        );`,
      ],
      ['DELETE FROM scanner_staged_files'],
      ['DELETE FROM scanner_staged_folders'],
    ]);

    return {
      filesStaged,
      foldersStaged,
      staleFilesRemoved,
    };
  }

  async discardScanStaging(): Promise<void> {
    await this.dependencies.executeBatch([
      ['DELETE FROM scanner_staged_files'],
      ['DELETE FROM scanner_staged_folders'],
    ]);
  }

  private async runTransaction(commands: SqlCommand[]): Promise<void> {
    if (commands.length === 0) {
      return;
    }

    try {
      await this.dependencies.executeBatch([['BEGIN IMMEDIATE'], ...commands, ['COMMIT']]);
    } catch (error) {
      try {
        await this.dependencies.executeSql('ROLLBACK');
      } catch (rollbackError) {
        throw new AggregateError(
          [error, rollbackError],
          'Scanner index transaction failed and rollback could not complete.',
        );
      }

      throw error;
    }
  }
}

export const scannerIndexWriter = new ScannerIndexWriter();
