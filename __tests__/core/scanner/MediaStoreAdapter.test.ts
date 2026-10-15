import {
  MediaStoreAdapter,
  type MediaStorePage,
  type MediaStoreRow,
  type NativeMediaStoreModule,
} from '@core/scanner';

const createRow = (overrides: Partial<MediaStoreRow> = {}): MediaStoreRow => ({
  id: '12',
  contentUri: 'content://media/external/audio/media/12',
  displayName: 'track.mp3',
  mimeType: 'audio/mpeg',
  sizeBytes: 2048,
  dateModifiedMs: 1_700_000_000_000,
  dateAddedMs: 1_699_000_000_000,
  durationMs: 60_000,
  width: null,
  height: null,
  artist: 'Artist',
  album: 'Album',
  folderPath: 'Music/Albums/',
  folderName: 'Albums',
  ...overrides,
});

const collect = async <T>(iterator: AsyncIterable<T>): Promise<T[]> => {
  const values: T[] = [];

  for await (const value of iterator) {
    values.push(value);
  }

  return values;
};

describe('MediaStoreAdapter', () => {
  it('normalizes rows and preserves MediaStore content URIs without inventing file paths', async () => {
    const nativeModule: NativeMediaStoreModule = {
      queryMedia: jest
        .fn<Promise<MediaStorePage>, [string, string | null, number]>()
        .mockResolvedValue({
          items: [
            createRow({
              id: '44',
              contentUri: 'content://media/external/images/media/44',
              displayName: 'photo.heic',
              mimeType: 'image/heic',
              durationMs: null,
              width: 3024,
              height: 4032,
              artist: null,
              album: null,
              folderPath: 'DCIM/Camera/',
              folderName: 'Camera',
            }),
          ],
          nextAfterId: '44',
          hasMore: false,
        }),
    };

    const [file] = await collect(new MediaStoreAdapter(nativeModule).discoverMedia('PHOTO'));

    expect(file).toMatchObject({
      id: '44',
      file_path: 'content://media/external/images/media/44',
      file_name: 'photo.heic',
      extension: 'heic',
      category: 'PHOTO',
      folder_path: 'DCIM/Camera/',
      folder_name: 'Camera',
      duration_ms: null,
      width: 3024,
      height: 4032,
    });
    expect(file.file_path).not.toMatch(/^\/storage\//);
  });

  it('handles null metadata and skips rows without required display information', async () => {
    const nativeModule: NativeMediaStoreModule = {
      queryMedia: jest.fn().mockResolvedValue({
        items: [
          createRow({
            id: '13',
            displayName: 'clip.mp4',
            contentUri: 'content://media/external/video/media/13',
            mimeType: null,
            sizeBytes: null,
            dateModifiedMs: null,
            dateAddedMs: null,
            durationMs: null,
            artist: null,
            album: null,
            folderPath: null,
            folderName: null,
          }),
          createRow({ id: '14', contentUri: '', displayName: '' }),
        ],
        nextAfterId: '14',
        hasMore: false,
      }),
    };

    const files = await collect(new MediaStoreAdapter(nativeModule).discoverMedia('VIDEO'));

    expect(files).toHaveLength(1);
    expect(files[0]).toMatchObject({
      file_path: 'content://media/external/video/media/13',
      mime_type: 'application/octet-stream',
      size_bytes: 0,
      duration_ms: null,
      date_modified: 0,
      date_added: 0,
      folder_path: '',
      folder_name: '',
    });
  });

  it('requests bounded pages and advances using the last item ID', async () => {
    const queryMedia = jest
      .fn()
      .mockResolvedValueOnce({
        items: [createRow({ id: '5', contentUri: 'content://media/external/audio/media/5' })],
        nextAfterId: '5',
        hasMore: true,
      })
      .mockResolvedValueOnce({
        items: [createRow({ id: '9', contentUri: 'content://media/external/audio/media/9' })],
        nextAfterId: '9',
        hasMore: false,
      });
    const adapter = new MediaStoreAdapter({ queryMedia }, { pageSize: 1 });

    const files = await collect(adapter.discoverMedia('AUDIO'));

    expect(files.map((file) => file.id)).toEqual(['5', '9']);
    expect(queryMedia.mock.calls).toEqual([
      ['AUDIO', null, 1],
      ['AUDIO', '5', 1],
    ]);
  });

  it('rejects invalid page sizes and non-advancing pagination', async () => {
    const nativeModule: NativeMediaStoreModule = {
      queryMedia: jest.fn().mockResolvedValue({
        items: [],
        nextAfterId: null,
        hasMore: true,
      }),
    };

    await expect(
      collect(new MediaStoreAdapter(nativeModule, { pageSize: 0 }).discoverMedia('AUDIO')),
    ).rejects.toThrow(RangeError);
    await expect(
      collect(new MediaStoreAdapter(nativeModule).discoverMedia('AUDIO')),
    ).rejects.toThrow('pagination did not advance');
  });
});
