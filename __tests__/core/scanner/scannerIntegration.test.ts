import { DocumentScannerAdapter, MediaStoreAdapter } from '@core/scanner';
import { FileScannerService } from '@core/scanner/FileScannerService';
import { ScannerIndexWriter } from '@core/scanner/ScannerIndexWriter';
import type {
  DocumentScannerPage,
  NativeDocumentScannerModule,
} from '@core/scanner/DocumentScannerAdapter';
import type {
  MediaStoreCategory,
  MediaStorePage,
  MediaStoreRow,
  NativeMediaStoreModule,
} from '@core/scanner/MediaStoreAdapter';
import type { PermissionSnapshot } from '@core/permissions/types';
import type { MediaFileRow } from '@core/storage/types';
import { useMediaScannerStore } from '@core/store/useMediaScannerStore';

type SqlValue = string | number | null;
type SqlCommand = [string, SqlValue[]?];

const FILE_COLUMNS = [
  'id',
  'file_path',
  'file_name',
  'extension',
  'mime_type',
  'category',
  'folder_path',
  'folder_name',
  'size_bytes',
  'duration_ms',
  'width',
  'height',
  'artist',
  'album',
  'date_modified',
  'date_added',
  'is_hidden',
  'is_messenger_media',
  'is_favorite',
  'is_vaulted',
] as const;

const FOLDER_COLUMNS = [
  'folder_path',
  'folder_name',
  'category',
  'item_count',
  'total_size_bytes',
  'thumbnail_uri',
  'last_modified',
  'is_excluded',
] as const;

const rowFromParams = <T extends readonly string[]>(
  columns: T,
  params: SqlValue[] = [],
): Record<T[number], SqlValue> =>
  Object.fromEntries(columns.map((column, index) => [column, params[index] ?? null])) as Record<
    T[number],
    SqlValue
  >;

class MemorySqlite {
  readonly stagedFiles = new Map<string, Record<string, SqlValue>>();
  readonly stagedFolders = new Map<string, Record<string, SqlValue>>();
  readonly files = new Map<string, Record<string, SqlValue>>();
  readonly folders = new Map<string, Record<string, SqlValue>>();
  readonly fts = new Map<string, string>();
  failNextStage = false;

  async executeBatch(commands: SqlCommand[]): Promise<void> {
    for (const [sql, params] of commands) {
      if (sql === 'BEGIN IMMEDIATE' || sql === 'COMMIT' || sql.startsWith('CREATE TEMP TABLE')) {
        continue;
      }
      if (sql.includes('DELETE FROM scanner_staged_files')) {
        this.stagedFiles.clear();
      } else if (sql.includes('DELETE FROM scanner_staged_folders')) {
        this.stagedFolders.clear();
      } else if (sql.includes('INSERT INTO scanner_staged_files')) {
        if (this.failNextStage) {
          this.failNextStage = false;
          throw new Error('Injected SQLite staging error.');
        }
        const row = rowFromParams(FILE_COLUMNS, params);
        this.stagedFiles.set(String(row.file_path), row);
      } else if (sql.includes('INSERT INTO scanner_staged_folders')) {
        const row = rowFromParams(FOLDER_COLUMNS, params);
        this.stagedFolders.set(`${row.category}\u0000${row.folder_path}`, row);
      } else if (sql.includes('INSERT INTO media_files')) {
        for (const [filePath, row] of this.stagedFiles) {
          this.files.set(filePath, row);
          this.fts.set(filePath, String(row.file_name));
        }
      } else if (sql.includes('DELETE FROM media_files')) {
        for (const filePath of this.files.keys()) {
          if (!this.stagedFiles.has(filePath)) {
            this.files.delete(filePath);
            this.fts.delete(filePath);
          }
        }
      } else if (sql.includes('INSERT INTO folders_index')) {
        for (const [key, row] of this.stagedFolders) {
          this.folders.set(key, row);
        }
      } else if (sql.includes('DELETE FROM folders_index')) {
        for (const key of this.folders.keys()) {
          if (!this.stagedFolders.has(key)) {
            this.folders.delete(key);
          }
        }
      } else {
        throw new Error(`Unexpected SQL command: ${sql.trim()}`);
      }
    }
  }

  async executeSql(query: string): Promise<unknown> {
    if (query.includes('FROM scanner_staged_files')) {
      return { rows: [{ count: this.stagedFiles.size }] };
    }
    if (query.includes('FROM scanner_staged_folders')) {
      return { rows: [{ count: this.stagedFolders.size }] };
    }
    if (query.includes('FROM media_files AS existing')) {
      const staleCount = [...this.files.keys()].filter((filePath) => !this.stagedFiles.has(filePath))
        .length;
      return { rows: [{ count: staleCount }] };
    }
    throw new Error(`Unexpected SQL query: ${query}`);
  }
}

const permissions = (overrides: Partial<PermissionSnapshot> = {}): PermissionSnapshot => ({
  requiredPermissions: [],
  grantedPermissions: [],
  deniedPermissions: [],
  blockedPermissions: [],
  unavailablePermissions: [],
  limitedPermissions: [],
  allFilesAccessRequired: false,
  allFilesAccessEnabled: null,
  allFilesAccessStatus: 'not_applicable',
  mediaPermissionsReady: true,
  status: 'granted',
  ...overrides,
});

const mediaRow = (
  id: string,
  displayName: string,
  mimeType: string,
  folderPath: string,
  sizeBytes = 100,
  durationMs: number | null = null,
): MediaStoreRow => ({
  id,
  contentUri: `content://media/${id}`,
  displayName,
  mimeType,
  sizeBytes,
  dateModifiedMs: 1_700_000_000_000 + Number(id.replace(/\D/g, '') || 0),
  dateAddedMs: 1_699_000_000_000,
  durationMs,
  width: mimeType.startsWith('image/') ? 1920 : null,
  height: mimeType.startsWith('image/') ? 1080 : null,
  artist: null,
  album: null,
  folderPath,
  folderName: folderPath.split('/').at(-1) ?? folderPath,
});

const createMediaModule = (
  rows: Partial<Record<MediaStoreCategory, MediaStoreRow[]>>,
): NativeMediaStoreModule => ({
  queryMedia: jest.fn(async (category, _afterId, _pageSize): Promise<MediaStorePage> => ({
    items: rows[category] ?? [],
    nextAfterId: null,
    hasMore: false,
  })),
});

const createDocumentRow = (id: string, displayName: string, mimeType: string) => ({
  id,
  contentUri: `content://documents/${id}`,
  displayName,
  mimeType,
  sizeBytes: 250,
  dateModifiedMs: 1_700_000_000_000,
  dateAddedMs: 1_699_000_000_000,
  folderPath: '/storage/shared/Project',
  folderName: 'Project',
});

const createDocumentModule = (
  accessStatus: 'granted' | 'denied' | 'unsupported' = 'granted',
  items: ReturnType<typeof createDocumentRow>[] = [],
): NativeDocumentScannerModule => ({
  getAccessStatus: jest.fn().mockResolvedValue(accessStatus),
  queryDocuments: jest.fn(async (): Promise<DocumentScannerPage> => ({
    accessStatus,
    items,
    errors: [],
    nextAfterId: null,
    hasMore: false,
  })),
});

const createHarness = (options: {
  permissions?: PermissionSnapshot;
  mediaModule?: NativeMediaStoreModule;
  documentModule?: NativeDocumentScannerModule;
  database?: MemorySqlite;
  now?: () => number;
}) => {
  const database = options.database ?? new MemorySqlite();
  const writer = new ScannerIndexWriter({}, database);
  const mediaAdapter = new MediaStoreAdapter(options.mediaModule ?? createMediaModule({}));
  const documentAdapter = new DocumentScannerAdapter(options.documentModule ?? createDocumentModule());
  const service = new FileScannerService({
    permissionManager: {
      getPermissionSnapshot: jest
        .fn()
        .mockResolvedValue(options.permissions ?? permissions()),
    },
    mediaAdapter,
    documentAdapter,
    indexWriter: writer,
    store: useMediaScannerStore,
    storageStatsProvider: async () => null,
    now: options.now ?? (() => 10),
  });

  return { database, documentAdapter, mediaAdapter, service, writer };
};

describe('scanner integration', () => {
  beforeEach(() => {
    useMediaScannerStore.getState().reset();
  });

  it('discovers mixed media and documents, filters, aggregates, stages, and indexes idempotently', async () => {
    const audio = mediaRow('audio-1', 'song.mp3', 'audio/mpeg', '/storage/shared/Project', 500, 60_000);
    const photo = mediaRow('photo-2', 'cover.jpg', 'image/jpeg', '/storage/shared/Project', 300);
    const video = mediaRow('video-3', 'clip.mp4', 'video/mp4', '/storage/shared/Project', 700);
    const shortAudio = mediaRow('audio-4', 'notification.mp3', 'audio/mpeg', '/storage/shared/Music', 50, 5_000);
    const hiddenPhoto = mediaRow('photo-5', 'hidden.jpg', 'image/jpeg', '/storage/shared/.nomedia', 80);
    const messengerAudio = mediaRow('audio-6', 'forwarded.mp3', 'audio/mpeg', '/storage/WhatsApp/Media', 90, 90_000);
    const duplicateAudio = { ...audio, id: 'audio-duplicate', contentUri: audio.contentUri };
    const mediaModule = createMediaModule({
      AUDIO: [audio, duplicateAudio, shortAudio, messengerAudio],
      VIDEO: [video],
      PHOTO: [photo, hiddenPhoto],
    });
    const documents = createDocumentModule('granted', [
      createDocumentRow('pdf-7', 'brief.pdf', 'application/pdf'),
      createDocumentRow('doc-8', 'notes.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'),
    ]);
    const { database, service } = createHarness({ mediaModule, documentModule: documents });
    const progress: string[] = [];
    const unsubscribe = useMediaScannerStore.subscribe((state) => {
      progress.push(`${state.phase}:${state.discoveredCount}:${state.indexedCount}`);
    });

    const result = await service.startScan({
      batchSize: 2,
      excludeShortAudio: true,
      minAudioDurationMs: 30_000,
      excludeHiddenPaths: true,
      excludeMessengerFolders: true,
    });
    unsubscribe();

    expect(result.status).toBe('completed');
    expect(result.discoveredCount).toBe(9);
    expect(result.skippedCount).toBe(4);
    expect(result.indexedCount).toBe(5);
    expect(result.categoryCounts).toEqual({
      AUDIO: 1,
      VIDEO: 1,
      PHOTO: 1,
      PDF: 1,
      OTHER_DOC: 1,
    });
    expect(database.files.size).toBe(5);
    expect(database.fts.size).toBe(5);
    expect(database.fts.get(audio.contentUri)).toBe('song.mp3');
    expect([...database.files.values()].filter((row) => row.category === 'AUDIO')).toHaveLength(1);
    expect(database.files.has(hiddenPhoto.contentUri)).toBe(false);
    expect(database.files.has(messengerAudio.contentUri)).toBe(false);
    expect(database.files.has(shortAudio.contentUri)).toBe(false);
    expect(database.folders.get(`AUDIO\u0000${audio.folderPath}`)?.item_count).toBe(1);
    expect(database.folders.get(`PHOTO\u0000${photo.folderPath}`)?.item_count).toBe(1);
    expect(database.folders.get(`VIDEO\u0000${video.folderPath}`)?.item_count).toBe(1);
    expect(database.folders.get(`PDF\u0000/storage/shared/Project`)?.item_count).toBe(1);
    expect(database.folders.get(`OTHER_DOC\u0000/storage/shared/Project`)?.item_count).toBe(1);
    expect(useMediaScannerStore.getState().indexedCount).toBe(5);
    expect(useMediaScannerStore.getState().categoryCounts.PDF).toBe(1);
    expect(progress).toContain('completed:9:5');

    const repeated = await service.startScan({
      batchSize: 2,
      excludeShortAudio: true,
      minAudioDurationMs: 30_000,
      excludeHiddenPaths: true,
      excludeMessengerFolders: true,
    });
    expect(repeated.status).toBe('completed');
    expect(database.files.size).toBe(5);
    expect(database.fts.size).toBe(5);
  });

  it('keeps short audio when filtering is disabled and ignores denied documents without replacing live rows', async () => {
    const existing = {
      id: 'existing',
      file_path: '/old-index.mp3',
      file_name: 'old-index.mp3',
      extension: 'mp3',
      mime_type: 'audio/mpeg',
      category: 'AUDIO',
      folder_path: '/old',
      folder_name: 'old',
      size_bytes: 1,
      duration_ms: 60_000,
      width: null,
      height: null,
      artist: null,
      album: null,
      date_modified: 1,
      date_added: 1,
      is_hidden: 0,
      is_messenger_media: 0,
      is_favorite: 0,
      is_vaulted: 0,
    } satisfies MediaFileRow;
    const database = new MemorySqlite();
    database.files.set(existing.file_path, existing);
    database.fts.set(existing.file_path, existing.file_name);
    const audio = mediaRow('audio-1', 'short.mp3', 'audio/mpeg', '/storage/Music', 80, 1_000);
    const { service } = createHarness({
      database,
      permissions: permissions({ allFilesAccessRequired: true, allFilesAccessEnabled: false }),
      mediaModule: createMediaModule({ AUDIO: [audio] }),
      documentModule: createDocumentModule('denied'),
    });

    const result = await service.startScan({ excludeShortAudio: false });

    expect(result.status).toBe('partial');
    expect(result.partialSources).toContain('documents');
    expect(result.categoryCounts.AUDIO).toBe(1);
    expect(database.files.has(existing.file_path)).toBe(true);
    expect(database.files.has(audio.contentUri)).toBe(false);
    expect(database.fts.has(existing.file_path)).toBe(true);
    expect(database.stagedFiles.size).toBe(0);
  });

  it('discards staged results when a scan is cancelled', async () => {
    let unblock: () => void = () => undefined;
    const pending = new Promise<void>((resolve) => {
      unblock = resolve;
    });
    const database = new MemorySqlite();
    const audio = mediaRow('audio-1', 'track.mp3', 'audio/mpeg', '/storage/Music');
    const mediaModule: NativeMediaStoreModule = {
      queryMedia: jest.fn(async (category, afterId) => {
        if (category === 'AUDIO' && afterId == null) {
          return {
            items: [audio],
            nextAfterId: '1',
            hasMore: true,
          };
        }
        if (category === 'AUDIO') {
          await pending;
        }
        return { items: [], nextAfterId: null, hasMore: false };
      }),
    };
    const { service } = createHarness({ database, mediaModule });
    const scan = service.startScan({ batchSize: 1 });

    for (let attempt = 0; attempt < 20 && database.stagedFiles.size === 0; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
    expect(database.stagedFiles.size).toBe(1);
    expect(service.cancelScan()).toBe(true);
    unblock();

    const result = await scan;

    expect(result.status).toBe('cancelled');
    expect(database.files.size).toBe(0);
    expect(database.stagedFiles.size).toBe(0);
    expect(useMediaScannerStore.getState().status).toBe('cancelled');
  });

  it('discards staging and retains the previous index on a fatal database error', async () => {
    const database = new MemorySqlite();
    database.failNextStage = true;
    database.files.set('/previous.mp3', { file_path: '/previous.mp3', file_name: 'previous.mp3' });
    const audio = mediaRow('audio-1', 'track.mp3', 'audio/mpeg', '/storage/Music');
    const { service } = createHarness({
      database,
      mediaModule: createMediaModule({ AUDIO: [audio] }),
    });

    const result = await service.startScan({ batchSize: 1 });

    expect(result.status).toBe('failed');
    expect(result.errors.at(-1)?.code).toBe('INDEXING_FAILED');
    expect(database.files.has('/previous.mp3')).toBe(true);
    expect(database.files.has(audio.contentUri)).toBe(false);
    expect(database.stagedFiles.size).toBe(0);
    expect(useMediaScannerStore.getState().status).toBe('error');
  });
});
