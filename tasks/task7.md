# Task 7: Universal Folder Explorer Screen — AI Subtask Prompts

## Goal

Implement Task 7 for **Kinetix**: a category-aware `FolderExplorerScreen` using `@shopify/flash-list`. It should query the existing `folders_index` data for the selected category and display folder name, item count, total size, folder thumbnail, a Messenger badge for WhatsApp/Telegram folders, and an active indicator when a folder contains files with unfinished resume progress. Add a top toggle chip to hide WhatsApp/Telegram folders.

This file breaks Task 7 into sequential subtasks so an AI coding assistant completes **one subtask per response**.

## Important Project Rules

- Inspect completed Tasks 1–6 and reuse the existing navigation contract, category types, theme tokens, scanner/database schema, repositories, and resume-history store.
- Do not reinitialize the project or replace unrelated configuration. Use the existing package manager and installed dependency versions.
- Use `@shopify/flash-list` for the folder collection. Check the installed version's API before coding; do not blindly copy API props from a different major version.
- Query the existing `folders_index` table through the current SQLite client/repository. Do not create a competing folder table or invent column names.
- Respect category names used by the scanner and navigation: `AUDIO`, `VIDEO`, `PHOTO`, `PDF`, and `OTHER_DOC`. A folder may contain multiple media categories; show it only when it contains items for the selected category according to the existing schema.
- Use local data only. Do not add network APIs, cloud thumbnails, or remote image loading.
- Keep folder queries and aggregation off expensive render paths. Handle loading, empty, database-error, and permission-required states without crashing.
- Preserve the existing Material 3 theme and palette system. Prefer theme tokens over hard-coded colors.
- Messenger detection should use the `is_messenger_folder` field already indexed by Task 5, not fragile display-name matching in the UI.
- The “active” indicator means at least one file in that folder has unfinished resume progress, based on the existing resume-history store/repository and actual file identity.
- Keep file-list implementation out of scope. Tapping a folder should navigate to the already-defined `FileListScreen` route contract (or a minimal typed placeholder if Task 8 has not implemented the screen yet).
- After each subtask, run relevant checks and report changed files, commands executed, results, and unresolved issues. Do not begin the next subtask unless asked.

---

## Subtask 1: Inspect the Existing Schema and Navigation Contract

### 1. What to Do (Goal)

Inspect the `folders_index` schema, folder/file repositories, scanner category representation, Task 6 navigation params, and resume-history APIs. Write down the real fields and available queries before implementing the screen.

Do not build the full UI in this step.

### 2. Where to Do (Exact File Paths)

Inspect as applicable:
- `src/core/storage/migrations/v1_initial_schema.ts`
- `src/core/storage/sqliteClient.ts`
- Existing `src/core/storage/repositories/FileRepository.ts`
- Existing scanner service/types under `src/core/scanner/`
- `src/core/store/useMediaScannerStore.ts`
- Existing `useResumeHistoryStore` and `ResumeRepository`
- `src/app/navigationTypes.ts` and `src/app/AppNavigator.tsx`

Create or update only if required:
- `src/features/browser/types.ts`

### 3. AI Prompt Instructions (Copy-Paste to AI)

> Act as a Senior React Native/SQLite engineer. Complete only Subtask 1 of Task 7 for Kinetix. Inspect the existing schema and repository APIs for `folders_index`, how category counts and total bytes are represented, how folder thumbnails can be sourced locally, how `is_messenger_folder` is stored, how resume progress is keyed to a file, and how Task 6 navigation passes the category. Report the exact field names and query capabilities. Define minimal browser-domain types only if the project lacks them. Do not alter the database schema, implement UI, or guess missing columns. Preserve all existing files and report verification results.

### 4. Verification / Acceptance Criteria

- Actual schema and repository field names are documented.
- Category and navigation types align with Tasks 5–6.
- Resume identity and progress shape are grounded in the current code.
- No duplicate schema, store, or data model is created.

---

## Subtask 2: Add FlashList and Establish the Folder Data Query

### 1. What to Do (Goal)

Install `@shopify/flash-list` if it is not already present, using a version compatible with the installed React Native version. Implement or extend a repository method that retrieves folders for the selected category from `folders_index`, returning the fields required by the UI.

### 2. Where to Do (Exact File Paths)

- `package.json` and lockfile if a dependency is missing
- Existing folder/file repository under `src/core/storage/repositories/`
- `src/features/browser/services/FolderExplorerService.ts` if a service layer is needed
- Related repository/service tests

### 3. AI Prompt Instructions (Copy-Paste to AI)

> Complete only Subtask 2. Check whether `@shopify/flash-list` is already installed and inspect its compatible version before adding it. Use the existing SQLite client and repository pattern to query `folders_index` for a selected category. Return the real folder ID, display name/path, category item count, total size, messenger flag, and locally available thumbnail reference only where those fields exist in the schema. If the schema stores category aggregates differently, use the existing representation or explain the gap; do not invent columns or migrate the schema as a shortcut. Use parameterized SQL, stable ordering, and an appropriate query boundary. Add repository/service tests using the project's current database test approach. Do not build screen components yet.

### 4. Verification / Acceptance Criteria

- The query filters by the selected category correctly.
- SQL values are parameterized; no user-provided category/path is interpolated unsafely.
- Returned types match the actual schema.
- Large folder collections can be retrieved without loading file-level records unnecessarily.
- Tests cover at least AUDIO and VIDEO categories.

---

## Subtask 3: Implement Messenger Folder Filtering

### 1. What to Do (Goal)

Add a small, testable filter/helper or service-level option for hiding folders where `is_messenger_folder = true`. The default should match the product's existing preference if one exists; otherwise choose and document a sensible initial state without silently changing global settings.

### 2. Where to Do (Exact File Paths)

- `src/features/browser/services/FolderExplorerService.ts` or `src/features/browser/utils/filterFolders.ts`
- Related unit tests

### 3. AI Prompt Instructions (Copy-Paste to AI)

> Complete only Subtask 3. Implement the folder filtering behavior for the “Hide WhatsApp/Telegram Folders” control. Use the existing `is_messenger_folder` field from the indexed folder data. When the hide option is enabled, immediately exclude messenger folders; when disabled, include them again. Keep the filtering pure and testable, and respect an existing persisted user preference if one is already available. Do not infer messenger status from labels in the UI, modify scanner logic, or add a new persistence system. Add tests for both toggle states and mixed folder lists.

### 4. Verification / Acceptance Criteria

- Messenger folders are excluded only when the hide option is enabled.
- Non-messenger folders remain visible.
- Toggling back restores messenger folders without rescanning storage.
- Filtering behavior is covered by unit tests.

---

## Subtask 4: Build FolderListItem

### 1. What to Do (Goal)

Create the list-layout folder item. Show folder name, item count with category-aware wording, total size, local thumbnail or a category-appropriate icon fallback, a Messenger badge when applicable, and an active-progress indicator when unfinished resume history exists.

### 2. Where to Do (Exact File Paths)

- `src/features/browser/components/FolderListItem.tsx`
- `src/features/browser/components/__tests__/FolderListItem.test.tsx`

### 3. AI Prompt Instructions (Copy-Paste to AI)

> Complete only Subtask 4. Build `FolderListItem.tsx` using React Native Paper and existing theme tokens. Accept a typed folder view model and an `onPress` callback. Display folder name, category-aware item count (for example “48 Audios”), formatted total size (for example “320 MB”), local thumbnail if the schema/service supplies a usable local reference, otherwise a MaterialCommunityIcons fallback. Display a “Messenger” badge only when `is_messenger_folder` is true. Show an accessible active indicator when `hasUnfinishedResume` is true. Handle long folder names, missing thumbnail, zero items, and large sizes. Use the shared pressable pattern from Task 6 if available. Do not query SQLite from this presentational component. Add RNTL tests for labels, fallback thumbnail, badge, indicator, and press behavior.

### 4. Verification / Acceptance Criteria

- All required folder metadata renders correctly.
- Thumbnail absence never results in a broken remote image or crash.
- Messenger badge and active indicator reflect props exactly.
- Long names and large values do not overflow badly.
- Component tests pass.

---

## Subtask 5: Build FolderGridItem

### 1. What to Do (Goal)

Create a grid-layout variant for the same folder model. It should show a larger thumbnail/icon, folder name, item count, Messenger badge, and active indicator, while preserving the same press and accessibility behavior as the list item.

### 2. Where to Do (Exact File Paths)

- `src/features/browser/components/FolderGridItem.tsx`
- `src/features/browser/components/__tests__/FolderGridItem.test.tsx`

### 3. AI Prompt Instructions (Copy-Paste to AI)

> Complete only Subtask 5. Build `FolderGridItem.tsx` for a responsive grid cell using the same folder view model and behavior as `FolderListItem`. Use local thumbnail data only if available; otherwise show a themed category/folder icon. Display folder name, item count, Messenger badge when `is_messenger_folder` is true, and the unfinished-resume indicator. Make the touch target accessible and use the shared pressable interaction. Keep the component presentational—no SQLite queries or store mutation inside it. Add tests for required metadata and interactions. Do not implement list/grid switching controls beyond what is necessary to render the grid cell.

### 4. Verification / Acceptance Criteria

- Grid card content agrees with the list item for the same folder.
- Layout responds to available width without clipping.
- Accessibility and press behavior work.
- Tests pass for both messenger and non-messenger folders.

---

## Subtask 6: Resolve Unfinished Resume Progress for Folders

### 1. What to Do (Goal)

Determine whether each folder contains at least one file with unfinished resume progress. Use existing resume history and actual file/folder relationships. Avoid a database query or full in-memory scan for every rendered row.

### 2. Where to Do (Exact File Paths)

- Existing `ResumeRepository` and `FileRepository`
- `src/features/browser/services/FolderExplorerService.ts`
- `src/features/browser/types.ts` if a view-model field is needed
- Related service/repository tests

### 3. AI Prompt Instructions (Copy-Paste to AI)

> Complete only Subtask 6. Implement an efficient way to set `hasUnfinishedResume` for each folder using the existing resume-history source and file IDs/paths. Inspect how Task 2 and Task 6 represent resume history; do not assume a store shape. Prefer a batch query or a single precomputed set/map over one query per folder. A file counts as unfinished only if its saved progress is valid and below the existing completion threshold. Do not alter the existing resume threshold or duplicate history state. Add tests for folders with unfinished progress, completed/no-progress files, and empty history.

### 4. Verification / Acceptance Criteria

- Folders with at least one resumable file show the indicator.
- Folders with only completed/no-progress files do not show it.
- Empty history produces no indicators.
- Implementation avoids an N+1 query pattern.
- Existing resume completion semantics are preserved.

---

## Subtask 7: Build FolderExplorerScreen and Bind the Selected Category

### 1. What to Do (Goal)

Build the main `FolderExplorerScreen` using FlashList. Read the selected category from the typed navigation route, query the folder service, and render the appropriate folder items with loading, empty, error, and permission-needed states.

### 2. Where to Do (Exact File Paths)

- `src/features/browser/FolderExplorerScreen.tsx`
- `src/features/browser/services/FolderExplorerService.ts`
- `src/features/browser/types.ts`
- `src/features/browser/__tests__/FolderExplorerScreen.test.tsx`

### 3. AI Prompt Instructions (Copy-Paste to AI)

> Complete only Subtask 7. Implement `FolderExplorerScreen.tsx` using the project's installed `@shopify/flash-list` version and the existing Task 6 typed navigation params. Read the exact selected category from the route and load matching folders through the repository/service—not through SQL in the component. Render a FlashList with stable folder IDs as keys and `FolderListItem` by default. Include a clear title for the selected category, a “Hide WhatsApp/Telegram Folders” toggle chip, loading state, empty state, retryable database/error state, and a permission-required state that links back into the existing Task 4 flow. Prevent stale results from a previous category from appearing during route changes and clean up any subscriptions on unmount. Do not implement FileListScreen. Add RNTL tests with mocked folder service data for AUDIO and VIDEO.

### 4. Verification / Acceptance Criteria

- Route category controls both the screen title and queried data.
- Only folders containing the selected category appear.
- Loading, empty, error, and permission states render without crashing.
- Toggle filters messenger folders immediately.
- List keys are stable and row components do not query the database.
- Tests pass for category-specific results.

---

## Subtask 8: Navigate from a Folder to FileListScreen

### 1. What to Do (Goal)

Wire folder presses to the typed `FileListScreen` route with the correct folder identity and category. Task 8 owns the real file-list implementation; if it is not yet present, retain a small typed placeholder route rather than building file-list features early.

### 2. Where to Do (Exact File Paths)

- `src/app/navigationTypes.ts` or the existing typed route definitions
- `src/app/AppNavigator.tsx`
- `src/features/browser/FolderExplorerScreen.tsx`
- Minimal placeholder route only if required

### 3. AI Prompt Instructions (Copy-Paste to AI)

> Complete only Subtask 8. Connect a folder item press to the typed `FileListScreen` route, passing the exact folder ID/path and selected category according to the existing route contract. Do not pass the display name as the unique identity unless the existing schema guarantees it. Task 8 will implement the actual file-list UI, so do not build search, sorting, list/grid switching, or file cards. If a placeholder is necessary, keep it minimal and clearly marked for replacement. Add a navigation test asserting the correct folder and category params are sent.

### 4. Verification / Acceptance Criteria

- Pressing a folder navigates with the correct stable folder identifier.
- Category and folder params are type-safe.
- No Task 8 features are implemented prematurely.
- Navigation test passes.

---

## Subtask 9: Integration Tests and Maestro Flow

### 1. What to Do (Goal)

Test category filtering, messenger filtering, folder metadata, resume indicators, and the full Dashboard → Folder Explorer → File List navigation path.

### 2. Where to Do (Exact File Paths)

- `src/features/browser/__tests__/FolderExplorerScreen.test.tsx`
- Repository/service test files
- `src/features/browser/components/__tests__/FolderListItem.test.tsx`
- `src/features/browser/components/__tests__/FolderGridItem.test.tsx`
- Existing `.maestro/` flow directory or the project's established E2E location

### 3. AI Prompt Instructions (Copy-Paste to AI)

> Complete only Subtask 9. Add or finish integration tests using the existing Jest/RNTL and SQLite mock/test setup. Seed folders for AUDIO and VIDEO and verify that opening the AUDIO route shows only matching folders. Toggle “Hide WhatsApp/Telegram Folders” and verify `is_messenger_folder=true` folders disappear and return when toggled off. Verify count, size, thumbnail fallback, Messenger badge, and unfinished-resume indicator. Add a Maestro flow that launches the app, opens Audio from the Dashboard, verifies Folder Explorer, taps a folder, and verifies the FileListScreen route receives the expected folder/category params. Use the project's existing test setup and do not claim tests passed unless they were run.

### 4. Verification / Acceptance Criteria

- Tests cover category filtering and both messenger-toggle states.
- Resume indicator behavior is covered.
- Navigation route parameters are asserted.
- Maestro flow follows existing project conventions.
- Any environment-dependent E2E limitation is reported accurately.

---

## Subtask 10: Real-Device Performance and Final Validation

### 1. What to Do (Goal)

Validate scrolling and thumbnail behavior with a large folder collection on a physical Android device or emulator. Check theme behavior, category changes, refresh/re-entry behavior, and navigation.

### 2. Where to Do (Exact File Paths)

- No new production files unless a verified issue requires a fix
- Relevant tests from previous subtasks
- Existing app navigation and browser feature files

### 3. AI Prompt Instructions (Copy-Paste to AI)

> Complete only Subtask 10. Review Task 7 against its acceptance criteria. Run available typecheck, lint, Jest, Android build, and Maestro commands from the current repository scripts. On a real device, rapidly scroll through 100+ folders, check for blank cells, flickering thumbnails, incorrect counts, or frame drops, and verify that the Messenger toggle updates immediately. Test each supported category, an empty category, and a database/permission error path. Inspect at 60/120 Hz where supported, but report only measurements actually collected. Do not invent FPS or performance results. Report changed files, commands, pass/fail results, and unresolved issues.

### 4. Verification / Acceptance Criteria

- Typecheck, lint, tests, and available build/E2E checks are run and reported.
- Scrolling through 100+ folders is checked on device where available.
- Thumbnails use local references and do not flicker or break when absent.
- Navigation works from Dashboard → Folder Explorer → File List.
- Performance claims are based on actual measurements.

---

## Task 7 Definition of Done

- [ ] FlashList is installed at a compatible version and used for the folder collection.
- [ ] `FolderExplorerScreen` reads a typed category route parameter.
- [ ] Folders are queried from the existing `folders_index` schema/repository.
- [ ] Folder name, category item count, total size, and local thumbnail/fallback are displayed.
- [ ] Messenger badge reflects `is_messenger_folder`.
- [ ] “Hide WhatsApp/Telegram Folders” filters the list immediately.
- [ ] Active indicator appears when a folder contains at least one unfinished resume item.
- [ ] Folder list/grid item components are accessible and tested.
- [ ] Folder press navigates to `FileListScreen` with correct typed params.
- [ ] Tests cover AUDIO/VIDEO filtering, messenger toggle, metadata, resume indicator, and navigation.
- [ ] Typecheck, lint, tests, build, and available E2E results are accurately reported.
- [ ] No Task 8 file-list features or unrelated refactors are included.
