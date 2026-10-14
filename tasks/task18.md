# Task 18 — Playlists, Favorites & Media Bookmarks Management

## Goal

Implement a unified, persistent experience for playlists, document collections, favorites, and media bookmarks in Kinetix. Follow the existing architecture and conventions in the repository. Reuse the existing OP-SQLite client, schema/migrations, file repository, Zustand stores, navigation, player APIs, and UI components wherever available. Do not create a second database or duplicate existing infrastructure.

## How to use this plan

- Complete **one subtask at a time**, in order.
- Give the coding AI only the prompt for the current subtask.
- Ask it to inspect the existing code before changing anything.
- Run the stated automated checks after each subtask and fix failures before moving on.
- Preserve the existing TypeScript strictness, path aliases, Material Design 3 styling, and offline-first behavior.
- Do not implement later subtasks early. If a required dependency is missing, report it clearly and make only the smallest prerequisite change needed.

---

## Subtask 1 — Inspect existing schema, storage, file models, and playback/navigation contracts

### Scope
Audit the current implementation before writing code. Confirm the actual columns and constraints for `playlists_and_collections`, `playlist_items`, and `media_bookmarks`; Task 2 mentions six core tables, so verify whether `playlist_items` already exists or whether playlist entries are stored another way. Inspect how `files_index` identifies files and represents the five categories. Inspect the audio player queue and `PersistentMiniPlayer`, video player seek API, PDF reader page navigation API, navigation routes, and existing repository/test conventions.

### Exact paths to inspect
- `src/core/storage/sqliteClient.ts`
- `src/core/storage/migrations/v1_initial_schema.ts`
- `src/core/storage/repositories/FileRepository.ts`
- `src/core/store/useAudioPlayerStore.ts`
- `src/features/audioPlayer/components/PersistentMiniPlayer.tsx`
- `src/features/videoPlayer/` (locate the existing player screen and seek controls)
- `src/features/pdfReader/AdvancePdfReaderScreen.tsx`
- `src/app/` and `src/features/` (locate current navigation and category entry points)
- Existing Jest tests and test setup

### Copy-paste AI prompt
> Inspect the repository and map the existing storage schema, file/category model, repository conventions, navigation, audio queue/PersistentMiniPlayer API, video seek API, and PDF page-navigation API relevant to Task 18. Do not implement the feature yet. Verify whether `playlists_and_collections`, `playlist_items`, and `media_bookmarks` exist and record their actual columns, indexes, foreign-key behavior, and migration version. Identify how a file ID and category are represented for all five categories. Return a concise implementation map with exact existing paths and a list of gaps. Do not guess APIs or create duplicate infrastructure. If `playlist_items` or a required column is absent, propose the smallest backward-compatible migration for a later subtask.

### Acceptance criteria
- A documented map of real schema columns and existing APIs is produced.
- Existing implementation is inspected rather than replaced.
- Any missing schema is identified with a minimal migration proposal.
- No runtime code or database schema is changed in this subtask.

### Tests / checks
- Run `yarn tsc --noEmit` and the existing test command to establish a baseline.
- Record pre-existing failures separately; do not attribute them to this task.

---

## Subtask 2 — Implement `PlaylistRepository` and minimal schema migration if needed

### Scope
Create a typed repository for playlists/collections and their entries. Support creating and listing playlists, adding/removing items, updating item order, deleting a playlist, and retrieving its entries in position order. Support audio playlists, video playlists, and document collections using the existing table design. Add a migration only if the audit proves a required table/column/index is missing. Preserve existing user data and make operations transactional where multiple rows must change together.

### Exact paths
- `src/core/storage/repositories/PlaylistRepository.ts`
- `src/core/storage/sqliteClient.ts`
- `src/core/storage/migrations/` (add the next migration only if needed)
- Relevant repository integration tests under the repository’s existing test convention

### Copy-paste AI prompt
> Implement `PlaylistRepository.ts` using the project’s existing OP-SQLite client and repository conventions. First use the actual schema found in Subtask 1. Provide typed operations to create a playlist/collection, list them by type and updated order, fetch its items ordered by position, add an item without accidental duplicates, remove an item, reorder items, rename a collection, and delete a collection safely. Use parameterized SQL, transactions for multi-row reorder operations, and deterministic position values. Do not invent columns or create a second database. If a required table or column is missing, add the smallest versioned migration consistent with the existing migration system. Add focused Jest integration tests for each repository operation and error cases.

### Acceptance criteria
- Repository operations use parameterized SQL and the existing SQLite connection.
- Playlist entries return in stable position order.
- Duplicate additions are handled consistently and safely.
- Reordering is atomic and leaves positions deterministic.
- Existing databases upgrade safely if a migration is needed.

### Tests / checks
- Test create/list/rename/delete.
- Test adding and removing entries.
- Test reorder persistence after querying again.
- Test empty playlists and invalid/nonexistent playlist IDs.
- Run targeted Jest tests and `yarn tsc --noEmit`.

---

## Subtask 3 — Implement `BookmarkRepository` for timestamp and page bookmarks

### Scope
Build persistent bookmarks for videos and PDFs. Store the exact location (timestamp for video or page for PDF), optional note, associated `file_id`, and any category/type fields that the existing schema supports. Queries by `file_id` must return bookmarks sorted by position. Keep timestamps in one consistent unit internally; display formatting belongs in the UI.

### Exact paths
- `src/core/storage/repositories/BookmarkRepository.ts`
- `src/core/storage/sqliteClient.ts`
- `src/core/storage/migrations/` (only if the schema audit shows a missing required field)
- Relevant bookmark repository tests

### Copy-paste AI prompt
> Implement `BookmarkRepository.ts` using the existing `media_bookmarks` schema and OP-SQLite patterns. Support creating, listing by `file_id`, updating a note/title if the schema supports it, and deleting bookmarks. Represent video timestamps consistently with the rest of the app (prefer milliseconds internally if that matches existing player APIs) and PDF bookmarks as page numbers. Ensure `getByFileId(fileId)` returns deterministic ascending position order, with a stable secondary sort for equal positions. Add validation for invalid timestamps/pages and parameterized SQL. Do not silently alter existing schema; create a minimal versioned migration only if necessary. Add Jest integration tests for a video bookmark at `00:45:12` with note `Best scene` and a PDF bookmark on page `88`.

### Acceptance criteria
- Video timestamp and PDF page bookmarks persist across queries/restarts.
- Queries by `file_id` are sorted by position.
- Notes are retained exactly.
- Invalid values are rejected or handled consistently with existing conventions.
- Existing bookmark records remain readable.

### Tests / checks
- Create a video bookmark at 45 minutes, 12 seconds with note `Best scene`.
- Create a PDF page bookmark at page 88.
- Query by `file_id` and verify ascending position order.
- Test delete, empty results, invalid page/timestamp, and persistence.
- Run targeted Jest tests and `yarn tsc --noEmit`.

---

## Subtask 4 — Build favorite state and reusable favorite actions

### Scope
Allow a user to favorite or unfavorite a file from any of the five supported categories. Use the existing database representation and file IDs. Avoid a UI-only or in-memory-only favorite flag. If the schema lacks a durable favorite representation, add a minimal migration and document the reason.

### Exact paths
- `src/core/storage/repositories/FileRepository.ts` (only if this repository is the established home for favorite queries)
- `src/core/storage/repositories/PlaylistRepository.ts` (only if the current architecture places favorites alongside collections)
- `src/features/playlists/` (add a small reusable favorite action component or hook if appropriate)
- Related repository/component tests

### Copy-paste AI prompt
> Implement persistent favorite/unfavorite behavior for any file in all five existing categories. Inspect the actual `files_index` and repository model first, and use the established favorite storage design if present. If it is absent, add the smallest backward-compatible schema migration and repository methods to set, toggle, and query favorite state; do not keep favorites only in component state or MMKV when the app’s indexed-file metadata belongs in SQLite. Make repeated toggles idempotent and handle a file that no longer exists gracefully. Expose a small reusable action/hook that accepts the existing file model, follows project UI conventions, and updates the UI after persistence succeeds. Add tests across category values and for persistence.

### Acceptance criteria
- Favorite state persists after navigating away and reopening the app.
- Favorite and unfavorite work for all five categories.
- Repeated taps do not create duplicate records or inconsistent state.
- Missing/deleted files do not crash the UI.
- Existing file model contracts remain compatible.

### Tests / checks
- Test favorite → query → unfavorite → query.
- Test representative files from all five category types.
- Test repeated toggles and missing file IDs.
- Run targeted Jest tests and `yarn tsc --noEmit`.

---

## Subtask 5 — Build `AddToPlaylistSheet`

### Scope
Create the reusable bottom sheet for selecting an existing playlist/collection or creating a new one, then adding the selected file. Support audio, video, and document collection types while respecting the current file category model. Provide loading, empty, validation, success, and error states.

### Exact paths
- `src/features/playlists/components/AddToPlaylistSheet.tsx`
- `src/core/storage/repositories/PlaylistRepository.ts`
- Relevant component tests

### Copy-paste AI prompt
> Build `AddToPlaylistSheet.tsx` using the project’s existing bottom-sheet/modal, React Native Paper, theme, and form conventions. It should accept the selected file using the real file model and expose a clear open/close contract consistent with nearby components. List compatible existing playlists/collections, allow creating a named playlist/collection, and add the file using `PlaylistRepository`. Prevent empty names, prevent duplicate entries, show loading/error/success feedback, and close only after a successful operation or an explicit cancel. Handle empty lists and files that cannot belong to the selected collection type. Do not add a new bottom-sheet dependency if the app already has one. Add RNTL tests with mocked repository calls.

### Acceptance criteria
- Existing compatible playlists are listed.
- A new playlist/collection can be created from the sheet.
- The selected file is added to the chosen collection exactly once.
- Validation and failures are visible and recoverable.
- Styling follows the active theme and Material 3 conventions.

### Tests / checks
- Test open/close and cancel behavior.
- Test creating a playlist and adding the selected file.
- Test invalid names, empty state, repository failure, and duplicate addition.
- Run targeted RNTL tests and `yarn tsc --noEmit`.

---

## Subtask 6 — Build playlist and collection detail workflows

### Scope
Implement the playlist/collection browsing experience, including item list, remove item, reorder items, rename, and delete. Reuse the existing file-list card and opening/playback behavior where possible. Ensure ordering persists in `playlist_items` or the actual schema established in Subtask 1.

### Exact paths
- `src/features/playlists/PlaylistsAndFavoritesScreen.tsx`
- `src/features/playlists/components/` (add focused detail/list components only where useful)
- `src/core/storage/repositories/PlaylistRepository.ts`
- Existing navigation files identified in Subtask 1

### Copy-paste AI prompt
> Implement playlist/collection listing and detail interactions in the existing feature structure. Reuse the actual repository APIs and shared file row/card components rather than duplicating the file browser. Support opening a playlist, displaying its entries in saved order, removing an entry, reordering entries, renaming the playlist, and deleting it with confirmation. Persist each reorder and ensure the UI reflects repository results rather than a temporary-only order. When an entry is opened, route it using the app’s existing audio/video/document opening contracts. Keep this subtask limited to playlist/collection workflows; do not yet build the full favorites/bookmarks tab. Add RNTL tests for the key flows.

### Acceptance criteria
- Users can list and open playlists/collections.
- Items appear in persisted order.
- Remove, reorder, rename, and delete actions persist correctly.
- Destructive operations require confirmation where consistent with the app.
- Existing media-opening behavior is reused.

### Tests / checks
- Render an existing playlist and verify item order.
- Remove one item and verify it disappears after re-query.
- Reorder items and verify the repository’s saved order.
- Test rename/delete confirmation and error states.
- Run targeted tests and `yarn tsc --noEmit`.

---

## Subtask 7 — Build unified Favorites & Bookmarks views

### Scope
Complete `PlaylistsAndFavoritesScreen.tsx` as a unified quick-access destination with clearly separated Playlists/Collections, Favorites, and Bookmarks views or tabs. Favorites should include any supported file category. Bookmarks should show media title, location (formatted timestamp or page), and note when present. Tapping an item should open the relevant file using existing navigation contracts.

### Exact paths
- `src/features/playlists/PlaylistsAndFavoritesScreen.tsx`
- `src/core/storage/repositories/PlaylistRepository.ts`
- `src/core/storage/repositories/BookmarkRepository.ts`
- Existing navigation files identified in Subtask 1

### Copy-paste AI prompt
> Complete `PlaylistsAndFavoritesScreen.tsx` as the unified quick-access screen for Playlists/Collections, Favorites, and Bookmarks. Use tabs/segments consistent with the app’s current navigation and UI patterns. Query persistent data through repositories; do not hardcode sample entries. Display empty states, loading states, and recoverable errors. Favorites must show files across all five categories. Bookmark rows must show the associated file, a formatted video timestamp or PDF page number, and the optional note. Tapping a favorite opens the file; tapping a bookmark navigates to the relevant media and passes its saved location to the player/reader using the existing route contract. Include accessible labels and stable list keys. Add RNTL tests for each section, empty states, and item navigation.

### Acceptance criteria
- The screen provides access to playlists/collections, favorites, and bookmarks.
- Data comes from persistent repositories.
- All five categories can appear in Favorites.
- Bookmark rows clearly distinguish timestamps from PDF page numbers.
- Selecting an item uses existing navigation contracts.

### Tests / checks
- Test all sections with mocked persisted records.
- Test empty and error states.
- Test opening a favorite and navigating from a bookmark.
- Run targeted RNTL tests and `yarn tsc --noEmit`.

---

## Subtask 8 — Integrate favorite and Add to Playlist actions into file browsing

### Scope
Make the new features reachable from existing file cards and multi-select/batch actions. A user should be able to star a file or add it to a playlist/collection without manually opening the quick-access screen first. Do not regress Task 16 batch operations.

### Exact paths
- Existing `FileListScreen` location identified from the repository
- `src/features/playlists/components/AddToPlaylistSheet.tsx`
- Reusable favorite action/hook created in Subtask 4
- `src/features/browser/services/FileBatchOperations.ts` (if batch operations are implemented there)

### Copy-paste AI prompt
> Integrate favorite/unfavorite and Add to Playlist/Collection actions into the existing file browser using its actual file row/card and selection-action architecture. Reuse the components and repository methods from earlier subtasks. Make the actions available for individual files and, where the existing batch-action system supports it, selected files. Respect the five category types and only offer compatible collection types. Avoid duplicating favorite state or SQL logic in screens. Preserve existing delete/share/rename/vault operations and selection behavior. Add tests for single-file actions and batch integration where supported.

### Acceptance criteria
- A file can be favorited/unfavorited from the browser.
- A file can be added to a compatible playlist/collection from the browser.
- Existing batch actions continue to work.
- UI state updates only after successful persistence.
- Category-specific incompatibilities are handled clearly.

### Tests / checks
- Test favorite toggling from a file row.
- Test opening `AddToPlaylistSheet` with the correct selected file.
- Test batch integration if the existing architecture supports it.
- Run browser-related tests, targeted feature tests, and `yarn tsc --noEmit`.

---

## Subtask 9 — Connect bookmark creation and exact-position jumps inside players/readers

### Scope
Wire bookmark creation and bookmark-list entry points into the existing video player and PDF reader. Reopening a bookmark must jump to its precise timestamp/page. Do not replace the existing player engines or resume-state mechanisms.

### Exact paths
- Existing video player screen and toolbar files under `src/features/videoPlayer/`
- `src/features/pdfReader/AdvancePdfReaderScreen.tsx`
- `src/features/pdfReader/components/PdfBookmarksSheet.tsx` (reuse or extend if present)
- `src/core/storage/repositories/BookmarkRepository.ts`
- `src/features/playlists/PlaylistsAndFavoritesScreen.tsx`

### Copy-paste AI prompt
> Integrate `BookmarkRepository` with the existing video player and PDF reader. Add a bookmark action using the current playback timestamp for video and the current page for PDF; support an optional note if the existing UI pattern allows it. Add or reuse a bookmark-list sheet/icon inside each player/reader. Selecting a bookmark must seek the video to the exact saved timestamp or navigate the PDF to the exact saved page. Also support opening a bookmark from `PlaylistsAndFavoritesScreen.tsx` by passing the appropriate file and location through existing navigation params. Avoid changing the underlying playback engine, breaking resume state, or introducing a second bookmark store. Add tests for saved-location routing and seek/page callbacks.

### Acceptance criteria
- Video bookmarks capture the current playback position accurately.
- PDF bookmarks capture the current page accurately.
- Bookmark lists persist and reopen after closing/reopening the file.
- Tapping a bookmark seeks/navigates to its saved position.
- Existing resume behavior and player controls still work.

### Tests / checks
- Mock video seek and PDF page callbacks; verify the saved values are passed exactly.
- Test bookmark creation, list display, and delete if supported by the existing UI.
- Verify the video bookmark at `00:45:12` jumps to 45 minutes, 12 seconds.
- Verify the PDF bookmark jumps to page `88`.
- Run targeted tests and `yarn tsc --noEmit`.

---

## Subtask 10 — End-to-end verification, regression tests, and device validation

### Scope
Run the required integration scenarios across repositories, UI, and playback. Fix only issues introduced by this task and record any environment-dependent limitation clearly.

### Exact paths
- `src/core/storage/repositories/PlaylistRepository.ts`
- `src/core/storage/repositories/BookmarkRepository.ts`
- `src/features/playlists/PlaylistsAndFavoritesScreen.tsx`
- `src/features/playlists/components/AddToPlaylistSheet.tsx`
- Existing test files and test setup
- Existing Maestro/E2E flow directory, if configured

### Copy-paste AI prompt
> Perform the final Task 18 verification. Add or complete Jest integration tests that create an audio playlist, add five audio tracks, reorder their positions in `playlist_items` (or the actual established playlist-entry table), delete one track, and verify the persisted order and remaining entries. Create a video bookmark at `00:45:12` with note `Best scene` and a PDF bookmark at page `88`; verify queries by `file_id` return bookmarks sorted by position. Add/update an E2E flow if the project already has a configured E2E framework. Run the full relevant test suite, `yarn tsc --noEmit`, and lint. Report commands and results accurately, distinguish pre-existing failures from regressions, and do not claim a physical-device test was performed unless it actually was.

### Acceptance criteria
- Playlist integration scenario passes with five tracks, reorder, and deletion.
- Video and PDF bookmark scenarios pass with sorted queries by `file_id`.
- TypeScript and lint pass, or remaining failures are clearly identified as pre-existing/environmental.
- No duplicate database or repository infrastructure was introduced.
- A real-device test checklist is provided.

### Automated testing checklist
- [ ] Create an audio playlist.
- [ ] Add five tracks.
- [ ] Reorder entries and verify saved positions.
- [ ] Delete one track and verify remaining entries/order.
- [ ] Create video bookmark at `00:45:12`, note `Best scene`.
- [ ] Create PDF bookmark on page `88`.
- [ ] Query bookmarks by `file_id` and verify ascending position order.
- [ ] Run relevant Jest tests, `yarn tsc --noEmit`, and lint.

### Manual real-device checklist
- [ ] Create a custom Audio playlist.
- [ ] Add songs from three different folders.
- [ ] Play the entire playlist through `PersistentMiniPlayer`.
- [ ] Add a bookmark inside a video and a PDF.
- [ ] Close each file and reopen it.
- [ ] Open the Bookmark list icon.
- [ ] Tap the video bookmark and verify the exact timestamp.
- [ ] Tap the PDF bookmark and verify the exact page.

---

## Definition of done

Task 18 is complete when playlists/collections, favorites across all five categories, and persistent video/PDF bookmarks are integrated with the existing offline-first storage and navigation architecture; all required automated scenarios pass; and the manual device checklist has been run and documented.
