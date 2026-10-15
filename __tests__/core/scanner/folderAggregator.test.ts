import { aggregateFolders } from '@core/scanner';
import type { MediaFileRow } from '@core/storage/types';

const createFile = (overrides: Partial<MediaFileRow> = {}): MediaFileRow => ({
  id: 'file-1',
  file_path: '/storage/emulated/0/DCIM/Camera/photo.jpg',
  file_name: 'photo.jpg',
  extension: 'jpg',
  mime_type: 'image/jpeg',
  category: 'PHOTO',
  folder_path: '/storage/emulated/0/DCIM/Camera',
  folder_name: 'Camera',
  size_bytes: 1024,
  duration_ms: null,
  width: 1920,
  height: 1080,
  artist: null,
  album: null,
  date_modified: 1_700_000_000_000,
  date_added: 1_699_000_000_000,
  is_hidden: 0,
  is_messenger_media: 0,
  is_favorite: 0,
  is_vaulted: 0,
  ...overrides,
});

describe('aggregateFolders', () => {
  it('returns no folder aggregates for empty input', () => {
    expect(aggregateFolders([])).toEqual([]);
  });

  it('creates separate per-category aggregates for mixed-content folders', () => {
    const results = aggregateFolders([
      createFile({ id: 'photo', size_bytes: 100 }),
      createFile({
        id: 'video',
        file_path: '/storage/emulated/0/DCIM/Camera/clip.mp4',
        file_name: 'clip.mp4',
        extension: 'mp4',
        mime_type: 'video/mp4',
        category: 'VIDEO',
        size_bytes: 900,
        date_modified: 1_700_000_000_200,
      }),
      createFile({
        id: 'pdf',
        file_path: '/storage/emulated/0/DCIM/Camera/guide.pdf',
        file_name: 'guide.pdf',
        extension: 'pdf',
        mime_type: 'application/pdf',
        category: 'PDF',
        size_bytes: 300,
      }),
    ]);

    expect(results).toHaveLength(3);
    expect(
      results.map(({ category, item_count, total_size_bytes }) => ({
        category,
        item_count,
        total_size_bytes,
      })),
    ).toEqual([
      { category: 'PHOTO', item_count: 1, total_size_bytes: 100 },
      { category: 'VIDEO', item_count: 1, total_size_bytes: 900 },
      { category: 'PDF', item_count: 1, total_size_bytes: 300 },
    ]);
  });

  it('deduplicates records by stable ID and file path', () => {
    const first = createFile({ id: 'same-id', size_bytes: 512 });
    const duplicateId = createFile({
      id: 'same-id',
      file_path: '/storage/emulated/0/DCIM/Camera/duplicate.jpg',
      size_bytes: 256,
    });
    const duplicatePath = createFile({
      id: 'different-id',
      file_path: first.file_path,
      size_bytes: 128,
    });

    expect(aggregateFolders([first, duplicateId, duplicatePath])).toMatchObject([
      { item_count: 1, total_size_bytes: 512 },
    ]);
  });

  it('calculates exact byte totals and most recent modification time', () => {
    const [aggregate] = aggregateFolders([
      createFile({ id: 'one', size_bytes: 1024, date_modified: 100 }),
      createFile({
        id: 'two',
        file_path: '/storage/emulated/0/DCIM/Camera/second.jpg',
        size_bytes: 2048,
        date_modified: 500,
      }),
      createFile({
        id: 'three',
        file_path: '/storage/emulated/0/DCIM/Camera/third.jpg',
        size_bytes: 512,
        date_modified: 300,
      }),
    ]);

    expect(aggregate).toMatchObject({
      item_count: 3,
      total_size_bytes: 3584,
      last_modified: 500,
    });
  });

  it('flags hidden folders as excluded and messenger folders using path heuristics', () => {
    const [hidden] = aggregateFolders([
      createFile({
        id: 'hidden',
        folder_path: '/storage/emulated/0/.private',
        folder_name: '.private',
      }),
    ]);
    const [messenger] = aggregateFolders([
      createFile({
        id: 'messenger',
        folder_path: '/storage/emulated/0/Android/media/com.whatsapp/WhatsApp/Media',
        folder_name: 'Media',
        is_messenger_media: 1,
      }),
    ]);

    expect(hidden.is_excluded).toBe(1);
    expect(hidden.is_messenger_folder).toBe(0);
    expect(messenger.is_excluded).toBe(0);
    expect(messenger.is_messenger_folder).toBe(1);
  });

  it('selects the latest photo or video URI for thumbnails and leaves others nullable', () => {
    const [photo] = aggregateFolders([
      createFile({ id: 'older', date_modified: 100 }),
      createFile({
        id: 'newer',
        file_path: 'content://media/images/2',
        date_modified: 200,
      }),
    ]);
    const [pdf] = aggregateFolders([
      createFile({
        id: 'document',
        file_path: 'content://media/files/3',
        file_name: 'document.pdf',
        category: 'PDF',
        date_modified: 300,
      }),
    ]);

    expect(photo.thumbnail_uri).toBe('content://media/images/2');
    expect(pdf.thumbnail_uri).toBeNull();
  });

  it('retains file-level hidden flags and treats invalid byte sizes as zero', () => {
    const [aggregate] = aggregateFolders([
      createFile({
        is_hidden: 1,
        size_bytes: Number.NaN,
      }),
    ]);

    expect(aggregate).toMatchObject({ is_excluded: 1, total_size_bytes: 0 });
  });
});
