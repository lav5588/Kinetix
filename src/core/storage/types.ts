export type MediaCategory = 'AUDIO' | 'VIDEO' | 'PHOTO' | 'PDF' | 'OTHER_DOC';

export interface MediaFileRow {
  id: string;
  file_path: string;
  file_name: string;
  extension: string;
  mime_type: string;
  category: MediaCategory;
  folder_path: string;
  folder_name: string;
  size_bytes: number;
  duration_ms: number | null;
  width: number | null;
  height: number | null;
  artist: string | null;
  album: string | null;
  date_modified: number;
  date_added: number;
  is_hidden: number;
  is_messenger_media: number;
  is_favorite: number;
  is_vaulted: number;
}

export interface FolderIndexRow {
  folder_path: string;
  folder_name: string;
  category: MediaCategory;
  item_count: number;
  total_size_bytes: number;
  thumbnail_uri: string | null;
  last_modified: number;
  is_excluded: number;
}

export interface PlaylistRow {
  playlist_id: string;
  name: string;
  created_at: number;
  track_count: number;
}

export interface PlaylistItemRow {
  id: number;
  playlist_id: string;
  file_id: string;
  sort_order: number;
}

export interface PdfBookmarkRow {
  id: number;
  file_path: string;
  page_number: number;
  label: string;
  created_at: number;
}

export interface ResumeRecord {
  filePath: string;
  fileName: string;
  category: 'audio' | 'video' | 'pdf' | 'photo';
  lastOpenedAt: number;
  positionMs?: number;
  durationMs?: number;
  isCompleted?: boolean;
  audioTrackId?: number;
  subtitleTrackId?: number;
  subtitleDelayMs?: number;
  playbackSpeed?: number;
  aspectRatioMode?: 'fit' | 'fill' | 'stretch' | '16:9' | '4:3';
  pdfPage?: number;
  pdfTotalPages?: number;
  pdfZoomScale?: number;
  pdfNightMode?: boolean;
}
