import { NativeModules } from 'react-native';
import type { MediaFileRow } from '@core/storage/types';
import { normalizeDiscoveredFile } from './metadataNormalizer';
import type { ScanError, ScanStatus } from './types';

export type DocumentAccessStatus = 'granted' | 'denied' | 'unsupported';

export interface DocumentScannerRow {
  id: string;
  contentUri: string;
  displayName: string;
  mimeType: string | null;
  sizeBytes: number | null;
  dateModifiedMs: number | null;
  dateAddedMs: number | null;
  folderPath: string | null;
  folderName: string | null;
}

export interface DocumentScannerPage {
  accessStatus: DocumentAccessStatus;
  items: DocumentScannerRow[];
  errors: Array<{
    message: string;
    filePath?: string | null;
  }>;
  nextAfterId: string | null;
  hasMore: boolean;
}

export interface NativeDocumentScannerModule {
  getAccessStatus(): Promise<DocumentAccessStatus>;
  queryDocuments(afterId: string | null, pageSize: number): Promise<DocumentScannerPage>;
}

export interface DocumentScannerAdapterOptions {
  pageSize?: number;
}

export interface DocumentDiscoveryResult {
  status: ScanStatus;
  accessStatus: DocumentAccessStatus;
  files: MediaFileRow[];
  discoveredCount: number;
  errors: ScanError[];
}

const DEFAULT_PAGE_SIZE = 200;
const MAX_PAGE_SIZE = 500;

const isNativeDocumentScannerModule = (
  nativeModule: unknown,
): nativeModule is NativeDocumentScannerModule => {
  if (typeof nativeModule !== 'object' || nativeModule === null) {
    return false;
  }

  return (
    'getAccessStatus' in nativeModule &&
    typeof nativeModule.getAccessStatus === 'function' &&
    'queryDocuments' in nativeModule &&
    typeof nativeModule.queryDocuments === 'function'
  );
};

const getNativeModule = (): NativeDocumentScannerModule | null => {
  const nativeModule: unknown = NativeModules.DocumentScanner;

  return isNativeDocumentScannerModule(nativeModule) ? nativeModule : null;
};

const toScanError = (
  message: string,
  filePath?: string | null,
  code: ScanError['code'] = 'DISCOVERY_FAILED',
): ScanError => ({
  code,
  message,
  stage: 'discovering',
  ...(filePath ? { filePath } : {}),
  recoverable: true,
});

export class DocumentScannerAdapter {
  constructor(
    private readonly nativeModule: NativeDocumentScannerModule | null = getNativeModule(),
    private readonly options: DocumentScannerAdapterOptions = {},
  ) {}

  async discoverDocuments(): Promise<DocumentDiscoveryResult> {
    const files = new Map<string, MediaFileRow>();
    const identities = new Set<string>();
    const errors: ScanError[] = [];
    const pageSize = this.options.pageSize ?? DEFAULT_PAGE_SIZE;

    if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > MAX_PAGE_SIZE) {
      throw new RangeError(
        `Document scanner pageSize must be an integer between 1 and ${MAX_PAGE_SIZE}`,
      );
    }

    if (!this.nativeModule) {
      return {
        status: 'partial',
        accessStatus: 'unsupported',
        files: [],
        discoveredCount: 0,
        errors: [
          toScanError(
            'Native document scanner is unavailable on this platform.',
            undefined,
            'ACCESS_DENIED',
          ),
        ],
      };
    }

    let accessStatus: DocumentAccessStatus;

    try {
      accessStatus = await this.nativeModule.getAccessStatus();
    } catch (error) {
      return {
        status: 'partial',
        accessStatus: 'denied',
        files: [],
        discoveredCount: 0,
        errors: [
          toScanError(
            error instanceof Error ? error.message : 'Unable to check document access.',
            undefined,
            'ACCESS_DENIED',
          ),
        ],
      };
    }

    if (accessStatus !== 'granted') {
      return {
        status: 'partial',
        accessStatus,
        files: [],
        discoveredCount: 0,
        errors: [
          toScanError(
            accessStatus === 'denied'
              ? 'All Files Access is not granted; document discovery was skipped.'
              : 'Broad document discovery is not supported on this Android version.',
            undefined,
            'ACCESS_DENIED',
          ),
        ],
      };
    }

    let afterId: string | null = null;
    let hasMore = true;

    while (hasMore) {
      let page: DocumentScannerPage;

      try {
        page = await this.nativeModule.queryDocuments(afterId, pageSize);
      } catch (error) {
        const nativeError = error as Error & { code?: string };
        const accessDenied = nativeError.code === 'DOCUMENT_SCANNER_ACCESS_DENIED';

        if (accessDenied) {
          accessStatus = 'denied';
        }
        errors.push(
          toScanError(
            error instanceof Error ? error.message : 'Document query failed.',
            undefined,
            accessDenied ? 'ACCESS_DENIED' : 'DISCOVERY_FAILED',
          ),
        );
        break;
      }

      if (!page || !Array.isArray(page.items) || !Array.isArray(page.errors)) {
        errors.push(toScanError('Native document scanner returned an invalid page.'));
        break;
      }

      if (page.accessStatus !== 'granted') {
        accessStatus = page.accessStatus;
        errors.push(
          toScanError(
            'Document access changed during discovery; remaining pages were skipped.',
            undefined,
            'ACCESS_DENIED',
          ),
        );
        break;
      }

      for (const pageError of page.errors) {
        errors.push(toScanError(pageError.message, pageError.filePath));
      }

      for (const row of page.items) {
        try {
          if (!row.contentUri || !row.displayName) {
            errors.push(toScanError('Document row is missing its content URI or display name.'));
            continue;
          }

          const file = normalizeDiscoveredFile({
            id: row.id,
            filePath: row.contentUri,
            fileName: row.displayName,
            folderPath: row.folderPath,
            folderName: row.folderName,
            mimeType: row.mimeType,
            sizeBytes: row.sizeBytes,
            dateModifiedMs: row.dateModifiedMs,
            dateAddedMs: row.dateAddedMs,
          });

          if (!file || (file.category !== 'PDF' && file.category !== 'OTHER_DOC')) {
            continue;
          }

          if (!identities.has(file.file_path) && !identities.has(file.id)) {
            files.set(file.file_path, file);
            identities.add(file.file_path);
            identities.add(file.id);
          }
        } catch (error) {
          errors.push(
            toScanError(
              error instanceof Error ? error.message : 'Unable to normalize document metadata.',
              row.contentUri,
              'INVALID_METADATA',
            ),
          );
        }
      }

      hasMore = page.hasMore;

      if (hasMore) {
        if (!page.nextAfterId || page.nextAfterId === afterId) {
          errors.push(toScanError('Document scanner pagination did not advance.'));
          break;
        }

        afterId = page.nextAfterId;
      }
    }

    return {
      status:
        accessStatus !== 'granted'
          ? 'partial'
          : errors.length > 0
            ? files.size > 0
              ? 'partial'
              : 'failed'
            : 'completed',
      accessStatus,
      files: Array.from(files.values()),
      discoveredCount: files.size,
      errors,
    };
  }
}

export const documentScannerAdapter = new DocumentScannerAdapter();
