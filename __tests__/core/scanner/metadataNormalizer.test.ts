import { normalizeDiscoveredFile } from '@core/scanner';

describe('normalizeDiscoveredFile', () => {
  it('normalizes file and folder fields to the implemented media_files schema', () => {
    expect(
      normalizeDiscoveredFile({
        filePath: '/storage/emulated/0/WhatsApp/Media/Voice Note.MP3',
        sizeBytes: 1024,
        durationMs: 60_000,
        width: 0,
        height: null,
        artist: ' Artist ',
        album: ' ',
        dateModifiedMs: 1_700_000_000_000,
        dateAddedMs: 1_699_000_000_000,
      }),
    ).toEqual({
      id: '/storage/emulated/0/WhatsApp/Media/Voice Note.MP3',
      file_path: '/storage/emulated/0/WhatsApp/Media/Voice Note.MP3',
      file_name: 'Voice Note.MP3',
      extension: 'mp3',
      mime_type: 'application/octet-stream',
      category: 'AUDIO',
      folder_path: '/storage/emulated/0/WhatsApp/Media',
      folder_name: 'Media',
      size_bytes: 1024,
      duration_ms: 60_000,
      width: 0,
      height: null,
      artist: 'Artist',
      album: null,
      date_modified: 1_700_000_000_000,
      date_added: 1_699_000_000_000,
      is_hidden: 0,
      is_messenger_media: 1,
      is_favorite: 0,
      is_vaulted: 0,
    });
  });

  it('normalizes nullable metadata, invalid numbers, MIME type, and absent timestamps', () => {
    const normalized = normalizeDiscoveredFile({
      filePath: '/storage/.private/report.PDF',
      mimeType: ' Application/PDF; charset=binary ',
      sizeBytes: 10.9,
      durationMs: -1,
      width: Number.POSITIVE_INFINITY,
      height: 1080.8,
      dateModifiedMs: 1_700_000_000_000.9,
    });

    expect(normalized).toMatchObject({
      category: 'PDF',
      extension: 'pdf',
      mime_type: 'application/pdf',
      size_bytes: 10,
      duration_ms: null,
      width: null,
      height: 1080,
      date_modified: 1_700_000_000_000,
      date_added: 0,
      is_hidden: 1,
    });
  });

  it('returns null when the file cannot be classified', () => {
    expect(normalizeDiscoveredFile({ filePath: '/storage/file.unknown' })).toBeNull();
  });

  it('throws when there is no usable file path or name', () => {
    expect(() => normalizeDiscoveredFile({ filePath: '  ' })).toThrow(RangeError);
    expect(() => normalizeDiscoveredFile({ filePath: '/' })).toThrow(RangeError);
  });
});
