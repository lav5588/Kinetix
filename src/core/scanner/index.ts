export { classifyFile, normalizeExtension } from './extensionClassifier';
export {
  isHiddenPath,
  isLikelyMessengerPath,
  shouldIncludeAudioFile,
  shouldIncludeDiscoveredFile,
} from './pathFilters';
export { normalizeDiscoveredFile } from './metadataNormalizer';
export { aggregateFolders, FolderAggregationAccumulator } from './folderAggregator';
export type { FolderAggregate } from './folderAggregator';
export { ScannerIndexWriter, scannerIndexWriter } from './ScannerIndexWriter';
export { FileScannerService, fileScannerService } from './FileScannerService';
export type {
  CompletedScanScope,
  ScannerIndexWriterDependencies,
  ScannerIndexWriterOptions,
  ScannerIndexWriteResult,
} from './ScannerIndexWriter';
export type {
  FileScannerDocumentAdapter,
  FileScannerIndexWriter,
  FileScannerMediaAdapter,
  FileScannerOptions,
  FileScannerPermissionManager,
  FileScannerPhase,
  FileScannerProgress,
  FileScannerResult,
  FileScannerResultStatus,
  FileScannerServiceDependencies,
  FileScannerStore,
} from './FileScannerService';
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
  DocumentDiscoverySummary,
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
