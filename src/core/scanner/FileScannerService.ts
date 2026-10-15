import type { PermissionSnapshot } from '@core/permissions/types';
import { permissionManager } from '@core/permissions/PermissionManager';
import type { FolderIndexRow, MediaCategory, MediaFileRow } from '@core/storage/types';
import { useMediaScannerStore } from '@core/store/useMediaScannerStore';
import type { DocumentDiscoveryResult, DocumentDiscoverySummary } from './DocumentScannerAdapter';
import { documentScannerAdapter } from './DocumentScannerAdapter';
import { FolderAggregationAccumulator } from './folderAggregator';
import { mediaStoreAdapter } from './MediaStoreAdapter';
import { scannerIndexWriter } from './ScannerIndexWriter';
import { isLikelyMessengerPath, shouldIncludeDiscoveredFile } from './pathFilters';
import { getDeviceStorageStats } from './storageStats';
import type { DeviceStorageStats } from './storageStats';
import type { ScanError, ScanOptions } from './types';

export type FileScannerPhase =
  'checkingPermissions' | 'scanning' | 'filtering' | 'indexing' | 'completed';

export type FileScannerResultStatus =
  'completed' | 'partial' | 'cancelled' | 'failed' | 'permission_required';

export interface FileScannerProgress {
  scanId: string;
  phase: FileScannerPhase;
  category: MediaCategory | null;
  discoveredCount: number;
  indexedCount: number;
  skippedCount: number;
  categoryCounts: Record<MediaCategory, number>;
}

export interface FileScannerResult {
  scanId: string;
  status: FileScannerResultStatus;
  discoveredCount: number;
  indexedCount: number;
  skippedCount: number;
  categoryCounts: Record<MediaCategory, number>;
  startedAtMs: number;
  completedAtMs: number;
  partialSources: string[];
  errors: ScanError[];
}

export interface FileScannerOptions extends ScanOptions {
  excludeMessengerFolders?: boolean;
  batchSize?: number;
  onProgress?: (progress: FileScannerProgress) => void;
}

export interface FileScannerPermissionManager {
  getPermissionSnapshot(): Promise<PermissionSnapshot>;
}

export interface FileScannerMediaAdapter {
  discoverMedia(
    category: 'AUDIO' | 'VIDEO' | 'PHOTO',
  ): AsyncGenerator<MediaFileRow, void, undefined>;
}

export interface FileScannerDocumentAdapter {
  discoverDocuments(): Promise<DocumentDiscoveryResult>;
  scanDocuments?: (
    onFile: (file: MediaFileRow) => void | Promise<void>,
  ) => Promise<DocumentDiscoverySummary>;
}

export interface FileScannerIndexWriter {
  beginScanStaging: () => Promise<void>;
  stageIndex: (params: {
    files: readonly MediaFileRow[];
    folders: readonly FolderIndexRow[];
  }) => Promise<{ filesStaged: number; foldersStaged: number }>;
  commitScanStaging: () => Promise<{
    filesStaged: number;
    foldersStaged: number;
    staleFilesRemoved: number;
  }>;
  discardScanStaging: () => Promise<void>;
}

export interface FileScannerStore {
  getState(): {
    startScan: (startedAtMs?: number) => void;
    beginScanning: () => void;
    beginIndexing: () => void;
    updateProgress: (progress: {
      phase?: 'discovering' | 'normalizing' | 'indexing' | 'completed';
      discoveredCount?: number;
      processedCount?: number;
      indexedCount?: number;
      totalCount?: number | null;
      categoryCounts?: Partial<Record<MediaCategory, number>>;
    }) => void;
    incrementCategoryCount: (category: MediaCategory, amount?: number) => void;
    completeScan: (completedAtMs?: number) => void;
    markPartial: (error?: ScanError) => void;
    markCancelled: (error: ScanError) => void;
    failScan: (error: ScanError) => void;
    setLastScanResult?: (
      status: 'completed' | 'partial' | 'cancelled' | 'error' | 'permission_required',
      timestampMs: number,
    ) => void;
    setIndexedMediaBytes?: (bytes: number) => void;
    setPermissionSnapshot?: (snapshot: PermissionSnapshot, checkedAtMs: number) => void;
    setStorageStats?: (stats: {
      usedBytes?: number | null;
      freeBytes?: number | null;
      totalBytes?: number | null;
      scope?: 'internal_data_volume' | null;
    }) => void;
  };
}

export interface FileScannerServiceDependencies {
  permissionManager: FileScannerPermissionManager;
  mediaAdapter: FileScannerMediaAdapter;
  documentAdapter: FileScannerDocumentAdapter;
  indexWriter: FileScannerIndexWriter;
  store: FileScannerStore;
  storageStatsProvider: () => Promise<DeviceStorageStats | null>;
  now: () => number;
}

const MEDIA_CATEGORIES: Array<'AUDIO' | 'VIDEO' | 'PHOTO'> = ['AUDIO', 'VIDEO', 'PHOTO'];
const DEFAULT_BATCH_SIZE = 100;
const MAX_BATCH_SIZE = 500;

const emptyCategoryCounts = (): Record<MediaCategory, number> => ({
  AUDIO: 0,
  VIDEO: 0,
  PHOTO: 0,
  PDF: 0,
  OTHER_DOC: 0,
});

const createError = (
  code: ScanError['code'],
  message: string,
  stage: ScanError['stage'],
  recoverable: boolean,
  filePath?: string,
): ScanError => ({
  code,
  message,
  stage,
  recoverable,
  ...(filePath ? { filePath } : {}),
});

const createScanId = (startedAtMs: number, sequence: number): string =>
  `scan-${startedAtMs}-${sequence}`;

const getFilterPath = (file: MediaFileRow): string =>
  file.folder_path
    ? `${file.folder_path.replace(/[\\/]+$/, '')}/${file.file_name}`
    : file.file_path;

export class FileScannerService {
  private activeScan: Promise<FileScannerResult> | null = null;
  private cancelRequested = false;
  private sequence = 0;
  private readonly dependencies: FileScannerServiceDependencies;

  constructor(dependencies: Partial<FileScannerServiceDependencies> = {}) {
    this.dependencies = {
      permissionManager: dependencies.permissionManager ?? permissionManager,
      mediaAdapter: dependencies.mediaAdapter ?? mediaStoreAdapter,
      documentAdapter: dependencies.documentAdapter ?? documentScannerAdapter,
      indexWriter: dependencies.indexWriter ?? scannerIndexWriter,
      store: dependencies.store ?? useMediaScannerStore,
      storageStatsProvider: dependencies.storageStatsProvider ?? getDeviceStorageStats,
      now: dependencies.now ?? Date.now,
    };
  }

  startScan(options: FileScannerOptions = {}): Promise<FileScannerResult> {
    if (this.activeScan) {
      return this.activeScan;
    }

    const batchSize = options.batchSize ?? DEFAULT_BATCH_SIZE;
    if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > MAX_BATCH_SIZE) {
      return Promise.reject(
        new RangeError(`Scanner batchSize must be an integer between 1 and ${MAX_BATCH_SIZE}`),
      );
    }
    if (
      options.minAudioDurationMs != null &&
      (!Number.isFinite(options.minAudioDurationMs) || options.minAudioDurationMs < 0)
    ) {
      return Promise.reject(
        new RangeError('minAudioDurationMs must be a finite, non-negative number'),
      );
    }

    this.cancelRequested = false;
    this.sequence += 1;
    const scan = this.runScan(options, batchSize, this.sequence);
    this.activeScan = scan;
    const clearActiveScan = (): void => {
      if (this.activeScan === scan) {
        this.activeScan = null;
        this.cancelRequested = false;
      }
    };
    void scan.then(clearActiveScan, clearActiveScan);
    return scan;
  }

  cancelScan(): boolean {
    if (!this.activeScan) {
      return false;
    }

    this.cancelRequested = true;
    return true;
  }

  async refreshPermissions(): Promise<PermissionSnapshot> {
    const snapshot = await this.dependencies.permissionManager.getPermissionSnapshot();
    this.dependencies.store.getState().setPermissionSnapshot?.(snapshot, this.dependencies.now());
    return snapshot;
  }

  async refreshStorageStats(): Promise<DeviceStorageStats | null> {
    const stats = await this.dependencies.storageStatsProvider();
    this.dependencies.store.getState().setStorageStats?.({
      usedBytes: stats?.usedBytes ?? null,
      freeBytes: stats?.freeBytes ?? null,
      totalBytes: stats?.totalBytes ?? null,
      scope: stats?.scope ?? null,
    });
    return stats;
  }

  rescan(options: FileScannerOptions = {}): Promise<FileScannerResult> {
    return this.startScan(options);
  }

  private async runScan(
    options: FileScannerOptions,
    batchSize: number,
    sequence: number,
  ): Promise<FileScannerResult> {
    const startedAtMs = this.dependencies.now();
    const scanId = createScanId(startedAtMs, sequence);
    const errors: ScanError[] = [];
    const partialSources = new Set<string>();
    const counts = emptyCategoryCounts();
    const aggregateAccumulator = new FolderAggregationAccumulator();
    const pendingFiles: MediaFileRow[] = [];
    let discoveredCount = 0;
    let indexedCount = 0;
    let indexedMediaBytes = 0;
    let skippedCount = 0;
    let databaseFailed = false;
    let stagingStarted = false;
    let permissionSnapshot: PermissionSnapshot;

    const emit = (phase: FileScannerPhase, category: MediaCategory | null): void => {
      const progress: FileScannerProgress = {
        scanId,
        phase,
        category,
        discoveredCount,
        indexedCount,
        skippedCount,
        categoryCounts: { ...counts },
      };

      options.onProgress?.(progress);
      const store = this.dependencies.store.getState();
      if (phase === 'indexing') {
        store.beginIndexing();
      } else if (phase === 'scanning' || phase === 'filtering') {
        store.beginScanning();
      }
      store.updateProgress({
        phase:
          phase === 'indexing'
            ? 'indexing'
            : phase === 'completed'
              ? 'completed'
              : phase === 'filtering'
                ? 'normalizing'
                : 'discovering',
        discoveredCount,
        processedCount: discoveredCount,
        indexedCount,
        totalCount: null,
        categoryCounts: counts,
      });
    };

    const flushFiles = async (): Promise<void> => {
      if (pendingFiles.length === 0) {
        return;
      }

      emit('indexing', null);
      const batch = pendingFiles.splice(0, pendingFiles.length);
      try {
        await this.dependencies.indexWriter.stageIndex({
          files: batch,
          folders: [],
        });
      } catch (error) {
        databaseFailed = true;
        throw error;
      }
      emit('indexing', null);
    };

    const failDatabase = (error: unknown): FileScannerResult => {
      const writeError = createError(
        'INDEXING_FAILED',
        error instanceof Error ? error.message : 'Unable to write the scan index.',
        'indexing',
        false,
      );
      errors.push(writeError);
      this.dependencies.store.getState().failScan(writeError);
      const completedAtMs = this.dependencies.now();
      setLastResult('error', completedAtMs);
      return result('failed', completedAtMs);
    };

    const result = (status: FileScannerResultStatus, completedAtMs: number): FileScannerResult => ({
      scanId,
      status,
      discoveredCount,
      indexedCount,
      skippedCount,
      categoryCounts: { ...counts },
      startedAtMs,
      completedAtMs,
      partialSources: Array.from(partialSources),
      errors: [...errors],
    });

    const setLastResult = (
      status: 'completed' | 'partial' | 'cancelled' | 'error' | 'permission_required',
      timestampMs: number,
    ): void => {
      this.dependencies.store.getState().setLastScanResult?.(status, timestampMs);
    };

    const cancelResult = async (): Promise<FileScannerResult> => {
      const cancelledError = createError(
        'SCAN_CANCELLED',
        'Scan was cancelled before completion.',
        'discovering',
        true,
      );

      try {
        if (stagingStarted) {
          await this.dependencies.indexWriter.discardScanStaging();
        }
      } catch (error) {
        const writeError = createError(
          'INDEXING_FAILED',
          error instanceof Error ? error.message : 'Unable to flush the cancelled scan batch.',
          'indexing',
          false,
        );
        errors.push(writeError);
        this.dependencies.store.getState().failScan(writeError);
        const completedAtMs = this.dependencies.now();
        setLastResult('error', completedAtMs);
        return result('failed', completedAtMs);
      }

      errors.push(cancelledError);
      this.dependencies.store.getState().markCancelled(cancelledError);
      const completedAtMs = this.dependencies.now();
      setLastResult('cancelled', completedAtMs);
      return result('cancelled', completedAtMs);
    };

    const processFile = async (file: MediaFileRow): Promise<void> => {
      if (this.cancelRequested) {
        throw new Error('SCAN_CANCEL_REQUESTED');
      }

      discoveredCount += 1;
      emit('filtering', file.category);

      let includeFile = shouldIncludeDiscoveredFile(
        {
          filePath: getFilterPath(file),
          durationMs: file.duration_ms,
          category: file.category,
        },
        options,
      );

      if (includeFile && options.excludeMessengerFolders) {
        includeFile = !isLikelyMessengerPath(file.folder_path);
      }

      if (!includeFile) {
        skippedCount += 1;
        return;
      }

      if (!aggregateAccumulator.add(file)) {
        skippedCount += 1;
        return;
      }

      pendingFiles.push(file);
      indexedMediaBytes += Math.max(0, file.size_bytes);
      counts[file.category] += 1;
      if (pendingFiles.length >= batchSize) {
        await flushFiles();
      }
    };

    this.dependencies.store.getState().startScan(startedAtMs);
    emit('checkingPermissions', null);

    try {
      permissionSnapshot = await this.dependencies.permissionManager.getPermissionSnapshot();
    } catch (error) {
      const permissionError = createError(
        'ACCESS_DENIED',
        error instanceof Error ? error.message : 'Unable to check scanner permissions.',
        'discovering',
        false,
      );
      errors.push(permissionError);
      this.dependencies.store.getState().failScan(permissionError);
      const completedAtMs = this.dependencies.now();
      setLastResult('error', completedAtMs);
      return result('failed', completedAtMs);
    }

    if (!permissionSnapshot.mediaPermissionsReady) {
      const permissionError = createError(
        'ACCESS_DENIED',
        'Required media permissions are not granted; scanning was not started.',
        'discovering',
        true,
      );
      errors.push(permissionError);
      partialSources.add('media');
      this.dependencies.store.getState().markPartial(permissionError);
      const completedAtMs = this.dependencies.now();
      setLastResult('permission_required', completedAtMs);
      return result('permission_required', completedAtMs);
    }

    if (this.cancelRequested) {
      return cancelResult();
    }

    try {
      await this.dependencies.indexWriter.beginScanStaging();
      stagingStarted = true;
    } catch (error) {
      return failDatabase(error);
    }

    emit('scanning', null);

    for (const category of MEDIA_CATEGORIES) {
      if (this.cancelRequested) {
        return cancelResult();
      }

      emit('scanning', category);

      try {
        for await (const file of this.dependencies.mediaAdapter.discoverMedia(category)) {
          if (this.cancelRequested) {
            return cancelResult();
          }

          await processFile(file);
        }
      } catch (error) {
        if (databaseFailed) {
          return failDatabase(error);
        }
        const sourceError = createError(
          'DISCOVERY_FAILED',
          error instanceof Error ? error.message : `Unable to discover ${category} files.`,
          'discovering',
          true,
        );
        errors.push(sourceError);
        partialSources.add(category.toLowerCase());
      }
    }

    if (this.cancelRequested) {
      return cancelResult();
    }

    if (permissionSnapshot.allFilesAccessRequired && !permissionSnapshot.allFilesAccessEnabled) {
      const accessError = createError(
        'ACCESS_DENIED',
        'All Files Access is not granted; document discovery was skipped.',
        'discovering',
        true,
      );
      errors.push(accessError);
      partialSources.add('documents');
    } else {
      emit('scanning', 'PDF');

      try {
        const documentResult = this.dependencies.documentAdapter.scanDocuments
          ? await this.dependencies.documentAdapter.scanDocuments(processFile)
          : await this.dependencies.documentAdapter.discoverDocuments();
        if (documentResult.status !== 'completed') {
          partialSources.add('documents');
        }
        errors.push(...documentResult.errors);
        if (this.cancelRequested) {
          return cancelResult();
        }

        if (!this.dependencies.documentAdapter.scanDocuments) {
          for (const file of (documentResult as DocumentDiscoveryResult).files) {
            if (this.cancelRequested) {
              return cancelResult();
            }

            await processFile(file);
          }
        }
      } catch (error) {
        if (this.cancelRequested) {
          return cancelResult();
        }
        if (databaseFailed) {
          return failDatabase(error);
        }
        const documentError = createError(
          'DISCOVERY_FAILED',
          error instanceof Error ? error.message : 'Unable to discover documents.',
          'discovering',
          true,
        );
        errors.push(documentError);
        partialSources.add('documents');
      }
    }

    if (this.cancelRequested) {
      return cancelResult();
    }

    const completedAtMs = this.dependencies.now();
    if (partialSources.size > 0 || errors.length > 0) {
      try {
        if (stagingStarted) {
          await this.dependencies.indexWriter.discardScanStaging();
        }
      } catch (error) {
        return failDatabase(error);
      }
      this.dependencies.store
        .getState()
        .markPartial(errors.find((error) => error.recoverable) ?? errors[0]);
      setLastResult('partial', completedAtMs);
      emit('completed', null);
      return result('partial', completedAtMs);
    }

    try {
      await flushFiles();
      const folderRows = aggregateAccumulator.getAggregates();
      for (let offset = 0; offset < folderRows.length; offset += batchSize) {
        await this.dependencies.indexWriter.stageIndex({
          files: [],
          folders: folderRows.slice(offset, offset + batchSize),
        });
      }
      const committed = await this.dependencies.indexWriter.commitScanStaging();
      indexedCount = committed.filesStaged;
    } catch (error) {
      if (stagingStarted) {
        try {
          await this.dependencies.indexWriter.discardScanStaging();
        } catch (discardError) {
          errors.push(
            createError(
              'INDEXING_FAILED',
              discardError instanceof Error
                ? discardError.message
                : 'Unable to discard staging data.',
              'indexing',
              false,
            ),
          );
        }
      }
      return failDatabase(error);
    }

    this.dependencies.store.getState().updateProgress({
      indexedCount,
      processedCount: discoveredCount,
      discoveredCount,
      categoryCounts: counts,
    });
    this.dependencies.store.getState().setIndexedMediaBytes?.(indexedMediaBytes);
    this.dependencies.store.getState().completeScan(completedAtMs);
    setLastResult('completed', completedAtMs);
    emit('completed', null);
    return result('completed', completedAtMs);
  }
}

export const fileScannerService = new FileScannerService();

export default fileScannerService;
