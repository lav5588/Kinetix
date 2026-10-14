# Task 5: Native MediaStore & File System Scanner Service — AI Subtask Prompts

## Goal

Implement Task 5 for **Kinetix**, the offline-first Android media and document hub. This task builds a fast, resumable scanner that discovers Audio, Video, Photos, PDFs, and Other Documents, classifies them, indexes them locally, and exposes progress/count/storage statistics to the UI.

Each subtask is intentionally scoped so an AI coding assistant can complete **one subtask in one response**. Complete the subtasks sequentially.

## Important Project Rules

- Inspect the existing project and the completed Tasks 1–4 before editing. Reuse the actual permission manager, SQLite client/schema, repositories, shared types, MMKV preferences, and Zustand conventions already present.
- Preserve the Master Architecture Blueprint's canonical database names: `folders_index`, `files_index`, and `files_search_fts`. Do not silently switch to another schema such as `media_files` or `media_files_fts`. If the repository's implemented schema differs from the blueprint, report the mismatch and adapt only to the schema actually present; do not rewrite database migrations as part of this task.
- Use the existing React Native CLI/Bare Workflow and TypeScript setup. Native Android code may be added where required for MediaStore or filesystem access.
- Keep all scanning on-device and offline. Do not add cloud APIs, analytics, remote indexing, or network calls.
- Use Android MediaStore for media collections where appropriate. Use the approved permission/access flow from Task 4 for broad document scanning. Respect scoped storage and Android API differences; do not assume direct filesystem traversal works everywhere.
- Avoid blocking the React Native UI thread. Query in pages/batches, yield between batches where appropriate, and use cancellation/stale-scan protection.
- Treat file paths/URIs carefully. MediaStore content URIs are not automatically equivalent to ordinary filesystem paths. Preserve a usable URI/path representation and ensure downstream consumers can open the file.
- Filter directories containing `.nomedia` where filesystem traversal is actually available; MediaStore already respects `.nomedia` for indexed media. Do not claim a filesystem scan can see inaccessible directories.
- Make the short-audio threshold configurable, defaulting to 30 seconds. Do not exclude short audio if the user setting disables that filter.
- Auto-flag WhatsApp/Telegram-related folders using case-insensitive path matching, but avoid assuming every folder name containing those words is definitely messenger media without documenting the heuristic.
- Do not build browser screens, dashboard cards, players, or navigation in Task 5. Those belong to later tasks.
- After each subtask, report files changed, commands actually run, results, and remaining limitations. Do not start the next subtask unless asked.

---

## Subtask 1: Build a Comprehensive File Extension Classifier

### 1. What to Do (Goal)

Create a pure, deterministic classifier that maps file names/extensions and available MIME types to the app's canonical categories:

- `AUDIO`
- `VIDEO`
- `PHOTO`
- `PDF`
- `OTHER_DOC`

Support a broad list of common formats and make classification easy to test and extend. Handle uppercase extensions, filenames with multiple dots, missing extensions, and unknown formats safely.

### 2. Where to Do (Exact File Paths)

- `src/core/scanner/extensionClassifier.ts`
- `src/core/scanner/index.ts`
- `src/shared/types/index.ts` (only if the existing canonical `MediaCategory` type needs to be imported or corrected; do not duplicate it)

### 3. AI Prompt Instructions (Copy-Paste to AI)

> Act as a Senior React Native TypeScript engineer. Implement only Subtask 1 of Task 5 for Kinetix. Inspect the existing shared `MediaCategory` type and use its exact canonical values (`AUDIO`, `VIDEO`, `PHOTO`, `PDF`, `OTHER_DOC`) without introducing conflicting enums. Create a pure `extensionClassifier.ts` exporting a function such as `classifyFile(fileName: string, mimeType?: string | null): MediaCategory | null` and, if useful, a helper to normalize extensions. Include broad tested extension maps for audio, video, images, PDF, and other documents; include examples such as `.mkv`, `.flac`, `.heic`, `.pdf`, `.docx`, `.apk`, and `.zip`. Normalize case and handle hidden files, trailing dots, no extension, and unknown types predictably. Do not scan storage, query Android APIs, or write to SQLite in this subtask. Export the helper from the scanner barrel if that matches existing project conventions.

### 4. Verification / Acceptance Criteria

- Automated: Add `__tests__/core/scanner/extensionClassifier.test.ts` with at least 50 representative extensions across all five categories.
- Include uppercase extensions, multi-dot names, hidden files, no extension, and unknown formats.
- Run `npm run typecheck && npm run lint && npm test` if those scripts exist.
- Manual: Inspect the category map and confirm unknown extensions are not accidentally assigned to a media category.

---

## Subtask 2: Create Scanner Domain Types and Pure Path/Filter Helpers

### 1. What to Do (Goal)

Define strict types for scan options, discovered files, folder summaries, scan progress, scan errors, and scan results. Implement pure helpers for:
- Detecting `.nomedia`/hidden paths where path data is available.
- Identifying likely WhatsApp/Telegram folders.
- Applying the configurable short-audio filter (default 30 seconds).
- Normalizing file and folder metadata before indexing.

Use the canonical schema field names from the Master Architecture Blueprint.

### 2. Where to Do (Exact File Paths)

- `src/core/scanner/types.ts`
- `src/core/scanner/pathFilters.ts`
- `src/core/scanner/metadataNormalizer.ts`
- `src/core/scanner/index.ts`

### 3. AI Prompt Instructions (Copy-Paste to AI)

> Implement only Subtask 2. Inspect the project's existing shared types and actual SQLite schema/repository types. Create strict TypeScript models for scan options, discovered file records, folder aggregates, progress events, structured errors, and final scan results. Use canonical categories `AUDIO`, `VIDEO`, `PHOTO`, `PDF`, and `OTHER_DOC`, and align indexed fields with `folders_index`, `files_index`, and `files_search_fts` as actually implemented. Add pure helpers for case-insensitive `.nomedia`/hidden-path filtering when a real path is available, case-insensitive WhatsApp/Telegram path detection, and filtering audio shorter than a configurable threshold defaulting to 30 seconds. Make the short-audio filter bypassable through scan options. Normalize nullable duration/dimensions/metadata and timestamps consistently. Do not call native APIs, mutate the database, or create Zustand state yet. Export public types/helpers from `src/core/scanner/index.ts`.

### 4. Verification / Acceptance Criteria

- Automated: Add tests for `.nomedia` and dot-folder filtering, WhatsApp/Telegram path detection, paths with mixed case, the 30-second audio boundary, missing duration, and disabled filtering.
- Run `npm run typecheck && npm run lint && npm test`.
- Manual: Confirm filtering is based on available path/metadata and does not claim visibility into inaccessible directories.

---

## Subtask 3: Implement Android MediaStore Query Adapter

### 1. What to Do (Goal)

Build the media discovery adapter for Audio, Video, and Photos using Android MediaStore. Query results in bounded pages/batches and normalize MediaStore rows into the scanner's domain model.

Requirements:
- Query audio, video, and image collections supported by the installed native library or a small custom native module.
- Retrieve available metadata such as display name, content URI, MIME type, size, date modified, duration, width, height, and audio artist/album where supported.
- Handle null/missing metadata and inaccessible or removed items.
- Do not make one giant unbounded query or load all media into memory at once.
- Do not scan or index documents in this subtask.

### 2. Where to Do (Exact File Paths)

- `src/core/scanner/MediaStoreAdapter.ts`
- `src/core/scanner/index.ts`
- `android/app/src/main/java/<existing-package-path>/MediaStoreModule.kt` (only if a custom native module is needed)
- `android/app/src/main/java/<existing-package-path>/MediaStorePackage.kt` (only if required by the existing native registration approach)

### 3. AI Prompt Instructions (Copy-Paste to AI)

> Implement only Subtask 3 for Kinetix. Inspect the installed React Native version, Android package name, current New Architecture setup, and available native dependencies before choosing the MediaStore integration. Prefer a maintained compatible library if one already exists; otherwise create the smallest native Android adapter necessary. Implement paginated/batched queries for audio, video, and image MediaStore collections, returning normalized records with a stable content URI, display name, MIME type, size, modified timestamp, and available duration/dimensions/audio metadata. Handle API-level differences and deleted/inaccessible rows gracefully. Do not query PDFs or other documents here, do not write SQLite records, and do not implement UI. Do not invent filesystem paths from content URIs. Add a typed TypeScript adapter and focused mocks/tests where practical.

### 4. Verification / Acceptance Criteria

- Automated: Unit-test row normalization, null metadata, URI preservation, and pagination boundaries using mocked adapter results.
- Build: Run the Android debug build if native code or dependencies change.
- Manual: On an Android device with audio, video, and image files, verify the adapter returns expected item counts and usable URIs without crashing when a file disappears during scanning.

---

## Subtask 4: Implement Document Discovery Adapter for PDFs and Other Documents

### 1. What to Do (Goal)

Discover PDFs and other documents using the access capability available from Task 4. Prefer Android document/provider APIs where appropriate; use filesystem traversal only where the granted access and platform rules permit it.

Requirements:
- Classify documents into `PDF` or `OTHER_DOC`.
- Include common document types such as DOC/DOCX, TXT, RTF, XLS/XLSX, PPT/PPTX, CSV, EPUB, and other explicitly supported formats.
- Respect denied or missing All Files Access and return a clear partial-scan/access result instead of crashing.
- Handle inaccessible folders and per-file errors without failing the entire scan.
- Avoid duplicate entries where a file appears through more than one discovery route.

### 2. Where to Do (Exact File Paths)

- `src/core/scanner/DocumentScannerAdapter.ts`
- `src/core/scanner/index.ts`
- Android native scanner helper files only if required, using the repository's actual package path

### 3. AI Prompt Instructions (Copy-Paste to AI)

> Implement only Subtask 4. Inspect the Task 4 permission manager and native All Files Access helper, then implement a document discovery adapter for PDFs and other supported document formats. Use a platform-appropriate approach: query a suitable Android provider/API where possible and use filesystem traversal only when permitted and actually supported. Do not request permissions from this adapter; it should consume the existing permission/access status and return a structured partial result when broad access is unavailable. Normalize document metadata into the same domain model as the MediaStore adapter, preserve valid content URIs or file paths, and deduplicate by a stable identity. Catch inaccessible-folder and disappearing-file errors at the smallest practical scope so one failure does not cancel all discovery. Do not write SQLite data or create UI in this subtask.

### 4. Verification / Acceptance Criteria

- Automated: Test PDF versus other-document classification, access denied, inaccessible directories, duplicate identities, and per-file error handling.
- Build: Run Android build if native code changes.
- Manual: Verify document discovery when All Files Access is granted and a graceful partial result when it is not. Do not claim complete document coverage where Android/provider access prevents it.

---

## Subtask 5: Build Folder Aggregation and Messenger/Hidden Folder Rules

### 1. What to Do (Goal)

Transform discovered file records into per-folder, per-category aggregates matching `folders_index`.

Each aggregate should calculate:
- Folder path/identity and display name.
- Category.
- File count.
- Total size in bytes.
- Thumbnail URI when a suitable media item exists.
- Messenger-folder flag.
- Hidden/excluded flag.
- Most recent modification timestamp.

A mixed-content folder may need a separate aggregate for each category so counts remain correct.

### 2. Where to Do (Exact File Paths)

- `src/core/scanner/folderAggregator.ts`
- `src/core/scanner/pathFilters.ts`
- `src/core/scanner/index.ts`
- `__tests__/core/scanner/folderAggregator.test.ts`

### 3. AI Prompt Instructions (Copy-Paste to AI)

> Implement only Subtask 5. Create a pure `folderAggregator.ts` that groups normalized discovered records by folder and category and produces the exact field shape required by the existing `folders_index` schema. Compute item count, total size, latest modification time, hidden/excluded state, and the likely WhatsApp/Telegram flag. Select a thumbnail URI only from an eligible discovered item and keep it nullable. Ensure mixed-content folders produce distinct category aggregates. Avoid database writes and native calls in this subtask. Add deterministic unit tests for empty input, multiple categories in one folder, duplicate records, byte totals, timestamps, hidden folders, and messenger-path flags.

### 4. Verification / Acceptance Criteria

- Automated: `folderAggregator.test.ts` passes and covers mixed-content folders.
- Run `npm run typecheck && npm run lint && npm test`.
- Manual: Compare aggregate results against a small hand-written set of known files and verify counts and sizes are exact.

---

## Subtask 6: Create `useMediaScannerStore` for Live Scan State

### 1. What to Do (Goal)

Create a lightweight Zustand store to expose scan status to future screens without tying scanner logic to UI.

State should cover:
- `idle`, `checkingPermissions`, `scanning`, `indexing`, `completed`, `partial`, and `error` statuses.
- Current phase and progress counts where known.
- Counts by category.
- Discovered/indexed file totals.
- Used/free storage bytes and formatted GB values (where the platform provides reliable data).
- Last successful scan timestamp and structured error information.
- Start/cancel/reset actions, or minimal state actions consistent with the scanner service design.

Do not create dashboard widgets in this subtask.

### 2. Where to Do (Exact File Paths)

- `src/core/store/useMediaScannerStore.ts`
- `src/core/store/index.ts` (create if missing)
- `__tests__/core/store/useMediaScannerStore.test.ts`

### 3. AI Prompt Instructions (Copy-Paste to AI)

> Implement only Subtask 6. Create a typed Zustand `useMediaScannerStore` for Kinetix. Follow existing Zustand conventions and keep state updates small and predictable. Represent idle, permission checking, scanning, indexing, completed, partial, and error states; current phase; per-category counts for AUDIO, VIDEO, PHOTO, PDF, and OTHER_DOC; progress totals; storage used/free bytes when available; last successful scan time; and structured errors. Add actions for updating progress, setting category counts, marking completion/partial/error, and resetting state. Do not put native scanning or database work directly in the store, and do not create UI. Add tests for state transitions, category aggregation, progress edge cases (zero total, unknown total, over-reported progress), and reset behavior.

### 4. Verification / Acceptance Criteria

- Automated: Store tests pass for all required transitions and edge cases.
- Run `npm run typecheck && npm run lint && npm test`.
- Manual: Inspect the state model to confirm the UI can distinguish complete from partial scans.

---

## Subtask 7: Implement Batched SQLite Index Writer

### 1. What to Do (Goal)

Persist discovered file and folder records into the existing SQLite database using the completed storage layer. Use parameterized statements and bounded transactions/batches to avoid excessive memory use and UI stalls.

Requirements:
- Write to the canonical `files_index`, `folders_index`, and `files_search_fts` structures as implemented in the repository.
- Reuse existing repository/client functions wherever possible.
- Make repeated scans idempotent and avoid duplicate file rows.
- Ensure folder counts/sizes and FTS search records stay consistent with indexed files.
- Define how stale entries are handled when files disappear, without deleting records for folders the scanner could not access.
- Never interpolate filenames or paths directly into SQL.

### 2. Where to Do (Exact File Paths)

- `src/core/scanner/ScannerIndexWriter.ts`
- `src/core/scanner/index.ts`
- Existing storage repository files only when a required method is genuinely missing
- `__tests__/core/scanner/ScannerIndexWriter.test.ts`

### 3. AI Prompt Instructions (Copy-Paste to AI)

> Implement only Subtask 7. Inspect the existing OP-SQLite client, migrations, row types, and repositories before writing code. Create `ScannerIndexWriter.ts` to persist normalized file records and per-folder/category aggregates using parameterized SQL and bounded transactional batches. Use the actual schema and column names already present—do not create a parallel schema or change migrations as a shortcut. Keep FTS records synchronized using existing triggers/repository behavior where available. Make repeated scans idempotent and define a safe stale-record reconciliation strategy: only remove stale records from a scope that was successfully and completely scanned, never from inaccessible or partially scanned folders. Do not scan native storage or update UI directly in this subtask. Add mocked integration tests for batch inserts, empty batches, duplicates/upserts, transaction errors, FTS consistency, and stale-scope safety.

### 4. Verification / Acceptance Criteria

- Automated: Test parameter binding and batch boundaries, duplicate handling, rollback/error behavior, and stale-record safety.
- Run `npm run typecheck && npm run lint && npm test`.
- Manual: Inspect SQL to confirm user-controlled paths/names are parameters, not interpolated SQL fragments.

---

## Subtask 8: Implement the Orchestrating `FileScannerService`

### 1. What to Do (Goal)

Create the service that orchestrates permission checks, MediaStore discovery, document discovery, filtering, folder aggregation, SQLite indexing, and progress events.

Required behavior:
- Check readiness through the Task 4 permission/access layer before scanning.
- Support scan options, including short-audio filtering and hidden/messenger-folder behavior.
- Emit progress updates by phase and category.
- Handle cancellation, duplicate starts, partial access, disappearing files, and recoverable per-file errors.
- Avoid blocking the UI thread and avoid holding the entire file inventory in memory when batching can be used.
- Produce a structured result describing discovered/indexed counts, skipped items, partial access, and errors.

### 2. Where to Do (Exact File Paths)

- `src/core/scanner/FileScannerService.ts`
- `src/core/scanner/index.ts`
- `src/core/permissions/PermissionManager.ts` (consume existing APIs; modify only if a missing integration method is necessary)
- `__tests__/core/scanner/FileScannerService.test.ts`

### 3. AI Prompt Instructions (Copy-Paste to AI)

> Implement only Subtask 8. Build `FileScannerService.ts` as an orchestrator over the already implemented permission manager, MediaStore adapter, document adapter, classifier/filter helpers, folder aggregator, SQLite index writer, and `useMediaScannerStore`. Do not duplicate those responsibilities inside the service. Check access before scanning and return a clear permission-required/partial result when some sources are unavailable. Emit progress updates for permission checking, scanning by category, filtering, indexing, and completion. Support cancellation and prevent overlapping scans from corrupting state. Use bounded batches and resilient per-item error handling. Do not create screens or navigation. Add tests with all native adapters and repositories mocked, covering successful scans, partial access, cancellation, repeated start requests, recoverable file errors, and fatal database errors.

### 4. Verification / Acceptance Criteria

- Automated: Service tests pass for success, partial, cancellation, and error paths.
- Run `npm run typecheck && npm run lint && npm test`.
- Manual: Trigger a scan and verify progress is monotonic, final counts match indexed records, and a cancelled scan does not report success.

---

## Subtask 9: Storage Capacity Stats and Scan Lifecycle Integration

### 1. What to Do (Goal)

Connect the scanner service to reliable device storage capacity information and app lifecycle without adding dashboard UI.

Requirements:
- Report used/free bytes and formatted GB only when a reliable native source is available.
- Clearly distinguish device-wide capacity from app-accessible/scanned content size.
- Expose last scan status/time and a refresh/rescan entry point.
- Re-check permissions when returning from Android Settings as needed.
- Avoid repeated full scans on every render or app foreground event; use explicit refresh rules and last-scan metadata.
- Ensure a partial scan does not overwrite a previously complete index with incomplete data.

### 2. Where to Do (Exact File Paths)

- `src/core/scanner/FileScannerService.ts`
- `src/core/store/useMediaScannerStore.ts`
- `src/core/scanner/storageStats.ts` (create if a reliable provider is available)
- `__tests__/core/scanner/storageStats.test.ts`
- `__tests__/core/scanner/FileScannerService.test.ts`

### 3. AI Prompt Instructions (Copy-Paste to AI)

> Implement only Subtask 9. Inspect the available Android APIs/native modules and the existing scanner store/service. Add a small storage-statistics adapter only if the repository can obtain reliable device-wide total/free capacity. Keep `used/free device storage` distinct from `sum of indexed media sizes`; do not infer one from the other. Format bytes as GB consistently. Integrate last-scan metadata and an explicit rescan entry point without starting scans during render or triggering duplicate scans on every AppState event. Preserve the previous complete index if the new scan is partial or access was denied. Add tests for unavailable storage stats, zero/invalid values, byte formatting, lifecycle refresh behavior, and partial-scan safety. Do not create Dashboard widgets.

### 4. Verification / Acceptance Criteria

- Automated: Run typecheck, lint, and all scanner tests.
- Manual: Compare capacity stats with Android Settings where the API provides equivalent values; document expected differences if Android reports system-reserved or rounded capacity.
- Manual: Verify returning from Settings refreshes permissions/status but does not automatically launch repeated scans.

---

## Subtask 10: End-to-End Scanner Tests, Performance Validation and Documentation

### 1. What to Do (Goal)

Complete Task 5 with end-to-end integration coverage and a practical on-device validation checklist. Validate large local libraries, permission edge cases, index integrity, and performance.

### 2. Where to Do (Exact File Paths)

- `__tests__/core/scanner/scannerIntegration.test.ts`
- `docs/testing/media-scanner.md` (or the repository's existing testing-documentation location)
- Production scanner files only for fixes demonstrated by tests

### 3. AI Prompt Instructions (Copy-Paste to AI)

> Implement only Subtask 10. Add an integration test that connects mocked MediaStore/document discovery, classification/filtering, folder aggregation, the scanner service, SQLite indexing, and store progress updates. Cover mixed media/document folders, `.nomedia`/hidden paths, short-audio filter enabled and disabled, messenger folder detection, duplicate records, denied document access, partial scans, cancellation, and database failures. Create a concise real-device checklist for Android 10–15 that records device/API, library size, scan duration, counts by category, permission state, storage stats, and errors. Run `npm run typecheck`, `npm run lint`, `npm test`, and `cd android && ./gradlew assembleDebug` when available. Report actual timings only when measured on a real device; do not claim the initial scan completes under three seconds unless measured. Do not build the Dashboard or browser UI.

### 4. Verification / Acceptance Criteria

- Automated: All scanner unit/integration tests pass.
- Build: Android debug build succeeds when the local Android SDK/NDK and dependency environment are available.
- Manual on real device:
  - Use a library containing at least 2,000 photos, 500 songs, 50 videos, and 100 PDFs.
  - Verify the scanner completes without freezing the UI and record the actual elapsed time.
  - Verify category counts and folder totals against a known sample.
  - Compare device used/free storage stats with Android Storage Settings and document expected rounding/system-reserved differences.
  - Verify permission-denied and partial-access behavior.
  - Verify repeated scans do not create duplicate records and inaccessible scopes do not trigger unsafe stale-record deletion.

---

## Task 5 Definition of Done

- [ ] Audio, Video, Photo, PDF, and Other Document classification is covered by tests.
- [ ] Android MediaStore discovery is paginated/batched and preserves usable content URIs.
- [ ] Document discovery respects Task 4 access status and reports partial coverage honestly.
- [ ] `.nomedia`/hidden-path and configurable short-audio filtering behave as specified.
- [ ] WhatsApp/Telegram folder heuristic is tested and documented.
- [ ] Folder aggregates match `folders_index` and separate mixed categories correctly.
- [ ] Scanner progress/counts are exposed through `useMediaScannerStore`.
- [ ] File/folder records are indexed through the existing SQLite layer and FTS remains consistent.
- [ ] Repeated scans are idempotent and stale entries are removed only from completely scanned scopes.
- [ ] Storage stats distinguish device capacity from indexed media size.
- [ ] Typecheck, lint, tests, and Android build results are reported honestly.
- [ ] No Dashboard, browser UI, player, or navigation work is included.
