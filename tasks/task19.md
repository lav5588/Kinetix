# Task 19 — Performance Profiling, Memory Leak Audits & Edge-Case Hardening

## Goal

Optimize Kinetix for low-end Android devices with 3GB RAM and flagship devices with 120Hz displays. Improve list rendering and thumbnail memory handling, recover gracefully from corrupted or missing files, clean stale resume/index records, and harden behavior for SD-card removal, split-screen resizing, and Android Back handling across modals and fullscreen players.

## How to use this plan

- Complete **one subtask at a time**, in order.
- Give the coding AI only the prompt for the current subtask.
- Ask it to inspect the existing code before changing anything.
- Run automated checks after each subtask and resolve regressions before moving on.
- Preserve the current architecture, strict TypeScript configuration, offline-first behavior, and native library choices.
- Do not claim FPS or memory improvements without measurements. Record baseline and post-change results on the same device/configuration when possible.
- Do not introduce a new dependency or replace a working subsystem unless the repository audit shows it is necessary.

---

## Subtask 1 — Audit performance-sensitive screens and establish a baseline

### Scope
Inspect all `FlashList` and `Reanimated` usage, thumbnail loading/caching, audio playback while browsing, resume history, file index cleanup, modal/fullscreen navigation, SD-card/storage event handling, and file-opening error boundaries. Record existing list sizes and current performance measurements where available. Identify the app’s installed image library and verify the actual API before using `FastImage.clearMemoryCache`.

### Exact paths to inspect
- `src/core/scanner/StaleRecordCleaner.ts` (if it exists)
- `src/shared/hooks/useAndroidBackHandler.ts` (if it exists)
- All files containing `FlashList` and `Reanimated`
- `src/features/` player, image viewer, PDF reader, and dashboard/Continue Watching files
- `src/core/storage/repositories/FileRepository.ts`
- `src/core/storage/repositories/ResumeRepository.ts`
- `src/core/storage/mmkvInstances.ts`
- Existing image/thumbnail loading utilities and Android native lifecycle code

### Copy-paste AI prompt
> Audit the existing app for Task 19 without modifying code. Locate every FlashList and Reanimated-heavy screen, thumbnail/image cache integration, Continue Watching/resume record flow, file-index cleanup path, media open/error boundary, SD-card removal handling, split-screen/window-size assumptions, and Android Back handling for modals and fullscreen players. Confirm which image package is actually installed and what cache-clearing API it exposes; do not assume FastImage is present. Record current available tests and, if a device is available, collect baseline UI FPS/JS FPS and memory observations while scrolling a large image list with audio playing. Return an implementation map with exact paths, risks, and a test plan. Do not change code yet.

### Acceptance criteria
- Existing APIs and paths are identified accurately.
- Baseline checks and any pre-existing failures are recorded.
- The actual image-cache API is verified from installed dependencies.
- No runtime code changes occur in this subtask.

### Tests / checks
- Run the current test suite, `yarn tsc --noEmit`, and lint to establish baseline.
- Record device model, Android version, build type, list size, and observed FPS/memory if profiling is possible.

---

## Subtask 2 — Tune `FlashList` sizing and large-list rendering

### Scope
Configure `estimatedItemSize` and related list props based on the actual row/card layouts. Avoid unnecessary rerenders, unstable keys, expensive inline calculations, and rendering large thumbnail grids eagerly. Preserve current sorting, filtering, selection, and list/grid switching behavior.

### Exact paths
- All existing components that use `FlashList` (locate them during Subtask 1)
- Relevant shared file row/card and thumbnail components under `src/features/` or `src/shared/`
- Existing list-related tests

### Copy-paste AI prompt
> Optimize the existing FlashList-based file and media lists using measured/actual row dimensions and the installed FlashList version’s supported props. Set appropriate `estimatedItemSize` values for each distinct row/card layout; do not apply one guessed value to every layout. Check stable keys, memoization boundaries, avoidable rerenders, and expensive work performed during render. Preserve list/grid mode, selection, sorting, filtering, scroll behavior, and the PersistentMiniPlayer dock. Do not rewrite the list architecture or add dependencies. Add or update tests for item rendering and list behavior, and explain how to compare performance before and after on-device.

### Acceptance criteria
- FlashList sizing is configured for the actual item layouts.
- Keys are stable and rendering does not regress selection or sorting.
- Large lists do not eagerly mount every item.
- Existing UI and interactions remain functionally equivalent.

### Tests / checks
- Run existing browser/list component tests.
- Test list/grid switching, sort/filter changes, and multi-select if supported.
- Run `yarn tsc --noEmit` and lint.
- On device, compare scrolling behavior using the same large folder before and after.

---

## Subtask 3 — Add bounded thumbnail memory-cache handling

### Scope
Set sensible thumbnail/cache behavior for large photo libraries and handle Android low-memory notifications where the existing native integration supports them. Clear only the appropriate memory cache in response to a genuine memory-pressure event; do not clear caches continuously during normal scrolling or delete disk cache unnecessarily.

### Exact paths
- Existing thumbnail/image-loading utility and image components identified in Subtask 1
- `src/shared/` or `src/core/` memory-pressure handler location consistent with existing conventions
- Native Android lifecycle/module path only if a JS-accessible memory warning signal is not already available
- Related tests

### Copy-paste AI prompt
> Implement bounded thumbnail memory handling using the image package and APIs actually installed in this repository. Inspect its implementation/types before calling any cache-clearing method. If the platform/library exposes memory-pressure events, respond to those events by clearing the relevant in-memory thumbnail cache in a throttled, safe way; otherwise document the missing signal and implement only a supported alternative without inventing an API. Do not clear the cache on every render, scroll event, or screen focus. Avoid breaking image loading or animated images. Add tests for event handling, cleanup/unsubscription, and ensuring normal renders do not repeatedly clear the cache.

### Acceptance criteria
- Cache handling uses a verified API.
- Memory cleanup occurs only at appropriate times.
- Event listeners/subscriptions are cleaned up correctly.
- Thumbnail rendering and disk-cache behavior remain intact.

### Tests / checks
- Unit-test memory warning handling and listener cleanup.
- Test repeated warnings do not trigger unbounded/redundant work.
- Run image-related tests, `yarn tsc --noEmit`, and lint.
- Profile memory while scrolling a large photo list before/after when possible.

---

## Subtask 4 — Implement `StaleRecordCleaner`

### Scope
Detect resume records whose files no longer exist, remove the stale resume entry from `mmkv-resume-store`, and remove the corresponding stale record from `files_index` according to the existing repository contracts. Avoid deleting a record merely because storage is temporarily unavailable or a mounted SD card is disconnected.

### Exact paths
- `src/core/scanner/StaleRecordCleaner.ts`
- `src/core/storage/mmkvInstances.ts`
- `src/core/storage/repositories/FileRepository.ts`
- `src/core/storage/repositories/ResumeRepository.ts`
- Dashboard/Continue Watching component and its existing file-opening flow
- Related Jest tests

### Copy-paste AI prompt
> Implement `src/core/scanner/StaleRecordCleaner.ts` using the project’s existing file, resume, and storage APIs. When a file is confirmed missing, remove its stale resume record from `mmkv-resume-store` and remove the corresponding indexed record from `files_index` through repository methods. Distinguish a confirmed missing file from a transient I/O error or an unavailable SD card: never purge records simply because a storage volume is temporarily inaccessible. Make cleanup idempotent, safe to retry, and testable without a physical device. Wire it into the appropriate stale-record/Continue Watching flow without doing a full synchronous filesystem scan on the UI thread. Add unit tests for missing, present, and temporarily inaccessible files.

### Acceptance criteria
- Confirmed missing files have their stale resume and index records cleaned up.
- Existing files remain untouched.
- Temporary storage failures do not trigger destructive cleanup.
- Repeated cleanup is safe and does not crash.
- Cleanup does not block UI rendering with a large synchronous scan.

### Tests / checks
- Test a missing file with a resume record and `files_index` entry.
- Verify both stale records are removed and cleanup can run twice safely.
- Test present files remain unchanged.
- Test transient I/O failure/volume-unavailable cases preserve records.
- Run repository/scanner tests and `yarn tsc --noEmit`.

---

## Subtask 5 — Handle missing files from Continue Watching gracefully

### Scope
When a user taps a Continue Watching card whose file has been deleted, avoid crashing or opening a broken player. Show a friendly message, invoke stale cleanup only when the missing state is confirmed, and keep the rest of the carousel usable.

### Exact paths
- Existing `ContinueWatchingCarousel` component location
- `src/core/scanner/StaleRecordCleaner.ts`
- `src/core/storage/repositories/FileRepository.ts`
- `src/core/storage/repositories/ResumeRepository.ts`
- Existing toast/snackbar and file-opening helpers

### Copy-paste AI prompt
> Harden the Continue Watching card-open flow. If the underlying file is confirmed missing, do not launch the player; show the app’s existing friendly toast/snackbar message and invoke `StaleRecordCleaner` to remove the dead resume record and indexed file record. If opening fails because storage is temporarily unavailable, show a non-destructive recoverable message and preserve records. Ensure one bad card does not break the carousel or other navigation. Use existing toast and repository patterns, and add Jest/RNTL tests for missing-file and transient-error behavior.

### Acceptance criteria
- Missing file: friendly message, no crash, stale records cleaned.
- Temporary storage issue: friendly message, records preserved.
- Other Continue Watching cards continue to work.
- No duplicate cleanup logic is embedded in the UI.

### Tests / checks
- Test tapping a card with a confirmed-missing file.
- Assert toast, no player navigation, and stale cleanup invocation.
- Test transient error preserves records.
- Run dashboard/resume tests and `yarn tsc --noEmit`.

---

## Subtask 6 — Add graceful handling for corrupted and zero-byte media files

### Scope
Ensure Audio, Video, Image, and PDF opening flows detect zero-byte or unreadable files and show the fallback text `File is corrupted or unreadable` with a `Try Opening in External App` action instead of crashing. Handle races where a file becomes unavailable after the initial check. Reuse existing external-open/intent helpers.

### Exact paths
- Existing Audio player screen and open service under `src/features/audioPlayer/`
- Existing Video player screen and open service under `src/features/videoPlayer/`
- `src/features/imageViewer/ProImageViewerScreen.tsx`
- `src/features/pdfReader/AdvancePdfReaderScreen.tsx`
- Existing `DocIntentLauncher` or external file-open helper where appropriate
- Shared file validation/error component location consistent with existing UI patterns
- Related tests

### Copy-paste AI prompt
> Add a shared, reusable error/fallback pattern for corrupted, zero-byte, unreadable, or newly missing media files across Audio, Video, Image, and PDF flows. The fallback must display the exact message `File is corrupted or unreadable` and a `Try Opening in External App` action. Use the existing external-app/intent helper and real file URI/path model; do not create an unsafe file URI manually. Treat metadata checks as a preliminary signal only because a file can fail during decoding/opening. Catch expected file-open/native decoder errors and show the fallback rather than crashing. Do not swallow unrelated programming errors silently. Add tests for zero-byte, open/decoder failure, external-open action, and recovery/back navigation.

### Acceptance criteria
- Audio, Video, Image, and PDF handle zero-byte/unreadable inputs gracefully.
- The specified fallback message and external-open action appear.
- External opening uses existing safe URI/intent infrastructure.
- Back navigation works from the fallback.
- Valid files continue opening normally.

### Tests / checks
- Add unit/component tests for each of the four media categories.
- Verify fallback action invokes the external-open helper with the expected file.
- Test a failure that occurs after the initial file check.
- Run player, image, PDF, and file-open tests plus `yarn tsc --noEmit`.

---

## Subtask 7 — Harden SD-card removal and storage-volume availability

### Scope
Handle SD-card ejection or temporary volume loss while browsing or playing media. Avoid treating inaccessible mounted storage as deleted files. Refresh or recover the UI when storage becomes available again, and gracefully handle failures during scans, file reads, thumbnails, and playback.

### Exact paths
- `src/core/scanner/` (existing scanner and volume/storage access services)
- `src/core/scanner/StaleRecordCleaner.ts`
- `src/core/storage/repositories/FileRepository.ts`
- Existing file browser and media open services
- Android native storage event integration only if required by the existing architecture

### Copy-paste AI prompt
> Audit and harden the existing storage-volume/SD-card handling for temporary removal or unavailability. Use the current storage-access APIs and native event integration if available. On volume loss, stop or fail affected reads/scans gracefully, display a recoverable message, and avoid deleting `files_index` or resume records solely because the volume cannot currently be accessed. When the volume returns, refresh/reconcile using the existing scanner flow. Handle errors in thumbnails and active media opens without crashing. Do not add polling loops or native APIs without verifying the current Android implementation. Add mockable tests for volume-unavailable, volume-restored, and scan/open failures.

### Acceptance criteria
- SD-card ejection does not crash the app.
- Temporary unavailability does not trigger stale-record deletion.
- Affected operations fail gracefully and can recover.
- Re-insertion allows the existing scanner/reconciliation flow to refresh content.
- No excessive polling or repeated scans are introduced.

### Tests / checks
- Test unavailable volume preserves file and resume records.
- Test scan/open failure displays a recoverable state.
- Test volume restoration triggers the supported refresh path.
- Run scanner/browser/player tests and `yarn tsc --noEmit`.

---

## Subtask 8 — Make layouts resilient to split-screen and window resizing

### Scope
Remove fixed-screen assumptions that break in split-screen or multi-window mode. Ensure lists, sheets, player controls, and image/PDF layouts respond to changing available dimensions without relying on device orientation as the sole indicator of screen size.

### Exact paths
- Responsive layout components across `src/features/`
- Video HUD/fullscreen controls under `src/features/videoPlayer/`
- `src/features/imageViewer/ProImageViewerScreen.tsx`
- `src/features/pdfReader/AdvancePdfReaderScreen.tsx`
- Shared window-dimension/layout hooks if present

### Copy-paste AI prompt
> Audit and fix layout assumptions that break when Android enters split-screen or changes window dimensions. Use React Native’s supported window-dimension/layout mechanisms and the project’s existing responsive patterns. Avoid caching initial screen width/height for components that must adapt at runtime. Ensure FlashList layouts, bottom sheets, video HUD controls, image viewer, and PDF reader recalculate layout from available dimensions without breaking media playback or orientation handling. Do not make unrelated visual redesigns. Add component tests for dimension-dependent layout logic where practical and provide a physical-device test checklist.

### Acceptance criteria
- Key screens adapt to window-size changes.
- No clipping/overlapping controls in narrow split-screen layouts.
- List columns and sheets use current available dimensions.
- Player behavior and orientation locking remain compatible.

### Tests / checks
- Test any extracted responsive layout utilities against narrow and wide dimensions.
- Run relevant screen/component tests, `yarn tsc --noEmit`, and lint.
- Manually resize the app in Android split-screen and verify key screens.

---

## Subtask 9 — Centralize Android Back handling for modals and fullscreen players

### Scope
Implement or harden `useAndroidBackHandler` so Back closes the topmost modal/sheet first, exits fullscreen where appropriate, and only then navigates away. Prevent duplicate listeners and stale closures. Respect the navigation framework’s existing back behavior.

### Exact paths
- `src/shared/hooks/useAndroidBackHandler.ts`
- Existing modal/sheet components across `src/features/`
- Fullscreen video player and image viewer components
- Existing navigation/back-handler setup
- Related Jest/RNTL tests

### Copy-paste AI prompt
> Implement or harden `src/shared/hooks/useAndroidBackHandler.ts` using the installed React Native/navigation APIs and existing app conventions. Define clear precedence for active modal/sheet, fullscreen player/viewer, and normal navigation so the topmost UI layer handles Back first. Ensure listeners are registered only while needed, removed on unmount/deactivation, and do not capture stale callbacks. Avoid registering competing handlers that consume Back after the relevant modal has closed. Integrate the hook into the key modal/fullscreen flows without rewriting the navigation architecture. Add tests for precedence, disabled/inactive states, callback updates, and listener cleanup.

### Acceptance criteria
- Back closes the topmost active modal/sheet first.
- Fullscreen exit happens before leaving the underlying screen when that is the established UX.
- Normal navigation still works when no overlay consumes Back.
- Listeners do not leak or fire twice.
- Existing Android navigation behavior remains intact.

### Tests / checks
- Test modal → fullscreen → navigation precedence as supported by the app.
- Test unmount/deactivation removes listeners.
- Test updated callbacks are used rather than stale closures.
- Run navigation/modal tests, `yarn tsc --noEmit`, and lint.

---

## Subtask 10 — Final profiling, edge-case regression, and real-device validation

### Scope
Validate performance with a large image library while audio is playing, verify stale cleanup and corrupted-file fallback behavior, and exercise SD-card removal, split-screen resizing, and Back handling. Record measured results honestly, including device and build details.

### Exact paths
- `src/core/scanner/StaleRecordCleaner.ts`
- `src/shared/hooks/useAndroidBackHandler.ts`
- All tuned FlashList/Reanimated and thumbnail components
- Audio, Video, Image, and PDF error/fallback flows
- Existing Jest and E2E test directories

### Copy-paste AI prompt
> Perform final Task 19 regression and profiling. Add or complete Jest tests for `StaleRecordCleaner`: when a Continue Watching file is confirmed missing, the app shows a friendly message and removes the dead record from `mmkv-resume-store` and `files_index`; transient volume errors must preserve records. Test corrupted/zero-byte file fallback behavior for Audio, Video, Image, and PDF, including the `File is corrupted or unreadable` message and `Try Opening in External App` action. Run the relevant automated tests, full test suite where practical, `yarn tsc --noEmit`, and lint. On a physical device, open React Native Perf Monitor and scroll through 5,000 photos while audio plays through `PersistentMiniPlayer`; record UI FPS, JS FPS, device/build details, and any memory observations. Also test external deletion of a recently watched video, SD-card removal/reinsertion if hardware is available, split-screen resizing, and Android Back handling. Do not claim any device measurement or test was performed unless it actually was.

### Acceptance criteria
- Missing-file cleanup and corrupted-file fallback tests pass.
- Transient storage failures do not purge records.
- TypeScript, lint, and relevant automated tests pass or remaining failures are documented.
- Performance results include device/build/list-size context.
- Real-device checks are reported as passed, failed, or not run—not assumed.

### Automated testing checklist
- [ ] Missing Continue Watching file shows a friendly message.
- [ ] Confirmed missing file is removed from `mmkv-resume-store` and `files_index`.
- [ ] Transient storage/SD-card failure preserves records.
- [ ] Zero-byte/corrupted Audio fallback works.
- [ ] Zero-byte/corrupted Video fallback works.
- [ ] Zero-byte/corrupted Image fallback works.
- [ ] Zero-byte/corrupted PDF fallback works.
- [ ] External-open action uses the existing safe helper.
- [ ] Back-handler precedence and listener cleanup pass.
- [ ] Run relevant Jest tests, `yarn tsc --noEmit`, and lint.

### Manual real-device checklist
- [ ] Open React Native Perf Monitor.
- [ ] Scroll through 5,000 photos while audio plays through `PersistentMiniPlayer`.
- [ ] Verify UI FPS stays at 60/120 FPS where the device/display supports it.
- [ ] Verify JS FPS stays above 55 during the scenario.
- [ ] Delete a recently watched video using an external file manager and return to the app.
- [ ] Verify the stale record is cleaned up without a crash.
- [ ] Eject/reinsert SD card if the device supports it.
- [ ] Resize the app in split-screen/multi-window mode.
- [ ] Press Android Back across a modal, fullscreen player/viewer, and normal screen.

---

## Definition of done

Task 19 is complete when list rendering and thumbnail memory handling have been audited and tuned, stale resume/index records are cleaned only after a file is confirmed missing, corrupted/zero-byte media shows the required fallback instead of crashing, SD-card removal and split-screen resizing are handled gracefully, and Android Back works consistently across overlays and fullscreen experiences. Automated results and real-device performance measurements must be documented honestly.
