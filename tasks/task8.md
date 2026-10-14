# Task 8: Universal File List Screen, Smart Search & Sorting — AI Subtask Prompts

This file breaks **Task 8 from `Tasks.md`** into small, sequential implementation steps. Complete one subtask, run its verification, and fix failures before starting the next. Keep the existing Kinetix architecture and inspect the current repository before creating or changing files.

## Project Rules for Every Subtask

- App: **Kinetix**, Android-first, offline-only React Native CLI bare workflow, TypeScript, New Architecture.
- Follow existing Feature-Sliced Design, aliases, theme engine, storage repositories, and Zustand conventions. Do not invent a parallel architecture.
- Use local SQLite (`@op-engineering/op-sqlite`), `files_search_fts`, existing MMKV instance `mmkv-sort-filter-state`, and the existing resume-history store. No network or cloud services.
- Reuse the real `files_index` schema, `FileRepository`, category types, navigation param types, theme tokens, and installed package versions. Inspect them before writing SQL or props.
- Use `@shopify/flash-list`, `@gorhom/bottom-sheet`, and Reanimated `LinearTransition` only after checking their installed versions and current project setup. Do not blindly install duplicates or replace working dependencies.
- Do not implement audio/video playback engines, batch file operations, or unrelated Task 9+ features here.
- Each AI coding response must implement **only the current subtask**. It must list changed files, explain key decisions, and give exact verification commands/results to run. Do not jump to the next subtask.
- Prefer parameterized SQL and repository methods; never interpolate raw user search text into SQL.
- Preserve responsive layout, accessibility labels, stable list keys, and light/dark/AMOLED theme compatibility.

---

## Subtask 1 — Inspect Existing Data, Navigation, and Storage Contracts

### 1. What to Do (Goal)
Inspect Tasks 1–7 implementation and map the existing contracts needed for `FileListScreen`: `files_index`, `files_search_fts`, folder/category navigation params, `FileRepository`, `mmkv-sort-filter-state`, and `useResumeHistoryStore`. Do not implement the screen yet. Identify missing contracts and report a minimal implementation plan consistent with the repository.

### 2. Where to Inspect
- `src/core/storage/sqliteClient.ts`
- `src/core/storage/migrations/v1_initial_schema.ts`
- `src/core/storage/repositories/FileRepository.ts`
- `src/core/storage/repositories/ResumeRepository.ts`
- `src/core/storage/mmkvInstances.ts`
- `src/core/store/useResumeHistoryStore.ts` (or the actual existing path)
- `src/app/AppNavigator.tsx`
- `src/features/browser/FolderExplorerScreen.tsx`
- Existing Task 7 folder item components and relevant tests

### 3. AI Prompt Instructions (Copy-Paste to AI)
> Act as a senior React Native architect working on Kinetix. For this subtask, inspect the existing code and report the actual schemas, repository methods, route param types, resume-history record shape, MMKV instance API, and installed versions of FlashList, Gorhom Bottom Sheet, and Reanimated. Identify the smallest missing contracts required for Task 8. Do not modify files or invent schema columns. End with a proposed ordered plan for the remaining subtasks.

### 4. Verification / Acceptance Criteria
- Automated: Run the existing typecheck, lint, and test commands to establish a baseline.
- Manual: Confirm the plan uses real paths, actual schema columns, and existing route/store APIs.
- Stop if a required schema or API is ambiguous; resolve that ambiguity before implementation.

---

## Subtask 2 — Add Typed Browser Models and Safe Sort/Search Utilities

### 1. What to Do (Goal)
Define or extend typed file-list models and pure utility functions for sorting and filter semantics. Support sort fields `NAME`, `DATE`, `SIZE`, `DURATION`, directions `ASC`/`DESC`, and quick filters `ALL`, `IN_PROGRESS`, `UNWATCHED`, `FAVORITES`, and `LARGE_FILES`. Reuse existing domain types wherever possible.

### 2. Where to Do (Exact File Paths)
- `src/features/browser/types.ts` (create only if no suitable existing type module exists)
- `src/features/browser/utils/fileSorting.ts`
- `src/features/browser/utils/fileFilters.ts`
- Corresponding `__tests__` or feature test files, following repository conventions

### 3. AI Prompt Instructions (Copy-Paste to AI)
> Implement only the typed browser sort/filter models and pure utility functions for Kinetix. Inspect the actual `files_index` and resume/favorites models first. Support Name, Date, Size, and Duration sorting in ascending and descending order, with deterministic tie-breakers that preserve stable results. Define the five quick-filter modes: All, In Progress, Unwatched, Favorites, and Large Files greater than 100 MB. Do not create fake fields or assume a favorites schema that does not exist; if favorite state is represented elsewhere, use that actual contract and report it. Do not build UI or database queries in this step.

### 4. Verification / Acceptance Criteria
- Automated: Test each comparator in both directions using at least 20 representative mock files, including missing duration/date values and equal sort keys.
- Automated: Test filter behavior at boundaries, including exactly 100 MB versus greater than 100 MB.
- Manual: Confirm sorting does not mutate the original array and results are deterministic.

---

## Subtask 3 — Implement Repository Queries for Folder Files and FTS5 Search

### 1. What to Do (Goal)
Extend the existing repository layer with safe, typed queries for files inside a selected folder and for debounced-search results from `files_search_fts`. Keep SQL and storage details out of React components. Ensure queries use the real schema and handle FTS5 special characters safely.

### 2. Where to Do (Exact File Paths)
- `src/core/storage/repositories/FileRepository.ts`
- `src/core/storage/sqliteClient.ts` only if a connection helper is genuinely missing
- Existing storage repository tests or `__tests__/core/storage/`

### 3. AI Prompt Instructions (Copy-Paste to AI)
> Implement only the required FileRepository methods for Task 8. One method must retrieve indexed files for a selected folder using the real folder identifier/path contract; another must search `files_search_fts` and constrain results to the selected folder when a folder is supplied. Use parameterized queries, map database rows into existing domain types, and inspect how the FTS5 virtual table is actually joined to `files_index`. Handle apostrophes, brackets, hyphens, empty queries, and malformed search syntax without crashing. Do not alter migrations or add columns unless the existing schema proves a migration is required; explain any necessary migration before applying it.

### 4. Verification / Acceptance Criteria
- Automated: Repository integration tests return only files from the requested folder.
- Automated: Search tests cover normal words, `[1080p]`, apostrophes, hyphens, empty input, no matches, and malformed input.
- Automated: Verify the SQL query does not concatenate raw search input.
- Manual: Query results match seeded local SQLite data while offline.

---

## Subtask 4 — Build the Persistent Browser Filter Store

### 1. What to Do (Goal)
Create `useBrowserFilterStore` to manage list/grid view, quick-filter selection, and sort field/direction. Persist sort/filter preferences per category using the existing `mmkv-sort-filter-state` instance. Hydrate safely and provide stable actions/selectors.

### 2. Where to Do (Exact File Paths)
- `src/core/store/useBrowserFilterStore.ts`
- `src/core/storage/mmkvInstances.ts` only if the existing instance needs a small exported accessor
- Corresponding store tests

### 3. AI Prompt Instructions (Copy-Paste to AI)
> Create `src/core/store/useBrowserFilterStore.ts` using the project's existing Zustand and MMKV patterns. Store view mode (`LIST`/`GRID`), quick filter, sort field, and sort direction with defaults that match the current app conventions. Persist preferences per category using the existing `mmkv-sort-filter-state` instance so changing Audio sorting does not overwrite Video or Photos preferences. Validate persisted JSON before using it, tolerate missing/corrupted values by falling back to safe defaults, and expose small typed actions. Do not persist the live file result array or duplicate the resume-history store.

### 4. Verification / Acceptance Criteria
- Automated: Test defaults, changing view, sorting, and quick filters.
- Automated: Verify Audio and Video preferences remain independent after updates.
- Automated: Verify malformed persisted data does not crash store initialization.
- Manual: Change a category's sort preference, restart the app, and confirm it remains selected.

---

## Subtask 5 — Build `FileItemCard` With Resume Progress

### 1. What to Do (Goal)
Build a reusable file card that can render in list and grid layouts. Show appropriate file/media icon or existing thumbnail, filename, useful metadata, and a bottom progress bar for any file with resume history. For a file with `positionMs = 30000` and `durationMs = 60000`, show 50% progress. Avoid subscribing every card to the entire resume store if a focused selector or precomputed view model is feasible.

### 2. Where to Do (Exact File Paths)
- `src/features/browser/components/FileItemCard.tsx`
- Existing browser types or file presentation helpers as established in Subtask 1
- `src/features/browser/components/__tests__/FileItemCard.test.tsx` (or the project's established test location)

### 3. AI Prompt Instructions (Copy-Paste to AI)
> Implement only `FileItemCard.tsx` for Kinetix. Reuse the existing theme tokens and icon/thumbnail components. Accept a typed file and the relevant resume record or derived progress value using actual project types. Render filename and appropriate metadata, and show a bottom progress indicator when a resume record exists and the duration is valid. Clamp progress to 0–100%, handle zero/missing duration without division errors, and keep the card accessible with a meaningful label. The component must work in both list and grid presentation without owning database or navigation logic.

### 4. Verification / Acceptance Criteria
- Automated: A record at 30,000/60,000 ms renders 50% progress.
- Automated: Test no history, zero duration, invalid negative values, and progress beyond duration.
- Automated: Verify long filenames and accessibility labels.
- Manual: Check card appearance in the app's light, dark, and AMOLED themes.

---

## Subtask 6 — Build the Debounced `SmartSearchHeader`

### 1. What to Do (Goal)
Build the search header with a 150 ms debounce and quick-filter chips: `All`, `In Progress`, `Unwatched`, `Favorites`, and `Large Files > 100MB`. It should update the browser store and expose search/filter changes to the parent without embedding SQL in the component.

### 2. Where to Do (Exact File Paths)
- `src/features/browser/components/SmartSearchHeader.tsx`
- `src/core/store/useBrowserFilterStore.ts`
- Corresponding SmartSearchHeader tests

### 3. AI Prompt Instructions (Copy-Paste to AI)
> Implement only `SmartSearchHeader.tsx`. Include an accessible search input and the five specified quick-filter chips. Debounce text changes by exactly 150 ms, clean up pending work on unmount, and pass the committed query and selected filter to the parent or existing store using the established architecture. The header must not run SQL directly. Keep the UI consistent with React Native Paper and the theme engine. Ensure clearing the query resets search results, and do not confuse “Unwatched” with “In Progress.”

### 4. Verification / Acceptance Criteria
- Automated: With fake timers, typing several characters triggers only the latest query after 150 ms.
- Automated: Verify clear-query behavior and each quick-filter selection.
- Automated: Verify timer cleanup on unmount and accessible labels for input/chips.
- Manual: Type quickly on a physical Android device and confirm the input remains responsive.

---

## Subtask 7 — Build `SortBottomSheet`

### 1. What to Do (Goal)
Build a sorting bottom sheet using `@gorhom/bottom-sheet`. Provide:
- Name: A–Z / Z–A
- Date: Newest / Oldest
- Size: Largest / Smallest
- Duration: Longest / Shortest

Persist the chosen field/direction through `useBrowserFilterStore` so each category remembers its own choice.

### 2. Where to Do (Exact File Paths)
- `src/features/browser/components/SortBottomSheet.tsx`
- `src/core/store/useBrowserFilterStore.ts`
- Corresponding SortBottomSheet tests

### 3. AI Prompt Instructions (Copy-Paste to AI)
> Implement only `SortBottomSheet.tsx` using the installed `@gorhom/bottom-sheet` version and the app's existing Gesture Handler/Reanimated setup. Expose a typed ref or controlled open/close API consistent with the installed version. Present all eight sort choices (four fields, two directions), clearly mark the current choice, and update `useBrowserFilterStore` for the active category when selected. Dismiss predictably after selection, support Android back dismissal, and use theme tokens. Do not add unrelated sorting modes or persist settings in a new storage instance.

### 4. Verification / Acceptance Criteria
- Automated: Test each sort option maps to the correct field and direction.
- Automated: Verify selecting a sort option updates the correct category's persisted preference.
- Manual: Open, select, dismiss via backdrop/back button, and reopen the sheet on Android.

---

## Subtask 8 — Assemble `FileListScreen` With List/Grid Layout and Live Queries

### 1. What to Do (Goal)
Build `FileListScreen` with FlashList, List/Grid switching, Reanimated `LinearTransition`, the search header, sort sheet, category-specific persisted preferences, repository-driven folder contents, quick filters, and resume progress on file cards. Implement loading, empty, search-no-results, and recoverable error states.

### 2. Where to Do (Exact File Paths)
- `src/features/browser/FileListScreen.tsx`
- `src/features/browser/components/FileItemCard.tsx`
- `src/features/browser/components/SmartSearchHeader.tsx`
- `src/features/browser/components/SortBottomSheet.tsx`
- `src/core/storage/repositories/FileRepository.ts`
- `src/core/store/useBrowserFilterStore.ts`

### 3. AI Prompt Instructions (Copy-Paste to AI)
> Implement only `FileListScreen.tsx` and the minimum wiring needed to integrate the already completed Task 8 components. Read the typed route params from the existing navigator and accept the selected folder/category using the real route contract. Query `FileRepository` for folder contents, use the debounced query against `files_search_fts`, apply the selected quick filter and stable sort, and render results with `@shopify/flash-list`. Add List/Grid switching with Reanimated `LinearTransition`, and preserve the selected view/sort/filter per category through `useBrowserFilterStore`. Show resume progress on file cards from `useResumeHistoryStore`. Handle loading, empty folder, no search results, permission loss, and repository errors without crashing. Do not implement playback; tapping a file should use an existing route if one exists, otherwise provide a clearly typed placeholder callback and report the missing route instead of inventing a player screen.

### 4. Verification / Acceptance Criteria
- Automated: With seeded AUDIO and VIDEO records, verify the selected folder's files and category remain scoped correctly.
- Automated: Verify list/grid toggling, search, all quick filters, sorting, and per-category preference hydration.
- Automated: Verify progress display and loading/empty/error/permission states.
- Manual: Open a folder from Task 7 and confirm the file list reflects only that folder's indexed files.

---

## Subtask 9 — Integration Tests for Search, Filters, Sorting, and Resume Indicators

### 1. What to Do (Goal)
Add focused unit/component/integration coverage for Task 8 behavior. Prefer testing pure logic and repository behavior separately, then test the screen composition with mocked repositories and stores.

### 2. Where to Do (Exact File Paths)
- Existing browser utility tests
- Existing `FileRepository` integration tests
- `src/features/browser/components/__tests__/SmartSearchHeader.test.tsx`
- `src/features/browser/components/__tests__/SortBottomSheet.test.tsx`
- `src/features/browser/__tests__/FileListScreen.test.tsx`

Use the test paths already established by the repository if they differ.

### 3. AI Prompt Instructions (Copy-Paste to AI)
> Add tests only for Task 8 behaviors, using the project's existing Jest/RNTL setup and established file locations. Cover Name/Date/Size/Duration sorting in both directions using 20 mock files; 150 ms debounced FTS search; the In Progress and Large Files >100MB filters plus the other three chips; 50% resume progress for 30,000/60,000 ms; and independent persisted sort preferences per category. Mock native bottom-sheet/FlashList/Reanimated modules only as needed for deterministic tests. Do not weaken assertions just to make tests pass.

### 4. Verification / Acceptance Criteria
- Automated: Run targeted browser/repository tests, then the full test suite.
- Automated: Run typecheck and lint with no new warnings.
- Manual: Confirm tests fail when key filter/sort logic is deliberately broken, then restore correct code.

---

## Subtask 10 — End-to-End and Real-Device Validation

### 1. What to Do (Goal)
Validate Task 8 using Maestro and a physical Android device, especially large folders, layout switching, persisted sorting, and local search responsiveness. Fix only Task 8 defects discovered during validation.

### 2. Where to Do (Exact File Paths)
- `.maestro/` (add or update the browser flow following current conventions)
- Relevant Task 8 source/tests only
- Project test/build scripts as needed

### 3. AI Prompt Instructions (Copy-Paste to AI)
> Add or update a Maestro flow for this exact journey: launch Kinetix → tap Audio on Dashboard → tap a folder → verify FileListScreen → enter a search query → apply In Progress and Large Files >100MB filters → switch List/Grid → choose a sort order → restart the app and verify that category-specific sorting remains selected. Use actual accessibility labels/testIDs present in the UI; add stable testIDs only where needed. Then provide exact commands for typecheck, lint, Jest, Android debug build, and Maestro execution. Do not claim a physical-device performance result unless it was actually measured.

### 4. Verification / Acceptance Criteria
- Automated: Maestro flow completes on the configured emulator/device.
- Manual: Open a folder with 2,000+ audio or image files and switch List/Grid; confirm the Reanimated layout transition remains smooth.
- Manual: Change sort order, close and reopen the app, and verify the choice is remembered for that category.
- Manual: Confirm search remains responsive, progress indicators are correct, and there are no blank/flickering cells or crashes.
- Final gate: Run `npx tsc --noEmit`, the project's lint command, targeted Jest tests, full Jest suite, Android debug build, and the available Maestro flow. Report any unavailable test environment honestly.

---

## Task 8 Completion Checklist

- [ ] FileListScreen reads the selected folder/category from typed navigation params.
- [ ] Files are loaded from the local repository and stay scoped to the selected folder.
- [ ] List/Grid switching uses FlashList and the installed Reanimated `LinearTransition` API.
- [ ] Search uses `files_search_fts` with a 150 ms debounce and safe parameterized queries.
- [ ] All five quick filters work: All, In Progress, Unwatched, Favorites, Large Files >100MB.
- [ ] Sorting supports Name, Date, Size, and Duration in both directions.
- [ ] Sorting/filter/view preferences persist per category in `mmkv-sort-filter-state`.
- [ ] File cards show resume progress where valid.
- [ ] Automated tests and real-device checks are documented and completed where available.
