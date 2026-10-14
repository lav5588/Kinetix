# Task 14 — Advanced Integrated PDF Reader (`AdvancePdfReaderScreen`)

## Goal

Implement a reliable, offline PDF reader for Kinetix with saved reading position, night mode, page layout controls, fast page navigation, password prompts, and SQLite-backed page bookmarks.

**Project assumptions:** React Native CLI + TypeScript, Android-first, Zustand where existing app state requires it, MMKV instance `mmkv-resume-store`, `@op-engineering/op-sqlite`, and the existing app theme/navigation conventions. Inspect the repository before changing APIs or creating parallel infrastructure.

**Important performance note:** The source task sets a `<300ms` resume target. Treat this as a measurement target on a defined test device, not a guaranteed promise. Record actual time-to-visible-page and optimize based on profiling.

## Existing required paths

- `src/features/pdfReader/AdvancePdfReaderScreen.tsx`
- `src/features/pdfReader/components/PdfToolbarAndScrubber.tsx`
- `src/features/pdfReader/components/JumpToPageDialog.tsx`
- `src/features/pdfReader/components/PdfBookmarksSheet.tsx`

Add supporting services, types, and tests in the existing project conventions rather than putting all logic into the screen component.

---

## Subtask 1 — Inspect the existing app and verify native dependencies

### Copy-paste AI coding prompt

> Inspect the existing Kinetix React Native CLI repository before making changes. Check `package.json`, React Native version, Android Gradle configuration, New Architecture setting, navigation conventions, theme provider, MMKV setup, OP-SQLite client/migrations, `ResumeRepository`, and `media_bookmarks` schema. Verify compatibility for `react-native-pdf` and `react-native-blob-util` with the installed React Native/Android versions and New Architecture. Install compatible versions only if needed, and make the required Android native configuration changes. Do not upgrade unrelated packages or create duplicate storage/database instances. Report any compatibility limitation before applying a risky workaround.

### Acceptance criteria

- `react-native-pdf` and `react-native-blob-util` are installed at compatible versions.
- Existing MMKV and SQLite singletons are reused.
- Native build configuration is changed only when required and documented.
- No unrelated dependencies are upgraded.

### Tests / verification

- Run the package manager's install command.
- Run TypeScript checks and the Android debug build.
- Confirm the native PDF module initializes on a device/emulator; a Jest mock alone is not sufficient to prove native compatibility.

---

## Subtask 2 — Define PDF reader types and resume-state contract

### Copy-paste AI coding prompt

> Add typed PDF reader models and a small service layer for `AdvancePdfReaderScreen`. Define the PDF document identity, current page, total pages, zoom scale, night-mode flag, page orientation/layout mode (`vertical` or `horizontal`), and page-snap setting. Integrate with the existing `mmkv-resume-store`; persist and restore at least `pdfCurrentPage` and `pdfZoomScale`, and persist `pdfNightMode` and layout preferences if consistent with the existing resume/settings model. Namespace state by a stable file identifier/path so one PDF never inherits another PDF's position. Clamp restored page values to the valid range once page count is known. Keep storage parsing defensive and avoid introducing a second MMKV instance.

### Acceptance criteria

- State is typed and keyed to the correct PDF.
- Invalid/missing values safely fall back to page 1 and a sensible zoom default.
- Page numbers are 1-based for the PDF component and user-facing UI.
- Existing resume-store patterns are followed.

### Tests / verification

- Unit-test serialization/deserialization, missing keys, malformed values, page clamping, and isolation between two PDF files.
- Run `tsc --noEmit`.

---

## Subtask 3 — Build `AdvancePdfReaderScreen` and render a PDF

### Copy-paste AI coding prompt

> Create `src/features/pdfReader/AdvancePdfReaderScreen.tsx`. Follow the existing navigation and screen conventions. Accept the PDF file URI/path and stable file identity through typed route params or the established screen props. Render the PDF with `react-native-pdf`, wire load success/error callbacks, and track current page and total pages. Handle loading, invalid URI, missing/deleted file, render failure, and password-required errors with clear UI and retry/cancel actions. Keep native PDF rendering concerns separate from resume persistence and toolbar UI. Do not assume every URI is a plain filesystem path; support the URI forms already used by the app and normalize only where required by the native library.

### Acceptance criteria

- The screen opens a valid local PDF and displays page count/progress.
- Loading and failure states are user-readable.
- Page-change and load callbacks update typed state.
- The screen does not crash on a missing or unsupported file.

### Tests / verification

- RNTL tests for loading, successful load callback, render error, and missing URI.
- Mock `react-native-pdf` for JS tests, then separately verify rendering on a real Android device/emulator.

---

## Subtask 4 — Restore and persist reading position and zoom

### Copy-paste AI coding prompt

> Integrate the screen with `mmkv-resume-store` so opening a PDF restores `pdfCurrentPage` and `pdfZoomScale`. Persist page changes and zoom changes without writing excessively on every tiny gesture update; use a small debounce/throttle or persist at stable interaction points, following existing repository conventions. Ensure the initial `page` prop is set from saved state once it is safe to do so, while guarding against the PDF library's initial callbacks overwriting the saved page with page 1. When the document reports its total page count, clamp the restored page to `1..totalPages`. On unmount, flush the latest state. Do not block the first render on unnecessary asynchronous work when MMKV reads are synchronous.

### Acceptance criteria

- Saved page 42 is restored as `page={42}` for a 200-page document.
- Current page and zoom are saved and restored for the same PDF.
- Initial load callbacks do not erase a valid saved page.
- Persistence does not trigger a render/write loop.

### Tests / verification

- Test restored state `{ pdfCurrentPage: 42, pdfTotalPages: 200, pdfNightMode: true }` and assert the PDF receives `page={42}`.
- Test page and zoom changes write to the existing MMKV store.
- Test invalid saved pages are clamped after total page count is known.

---

## Subtask 5 — Implement night mode / dark invert

### Copy-paste AI coding prompt

> Add a Night Mode / Dark Invert control to the PDF reader toolbar. Use the PDF library's supported inversion/night-mode mechanism if it is available and compatible; inspect its actual installed API rather than guessing prop names. If full page inversion is not supported, implement a clearly named supported fallback and document its limitations instead of claiming perfect inversion. Persist the toggle consistently, apply night-mode styling to reader chrome, and ensure the control is accessible. Avoid changing the actual document content or file on disk.

### Acceptance criteria

- Night mode toggles on/off without reopening the PDF.
- Reader chrome follows the app theme and the toggle state.
- The chosen approach's limitations are documented if inversion is approximate.
- The state is restored after closing and reopening the PDF.

### Tests / verification

- RNTL test that night-mode state changes the PDF props/styles using the installed library's real supported API.
- Manual test with text-heavy and image-heavy pages; inspect readability, images, and zoom sharpness.

---

## Subtask 6 — Add vertical/horizontal modes and page snap

### Copy-paste AI coding prompt

> Implement a layout control in `AdvancePdfReaderScreen` for Vertical Continuous versus Horizontal Page-Flip and a Page Snap toggle. Map these controls to the actual supported `react-native-pdf` props for the installed version. If a requested behavior is not natively supported, do not invent a prop: implement a compatible alternative or explain the limitation in code comments and the final summary. Switching layout should preserve the current page and zoom as far as the library allows. Persist the selected preferences using the established settings/resume conventions.

### Acceptance criteria

- Vertical and horizontal modes visibly behave as labeled.
- Page snap can be enabled/disabled when supported.
- Changing modes preserves the reading location or restores it immediately after the mode change.
- Unsupported behavior is surfaced honestly, not silently simulated.

### Tests / verification

- Unit/component tests for control state and the props passed to the PDF component.
- Manual test switching modes on a multi-page PDF and verify page alignment and scrolling.

---

## Subtask 7 — Build toolbar, draggable scrubber, and floating page bubble

### Copy-paste AI coding prompt

> Create `src/features/pdfReader/components/PdfToolbarAndScrubber.tsx`. Build a compact toolbar for night mode, layout mode, page snap, jump-to-page, and bookmarks. Add a draggable vertical page scrubber with a floating bubble such as `Page 45 / 320`. Convert drag position to a clamped page index from 1 to total pages, update the bubble while dragging, and navigate to the selected page when appropriate. Make touch targets usable and prevent the scrubber from blocking normal PDF scrolling except while actively dragged. Use the app's existing theme, icon, gesture, and animation conventions; clean up gesture/timer resources on unmount.

### Acceptance criteria

- Bubble shows current page and total pages.
- Dragging maps to a valid page and never selects page 0 or beyond the last page.
- The selected page is applied to the PDF and resume state.
- Toolbar controls have accessible labels and work with the app theme.

### Tests / verification

- Unit-test scrubber position-to-page conversion at start, middle, end, and out-of-range positions.
- RNTL test page bubble text and callbacks.
- Manually drag across a long PDF and verify responsiveness.

---

## Subtask 8 — Implement `JumpToPageDialog`

### Copy-paste AI coding prompt

> Create `src/features/pdfReader/components/JumpToPageDialog.tsx`. Provide a numeric page input, current total-page context, Jump and Cancel actions, and clear validation feedback. Reject non-integers and values outside `1..totalPages`. On a valid input, call a typed callback with the requested page and close the dialog only when the action is accepted. Integrate it with `AdvancePdfReaderScreen` so jumping to a page updates the PDF's page prop/current page and writes the new page to `mmkv-resume-store`. Follow existing dialog/accessibility conventions.

### Acceptance criteria

- Inputs `0`, `-5`, and `999` on a 200-page PDF show an out-of-bounds error.
- Input `85` jumps to page 85 and updates MMKV.
- Cancel closes the dialog without changing the current page.
- Empty, decimal, and non-numeric values are handled clearly.

### Tests / verification

- RNTL tests for `0`, `-5`, `999`, and valid `85`.
- Assert the valid case calls the page callback with 85 and persists the new page.
- Test dialog keyboard behavior and accessibility labels.

---

## Subtask 9 — Password prompt and SQLite page bookmarks

### Copy-paste AI coding prompt

> Add password-protected PDF handling and `src/features/pdfReader/components/PdfBookmarksSheet.tsx`. When the PDF library reports that a password is required, show a password input with Submit and Cancel; never log or persist the password. Pass the password only to the supported PDF component API and allow retry with a useful error for a wrong password. For page bookmarks, inspect the existing `media_bookmarks` migration and repository before changing schema. Reuse/create the existing `BookmarkRepository` if present; store a PDF bookmark with stable file ID, page number, media/document type, and optional label/note using the current schema. Support listing, adding, deleting, and jumping to a saved page. Do not add a parallel bookmark table or issue raw SQL outside established repository conventions.

### Acceptance criteria

- Password-required PDFs prompt the user; successful entry loads the document and cancel exits the prompt safely.
- Passwords are not written to MMKV, SQLite, logs, or analytics.
- PDF page bookmarks persist in the existing `media_bookmarks` table.
- User can add, list, jump to, and delete bookmarks.

### Tests / verification

- Test password prompt submit/cancel and wrong-password error handling using mocks.
- Integration-test adding and deleting a PDF page bookmark in `media_bookmarks`.
- Test bookmark selection navigates to the stored page.
- Manual test with a password-protected PDF the tester is authorized to access.

---

## Subtask 10 — Integration, performance, and real-device regression

### Copy-paste AI coding prompt

> Finish Task 14 by integrating the PDF screen with the existing Dashboard Continue Reading/PDF-folder navigation without creating a duplicate navigation path. Add focused Jest/RNTL tests for restoring `{ pdfCurrentPage: 42, pdfTotalPages: 200, pdfNightMode: true }`, page-jump validation, and SQLite bookmark add/delete. Run the project's TypeScript, lint, test, and Android build commands and fix regressions introduced by this task. Add a short manual test checklist. On a real device, test a 300+ page PDF larger than 100 MB and a password-protected PDF. Navigate to page 145, close the app, reopen from Continue Reading or the PDF folder, and measure time until page 145 is visible. Treat `<300ms` as a target to measure, not a guaranteed acceptance condition; report device, file, and measured result. Verify night mode, zoom sharpness, horizontal/vertical modes, page snap, scrubber, jump dialog, and bookmarks.

### Acceptance criteria

- All focused automated tests pass.
- TypeScript/lint/build checks pass or any pre-existing failures are clearly identified.
- Continue Reading opens the correct PDF and restores its page.
- Manual test results record actual resume latency rather than asserting an unmeasured number.
- No duplicate MMKV or SQLite infrastructure is introduced.

### Tests / verification checklist

- [ ] RNTL: restored page 42 and night-mode state.
- [ ] RNTL: Jump-to-page rejects `0`, `-5`, and `999` for 200 pages; accepts `85`.
- [ ] SQLite integration: add, query, jump to, and delete a PDF page bookmark.
- [ ] Real device: 300+ page, 100MB+ PDF.
- [ ] Real device: password-protected PDF.
- [ ] Real device: reopen at page 145 and record measured time-to-visible-page.
- [ ] Real device: night mode, pinch zoom, layout switching, page snap, scrubber, and Android Back behavior.
