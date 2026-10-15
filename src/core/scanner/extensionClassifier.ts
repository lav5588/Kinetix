import type { MediaCategory } from '@shared/types';

const extensionCategories: Record<string, MediaCategory> = {
  '3g2': 'VIDEO',
  '3gp': 'VIDEO',
  '3gpp': 'VIDEO',
  '3gpp2': 'VIDEO',
  '7z': 'OTHER_DOC',
  aac: 'AUDIO',
  aab: 'OTHER_DOC',
  aiff: 'AUDIO',
  aif: 'AUDIO',
  alac: 'AUDIO',
  amr: 'AUDIO',
  ape: 'AUDIO',
  apk: 'OTHER_DOC',
  apks: 'OTHER_DOC',
  arw: 'PHOTO',
  asf: 'VIDEO',
  avi: 'VIDEO',
  azw: 'OTHER_DOC',
  azw3: 'OTHER_DOC',
  bmp: 'PHOTO',
  bz2: 'OTHER_DOC',
  cbr: 'OTHER_DOC',
  cbz: 'OTHER_DOC',
  cr2: 'PHOTO',
  csv: 'OTHER_DOC',
  divx: 'VIDEO',
  dng: 'PHOTO',
  doc: 'OTHER_DOC',
  docm: 'OTHER_DOC',
  docx: 'OTHER_DOC',
  dot: 'OTHER_DOC',
  dotx: 'OTHER_DOC',
  epub: 'OTHER_DOC',
  flac: 'AUDIO',
  flv: 'VIDEO',
  gif: 'PHOTO',
  gz: 'OTHER_DOC',
  heic: 'PHOTO',
  heif: 'PHOTO',
  htm: 'OTHER_DOC',
  html: 'OTHER_DOC',
  json: 'OTHER_DOC',
  jpeg: 'PHOTO',
  jpg: 'PHOTO',
  key: 'OTHER_DOC',
  log: 'OTHER_DOC',
  m2ts: 'VIDEO',
  m4a: 'AUDIO',
  m4v: 'VIDEO',
  md: 'OTHER_DOC',
  mid: 'AUDIO',
  midi: 'AUDIO',
  mobi: 'OTHER_DOC',
  mov: 'VIDEO',
  mp3: 'AUDIO',
  mp4: 'VIDEO',
  mpc: 'AUDIO',
  mpe: 'VIDEO',
  mpeg: 'VIDEO',
  mpg: 'VIDEO',
  mka: 'AUDIO',
  mkv: 'VIDEO',
  mts: 'VIDEO',
  nef: 'PHOTO',
  numbers: 'OTHER_DOC',
  odp: 'OTHER_DOC',
  ods: 'OTHER_DOC',
  odt: 'OTHER_DOC',
  oga: 'AUDIO',
  ogg: 'AUDIO',
  ogv: 'VIDEO',
  opus: 'AUDIO',
  pages: 'OTHER_DOC',
  pdf: 'PDF',
  ppt: 'OTHER_DOC',
  pptm: 'OTHER_DOC',
  pptx: 'OTHER_DOC',
  pot: 'OTHER_DOC',
  potx: 'OTHER_DOC',
  png: 'PHOTO',
  rar: 'OTHER_DOC',
  raw: 'PHOTO',
  rtf: 'OTHER_DOC',
  svg: 'PHOTO',
  tar: 'OTHER_DOC',
  tif: 'PHOTO',
  tiff: 'PHOTO',
  tgz: 'OTHER_DOC',
  ts: 'VIDEO',
  tsv: 'OTHER_DOC',
  txt: 'OTHER_DOC',
  tex: 'OTHER_DOC',
  vob: 'VIDEO',
  wav: 'AUDIO',
  webm: 'VIDEO',
  webp: 'PHOTO',
  wma: 'AUDIO',
  wmv: 'VIDEO',
  xls: 'OTHER_DOC',
  xlsb: 'OTHER_DOC',
  xlsm: 'OTHER_DOC',
  xlsx: 'OTHER_DOC',
  xlt: 'OTHER_DOC',
  xltx: 'OTHER_DOC',
  xz: 'OTHER_DOC',
  yaml: 'OTHER_DOC',
  yml: 'OTHER_DOC',
  zip: 'OTHER_DOC',
  zst: 'OTHER_DOC',
  xml: 'OTHER_DOC',
};

const mimeCategories: Record<string, MediaCategory> = {
  'application/epub+zip': 'OTHER_DOC',
  'application/gzip': 'OTHER_DOC',
  'application/java-archive': 'OTHER_DOC',
  'application/json': 'OTHER_DOC',
  'application/msword': 'OTHER_DOC',
  'application/pdf': 'PDF',
  'application/rtf': 'OTHER_DOC',
  'application/vnd.android.package-archive': 'OTHER_DOC',
  'application/vnd.ms-excel': 'OTHER_DOC',
  'application/vnd.ms-powerpoint': 'OTHER_DOC',
  'application/vnd.oasis.opendocument.presentation': 'OTHER_DOC',
  'application/vnd.oasis.opendocument.spreadsheet': 'OTHER_DOC',
  'application/vnd.oasis.opendocument.text': 'OTHER_DOC',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'OTHER_DOC',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'OTHER_DOC',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'OTHER_DOC',
  'application/x-7z-compressed': 'OTHER_DOC',
  'application/x-bzip2': 'OTHER_DOC',
  'application/x-rar-compressed': 'OTHER_DOC',
  'application/x-tar': 'OTHER_DOC',
  'application/xml': 'OTHER_DOC',
  'application/x-xz': 'OTHER_DOC',
  'application/zip': 'OTHER_DOC',
  'text/csv': 'OTHER_DOC',
  'text/plain': 'OTHER_DOC',
  'text/rtf': 'OTHER_DOC',
};

export const normalizeExtension = (fileName: string): string | null => {
  const baseName = fileName.trim().split(/[\\/]/).pop() ?? '';
  const lastDotIndex = baseName.lastIndexOf('.');

  if (lastDotIndex <= 0 || lastDotIndex === baseName.length - 1) {
    return null;
  }

  return baseName.slice(lastDotIndex + 1).toLowerCase();
};

export const classifyFile = (fileName: string, mimeType?: string | null): MediaCategory | null => {
  const extension = normalizeExtension(fileName);
  const extensionCategory = extension ? extensionCategories[extension] : undefined;

  if (extensionCategory) {
    return extensionCategory;
  }

  const normalizedMimeType = mimeType?.split(';', 1)[0].trim().toLowerCase();

  if (!normalizedMimeType) {
    return null;
  }

  const mimeCategory = mimeCategories[normalizedMimeType];

  if (mimeCategory) {
    return mimeCategory;
  }

  if (normalizedMimeType.startsWith('audio/')) {
    return 'AUDIO';
  }
  if (normalizedMimeType.startsWith('video/')) {
    return 'VIDEO';
  }
  if (normalizedMimeType.startsWith('image/')) {
    return 'PHOTO';
  }
  if (normalizedMimeType.startsWith('text/')) {
    return 'OTHER_DOC';
  }

  return null;
};
