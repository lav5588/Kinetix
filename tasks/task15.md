# Task 15 — Other Documents Hub & Native Android Intent Chooser (`DocIntentLauncher`)

## Goal

Build the **Other Docs** category for Kinetix. Support a broad set of document/archive extensions, a built-in text/code viewer for lightweight text formats, and Android's native **Open with…** chooser for Office documents and archives. Configure secure Android `content://` URI sharing/opening for Android 10–15.

**Project assumptions:** React Native CLI + TypeScript, Android-first, existing navigation/theme/file scanner, and existing file records. Inspect the repository before implementing. Reuse established file metadata and permission utilities; do not create a duplicate scanner or storage database.

## Required paths from `Tasks.md`

- `android/app/src/main/res/xml/file_paths.xml`
- `src/features/otherDocs/services/DocIntentLauncher.ts`
- `src/features/otherDocs/TextAndCodeViewerModal.tsx`

Add additional files only where needed and follow the project's existing conventions.

---

## Subtask 1 — Inspect app architecture and validate native dependencies

### Copy-paste AI coding prompt

> Inspect the existing Kinetix React Native CLI repository before changing anything. Review `package.json`, React Native version, Android `AndroidManifest.xml`, existing FileProvider declarations, `res/xml` resources, file scanner/category classifier, file URI/path conventions, navigation, theme, permission helpers, and current tests. Verify compatible versions and native setup for `react-native-file-viewer` and `react-native-share`. Check whether either dependency or a FileProvider already exists; reuse existing setup instead of adding duplicates. Summarize the planned changes and then implement only the minimal compatible dependency/configuration updates.

### Acceptance criteria

- Compatible dependencies are installed only if missing.
- Existing FileProvider and share utilities are reused where possible.
- No duplicate provider authority, scanner, database, or permission layer is created.
- Existing project conventions and Android SDK targets are preserved.

### Tests / verification

- Install dependencies with the project's package manager.
- Run `tsc --noEmit`, lint, and Android debug build.
- Verify the native packages compile for the project's current React Native/Android setup.

---

## Subtask 2 — Configure Android FileProvider and secure URI access

### Copy-paste AI coding prompt

> Configure Android FileProvider for secure sharing/opening of local documents on Android 10–15. Inspect `android/app/src/main/AndroidManifest.xml` and create/update `android/app/src/main/res/xml/file_paths.xml` as required. Use the provider authority derived from the app's actual `applicationId` (commonly `${applicationId}.fileprovider`), set `exported="false"` and `grantUriPermissions="true"`, and expose only the narrowest required app-owned/cache directories. Do not expose the entire filesystem with an overly broad path. Ensure the manifest provider matches the XML resource and the share/opening library's documented requirements. Avoid manually constructing `file://` URIs for external apps when a secure `content://` URI is required.

### Acceptance criteria

- Manifest provider authority and XML resource match.
- Only intended directories are exposed.
- URI permissions are granted to receiving apps as needed.
- No duplicate provider declarations or `FileUriExposedException` caused by passing raw file URIs.

### Tests / verification

- Inspect the merged Android manifest and build output.
- On a real Android device, open/share a test document to an installed compatible app.
- Verify the receiver can read the document and access is not unnecessarily broad.

---

## Subtask 3 — Implement extension and MIME-type classification

### Copy-paste AI coding prompt

> Build a small typed extension/MIME classification utility for the Other Docs workflow, following the repository's existing classifier conventions. Cover `.docx`, `.doc`, `.xlsx`, `.xls`, `.pptx`, `.ppt`, `.csv`, `.txt`, `.json`, `.xml`, `.md`, `.log`, `.zip`, `.rar`, and `.apk`. Add the visual badge categories required by the task: Word Blue, Excel Green, PowerPoint Orange, and Archive Gold; provide sensible neutral styling for other formats. Normalize extensions case-insensitively, handle filenames without extensions, and return a safe unknown/unsupported result rather than guessing. Use correct MIME types where known and avoid treating MIME type alone as proof that an APK is safe.

### Acceptance criteria

- Extension lookup is case-insensitive.
- Required extensions map to the expected category/MIME type.
- Unknown extensions are handled safely.
- Badge color/category mapping is centralized and testable.

### Tests / verification

- Jest unit tests for `.docx`, `.xlsx`, `.pptx`, `.zip`, `.apk`, and `.txt`.
- Include uppercase extensions, filenames with multiple dots, and files without extensions.
- Verify archive/Office badge categories use the intended theme tokens.

---

## Subtask 4 — Build `DocIntentLauncher` service

### Copy-paste AI coding prompt

> Create `src/features/otherDocs/services/DocIntentLauncher.ts` as a typed service for opening or sharing documents. Separate routing decisions from UI: `.txt`, `.json`, `.csv`, `.log`, `.md`, and `.xml` should be routed to the built-in viewer; Office documents and archives should use `react-native-file-viewer` with the native chooser behavior requested by the task. Use the library's installed-version API and verify the exact chooser option instead of guessing option names. Resolve supported local file URIs safely, apply the correct MIME type when the API allows it, and return structured success/cancel/error outcomes. Handle missing files, no compatible installed app, and native failures with user-friendly messages. Do not silently claim a file opened if the native promise rejects.

### Acceptance criteria

- Routing logic is independent from React components.
- Text-like formats route internally; Office/archive formats request the native chooser.
- Correct MIME mapping is used where supported.
- Errors are surfaced in a typed, actionable form.

### Tests / verification

- Jest tests verify `.txt`, `.json`, and `.md` select the internal viewer route.
- Jest tests verify `.docx`, `.xlsx`, and `.pptx` call `FileViewer.open()` with the documented chooser option.
- Test missing file, unsupported type, and native rejection paths.

---

## Subtask 5 — Build the Other Docs category workflow and file list

### Copy-paste AI coding prompt

> Integrate an Other Docs category screen or route with the existing file browser/navigation patterns. Display supported file types `.docx`, `.doc`, `.xlsx`, `.xls`, `.pptx`, `.ppt`, `.csv`, `.txt`, `.json`, `.xml`, `.md`, `.zip`, `.rar`, and `.apk`, using existing indexed file data rather than rescanning storage. Show file name, extension badge, and useful existing metadata such as size/date if available. Tapping a file should call the `DocIntentLauncher` routing layer. Reuse the app's list virtualization, search/sort behavior, empty/loading/error states, theme, and accessibility conventions. If the existing `FileListScreen` already supports category filtering, extend it rather than duplicating the whole file browser.

### Acceptance criteria

- Other Docs displays the required formats from existing indexed data.
- Extension badges are consistent and correctly categorized.
- File taps route through `DocIntentLauncher`.
- Empty/loading/error states are handled without crashing.
- Existing search, sort, and file selection behavior is preserved where already implemented.

### Tests / verification

- RNTL test the category list with a mixed mock dataset.
- Verify required extensions render and pressing a file invokes the correct route/service.
- Verify empty and loading states.

---

## Subtask 6 — Implement `TextAndCodeViewerModal` basic viewing

### Copy-paste AI coding prompt

> Create `src/features/otherDocs/TextAndCodeViewerModal.tsx` as a lightweight in-app viewer for `.txt`, `.json`, `.csv`, `.log`, `.md`, and `.xml`. Accept a typed file reference and callbacks for close/error. Load file content using the repository's existing supported filesystem/document-reading utility; do not assume every URI can be read with a plain Node filesystem API. Show loading, empty-file, too-large-file, unsupported-encoding, and read-error states. Render long content without blocking the UI or trying to parse untrusted text as HTML. For JSON/XML/CSV, preserve the raw text and provide readable formatting only as a view enhancement; do not mutate the source file.

### Acceptance criteria

- Required text-like formats open inside the modal.
- Content is read safely from supported local file references.
- Large/unreadable files show an understandable fallback instead of freezing/crashing.
- Closing the modal returns to the prior file list without changing the file.

### Tests / verification

- RNTL tests for loading, rendered sample content, empty content, read failure, and close callback.
- Verify content is displayed as text and is not executed as markup or code.

---

## Subtask 7 — Add line numbers and text search highlighting

### Copy-paste AI coding prompt

> Enhance `TextAndCodeViewerModal` with line numbers and an in-view text search field. Search should be case-insensitive by default, highlight matching substrings, show match count/current match, and allow next/previous match navigation if feasible within the current rendering approach. Handle empty queries and zero matches clearly. Keep large-file performance in mind: avoid creating thousands of deeply nested React elements unnecessarily; use an appropriate virtualized or bounded rendering strategy consistent with existing dependencies. Preserve original line breaks and ensure search highlighting cannot inject markup or execute file contents.

### Acceptance criteria

- Sample JSON/text displays line numbers.
- Search highlights matching text and reports match count.
- Zero matches and cleared queries are handled correctly.
- Long documents remain usable without major UI freezes.

### Tests / verification

- RNTL test sample JSON/text with known matches, line numbers, and zero-result query.
- Test case-insensitive matching and special characters in the query.
- Manually test a large `.log` or `.json` file.

---

## Subtask 8 — Implement safe native open/share flows

### Copy-paste AI coding prompt

> Wire `DocIntentLauncher` to `react-native-file-viewer` and `react-native-share` using the installed versions' documented APIs. For Office documents and archives, launch Android's native chooser (`Intent.ACTION_VIEW` through the library's supported chooser behavior) so users can select an installed compatible app. For share actions, use secure `content://` URIs and grant read permissions where supported. Show a useful message when no handler is installed or the selected app cannot open the file. Treat `.apk` as a file that may be inspected/shared, not automatically installed; never bypass Android's install confirmation or security controls. Ensure cancellation is not displayed as a fatal error.

### Acceptance criteria

- `.docx`, `.xlsx`, and `.pptx` invoke the native chooser with correct options.
- Text-like formats open internally.
- Sharing uses secure URIs and appropriate temporary access grants.
- No-handler and cancellation outcomes are handled appropriately.
- APK files do not trigger silent installation.

### Tests / verification

- Mock-based Jest tests for chooser invocation, share invocation, cancellation, and failure handling.
- Real-device test opening `.docx`, `.xlsx`, `.pptx`, `.zip`, and sharing a document.
- Confirm no `FileUriExposedException` occurs.

---

## Subtask 9 — Accessibility, lifecycle, and error hardening

### Copy-paste AI coding prompt

> Review the Other Docs list, `DocIntentLauncher`, and `TextAndCodeViewerModal` for lifecycle, accessibility, and error handling. Add accessible labels and focus behavior for toolbar buttons, search, close, and chooser actions. Ensure opening/closing a modal cleans up listeners and temporary state. Handle file deletion between list display and opening, permission revocation, invalid paths, unsupported MIME types, and native module rejection. Avoid logging full document contents or sensitive filenames. Keep errors consistent with the app's existing toast/dialog pattern and never suppress unexpected errors without a visible fallback.

### Acceptance criteria

- Key controls have accessible labels and usable touch targets.
- Deleted/unreadable files fail gracefully.
- Modal state and subscriptions are cleaned up.
- Sensitive document content is not written to logs.
- Errors are communicated using existing app patterns.

### Tests / verification

- Jest/RNTL tests for deleted file, invalid URI, and native rejection.
- Check accessibility labels and modal close behavior.
- Test reopening the viewer after a failed open.

---

## Subtask 10 — Full regression and real-device verification

### Copy-paste AI coding prompt

> Complete Task 15 by connecting the Other Docs category to the Dashboard's existing navigation and indexed file list. Add or finish tests for MIME-type mapping, internal-vs-native routing, and `TextAndCodeViewerModal` line numbers/search highlighting. Run the project's TypeScript, lint, Jest, and Android build commands; fix regressions caused by this task and report pre-existing failures separately. On real Android devices covering the project's supported range (at minimum a recent Android version; test Android 10–15 where available), tap `.docx`, `.xlsx`, and `.pptx` and verify the native Open with chooser appears; open `.txt` and `.json` in the built-in viewer; share a document to a compatible app; and verify secure URI access without `FileUriExposedException`. Record the device/Android version and actual outcomes.

### Acceptance criteria

- Automated tests and project checks pass, or remaining pre-existing failures are documented.
- Other Docs is reachable from the existing Dashboard.
- Native chooser works for Office files when compatible apps are installed.
- Text/code files open in-app with line numbers and search highlighting.
- Secure URI sharing/opening works without file URI exposure crashes.

### Tests / verification checklist

- [ ] MIME tests for `.docx`, `.xlsx`, `.pptx`, `.zip`, `.apk`, `.txt`.
- [ ] Routing tests: `.txt`, `.json`, `.md` -> internal viewer.
- [ ] Routing tests: `.docx`, `.xlsx`, `.pptx` -> native chooser.
- [ ] Viewer tests: sample content, line numbers, search highlights, zero matches.
- [ ] Real device: `.docx`, `.xlsx`, `.pptx` chooser.
- [ ] Real device: `.txt` and `.json` internal viewer.
- [ ] Real device: share a document through `content://` URI.
- [ ] Confirm no `FileUriExposedException` and no app crash on missing handlers.
