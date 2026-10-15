import { create } from 'zustand';
import type { MediaCategory } from '@core/storage/types';
import type { ScanError, ScanPhase } from '@core/scanner/types';

export type MediaScannerStatus =
  'idle' | 'checkingPermissions' | 'scanning' | 'indexing' | 'completed' | 'partial' | 'error';

export interface MediaScannerStorageStats {
  usedBytes: number | null;
  freeBytes: number | null;
  totalBytes: number | null;
  usedGb: string | null;
  freeGb: string | null;
}

export interface MediaScannerProgressUpdate {
  phase?: ScanPhase;
  discoveredCount?: number;
  processedCount?: number;
  indexedCount?: number;
  totalCount?: number | null;
  categoryCounts?: Partial<Record<MediaCategory, number>>;
}

const MEDIA_CATEGORIES: MediaCategory[] = ['AUDIO', 'VIDEO', 'PHOTO', 'PDF', 'OTHER_DOC'];
const BYTES_PER_GIGABYTE = 1024 ** 3;

const createEmptyCategoryCounts = (): Record<MediaCategory, number> => ({
  AUDIO: 0,
  VIDEO: 0,
  PHOTO: 0,
  PDF: 0,
  OTHER_DOC: 0,
});

const normalizeCount = (value: number): number =>
  Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0;

const normalizeOptionalBytes = (value: number | null | undefined): number | null =>
  value != null && Number.isFinite(value) && value >= 0 ? Math.trunc(value) : null;

const formatGigabytes = (bytes: number | null): string | null =>
  bytes == null ? null : `${(bytes / BYTES_PER_GIGABYTE).toFixed(2)} GB`;

const normalizeCategoryCounts = (
  values: Partial<Record<MediaCategory, number>>,
): Record<MediaCategory, number> => {
  const counts = createEmptyCategoryCounts();

  for (const category of MEDIA_CATEGORIES) {
    const value = values[category];

    if (value != null) {
      counts[category] = normalizeCount(value);
    }
  }

  return counts;
};

interface MediaScannerData {
  status: MediaScannerStatus;
  phase: ScanPhase | null;
  progressPercent: number | null;
  discoveredCount: number;
  processedCount: number;
  indexedCount: number;
  totalCount: number | null;
  categoryCounts: Record<MediaCategory, number>;
  storageStats: MediaScannerStorageStats;
  scanStartedAtMs: number | null;
  lastSuccessfulScanTimestampMs: number | null;
  error: ScanError | null;
  errors: ScanError[];
}

interface MediaScannerActions {
  startScan: (startedAtMs?: number) => void;
  beginScanning: () => void;
  beginIndexing: () => void;
  updateProgress: (update: MediaScannerProgressUpdate) => void;
  setCategoryCounts: (counts: Partial<Record<MediaCategory, number>>) => void;
  incrementCategoryCount: (category: MediaCategory, amount?: number) => void;
  setStorageStats: (stats: { usedBytes?: number | null; freeBytes?: number | null }) => void;
  completeScan: (completedAtMs?: number) => void;
  markPartial: (error?: ScanError) => void;
  failScan: (error: ScanError) => void;
  reset: () => void;
}

const INITIAL_DATA: MediaScannerData = {
  status: 'idle',
  phase: null,
  progressPercent: null,
  discoveredCount: 0,
  processedCount: 0,
  indexedCount: 0,
  totalCount: null,
  categoryCounts: createEmptyCategoryCounts(),
  storageStats: {
    usedBytes: null,
    freeBytes: null,
    totalBytes: null,
    usedGb: null,
    freeGb: null,
  },
  scanStartedAtMs: null,
  lastSuccessfulScanTimestampMs: null,
  error: null,
  errors: [],
};

const withProgressPercent = (processedCount: number, totalCount: number | null): number | null => {
  if (totalCount == null || totalCount <= 0) {
    return null;
  }

  return Math.min(100, Math.max(0, (processedCount / totalCount) * 100));
};

export interface MediaScannerStore extends MediaScannerData, MediaScannerActions {}

export const useMediaScannerStore = create<MediaScannerStore>((set) => ({
  ...INITIAL_DATA,

  startScan: (startedAtMs = Date.now()) =>
    set((state) => ({
      ...INITIAL_DATA,
      lastSuccessfulScanTimestampMs: state.lastSuccessfulScanTimestampMs,
      status: 'checkingPermissions',
      scanStartedAtMs: startedAtMs,
    })),

  beginScanning: () =>
    set({
      status: 'scanning',
      phase: 'discovering',
      progressPercent: null,
    }),

  beginIndexing: () =>
    set((state) => ({
      status: 'indexing',
      phase: 'indexing',
      progressPercent: withProgressPercent(state.processedCount, state.totalCount),
    })),

  updateProgress: (update) =>
    set((state) => {
      const discoveredCount =
        update.discoveredCount == null
          ? state.discoveredCount
          : normalizeCount(update.discoveredCount);
      const processedCount =
        update.processedCount == null
          ? state.processedCount
          : normalizeCount(update.processedCount);
      const indexedCount =
        update.indexedCount == null ? state.indexedCount : normalizeCount(update.indexedCount);
      const totalCount =
        update.totalCount === undefined
          ? state.totalCount
          : update.totalCount == null
            ? null
            : normalizeCount(update.totalCount);
      const categoryCounts = update.categoryCounts
        ? {
            ...state.categoryCounts,
            ...normalizeCategoryCounts({
              ...state.categoryCounts,
              ...update.categoryCounts,
            }),
          }
        : state.categoryCounts;

      return {
        phase: update.phase ?? state.phase,
        discoveredCount,
        processedCount,
        indexedCount,
        totalCount,
        categoryCounts,
        progressPercent: withProgressPercent(processedCount, totalCount),
      };
    }),

  setCategoryCounts: (counts) =>
    set((state) => ({
      categoryCounts: normalizeCategoryCounts({
        ...state.categoryCounts,
        ...counts,
      }),
    })),

  incrementCategoryCount: (category, amount = 1) =>
    set((state) => ({
      categoryCounts: {
        ...state.categoryCounts,
        [category]: normalizeCount(state.categoryCounts[category] + amount),
      },
    })),

  setStorageStats: ({ usedBytes, freeBytes }) =>
    set((state) => {
      const normalizedUsedBytes =
        usedBytes === undefined ? state.storageStats.usedBytes : normalizeOptionalBytes(usedBytes);
      const normalizedFreeBytes =
        freeBytes === undefined ? state.storageStats.freeBytes : normalizeOptionalBytes(freeBytes);
      const totalBytes =
        normalizedUsedBytes != null && normalizedFreeBytes != null
          ? normalizedUsedBytes + normalizedFreeBytes
          : null;

      return {
        storageStats: {
          usedBytes: normalizedUsedBytes,
          freeBytes: normalizedFreeBytes,
          totalBytes,
          usedGb: formatGigabytes(normalizedUsedBytes),
          freeGb: formatGigabytes(normalizedFreeBytes),
        },
      };
    }),

  completeScan: (completedAtMs = Date.now()) =>
    set({
      status: 'completed',
      phase: 'completed',
      progressPercent: 100,
      lastSuccessfulScanTimestampMs: completedAtMs,
      error: null,
      errors: [],
    }),

  markPartial: (error) =>
    set((state) => ({
      status: 'partial',
      error: error ?? null,
      errors: error ? [...state.errors, error] : state.errors,
    })),

  failScan: (error) =>
    set((state) => ({
      status: 'error',
      error,
      errors: [...state.errors, error],
    })),

  reset: () => set({ ...INITIAL_DATA, categoryCounts: createEmptyCategoryCounts() }),
}));

export default useMediaScannerStore;
