import { NativeModules } from 'react-native';
import type { MediaFileRow } from '@core/storage/types';
import { normalizeDiscoveredFile } from './metadataNormalizer';
import type { DiscoveredFileInput } from './types';

export type MediaStoreCategory = 'AUDIO' | 'VIDEO' | 'PHOTO';

export interface MediaStoreRow {
  id: string;
  contentUri: string;
  displayName: string;
  mimeType: string | null;
  sizeBytes: number | null;
  dateModifiedMs: number | null;
  dateAddedMs: number | null;
  durationMs: number | null;
  width: number | null;
  height: number | null;
  artist: string | null;
  album: string | null;
  folderPath: string | null;
  folderName: string | null;
}

export interface MediaStorePage {
  items: MediaStoreRow[];
  nextAfterId: string | null;
  hasMore: boolean;
}

export interface NativeMediaStoreModule {
  queryMedia(
    category: MediaStoreCategory,
    afterId: string | null,
    pageSize: number,
  ): Promise<MediaStorePage>;
}

export interface MediaStoreAdapterOptions {
  pageSize?: number;
}

const DEFAULT_PAGE_SIZE = 100;
const MAX_PAGE_SIZE = 500;

const getNativeModule = (): NativeMediaStoreModule => {
  const nativeModule = NativeModules.MediaStore as NativeMediaStoreModule | undefined;

  if (!nativeModule?.queryMedia) {
    throw new Error('The native MediaStore module is not available on this platform.');
  }

  return nativeModule;
};

const normalizeMediaStoreRow = (row: MediaStoreRow): MediaFileRow | null => {
  if (!row.contentUri || !row.displayName) {
    return null;
  }

  const discoveredFile: DiscoveredFileInput = {
    id: row.id,
    filePath: row.contentUri,
    fileName: row.displayName,
    folderPath: row.folderPath,
    folderName: row.folderName,
    mimeType: row.mimeType,
    sizeBytes: row.sizeBytes,
    durationMs: row.durationMs,
    width: row.width,
    height: row.height,
    artist: row.artist,
    album: row.album,
    dateModifiedMs: row.dateModifiedMs,
    dateAddedMs: row.dateAddedMs,
  };

  return normalizeDiscoveredFile(discoveredFile);
};

export class MediaStoreAdapter {
  constructor(
    private readonly nativeModule?: NativeMediaStoreModule,
    private readonly options: MediaStoreAdapterOptions = {},
  ) {}

  async *discoverMedia(
    category: MediaStoreCategory,
  ): AsyncGenerator<MediaFileRow, void, undefined> {
    const pageSize = this.options.pageSize ?? DEFAULT_PAGE_SIZE;

    if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > MAX_PAGE_SIZE) {
      throw new RangeError(`MediaStore pageSize must be an integer between 1 and ${MAX_PAGE_SIZE}`);
    }

    let afterId: string | null = null;
    const nativeModule = this.nativeModule ?? getNativeModule();

    while (true) {
      const page = await nativeModule.queryMedia(category, afterId, pageSize);

      if (!page || !Array.isArray(page.items)) {
        throw new TypeError('Native MediaStore query returned an invalid page.');
      }

      for (const row of page.items) {
        const normalized = normalizeMediaStoreRow(row);

        if (normalized) {
          yield normalized;
        }
      }

      if (!page.hasMore) {
        return;
      }

      if (!page.nextAfterId || page.nextAfterId === afterId) {
        throw new Error('Native MediaStore pagination did not advance.');
      }

      afterId = page.nextAfterId;
    }
  }
}

export const mediaStoreAdapter = new MediaStoreAdapter();
