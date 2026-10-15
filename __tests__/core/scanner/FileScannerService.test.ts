import {
  FileScannerService,
  type FileScannerIndexWriter,
  type FileScannerMediaAdapter,
} from '@core/scanner';
import type { PermissionSnapshot } from '@core/permissions/types';
import type { MediaFileRow } from '@core/storage/types';
import { useMediaScannerStore } from '@core/store/useMediaScannerStore';

const createFile = (overrides: Partial<MediaFileRow> = {}): MediaFileRow => ({
  id: 'file-1',
  file_path: 'content://media/audio/1',
  file_name: 'track.mp3',
  extension: 'mp3',
  mime_type: 'audio/mpeg',
  category: 'AUDIO',
  folder_path: 'Music/',
  folder_name: 'Music',
  size_bytes: 1024,
  duration_ms: 60_000,
  width: null,
  height: null,
  artist: 'Artist',
  album: 'Album',
  date_modified: 100,
  date_added: 50,
  is_hidden: 0,
  is_messenger_media: 0,
  is_favorite: 0,
  is_vaulted: 0,
  ...overrides,
});

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

const createStoreDependency = () => ({
  getState: () => useMediaScannerStore.getState(),
});

const emptyDocumentAdapter = {
  discoverDocuments: jest.fn().mockResolvedValue({
    status: 'completed',
    accessStatus: 'granted',
    files: [],
    discoveredCount: 0,
    errors: [],
  }),
};

describe('FileScannerService', () => {
  beforeEach(() => {
    useMediaScannerStore.getState().reset();
    jest.clearAllMocks();
    emptyDocumentAdapter.discoverDocuments.mockResolvedValue({
      status: 'completed',
      accessStatus: 'granted',
      files: [],
      discoveredCount: 0,
      errors: [],
    });
  });

  it('scans, filters, batches index writes, aggregates folders, and reports progress', async () => {
    const first = createFile({ id: 'audio-1' });
    const second = createFile({
      id: 'photo-1',
      file_path: 'content://media/images/1',
      file_name: 'photo.jpg',
      extension: 'jpg',
      mime_type: 'image/jpeg',
      category: 'PHOTO',
      duration_ms: null,
    });
    const shortAudio = createFile({
      id: 'audio-short',
      file_path: 'content://media/audio/short',
      duration_ms: 10_000,
    });
    const mediaAdapter: FileScannerMediaAdapter = {
      discoverMedia: jest.fn(async function* (category) {
        if (category === 'AUDIO') {
          yield first;
          yield shortAudio;
        } else if (category === 'PHOTO') {
          yield second;
        }
      }),
    };
    const writeIndex = jest
      .fn()
      .mockImplementation(async ({ files }: { files: readonly MediaFileRow[] }) => ({
        filesUpserted: files.length,
        foldersUpserted: 0,
      }));
    const writer = { writeIndex } as FileScannerIndexWriter;
    const progress: string[] = [];
    const service = new FileScannerService({
      permissionManager: { getPermissionSnapshot: jest.fn().mockResolvedValue(permissions()) },
      mediaAdapter,
      documentAdapter: emptyDocumentAdapter,
      indexWriter: writer,
      store: createStoreDependency(),
      now: jest.fn().mockReturnValueOnce(100).mockReturnValueOnce(200),
    });

    const result = await service.startScan({
      batchSize: 1,
      onProgress: ({ phase, discoveredCount, indexedCount }) => {
        progress.push(`${phase}:${discoveredCount}:${indexedCount}`);
      },
    });

    expect(result).toMatchObject({
      status: 'completed',
      discoveredCount: 3,
      indexedCount: 2,
      skippedCount: 1,
      categoryCounts: { AUDIO: 1, PHOTO: 1, VIDEO: 0, PDF: 0, OTHER_DOC: 0 },
    });
    expect(writeIndex).toHaveBeenCalledTimes(4);
    expect(writeIndex.mock.calls[0][0].files).toEqual([first]);
    expect(writeIndex.mock.calls[1][0].files).toEqual([second]);
    expect(writeIndex.mock.calls[2][0].folders).toHaveLength(1);
    expect(writeIndex.mock.calls[3][0].folders).toHaveLength(1);
    expect(progress).toContain('completed:3:2');
    const progressCounts = progress.map((entry) => Number(entry.split(':')[1]));
    expect(progressCounts).toEqual([...progressCounts].sort((left, right) => left - right));
    expect(useMediaScannerStore.getState().status).toBe('completed');
    expect(emptyDocumentAdapter.discoverDocuments).toHaveBeenCalledTimes(1);
  });

  it('returns permission_required without scanning if media access is missing', async () => {
    const mediaAdapter: FileScannerMediaAdapter = {
      discoverMedia: jest.fn(async function* () {}),
    };
    const documentAdapter = { discoverDocuments: jest.fn() };
    const service = new FileScannerService({
      permissionManager: {
        getPermissionSnapshot: jest
          .fn()
          .mockResolvedValue(permissions({ mediaPermissionsReady: false, status: 'denied' })),
      },
      mediaAdapter,
      documentAdapter,
      indexWriter: { writeIndex: jest.fn() } as unknown as FileScannerIndexWriter,
      store: createStoreDependency(),
      now: () => 100,
    });

    const result = await service.startScan();

    expect(result.status).toBe('permission_required');
    expect(result.errors[0].code).toBe('ACCESS_DENIED');
    expect(mediaAdapter.discoverMedia).not.toHaveBeenCalled();
    expect(documentAdapter.discoverDocuments).not.toHaveBeenCalled();
  });

  it('completes available media as partial when All Files Access is unavailable', async () => {
    const mediaAdapter: FileScannerMediaAdapter = {
      discoverMedia: jest.fn(async function* (category) {
        if (category === 'AUDIO') {
          yield createFile();
        }
      }),
    };
    const documentAdapter = { discoverDocuments: jest.fn() };
    const service = new FileScannerService({
      permissionManager: {
        getPermissionSnapshot: jest
          .fn()
          .mockResolvedValue(
            permissions({ allFilesAccessRequired: true, allFilesAccessEnabled: false }),
          ),
      },
      mediaAdapter,
      documentAdapter,
      indexWriter: {
        writeIndex: jest.fn().mockResolvedValue({ filesUpserted: 1, foldersUpserted: 0 }),
      },
      store: createStoreDependency(),
      now: () => 100,
    });

    const result = await service.startScan();

    expect(result.status).toBe('partial');
    expect(result.partialSources).toContain('documents');
    expect(result.categoryCounts.AUDIO).toBe(1);
    expect(documentAdapter.discoverDocuments).not.toHaveBeenCalled();
    expect(useMediaScannerStore.getState().status).toBe('partial');
  });

  it('preserves discovered files and reports document adapter partial errors', async () => {
    emptyDocumentAdapter.discoverDocuments.mockResolvedValueOnce({
      status: 'partial',
      accessStatus: 'denied',
      files: [],
      discoveredCount: 0,
      errors: [
        {
          code: 'ACCESS_DENIED',
          message: 'Documents were not accessible.',
          stage: 'discovering',
          recoverable: true,
        },
      ],
    });
    const service = new FileScannerService({
      permissionManager: { getPermissionSnapshot: jest.fn().mockResolvedValue(permissions()) },
      mediaAdapter: {
        discoverMedia: jest.fn(async function* (category) {
          if (category === 'VIDEO') {
            yield createFile({ category: 'VIDEO', file_name: 'film.mp4', extension: 'mp4' });
          }
        }),
      },
      documentAdapter: emptyDocumentAdapter,
      indexWriter: {
        writeIndex: jest.fn().mockImplementation(async ({ files }) => ({
          filesUpserted: files.length,
          foldersUpserted: 0,
        })),
      },
      store: createStoreDependency(),
      now: () => 100,
    });

    const result = await service.startScan();

    expect(result.status).toBe('partial');
    expect(result.partialSources).toContain('documents');
    expect(result.errors[0].code).toBe('ACCESS_DENIED');
    expect(result.categoryCounts.VIDEO).toBe(1);
  });

  it('consumes streamed documents in bounded batches', async () => {
    const documentFiles = [
      createFile({
        id: 'pdf-1',
        file_path: 'content://media/files/1',
        file_name: 'one.pdf',
        category: 'PDF',
        mime_type: 'application/pdf',
      }),
      createFile({
        id: 'pdf-2',
        file_path: 'content://media/files/2',
        file_name: 'two.pdf',
        category: 'PDF',
        mime_type: 'application/pdf',
      }),
    ];
    const documentAdapter = {
      discoverDocuments: jest.fn(),
      scanDocuments: jest.fn(async (onFile: (file: MediaFileRow) => void | Promise<void>) => {
        for (const file of documentFiles) {
          await onFile(file);
        }
        return {
          status: 'completed' as const,
          accessStatus: 'granted' as const,
          discoveredCount: documentFiles.length,
          errors: [],
        };
      }),
    };
    const writer: FileScannerIndexWriter = {
      writeIndex: jest.fn().mockImplementation(async ({ files }) => ({
        filesUpserted: files.length,
        foldersUpserted: 0,
      })),
    };
    const service = new FileScannerService({
      permissionManager: { getPermissionSnapshot: jest.fn().mockResolvedValue(permissions()) },
      mediaAdapter: { discoverMedia: jest.fn(async function* () {}) },
      documentAdapter,
      indexWriter: writer,
      store: createStoreDependency(),
      now: () => 100,
    });

    const result = await service.startScan({ batchSize: 1 });

    expect(result.status).toBe('completed');
    expect(result.indexedCount).toBe(2);
    expect(documentAdapter.discoverDocuments).not.toHaveBeenCalled();
    expect(writer.writeIndex).toHaveBeenCalledTimes(3);
    expect(writer.writeIndex.mock.calls[0][0].files).toHaveLength(1);
    expect(writer.writeIndex.mock.calls[1][0].files).toHaveLength(1);
  });

  it('cancels without reporting success and does not start overlapping scans', async () => {
    let releasePermissions: (value: PermissionSnapshot) => void = () => undefined;
    const getPermissionSnapshot = jest.fn(
      () =>
        new Promise<PermissionSnapshot>((resolve) => {
          releasePermissions = resolve;
        }),
    );
    const service = new FileScannerService({
      permissionManager: { getPermissionSnapshot },
      mediaAdapter: { discoverMedia: jest.fn(async function* () {}) },
      documentAdapter: emptyDocumentAdapter,
      indexWriter: { writeIndex: jest.fn() } as unknown as FileScannerIndexWriter,
      store: createStoreDependency(),
      now: () => 100,
    });

    const phases: string[] = [];
    const firstRequest = service.startScan({
      onProgress: ({ phase }) => phases.push(phase),
    });
    const duplicateRequest = service.startScan();

    expect(firstRequest).toBe(duplicateRequest);
    expect(service.cancelScan()).toBe(true);
    releasePermissions(permissions());

    const result = await firstRequest;

    expect(result.status).toBe('cancelled');
    expect(result.errors[0].code).toBe('SCAN_CANCELLED');
    expect(useMediaScannerStore.getState().status).toBe('cancelled');
    expect(phases).not.toContain('completed');
    expect(service.cancelScan()).toBe(false);
  });

  it('continues after a recoverable media collection failure', async () => {
    const mediaAdapter: FileScannerMediaAdapter = {
      discoverMedia: jest.fn(async function* (category) {
        if (category === 'AUDIO') {
          yield createFile();
          throw new Error('Audio collection disappeared.');
        }
        if (category === 'PHOTO') {
          yield createFile({
            id: 'photo',
            file_path: 'content://media/images/1',
            file_name: 'photo.jpg',
            category: 'PHOTO',
          });
        }
      }),
    };
    const service = new FileScannerService({
      permissionManager: { getPermissionSnapshot: jest.fn().mockResolvedValue(permissions()) },
      mediaAdapter,
      documentAdapter: emptyDocumentAdapter,
      indexWriter: {
        writeIndex: jest.fn().mockImplementation(async ({ files }) => ({
          filesUpserted: files.length,
          foldersUpserted: 0,
        })),
      },
      store: createStoreDependency(),
      now: () => 100,
    });

    const result = await service.startScan();

    expect(result.status).toBe('partial');
    expect(result.partialSources).toContain('audio');
    expect(result.errors[0].message).toBe('Audio collection disappeared.');
    expect(result.indexedCount).toBe(2);
  });

  it('marks fatal database failures as failed and does not report completion', async () => {
    const service = new FileScannerService({
      permissionManager: { getPermissionSnapshot: jest.fn().mockResolvedValue(permissions()) },
      mediaAdapter: {
        discoverMedia: jest.fn(async function* (category) {
          if (category === 'AUDIO') {
            yield createFile();
          }
        }),
      },
      documentAdapter: emptyDocumentAdapter,
      indexWriter: {
        writeIndex: jest.fn().mockRejectedValue(new Error('Database write failed.')),
      },
      store: createStoreDependency(),
      now: () => 100,
    });

    const result = await service.startScan({ batchSize: 1 });

    expect(result.status).toBe('failed');
    expect(result.errors.at(-1)?.code).toBe('INDEXING_FAILED');
    expect(useMediaScannerStore.getState().status).toBe('error');
    expect(useMediaScannerStore.getState().lastSuccessfulScanTimestampMs).toBeNull();
  });

  it('applies custom short-audio and messenger-folder exclusions', async () => {
    const mediaAdapter: FileScannerMediaAdapter = {
      discoverMedia: jest.fn(async function* (category) {
        if (category === 'AUDIO') {
          yield createFile({ duration_ms: 1_000 });
          yield createFile({
            id: 'messenger',
            file_path: 'content://media/audio/2',
            folder_path: '/WhatsApp/Media',
          });
        }
      }),
    };
    const writer: FileScannerIndexWriter = {
      writeIndex: jest.fn().mockResolvedValue({ filesUpserted: 0, foldersUpserted: 0 }),
    };
    const service = new FileScannerService({
      permissionManager: { getPermissionSnapshot: jest.fn().mockResolvedValue(permissions()) },
      mediaAdapter,
      documentAdapter: emptyDocumentAdapter,
      indexWriter: writer,
      store: createStoreDependency(),
      now: () => 100,
    });

    const result = await service.startScan({
      excludeShortAudio: true,
      minAudioDurationMs: 5_000,
      excludeMessengerFolders: true,
    });

    expect(result.skippedCount).toBe(2);
    expect(result.indexedCount).toBe(0);
  });

  it('filters hidden directories using the supplied folder path, not only the content URI', async () => {
    const hidden = createFile({
      file_path: 'content://media/images/hidden',
      file_name: 'photo.jpg',
      category: 'PHOTO',
      folder_path: 'DCIM/.private',
      duration_ms: null,
    });
    const writer: FileScannerIndexWriter = {
      writeIndex: jest.fn().mockResolvedValue({ filesUpserted: 0, foldersUpserted: 0 }),
    };
    const service = new FileScannerService({
      permissionManager: { getPermissionSnapshot: jest.fn().mockResolvedValue(permissions()) },
      mediaAdapter: {
        discoverMedia: jest.fn(async function* (category) {
          if (category === 'PHOTO') {
            yield hidden;
          }
        }),
      },
      documentAdapter: emptyDocumentAdapter,
      indexWriter: writer,
      store: createStoreDependency(),
      now: () => 100,
    });

    const result = await service.startScan();

    expect(result.skippedCount).toBe(1);
    expect(result.indexedCount).toBe(0);
  });
});
