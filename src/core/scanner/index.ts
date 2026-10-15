export { classifyFile, normalizeExtension } from './extensionClassifier';
export {
  isHiddenPath,
  isLikelyMessengerPath,
  shouldIncludeAudioFile,
  shouldIncludeDiscoveredFile,
} from './pathFilters';
export { normalizeDiscoveredFile } from './metadataNormalizer';
export { aggregateFolders } from './folderAggregator';
export type { FolderAggregate } from './folderAggregator';
export { MediaStoreAdapter, mediaStoreAdapter } from './MediaStoreAdapter';
export { DocumentScannerAdapter, documentScannerAdapter } from './DocumentScannerAdapter';
export type {
  MediaStoreAdapterOptions,
  MediaStoreCategory,
  MediaStorePage,
  MediaStoreRow,
  NativeMediaStoreModule,
} from './MediaStoreAdapter';
export type {
  DocumentAccessStatus,
  DocumentDiscoveryResult,
  DocumentScannerAdapterOptions,
  DocumentScannerPage,
  DocumentScannerRow,
  NativeDocumentScannerModule,
} from './DocumentScannerAdapter';
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
