import type { FolderIndexRow, MediaCategory, MediaFileRow } from '@core/storage/types';

export const DEFAULT_MIN_AUDIO_DURATION_MS = 30_000;

export interface ScanOptions {
  excludeHiddenPaths?: boolean;
  excludeShortAudio?: boolean;
  minAudioDurationMs?: number;
}

export interface DiscoveredFileInput {
  id?: string | null;
  filePath: string;
  fileName?: string | null;
  mimeType?: string | null;
  sizeBytes?: number | null;
  durationMs?: number | null;
  width?: number | null;
  height?: number | null;
  artist?: string | null;
  album?: string | null;
  dateModifiedMs?: number | null;
  dateAddedMs?: number | null;
}

export type DiscoveredFile = MediaFileRow;

export type FolderSummary = FolderIndexRow;

export type ScanPhase = 'discovering' | 'normalizing' | 'indexing' | 'completed';

export interface ScanProgressEvent {
  scanId: string;
  phase: ScanPhase;
  discoveredCount: number;
  processedCount: number;
  indexedCount: number;
  totalCount: number | null;
  categoryCounts: Record<MediaCategory, number>;
  startedAtMs: number;
  updatedAtMs: number;
}

export type ScanErrorCode =
  'ACCESS_DENIED' | 'DISCOVERY_FAILED' | 'INDEXING_FAILED' | 'INVALID_METADATA' | 'SCAN_CANCELLED';

export interface ScanError {
  code: ScanErrorCode;
  message: string;
  stage: ScanPhase;
  filePath?: string;
  recoverable: boolean;
}

export type ScanStatus = 'completed' | 'partial' | 'cancelled' | 'failed';

export interface ScanResult {
  scanId: string;
  status: ScanStatus;
  discoveredCount: number;
  indexedCount: number;
  categoryCounts: Record<MediaCategory, number>;
  startedAtMs: number;
  completedAtMs: number;
  errors: ScanError[];
}
