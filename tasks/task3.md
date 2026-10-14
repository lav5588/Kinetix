# Task 3: Local Storage Layer (SQLite 6-Table Schema, FTS5 Search & MMKV Resume Manager) — AI Subtask Prompts

## Subtask-1
1. **What to Do (Goal):** Install `@op-engineering/op-sqlite` for blazing-fast JSI C++ SQLite operations (with FTS5 full-text search enabled for Android) and create a deterministic in-memory Jest mock in `jest.setup.ts` so all database queries can be unit-tested in Node.
2. **Where to Do (Exact File Paths):**
   - `package.json`
   - `android/gradle.properties` (Enable `OPSQLITE_USE_FTS5=true` or equivalent CMake flag if required by `@op-engineering/op-sqlite`)
   - `src/core/storage/sqliteClient.ts`
   - `jest.setup.ts`
3. **AI Prompt Instructions (Copy-Paste to AI):**
   > "Act as a Senior React Native Architect. We are starting Task 3 (SQLite & MMKV Storage Layer) for 'Kinetix'. First, add `@op-engineering/op-sqlite` to `package.json`. Second, create `src/core/storage/sqliteClient.ts` that opens a singleton database connection named `'omniplay_hub.db'` using `open({ name: 'omniplay_hub.db' })`, enables `PRAGMA foreign_keys = ON;` and `PRAGMA journal_mode = WAL;` for high-concurrency read/write performance, and exports helper methods `executeSql(query: string, params?: any[])` and `executeBatch(commands: Array<[string, any[]?]>)`. Finally, add a clean mock for `@op-engineering/op-sqlite` in `jest.setup.ts` so unit tests can inspect executed SQL statements and return mocked row sets."
4. **Verification / Acceptance Criteria:**
   - Automated: Run `npm run typecheck && npm test` to verify `sqliteClient.ts` compiles and the Jest mock loads cleanly.
   - Manual: Run `cd android && ./gradlew assembleDebug` to confirm `@op-engineering/op-sqlite` native C++ JSI library builds cleanly on Android.

---

## Subtask-2
1. **What to Do (Goal):** Define strict TypeScript database row interfaces and domain DTOs for all 6 SQLite tables (`media_files`, `media_files_fts`, `folders_index`, `playlists`, `playlist_items`, `pdf_bookmarks`) and the `ResumeRecord` MMKV model.
2. **Where to Do (Exact File Paths):**
   - `src/core/storage/types.ts`
   - `src/core/storage/index.ts`
3. **AI Prompt Instructions (Copy-Paste to AI):**
   > "Create `src/core/storage/types.ts` and export it from `src/core/storage/index.ts`. Define strict TypeScript interfaces matching our 6-table SQLite schema and MMKV resume store:
   > 1. `MediaFileRow`: `id: string`, `file_path: string`, `file_name: string`, `extension: string`, `mime_type: string`, `category: MediaCategory`, `folder_path: string`, `folder_name: string`, `size_bytes: number`, `duration_ms: number | null`, `width: number | null`, `height: number | null`, `artist: string | null`, `album: string | null`, `date_modified: number`, `date_added: number`, `is_hidden: number`, `is_messenger_media: number`, `is_favorite: number`, `is_vaulted: number`.
   > 2. `FolderIndexRow`: `folder_path: string`, `folder_name: string`, `category: MediaCategory`, `item_count: number`, `total_size_bytes: number`, `thumbnail_uri: string | null`, `last_modified: number`, `is_excluded: number`.
   > 3. `PlaylistRow`: `playlist_id: string`, `name: string`, `created_at: number`, `track_count: number`.
   > 4. `PlaylistItemRow`: `id: number`, `playlist_id: string`, `file_id: string`, `sort_order: number`.
   > 5. `PdfBookmarkRow`: `id: number`, `file_path: string`, `page_number: number`, `label: string`, `created_at: number`.
   > 6. `ResumeRecord`: `filePath: string`, `fileName: string`, `category: 'audio' | 'video' | 'pdf' | 'photo'`, `lastOpenedAt: number`, `positionMs?: number`, `durationMs?: number`, `isCompleted?: boolean`, `audioTrackId?: number`, `subtitleTrackId?: number`, `subtitleDelayMs?: number`, `playbackSpeed?: number`, `aspectRatioMode?: 'fit' | 'fill' | 'stretch' | '16:9' | '4:3'`, `pdfPage?: number`, `pdfTotalPages?: number`, `pdfZoomScale?: number`, `pdfNightMode?: boolean`."
4. **Verification / Acceptance Criteria:**
   - Automated: Run `npm run typecheck && npm run lint` with 0 errors.
   - Manual: Verify that all 6 SQLite schemas and the MMKV `ResumeRecord` match the Master Architecture Blueprint key-for-key.

---

## Subtask-3
1. **What to Do (Goal):** Create the SQLite schema migration runner (`schemaMigrations.ts`) that creates the 6 tables (`media_files`, `media_files_fts` virtual FTS5 table + sync triggers, `folders_index`, `playlists`, `playlist_items`, `pdf_bookmarks`) and composite indexes on app launch.
2. **Where to Do (Exact File Paths):**
   - `src/core/storage/schemaMigrations.ts`
   - `src/core/storage/index.ts`
3. **AI Prompt Instructions (Copy-Paste to AI):**
   > "Create `src/core/storage/schemaMigrations.ts` and export `initializeDatabaseSchema()` via `src/core/storage/index.ts`. Write idempotent SQL DDL statements (`CREATE TABLE IF NOT EXISTS`, `CREATE VIRTUAL TABLE IF NOT EXISTS media_files_fts USING fts5(...)`, and `CREATE INDEX IF NOT EXISTS`) for all 6 tables: `media_files`, `media_files_fts` (indexing `file_name`, `folder_name`, `artist`, `album`), `folders_index` (`PRIMARY KEY (folder_path, category)`), `playlists`, `playlist_items`, and `pdf_bookmarks`. Also create SQLite triggers (`AFTER INSERT`, `AFTER DELETE`, `AFTER UPDATE` on `media_files`) so `media_files_fts` stays automatically synchronized whenever files are inserted, updated, or deleted. Create composite indexes on `media_files(category, folder_path)` and `media_files(date_modified DESC, size_bytes DESC)`."
4. **Verification / Acceptance Criteria:**
   - Automated: Run `npm run typecheck && npm run lint`.
   - Manual: Inspect the SQL strings in `schemaMigrations.ts` to ensure foreign keys, composite primary keys, and FTS5 triggers have valid SQLite syntax.

---

## Subtask-4
1. **What to Do (Goal):** Build the `MediaRepository` (`mediaRepository.ts`) providing parameterized batch upsert for scanned files, folder aggregation queries, dynamic sorting (`name`, `date_modified`, `size_bytes`, `duration_ms` in `ASC`/`DESC`), quick filter queries (`unwatched`, `in_progress`, `large_files`, `hide_messenger`), and sub-5ms FTS5 prefix search (`query*`).
2. **Where to Do (Exact File Paths):**
   - `src/core/storage/mediaRepository.ts`
   - `src/core/storage/index.ts`
3. **AI Prompt Instructions (Copy-Paste to AI):**
   > "Create `src/core/storage/mediaRepository.ts` and export `MediaRepository` in `src/core/storage/index.ts`. Implement these methods using `executeSql` and `executeBatch`:
   > 1. `upsertMediaFilesBatch(files: MediaFileRow[])`: Performs a fast transactional batch `INSERT OR REPLACE INTO media_files` and recomputes `folders_index` counts/sizes per category and folder.
   > 2. `getFoldersByCategory(category: MediaCategory, hideMessenger?: boolean)`: Returns `FolderIndexRow[]` sorted by `folder_name ASC` or `last_modified DESC`.
   > 3. `getFilesByFolder(params: { category: MediaCategory; folderPath: string; sortField: SortField; sortOrder: SortOrder; hideShortAudio?: boolean; hideHiddenFiles?: boolean })`: Returns sorted `MediaFileRow[]` using whitelisted `ORDER BY` columns to prevent SQL injection.
   > 4. `searchFilesFts(params: { query: string; category?: MediaCategory; folderPath?: string; limit?: number })`: Sanitizes the search string into an FTS5 prefix query (`\"term\"*`) and joins `media_files_fts` with `media_files` to return matching `MediaFileRow[]`."
4. **Verification / Acceptance Criteria:**
   - Automated: Run `npm run typecheck && npm run lint`.
   - Manual: Check that `sortField` and `sortOrder` use a strict whitelist map (`{ name: 'file_name COLLATE NOCASE', date: 'date_modified', size: 'size_bytes', duration: 'duration_ms' }`) so arbitrary strings can never be interpolated into `ORDER BY`.

---

## Subtask-5
1. **What to Do (Goal):** Build the `BookmarkAndPlaylistRepository` (`userDataRepository.ts`) to manage PDF page bookmarks (`pdf_bookmarks`), audio playlists (`playlists`, `playlist_items`), and favorite/vaulted file flags in SQLite.
2. **Where to Do (Exact File Paths):**
   - `src/core/storage/userDataRepository.ts`
   - `src/core/storage/index.ts`
3. **AI Prompt Instructions (Copy-Paste to AI):**
   > "Create `src/core/storage/userDataRepository.ts` and export `UserDataRepository` from `src/core/storage/index.ts`. Implement methods for:
   > 1. PDF Bookmarks: `addPdfBookmark(filePath: string, pageNumber: number, label: string)`, `removePdfBookmark(filePath: string, pageNumber: number)`, and `getPdfBookmarks(filePath: string): Promise<PdfBookmarkRow[]>`.
   > 2. Audio Playlists: `createPlaylist(name: string)`, `deletePlaylist(playlistId: string)`, `addTrackToPlaylist(playlistId: string, fileId: string)`, `removeTrackFromPlaylist(playlistId: string, fileId: string)`, and `getPlaylists(): Promise<PlaylistRow[]>`.
   > 3. File Flags: `toggleFavorite(fileId: string, isFavorite: boolean)` and `setVaultStatus(fileId: string, isVaulted: boolean, newFilePath: string)`."
4. **Verification / Acceptance Criteria:**
   - Automated: Run `npm run typecheck && npm run lint`.
   - Manual: Verify that adding or removing a track from `playlist_items` updates `track_count` on the parent `playlists` row.

---

## Subtask-6
1. **What to Do (Goal):** Build the `ResumeManager` service (`resumeManager.ts`) and Zustand reactive wrapper (`useResumeStore.ts`) backed by `resumeStorage` (`react-native-mmkv`) to save, retrieve, auto-complete (`>97%` rule), and list "Continue Where You Left Off" items across Audio, Video, PDF, and Photos.
2. **Where to Do (Exact File Paths):**
   - `src/core/storage/resumeManager.ts`
   - `src/core/storage/useResumeStore.ts`
   - `src/core/storage/index.ts`
3. **AI Prompt Instructions (Copy-Paste to AI):**
   > "Create `src/core/storage/resumeManager.ts` and `src/core/storage/useResumeStore.ts`, and export both from `src/core/storage/index.ts`.
   > In `resumeManager.ts`, use `resumeStorage` (MMKV) with keys prefixed by `'resume:' + filePath`:
   > 1. `saveResumeState(record: ResumeRecord)`: Automatically calculates `progressRatio = positionMs / durationMs`. If `progressRatio >= 0.97`, set `positionMs = 0` and `isCompleted = true` so finished movies/songs start from the beginning next time while showing a 'Watched' badge.
   > 2. `getResumeState(filePath: string): ResumeRecord | null`: Reads and parses the JSON synchronously in <1ms.
   > 3. `getRecentHistory(limit = 15, category?: MediaCategory): ResumeRecord[]`: Scans all `'resume:'` keys, filters by optional category, and sorts by `lastOpenedAt DESC`.
   > 4. `removeResumeState(filePath: string)` and `clearAllHistory()`.
   > In `useResumeStore.ts`, create a lightweight Zustand store wrapping `ResumeManager` so UI components (like the Dashboard 'Continue' carousel and FileList progress bars) automatically re-render whenever a playback/PDF state is updated or cleared."
4. **Verification / Acceptance Criteria:**
   - Automated: Run `npm run typecheck && npm run lint`.
   - Manual: Verify that `getResumeState(filePath)` is 100% synchronous (no `async/await` delay) so `FlashList` items can read progress percentages at 60 FPS during scrolling.

---

## Subtask-7
1. **What to Do (Goal):** Wire `initializeDatabaseSchema()` into `src/app/App.tsx` startup lifecycle and write a comprehensive unit test suite (`__tests__/core/storage/storageLayer.test.ts`) verifying SQLite schema creation, FTS5 query formatting, `ORDER BY` whitelisting, and `ResumeManager` `>97%` completion reset logic.
2. **Where to Do (Exact File Paths):**
   - `src/app/App.tsx`
   - `__tests__/core/storage/storageLayer.test.ts`
3. **AI Prompt Instructions (Copy-Paste to AI):**
   > "Update `src/app/App.tsx` to call `initializeDatabaseSchema()` inside a startup hook and show a storage readiness status badge on the temporary debug card (`testID='db-status-badge'`). Then, create `__tests__/core/storage/storageLayer.test.ts` using Jest to test:
   > 1. `initializeDatabaseSchema()` executes `CREATE TABLE` statements for all 6 tables (`media_files`, `media_files_fts`, `folders_index`, `playlists`, `playlist_items`, `pdf_bookmarks`).
   > 2. `MediaRepository.searchFilesFts({ query: 'interstellar' })` formats the FTS5 prefix query as `'\"interstellar\"*'` and binds parameters safely.
   > 3. `ResumeManager.saveResumeState` preserves exact `positionMs` when progress is 50% (e.g., `positionMs: 50000, durationMs: 100000`), but resets `positionMs` to `0` and sets `isCompleted: true` when progress is `>= 97%` (e.g., `positionMs: 98000, durationMs: 100000`).
   > 4. `ResumeManager.getRecentHistory(5)` returns records sorted newest-first by `lastOpenedAt`."
4. **Verification / Acceptance Criteria:**
   - Automated: Run `npm run typecheck && npm run lint && npm test` — all tests must pass with 0 warnings.
   - Manual: Launch the app on an Android device/emulator and verify `db-status-badge` displays `"SQLite + MMKV Ready"` with zero Logcat SQL errors.