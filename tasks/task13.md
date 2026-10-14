# Task 13 — Advanced Integrated Image Viewer (`ProImageViewerScreen`)

## Goal

Build an integrated image viewer that supports horizontal paging, double-tap zoom, pinch-to-zoom up to 8x, panning with boundaries, swipe-down-to-dismiss, animated GIF/WebP playback, slideshow intervals, 90° rotation, sharing, setting wallpaper, EXIF metadata, and persistence of the last viewed image index in `mmkv-resume-store`.

Complete the following **10 subtasks in order**. Inspect and reuse the existing file model, navigation, theme, resume storage, permissions, and UI conventions before making changes.

## Important implementation rules

- Verify the current React Native version and compatibility of `@d11/react-native-fast-image` and any zoom/gesture helper before installing or changing native dependencies.
- Use actual media URIs/paths from the app's file model. Handle Android content URIs and scoped storage correctly; do not assume every file is a normal filesystem path.
- Do not implement a second resume store. Reuse `mmkv-resume-store` and the existing `ResumeRepository`/record schema.
- Keep image transforms, gesture state, timers, and native operations separate enough to test independently.
- Clean up slideshow timers and gesture state on unmount, navigation, and file-list changes.
- Report formats or native actions that are not supported by the selected dependency/device instead of faking support.

---

## Subtask 13.1 — Inspect Existing Image and File Architecture

**Purpose:** Establish the existing contracts before coding.

**AI coding prompt (copy and paste):**

> Inspect the repository for image/media file types, the current file browser's image-open flow, navigation parameters, permissions/content URI handling, `mmkv-resume-store`, `ResumeRepository`, `useResumeHistoryStore`, theme/UI conventions, and installed image/gesture libraries. Check compatibility and setup requirements for `@d11/react-native-fast-image` and any existing zoom/gesture helper. Do not implement features yet. Report exact existing contracts, missing pieces, package compatibility risks, and a minimal Task 13 implementation plan.

**Acceptance criteria**
- The report identifies the current image file type, stable file ID, URI/path, folder ID, and resume-record schema.
- Existing dependencies and native setup are identified.
- No source files are changed in this subtask.

**Verification**
- Confirm the proposed imports and storage APIs exist or are explicitly identified as work to add.

---

## Subtask 13.2 — Install and Verify Image Rendering Dependencies

**Scope:** `package.json`, lockfile, Android configuration only if required by the verified package.

**AI coding prompt:**

> Install/configure `@d11/react-native-fast-image` and any zoom/gesture helper required for Task 13 only after checking compatibility with this project's React Native version, Android setup, and New Architecture. Read the installed package's real setup instructions. Reuse existing `react-native-gesture-handler` and Reanimated if already installed. Run package installation, TypeScript checks, and an Android debug build. If the package is incompatible, report the exact failure and recommend a compatible alternative instead of applying speculative native changes.

**Acceptance criteria**
- Dependency versions and lockfile are consistent.
- Required native configuration follows the installed package's documentation.
- The Android build result is recorded.

**Verification**
- Run the project's install, type-check, and Android debug build commands.
- Confirm images can render on an Android device/emulator before building viewer interactions.

---

## Subtask 13.3 — Implement `ProImageViewerScreen` and Horizontal Paging

**Primary file:** `src/features/imageViewer/ProImageViewerScreen.tsx`

**AI coding prompt:**

> Build `ProImageViewerScreen` using the project's actual image-file model and navigation conventions. Accept the current folder's image list and starting index (or load them through the existing repository/navigation contract). Render the correct image and support horizontal paging through the folder's images. Show a header counter such as `5 / 10`, and handle an empty list, missing file, invalid starting index, loading state, and image-load error gracefully. Keep image transformations and metadata presentation in the dedicated child components. Do not load unrelated folders or invent file URIs.

**Acceptance criteria**
- Opening an image from `FileListScreen` shows the correct image and folder sequence.
- Horizontal paging updates the active index and counter.
- Invalid or deleted image entries do not crash the viewer.
- The screen follows the app's theme and accessibility conventions.

**Verification**
- RNTL-test 10 images with starting index `4`; assert the correct URI and header counter `5 / 10`.
- Test empty list, invalid index, and image load failure.

---

## Subtask 13.4 — Build `ZoomableImageCanvas` with Double-Tap and Pinch Zoom

**Primary file:** `src/features/imageViewer/components/ZoomableImageCanvas.tsx`

**AI coding prompt:**

> Build a reusable `ZoomableImageCanvas` supporting double-tap zoom from `1x` to `2.5x` and back to `1x`, plus two-finger pinch zoom from `1x` up to `8x`. Use the project's installed gesture-handler and Reanimated APIs or the verified zoom helper. Keep transforms on the UI thread where appropriate. Clamp scale to `1x–8x`, maintain the focal point during pinch as supported by the chosen implementation, and avoid blank gaps when panning beyond image bounds. Coordinate gestures with horizontal paging so a swipe advances to the next image when zoomed out but pans the current image when zoomed in. Reset or deliberately preserve zoom when the active image changes according to a documented behavior.

**Acceptance criteria**
- Double tap toggles `1x` ↔ `2.5x`.
- Pinch scale is clamped between `1x` and `8x`.
- Pan is constrained to the image's valid bounds.
- Horizontal paging and zoom/pan do not fight each other.
- Gesture state resets cleanly when switching images or unmounting.

**Verification**
- Unit-test scale clamping and any pure transform/bounds helpers.
- Component-test the expected zoom state transitions where practical.
- Manually test double-tap, 8x pinch, panning to corners, and paging on a real device.

---

## Subtask 13.5 — Add Swipe-Down-to-Dismiss and Transition

**Primary file:** `src/features/imageViewer/ProImageViewerScreen.tsx`  
**Supporting component:** `src/features/imageViewer/components/ZoomableImageCanvas.tsx`

**AI coding prompt:**

> Implement vertical swipe-down-to-dismiss with a backdrop opacity fade and a Shared Element-style transition if the project's navigation and image component support it. Reuse existing transition infrastructure if present. Ensure the gesture only dismisses when the image is not zoomed in or when the gesture can be distinguished safely from panning. On dismissal, return to the original `FileListScreen` and clean up any active slideshow. If a true Shared Element transition is not supported by the current navigation/dependency versions, implement a smooth verified backdrop/translate transition and document the limitation rather than claiming a Shared Element animation.

**Acceptance criteria**
- A downward swipe dismisses the viewer with an opacity/translation transition.
- Pan gestures at high zoom do not accidentally dismiss the screen.
- Navigation returns to the previous file list without losing its context.
- Active slideshow timers are cleared on dismiss.

**Verification**
- Test dismiss callback and timer cleanup.
- Manually swipe down on a photo and verify the backdrop fade and return to `FileListScreen`.

---

## Subtask 13.6 — Support Animated GIF/WebP and Image Rotation

**Primary file:** `src/features/imageViewer/ProImageViewerScreen.tsx`  
**Supporting component:** `src/features/imageViewer/components/ZoomableImageCanvas.tsx`

**AI coding prompt:**

> Support animated `.gif` and `.webp` playback using the verified capabilities of the selected image library and Android device. Add a 90° rotation action that rotates the active image in 90-degree increments. Keep rotation state associated with the active image session and ensure zoom/pan bounds are recalculated after rotation. If animated WebP or another format is not supported by the installed native library, show a graceful fallback/error state and document the limitation; do not silently show only the first frame while claiming animation works.

**Acceptance criteria**
- Supported animated formats play as animations.
- Rotation changes by 90° per action and remains within normalized angles.
- Rotating an image does not break zoom/pan or paging.
- Unsupported formats fail gracefully.

**Verification**
- Unit-test rotation normalization (for example, `0 → 90 → 180 → 270 → 0`).
- Manually open `.gif` and `.webp` files and test 90° rotation.

---

## Subtask 13.7 — Implement Slideshow Mode (3s / 5s / 10s)

**Primary file:** `src/features/imageViewer/ProImageViewerScreen.tsx`

**AI coding prompt:**

> Add slideshow controls with intervals of `3s`, `5s`, and `10s`. When enabled, advance to the next image at the selected interval, and define the end-of-folder behavior consistently (for example, stop at the last image or loop only if the UI explicitly supports looping). Use a single managed timer; changing intervals must reset it cleanly. Stop slideshow when the user exits the viewer, the image list becomes invalid, or a dismissal gesture completes. Avoid stale closures by reading current slideshow state and active index safely.

**Acceptance criteria**
- User can start, stop, and change interval.
- The active image advances at the selected cadence.
- Timer does not multiply after repeated toggles or interval changes.
- Timer stops on unmount/dismiss and handles the last image predictably.

**Verification**
- Use Jest fake timers to verify active index increments every 3 seconds.
- Test stop, interval changes, end-of-folder behavior, and unmount cleanup.

---

## Subtask 13.8 — Add Share and Set as Wallpaper Actions

**Primary file:** `src/features/imageViewer/ProImageViewerScreen.tsx`  
**Additional native/configuration files:** only those required by the verified sharing/wallpaper API.

**AI coding prompt:**

> Add Share and Set as Wallpaper actions for the active image. Reuse existing sharing, file-provider, permissions, and native-intent utilities if available. Handle Android `content://` URIs, temporary URI permissions, cancellation, permission denial, unsupported devices, and native errors. For wallpaper, use a verified Android API/module or a compatible maintained package and request only required permissions. Do not copy private media into a public directory merely to make the action work. If wallpaper setting is not supported by the current dependency, identify and implement the minimal native bridge or report the precise blocker.

**Acceptance criteria**
- Share opens the native share sheet for the current image.
- Wallpaper action invokes the real platform operation or reports a clear actionable error.
- Cancellation and permission errors do not crash the viewer.
- The action always targets the currently displayed image.

**Verification**
- Mock-test share/wallpaper action success, cancellation, and error handling.
- Manually share an image to another app and set a supported image as wallpaper on Android.

---

## Subtask 13.9 — Build `ExifMetadataBottomSheet`

**Primary file:** `src/features/imageViewer/components/ExifMetadataBottomSheet.tsx`

**AI coding prompt:**

> Build `ExifMetadataBottomSheet` to display Resolution, File Size, Date Taken, Camera Model, ISO, and Path for the active image. Use an existing EXIF/metadata reader if the project has one; otherwise inspect compatible libraries before adding a dependency. Treat each field as optional because many images lack EXIF data or have stripped metadata. Format resolution and file size clearly, handle missing/unreadable metadata gracefully, and avoid blocking image rendering while metadata loads. Do not infer metadata values that are not present in the file.

**Acceptance criteria**
- All six metadata rows display when values exist.
- Missing tags show a clear unavailable value or are omitted consistently.
- Metadata is refreshed when the active image changes.
- Metadata extraction errors do not crash the viewer.

**Verification**
- RNTL-test with mock EXIF tags and assert all metadata rows render.
- Test missing tags and extraction failure.
- Manually inspect a camera photo and an image with stripped metadata.

---

## Subtask 13.10 — Persist Last Viewed Image Index and Run Regression Tests

**Primary files**
- `src/features/imageViewer/ProImageViewerScreen.tsx`
- Existing `ResumeRepository`/resume record and `useResumeHistoryStore`

**AI coding prompt:**

> Persist the last viewed image index for the current folder in the existing `mmkv-resume-store` using the project's existing resume-record conventions. On opening a folder's image viewer, restore the last valid index when appropriate; when the user opens a specific image intentionally, preserve the requested start index unless the existing app behavior specifies otherwise. Save index changes as the user pages through images and ensure the saved index is scoped to the folder, not globally shared across folders. Handle deleted images, reordered folder contents, invalid indices, and folder changes safely. Then run Task 13's component/unit tests, TypeScript check, lint, and Android debug build and report exact results.

**Acceptance criteria**
- Last viewed image index is saved and restored for the correct folder.
- Index is clamped or safely reset when the image list changes.
- Existing audio/video/PDF resume data is not overwritten or corrupted.
- Component tests cover initial index, index `4` of 10 (`5 / 10`), paging persistence, and invalid/deleted entries.
- Build/test results are reported accurately.

**Verification**
- Test saving/restoring the index through the project's MMKV/resume test setup.
- Open a folder, view several photos, exit and reopen; verify the expected image index is restored.
- Confirm folder A's index does not affect folder B.

---

## Task 13 completion definition

Task 13 is complete when `ProImageViewerScreen` is integrated with the real file browser, paging and zoom/pan work together, supported animations/rotation/slideshow work, swipe-down dismissal is clean, Share/Wallpaper use real Android actions, EXIF metadata is displayed safely, and the last viewed index persists per folder in `mmkv-resume-store`. Record native/dependency limitations explicitly.
