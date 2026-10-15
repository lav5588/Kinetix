export { classifyFile, normalizeExtension } from './extensionClassifier';
export {
  isHiddenPath,
  isLikelyMessengerPath,
  shouldIncludeAudioFile,
  shouldIncludeDiscoveredFile,
} from './pathFilters';
export { normalizeDiscoveredFile } from './metadataNormalizer';
export { DEFAULT_MIN_AUDIO_DURATION_MS } from './types';
export type {
  DiscoveredFile,
  DiscoveredFileInput,
  FolderSummary,
  ScanError,
  ScanErrorCode,
  ScanOptions,
  ScanPhase,
  ScanProgressEvent,
  ScanResult,
  ScanStatus,
} from './types';
