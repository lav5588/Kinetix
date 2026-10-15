import { classifyFile, normalizeExtension } from '@core/scanner';

describe('extensionClassifier', () => {
  it.each([
    ['song.mp3', 'AUDIO'],
    ['song.m4a', 'AUDIO'],
    ['song.aac', 'AUDIO'],
    ['song.flac', 'AUDIO'],
    ['song.wav', 'AUDIO'],
    ['song.ogg', 'AUDIO'],
    ['song.oga', 'AUDIO'],
    ['song.opus', 'AUDIO'],
    ['song.wma', 'AUDIO'],
    ['song.amr', 'AUDIO'],
    ['song.aiff', 'AUDIO'],
    ['song.aif', 'AUDIO'],
    ['song.ape', 'AUDIO'],
    ['song.alac', 'AUDIO'],
    ['song.mpc', 'AUDIO'],
    ['song.mid', 'AUDIO'],
    ['song.midi', 'AUDIO'],
    ['song.mka', 'AUDIO'],
    ['movie.mp4', 'VIDEO'],
    ['movie.mkv', 'VIDEO'],
    ['movie.mov', 'VIDEO'],
    ['movie.avi', 'VIDEO'],
    ['movie.webm', 'VIDEO'],
    ['movie.m4v', 'VIDEO'],
    ['movie.wmv', 'VIDEO'],
    ['movie.flv', 'VIDEO'],
    ['movie.mpg', 'VIDEO'],
    ['movie.mpeg', 'VIDEO'],
    ['movie.mts', 'VIDEO'],
    ['movie.m2ts', 'VIDEO'],
    ['movie.ts', 'VIDEO'],
    ['movie.ogv', 'VIDEO'],
    ['movie.vob', 'VIDEO'],
    ['movie.divx', 'VIDEO'],
    ['movie.asf', 'VIDEO'],
    ['movie.3gp', 'VIDEO'],
    ['movie.3g2', 'VIDEO'],
    ['photo.jpg', 'PHOTO'],
    ['photo.jpeg', 'PHOTO'],
    ['photo.png', 'PHOTO'],
    ['photo.gif', 'PHOTO'],
    ['photo.bmp', 'PHOTO'],
    ['photo.webp', 'PHOTO'],
    ['photo.heic', 'PHOTO'],
    ['photo.heif', 'PHOTO'],
    ['photo.tif', 'PHOTO'],
    ['photo.tiff', 'PHOTO'],
    ['photo.svg', 'PHOTO'],
    ['photo.raw', 'PHOTO'],
    ['photo.dng', 'PHOTO'],
    ['photo.cr2', 'PHOTO'],
    ['photo.nef', 'PHOTO'],
    ['photo.arw', 'PHOTO'],
    ['document.pdf', 'PDF'],
    ['document.doc', 'OTHER_DOC'],
    ['document.docx', 'OTHER_DOC'],
    ['document.odt', 'OTHER_DOC'],
    ['document.rtf', 'OTHER_DOC'],
    ['document.txt', 'OTHER_DOC'],
    ['document.md', 'OTHER_DOC'],
    ['document.xls', 'OTHER_DOC'],
    ['document.xlsx', 'OTHER_DOC'],
    ['document.ods', 'OTHER_DOC'],
    ['document.csv', 'OTHER_DOC'],
    ['document.ppt', 'OTHER_DOC'],
    ['document.pptx', 'OTHER_DOC'],
    ['document.odp', 'OTHER_DOC'],
    ['document.html', 'OTHER_DOC'],
    ['document.xml', 'OTHER_DOC'],
    ['book.epub', 'OTHER_DOC'],
    ['book.mobi', 'OTHER_DOC'],
    ['archive.zip', 'OTHER_DOC'],
    ['archive.rar', 'OTHER_DOC'],
    ['archive.7z', 'OTHER_DOC'],
    ['archive.tar', 'OTHER_DOC'],
    ['archive.gz', 'OTHER_DOC'],
    ['archive.bz2', 'OTHER_DOC'],
    ['archive.xz', 'OTHER_DOC'],
    ['package.apk', 'OTHER_DOC'],
    ['package.aab', 'OTHER_DOC'],
    ['package.apks', 'OTHER_DOC'],
  ])('classifies %s as %s', (fileName, expectedCategory) => {
    expect(classifyFile(fileName)).toBe(expectedCategory);
  });

  it('normalizes case and takes the extension after the final dot', () => {
    expect(normalizeExtension('Holiday.PHOTO.HEIC')).toBe('heic');
    expect(classifyFile('Holiday.PHOTO.HEIC')).toBe('PHOTO');
    expect(classifyFile('C:\\Media\\Final.Cut.MKV')).toBe('VIDEO');
  });

  it('handles hidden files, trailing dots, and names without extensions', () => {
    expect(normalizeExtension('.nomedia')).toBeNull();
    expect(classifyFile('.nomedia')).toBeNull();
    expect(classifyFile('.secret.pdf')).toBe('PDF');
    expect(normalizeExtension('filename.')).toBeNull();
    expect(normalizeExtension('filename')).toBeNull();
    expect(classifyFile('filename')).toBeNull();
  });

  it('uses MIME types when the extension is missing or unrecognized', () => {
    expect(classifyFile('track', 'Audio/MPEG')).toBe('AUDIO');
    expect(classifyFile('clip.unknown', 'video/mp4')).toBe('VIDEO');
    expect(classifyFile('picture', 'image/heic')).toBe('PHOTO');
    expect(classifyFile('file', 'application/pdf; charset=binary')).toBe('PDF');
    expect(classifyFile('file.unknown', 'application/vnd.ms-excel')).toBe('OTHER_DOC');
    expect(classifyFile('file', 'text/plain')).toBe('OTHER_DOC');
    expect(classifyFile('document.pdf', 'video/mp4')).toBe('PDF');
  });

  it('returns null for unknown extensions and generic MIME types', () => {
    expect(classifyFile('file.unknown')).toBeNull();
    expect(classifyFile('file.unknown', 'application/octet-stream')).toBeNull();
    expect(classifyFile('', 'application/octet-stream')).toBeNull();
  });
});
