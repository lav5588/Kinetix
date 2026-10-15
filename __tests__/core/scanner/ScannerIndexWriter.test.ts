import {
  ScannerIndexWriter,
  type CompletedScanScope,
  type ScannerIndexWriterDependencies,
} from '@core/scanner';
import type { FolderIndexRow, MediaFileRow } from '@core/storage/types';

const createFile = (overrides: Partial<MediaFileRow> = {}): MediaFileRow => ({
  id: 'file-1',
  file_path: '/storage/Music/track.mp3',
  file_name: "track'; DROP TABLE media_files; --.mp3",
  extension: 'mp3',
  mime_type: 'audio/mpeg',
  category: 'AUDIO',
  folder_path: '/storage/Music',
  folder_name: 'Music',
  size_bytes: 1024,
  duration_ms: 60_000,
  width: null,
  height: null,
  artist: "O'Connor",
  album: 'Album',
  date_modified: 100,
  date_added: 50,
  is_hidden: 0,
  is_messenger_media: 0,
  is_favorite: 1,
  is_vaulted: 0,
  ...overrides,
});

const createFolder = (overrides: Partial<FolderIndexRow> = {}): FolderIndexRow => ({
  folder_path: '/storage/Music',
  folder_name: 'Music',
  category: 'AUDIO',
  item_count: 1,
  total_size_bytes: 1024,
  thumbnail_uri: null,
  last_modified: 100,
  is_excluded: 0,
  ...overrides,
});

const createDependencies = (
  stalePaths: string[] = [],
): {
  dependencies: ScannerIndexWriterDependencies;
  batches: Array<Array<[string, (string | number | null)?]>>;
  queries: Array<{ query: string; params?: (string | number | null)[] }>;
} => {
  const batches: Array<Array<[string, (string | number | null)?]>> = [];
  const queries: Array<{ query: string; params?: (string | number | null)[] }> = [];

  return {
    batches,
    queries,
    dependencies: {
      executeBatch: jest.fn(async (commands) => {
        batches.push(commands);
      }),
      executeSql: jest.fn(async (query, params) => {
        queries.push({ query, params });

        if (query.startsWith('SELECT file_path FROM media_files')) {
          return { rows: stalePaths.map((file_path) => ({ file_path })) };
        }

        return {};
      }),
    },
  };
};

describe('ScannerIndexWriter', () => {
  it('writes files and folder aggregates in bounded transactional batches', async () => {
    const { dependencies, batches } = createDependencies();
    const writer = new ScannerIndexWriter({ batchSize: 2 }, dependencies);
    const files = [
      createFile({ id: '1', file_path: '/storage/Music/1.mp3' }),
      createFile({ id: '2', file_path: '/storage/Music/2.mp3' }),
      createFile({ id: '3', file_path: '/storage/Music/3.mp3' }),
    ];
    const folders = [
      createFolder(),
      createFolder({
        folder_path: '/storage/MoreMusic',
        folder_name: 'MoreMusic',
      }),
      createFolder({
        folder_path: '/storage/OtherMusic',
        folder_name: 'OtherMusic',
      }),
    ];

    const result = await writer.writeIndex({ files, folders });

    expect(result).toEqual({
      filesUpserted: 3,
      foldersUpserted: 3,
      staleFilesRemoved: 0,
      staleScopesReconciled: 0,
    });
    expect(batches).toHaveLength(4);
    expect(batches.map((batch) => batch.length)).toEqual([4, 3, 4, 3]);
    expect(batches.every((batch) => batch[0][0] === 'BEGIN IMMEDIATE')).toBe(true);
    expect(batches.every((batch) => batch.at(-1)?.[0] === 'COMMIT')).toBe(true);
  });

  it('does not execute database writes for empty file and folder input', async () => {
    const { dependencies, batches } = createDependencies();
    const result = await new ScannerIndexWriter({}, dependencies).writeIndex({
      files: [],
      folders: [],
    });

    expect(result).toEqual({
      filesUpserted: 0,
      foldersUpserted: 0,
      staleFilesRemoved: 0,
      staleScopesReconciled: 0,
    });
    expect(batches).toEqual([]);
  });

  it('deduplicates file paths, tolerates colliding source IDs, and preserves user flags', async () => {
    const { dependencies, batches } = createDependencies();
    const writer = new ScannerIndexWriter({}, dependencies);

    const result = await writer.writeIndex({
      files: [
        createFile({ id: 'one', file_path: '/storage/Music/one.mp3' }),
        createFile({ id: 'one', file_path: '/storage/Music/duplicate.mp3' }),
        createFile({
          id: 'two',
          file_path: '/storage/Music/one.mp3',
          is_favorite: 0,
        }),
      ],
      folders: [createFolder(), createFolder({ item_count: 99 })],
    });

    expect(result.filesUpserted).toBe(2);
    expect(result.foldersUpserted).toBe(1);
    const commands = batches.flat().filter(([sql]) => sql.includes('INSERT INTO media_files'));
    const command = commands.find(([, params]) => params?.[1] === '/storage/Music/one.mp3');
    expect(command?.[0]).toContain('ON CONFLICT(file_path) DO UPDATE');
    expect(command?.[0]).not.toContain("track'; DROP TABLE");
    expect(command?.[1]).toContain("track'; DROP TABLE media_files; --.mp3");
    expect(commands.map(([, params]) => params?.[0])).toEqual([
      '/storage/Music/one.mp3',
      '/storage/Music/duplicate.mp3',
    ]);
    expect(command?.[0]).not.toContain('is_favorite = excluded.is_favorite');
    expect(command?.[0]).not.toContain('is_vaulted = excluded.is_vaulted');
  });

  it('reconciles stale files only within explicitly completed folder/category scopes', async () => {
    const scope: CompletedScanScope = {
      folderPath: '/storage/Music',
      category: 'AUDIO',
      fullyScanned: true,
    };
    const { dependencies, batches, queries } = createDependencies([
      '/storage/Music/current.mp3',
      '/storage/Music/deleted.mp3',
    ]);
    const writer = new ScannerIndexWriter({}, dependencies);

    const result = await writer.writeIndex({
      files: [createFile({ file_path: '/storage/Music/current.mp3' })],
      folders: [createFolder()],
      completedScopes: [scope, { ...scope, fullyScanned: false }],
    });

    expect(result.staleFilesRemoved).toBe(1);
    expect(result.staleScopesReconciled).toBe(1);
    expect(queries[0]).toEqual({
      query: 'SELECT file_path FROM media_files WHERE folder_path = ? AND category = ?',
      params: ['/storage/Music', 'AUDIO'],
    });
    const staleDelete = batches
      .flat()
      .find(([sql, params]) => sql.startsWith('DELETE FROM media_files'));
    expect(staleDelete?.[1]).toEqual(['/storage/Music/deleted.mp3', '/storage/Music', 'AUDIO']);
  });

  it('does not reconcile or delete entries for partial or inaccessible scopes', async () => {
    const { dependencies, batches, queries } = createDependencies(['/storage/Music/old.mp3']);
    const writer = new ScannerIndexWriter({}, dependencies);

    await writer.writeIndex({
      files: [],
      folders: [],
      completedScopes: [{ folderPath: '/storage/Music', category: 'AUDIO', fullyScanned: false }],
    });

    expect(queries).toEqual([]);
    expect(batches).toEqual([]);
  });

  it('removes empty folders only after a completed scope has no discovered files', async () => {
    const { dependencies, batches } = createDependencies(['/storage/Music/removed.mp3']);
    const writer = new ScannerIndexWriter({}, dependencies);

    const result = await writer.writeIndex({
      files: [],
      folders: [],
      completedScopes: [{ folderPath: '/storage/Music', category: 'AUDIO', fullyScanned: true }],
    });

    expect(result.staleFilesRemoved).toBe(1);
    expect(
      batches.flat().some(([sql, params]) => {
        return (
          sql.startsWith('DELETE FROM folders_index') &&
          params?.[0] === '/storage/Music' &&
          params?.[1] === 'AUDIO'
        );
      }),
    ).toBe(true);
  });

  it('rolls back and propagates transaction errors', async () => {
    const dependencies: ScannerIndexWriterDependencies = {
      executeBatch: jest.fn().mockRejectedValue(new Error('insert failed')),
      executeSql: jest.fn().mockResolvedValue({}),
    };
    const writer = new ScannerIndexWriter({}, dependencies);

    await expect(writer.writeIndex({ files: [createFile()], folders: [] })).rejects.toThrow(
      'insert failed',
    );
    expect(dependencies.executeSql).toHaveBeenCalledWith('ROLLBACK');
  });

  it('reports both write and rollback failures', async () => {
    const dependencies: ScannerIndexWriterDependencies = {
      executeBatch: jest.fn().mockRejectedValue(new Error('insert failed')),
      executeSql: jest.fn().mockRejectedValue(new Error('rollback failed')),
    };
    const writer = new ScannerIndexWriter({}, dependencies);

    await expect(writer.writeIndex({ files: [createFile()], folders: [] })).rejects.toThrow(
      'rollback could not complete',
    );
  });

  it('validates a bounded batch size', () => {
    expect(
      () => new ScannerIndexWriter({ batchSize: 0 }, createDependencies().dependencies),
    ).toThrow(RangeError);
    expect(
      () => new ScannerIndexWriter({ batchSize: 501 }, createDependencies().dependencies),
    ).toThrow(RangeError);
  });
});
