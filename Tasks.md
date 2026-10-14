# Universal Media & Document Hub — End-to-End Task Breakdown & Testing Plan

This document breaks down the entire **Universal Media & Document Hub (Kinetix)** architecture into **20 sequential, small, testable tasks**. Completing Task 1 through Task 20 in order will take the project from an empty repository to a 100% production-ready Android application.

Each task strictly follows the 4-point structure:
1. **What to Do** (Functional & architectural implementation scope)
2. **Where to Do** (Exact directories and file paths)
3. **Automated Testing (What to Consider in Automation)** (Unit, Integration, and E2E tests via Jest, React Native Testing Library, and Maestro/Detox)
4. **Manual Testing (What to Test Manually on Real Device)** (Hardware, native OS dialogs, codecs, and 60/120 FPS visual checks)

---

## Task 1: Project Initialization, New Architecture & Testing Setup
1. **What to Do:** Initialize a bare React Native CLI project with TypeScript in strict mode. Enable React Native's New Architecture (Fabric & TurboModules) in Android build properties. Configure path aliases (`@app`, `@core`, `@shared`, `@features`), ESLint, Prettier, Jest, React Native Testing Library (RNTL), and Maestro/Detox for E2E testing. Create the base Feature-Sliced directory structure.
2. **Where to Do:** 
   - `android/gradle.properties` (`newArchEnabled=true`)
   - `tsconfig.json`, `babel.config.js`, `jest.config.js`
   - `src/app/`, `src/core/`, `src/shared/`, `src/features/`
   - `__tests__/setup.ts` and `.maestro/config.yaml`
3. **Automated Testing (What to Consider in Automation):**
   - Write a Jest smoke test verifying that the root `App.tsx` renders without crashing.
   - Verify TypeScript compiler (`tsc --noEmit`) and ESLint pass in CI/CD pipeline with zero warnings.
   - Verify path aliases resolve properly inside Jest unit tests.
4. **Manual Testing (What to Test Manually on Real Device):**
   - Build and install the debug APK on a physical Android phone (`yarn android`).
   - Verify the Metro bundler connects, Fast Refresh works instantly, and the app launches with zero red-box or native C++ crashes.

---

## Task 2: Dual Local Storage Engine Setup (`MMKV` + `OP-SQLite`)
1. **What to Do:** Install and configure `react-native-mmkv` and `@op-engineering/op-sqlite`. Create the 3 isolated MMKV instances (`mmkv-resume-store`, `mmkv-user-settings`, `mmkv-sort-filter-state`). Create the SQLite database initializer and run startup migrations for all 6 tables (`folders_index`, `files_index`, `files_search_fts`, `media_bookmarks`, `playlists_and_collections`, `private_vault_files`).
2. **Where to Do:**
   - `src/core/storage/mmkvInstances.ts`
   - `src/core/storage/sqliteClient.ts`
   - `src/core/storage/migrations/v1_initial_schema.ts`
   - `src/core/storage/repositories/FileRepository.ts`
   - `src/core/storage/repositories/ResumeRepository.ts`
3. **Automated Testing (What to Consider in Automation):**
   - **Unit Tests (Jest):** Mock MMKV in memory and test synchronous read/write/delete operations for settings and resume records.
   - **Integration Tests:** Test SQLite table creation, CRUD operations on `files_index` and `folders_index`, and verify the `97%` completion threshold logic in `ResumeRepository` (if `positionMs / durationMs > 0.97`, `isCompleted` must be set to `true` and `positionMs` reset to `0`).
   - Test FTS5 virtual table search query construction and verify special characters in filenames (like `[1080p]`, `'`, `-`) do not cause SQL syntax errors.
4. **Manual Testing (What to Test Manually on Real Device):**
   - Launch the app on an Android device, trigger a dummy insert of 5,000 file records into SQLite and 50 resume states into MMKV, force-kill the app from Android recents, reopen it, and verify data persists with `<5ms` read time.

---

## Task 3: Material Design 3 Theme Engine & Core Zustand Stores
1. **What to Do:** Install `react-native-paper`, `react-native-vector-icons` (`MaterialCommunityIcons`), and `zustand`. Build the 3-Dimensional Theme Engine supporting `System`, `Light`, `Dark`, and `Pure AMOLED Black` (`#000000`) modes, plus the 6 color palettes (Dynamic Android 12+ Wallpaper, Royal Indigo, VLC Sunset Orange, Emerald Forest, Crimson Cinema, Cyber Cyan) and fixed Category Accent Colors. Create `useThemeAndSettingsStore` hydrated synchronously from `mmkv-user-settings`.
2. **Where to Do:**
   - `src/core/theme/colorTokens.ts`
   - `src/core/theme/ThemeProvider.tsx`
   - `src/core/store/useThemeAndSettingsStore.ts`
   - `android/app/build.gradle` (link `MaterialCommunityIcons.ttf` font)
3. **Automated Testing (What to Consider in Automation):**
   - **Unit Tests (Jest):** Test `useThemeAndSettingsStore` actions (`setThemeMode`, `toggleAmoledBlack`, `setAccentPalette`) and verify that updating any state immediately writes the updated key to `mmkv-user-settings`.
   - **Component Snapshot/Render Tests (RNTL):** Render a themed test screen in Light, Dark, and AMOLED modes and assert that background hex codes match `#F8FAFC`, `#0F172A`, and `#000000` respectively.
4. **Manual Testing (What to Test Manually on Real Device):**
   - Toggle Android OS Dark/Light mode from the phone's quick settings tile while the app is set to `System Default` and verify the app transitions smoothly without restarting.
   - Verify no "white flash" occurs when cold-starting the app in Dark/AMOLED mode.
   - Verify all `MaterialCommunityIcons` render crisply without showing missing `?` boxes.

---

## Task 4: Android Storage Permissions Gatekeeper (Android 10 to 15)
1. **What to Do:** Install `react-native-permissions`. Configure `AndroidManifest.xml` for granular media permissions (`READ_MEDIA_AUDIO`, `READ_MEDIA_VIDEO`, `READ_MEDIA_IMAGES` for Android 13+), legacy `READ_EXTERNAL_STORAGE` (Android 10–12), and `MANAGE_EXTERNAL_STORAGE` (for scanning PDFs and Other Docs across all folders on Android 11+). Build the `PermissionGatekeeper` onboarding screen and a custom native intent helper to open Android's "All Files Access" settings page.
2. **Where to Do:**
   - `android/app/src/main/AndroidManifest.xml`
   - `src/core/permissions/PermissionManager.ts`
   - `src/features/onboarding/PermissionGatekeeperScreen.tsx`
3. **Automated Testing (What to Consider in Automation):**
   - **Unit Tests (Jest):** Mock `Platform.Version` for API 29 (Android 10), API 31 (Android 12), and API 34 (Android 14) and verify `PermissionManager` requests the exact required permission array for each Android version.
   - **Component Tests (RNTL):** Verify `PermissionGatekeeperScreen` displays the "Grant Permission" CTA when status is `denied`, and shows the "Open App Settings" button when status is `blocked`.
4. **Manual Testing (What to Test Manually on Real Device):**
   - Test on an Android 13/14/15 phone: Verify the native OS permission dialog pops up and redirects to the "Allow access to manage all files" toggle.
   - Deny permission once, verify the educational fallback UI appears, then grant permission and confirm the app automatically transitions to the Dashboard when returning from Android Settings.

---

## Task 5: Native MediaStore & File System Scanner Service
1. **What to Do:** Build the high-speed storage scanner and indexer. Query Android's `MediaStore` and file system (`react-native-blob-util` / custom TurboModule) to discover all Audio, Video, Photo, PDF, and Other Document files. Filter out hidden `.nomedia` folders and audio clips shorter than 30 seconds (configurable). Auto-flag WhatsApp/Telegram folders (`is_messenger_folder = true`). Batch-insert discovered folders and files into `op-sqlite` (`folders_index`, `files_index`, and `files_search_fts`) and update `useMediaScannerStore` with live counts and storage space stats (Free vs Used GB).
2. **Where to Do:**
   - `src/core/scanner/FileScannerService.ts`
   - `src/core/scanner/extensionClassifier.ts`
   - `src/core/store/useMediaScannerStore.ts`
3. **Automated Testing (What to Consider in Automation):**
   - **Unit Tests (Jest):** Test `extensionClassifier.ts` with 50+ file extensions (`.mkv`, `.flac`, `.heic`, `.pdf`, `.docx`, `.apk`, `.zip`) and assert they map to the exact category (`AUDIO`, `VIDEO`, `PHOTO`, `PDF`, `OTHER_DOC`).
   - Test the WhatsApp/Telegram path detector and the `<30s` short-audio exclusion filter logic.
   - Test `useMediaScannerStore` progress calculations and category count aggregation.
4. **Manual Testing (What to Test Manually on Real Device):**
   - Run the scanner on a real phone containing 2,000+ photos, 500+ songs, 50+ videos, and 100+ PDFs.
   - Verify the initial scan completes in under 3 seconds without freezing the UI thread.
   - Verify total Used/Free storage numbers match Android's native Storage Settings.

---

## Task 6: Navigation Architecture & Category Dashboard (Home Screen)
1. **What to Do:** Install `@react-navigation/native` and `@react-navigation/native-stack`. Build the `CategoryDashboardScreen` (First Opening Screen) featuring the 5 Material 3 Bento Category Cards (**Audio, Video, Photos, PDF, Other Docs**) with staggered `Reanimated` entry animations (`FadeInDown`), tactile press-scale animations (`PressableScale`), live file counts, the `StorageAnalyzerWidget` bar, and the `ContinueWatchingCarousel` (wired to `useResumeHistoryStore`).
2. **Where to Do:**
   - `src/app/AppNavigator.tsx`
   - `src/shared/components/PressableScale.tsx`
   - `src/features/dashboard/CategoryDashboardScreen.tsx`
   - `src/features/dashboard/components/CategoryBentoCard.tsx`
   - `src/features/dashboard/components/StorageAnalyzerWidget.tsx`
   - `src/features/dashboard/components/ContinueWatchingCarousel.tsx`
3. **Automated Testing (What to Consider in Automation):**
   - **Component Tests (RNTL):** Render `CategoryDashboardScreen` with mocked scanner counts and verify all 5 cards (`Audio`, `Video`, `Photos`, `PDF`, `Other Docs`) display their exact title and item count.
   - Verify `ContinueWatchingCarousel` renders recent items from `useResumeHistoryStore` and hides itself cleanly when history is empty.
   - **E2E Test (Maestro):** Launch app -> Assert all 5 category cards are visible -> Tap each card and verify navigation to `FolderExplorerScreen` with the correct category parameter.
4. **Manual Testing (What to Test Manually on Real Device):**
   - Visually inspect the staggered card entry animation and press-bounce feel at 60/120 FPS.
   - Test pull-to-refresh on the Dashboard and verify the top non-blocking scan progress bar animates smoothly.

---

## Task 7: Universal Folder Explorer Screen (`FolderExplorerScreen`)
1. **What to Do:** Build the `FolderExplorerScreen` using `@shopify/flash-list`. When the user opens any category (e.g., Audio or Video), query `folders_index` for that category and display all folders containing those media types. Show Folder Name, Item Count (`48 Audios`), Total Size (`320 MB`), Folder Thumbnail, a "Messenger" badge for WhatsApp/Telegram folders, and an active indicator dot if any file inside that folder has unfinished resume progress. Add a top toggle chip to "Hide WhatsApp/Telegram Folders".
2. **Where to Do:**
   - `src/features/browser/FolderExplorerScreen.tsx`
   - `src/features/browser/components/FolderListItem.tsx`
   - `src/features/browser/components/FolderGridItem.tsx`
3. **Automated Testing (What to Consider in Automation):**
   - **Component & Integration Tests (RNTL):** Seed mock folders into `folders_index` for `AUDIO` and `VIDEO`. Open `FolderExplorerScreen` with `category = 'AUDIO'` and assert only audio folders render.
   - Test toggling the "Hide Messenger Media" chip and verify folders with `is_messenger_folder = true` are immediately filtered out.
   - **E2E Test (Maestro):** Tap "Audio" on Dashboard -> Verify folder list appears -> Tap a folder -> Verify navigation to `FileListScreen`.
4. **Manual Testing (What to Test Manually on Real Device):**
   - Scroll rapidly through 100+ folders on a physical device and verify `FlashList` maintains 60/120 FPS with zero blank cells.
   - Verify folder thumbnails load smoothly without flickering.

---

## Task 8: Universal File List Screen, Smart Search & Sorting (`FileListScreen`)
1. **What to Do:** Build `FileListScreen` using `@shopify/flash-list` and `@gorhom/bottom-sheet`. Display all files inside a selected folder with List View and Grid View switching (`LinearTransition` layout animation). Build `SmartSearchHeader` (debounced 150ms query against `files_search_fts` with quick filter chips: `All`, `In Progress`, `Unwatched`, `Favorites`, `Large Files > 100MB`). Build `SortBottomSheet` allowing sorting by **Name (A-Z / Z-A)**, **Date (Newest / Oldest)**, **Size (Largest / Smallest)**, and **Duration (Longest / Shortest)**, persisting per category in `mmkv-sort-filter-state`. Render a bottom progress bar on any file card that has an entry in `useResumeHistoryStore`.
2. **Where to Do:**
   - `src/features/browser/FileListScreen.tsx`
   - `src/features/browser/components/FileItemCard.tsx`
   - `src/features/browser/components/SmartSearchHeader.tsx`
   - `src/features/browser/components/SortBottomSheet.tsx`
   - `src/core/store/useBrowserFilterStore.ts`
3. **Automated Testing (What to Consider in Automation):**
   - **Unit & Integration Tests (Jest + RNTL):** Test sorting comparators (`NAME`, `DATE`, `SIZE`, `DURATION` in `ASC` and `DESC` order) against a mock array of 20 files.
   - Test typing into `SmartSearchHeader` and verify the FTS5 search filters the file list within 150ms.
   - Test quick filter chips (`In Progress`, `Large Files > 100MB`) and verify only matching files remain visible.
   - Verify that a file with `positionMs = 30000` and `durationMs = 60000` renders a `50%` progress indicator on its card.
4. **Manual Testing (What to Test Manually on Real Device):**
   - Open a folder with 2,000+ audio or image files, switch between List View and Grid View, and verify the Reanimated layout transition is smooth.
   - Open the `SortBottomSheet`, change sort order, close and reopen the app, and verify the chosen sort order was remembered for that specific category.

---

## Task 9: Integrated Audio Player Engine & Background Service (`TrackPlayer` + VLC Fallback)
1. **What to Do:** Install and configure `react-native-track-player` for background audio execution, lock-screen media controls, Android notification shade player, headset button events, and audio focus ducking. Connect a secondary LibVLC headless audio fallback for rare audio formats that ExoPlayer rejects (`.ape`, `.wma`, `.mpc`). Wire playback events to `useAudioPlayerStore` and throttled progress saving (every 2 seconds) to `ResumeRepository` (`mmkv-resume-store`).
2. **Where to Do:**
   - `src/features/audioPlayer/services/AudioPlaybackService.ts`
   - `src/features/audioPlayer/services/VlcAudioFallbackService.ts`
   - `src/core/store/useAudioPlayerStore.ts`
   - `index.js` (register playback service)
3. **Automated Testing (What to Consider in Automation):**
   - **Unit Tests (Jest):** Mock `TrackPlayer` native module and test queue loading, play/pause/skip actions, shuffle randomization algorithm, repeat modes (`OFF`, `TRACK`, `QUEUE`), and automatic fallback trigger when an unsupported codec error fires.
   - Test that `ResumeRepository.saveState` is called with updated `positionMs` during playback and respects the `audio_resume_min_duration_sec` setting.
4. **Manual Testing (What to Test Manually on Real Device):**
   - Play `.mp3`, `.flac`, `.wav`, `.aac`, `.ogg`, `.opus`, and `.wma` files from an audio folder.
   - Lock the phone screen and verify audio continues playing smoothly, lock-screen controls work, and notification seekbar scrubbing works.
   - Make a phone call or play a YouTube video in another app and verify audio pauses automatically (Audio Focus) and resumes when appropriate.
   - Unplug wired/Bluetooth headphones while playing and verify playback pauses immediately.

---

## Task 10: Persistent Mini-Player, Full Audio Player Sheet & Equalizer
1. **What to Do:** Build the `PersistentMiniPlayer` docked at the bottom of the app with album art, marquee scrolling title, Play/Pause, Next, and thin live progress bar. Build `FullAudioPlayerSheet` expanding via Shared Element / BottomSheet gesture with waveform/scrubbing bar, **Playback Speed (`0.5x` to `2.5x`)**, **A-B Loop Repeat**, **Sleep Timer (15m, 30m, 60m, End of Track)**, Bookmarks pin button, and Queue Reorder list. Build `AudioEqualizerSheet` bridged to Android's native `AudioEffect` API (`Equalizer`, `BassBoost`, `Virtualizer`).
2. **Where to Do:**
   - `src/features/audioPlayer/components/PersistentMiniPlayer.tsx`
   - `src/features/audioPlayer/components/FullAudioPlayerSheet.tsx`
   - `src/features/audioPlayer/components/AudioEqualizerSheet.tsx`
   - `android/app/src/main/java/.../AudioEqModule.kt` (Native EQ TurboModule)
3. **Automated Testing (What to Consider in Automation):**
   - **Component Tests (RNTL):** Verify `PersistentMiniPlayer` is hidden when `activeTrack` is `null` and appears when a track starts playing.
   - Test **A-B Loop logic**: When `currentPositionMs` reaches `pointBMs`, assert the player automatically seeks back to `pointAMs`.
   - Test **Sleep Timer countdown**: Advance Jest fake timers by 15 minutes and verify `TrackPlayer.pause()` is invoked automatically.
   - **E2E Test (Maestro):** Open Audio folder -> Tap a song -> Verify MiniPlayer appears -> Swipe up MiniPlayer -> Verify Full Player controls, Speed selector, and Equalizer sheet open.
4. **Manual Testing (What to Test Manually on Real Device):**
   - Listen with headphones and adjust the 5-Band Equalizer sliders and Bass Boost knob; verify real-time audible changes in sound output without crackling.
   - Test swiping the MiniPlayer up into the Full Player and down again to ensure 60/120 FPS gesture smoothness.

---

## Task 11: VLC-Grade Video Player Core Engine & Resume Integration
1. **What to Do:** Install and configure `react-native-vlc-media-player` (LibVLC Android engine) inside `UniversalVideoPlayerScreen`. Configure hardware acceleration (`HW+`) and software decoding (`SW`) fallback options. Handle orientation locking (Auto-Landscape based on video aspect ratio or manual toggle). Wire instant resume lookup on mount (`AUTO` resume with "Resumed from HH:MM:SS — [Start Over]" snackbar, or `ASK` dialog based on settings) and save timestamp progress to `mmkv-resume-store` every 2 seconds and on unmount.
2. **Where to Do:**
   - `src/features/videoPlayer/UniversalVideoPlayerScreen.tsx`
   - `src/features/videoPlayer/components/ResumePromptBanner.tsx`
   - `src/core/store/useVideoPlayerStore.ts`
3. **Automated Testing (What to Consider in Automation):**
   - **Unit & Component Tests (Jest + RNTL):** Mock the VLC surface component and test mounting `UniversalVideoPlayerScreen` with a file that has saved progress (`positionMs: 120000`).
   - Verify that when `video_resume_mode === 'AUTO'`, the player calls `seek(120000)` and renders the "Start Over" snackbar.
   - Verify that when `video_resume_mode === 'ASK'`, the confirmation modal is displayed before seeking.
   - Verify that closing the screen saves the final timestamp to `mmkv-resume-store` and updates `useResumeHistoryStore`.
4. **Manual Testing (What to Test Manually on Real Device):**
   - **Stress-test VLC Codec Support:** Play challenging video formats on a real phone: `.mkv` (10-bit HEVC / x265), `.avi`, `.mp4` (4K 60fps), `.flv`, `.webm`, `.mov`, and videos with **EAC3 / DTS / AC3 audio codecs** (where standard Android players fail with "Audio format not supported").
   - Close a movie mid-scene, return to the folder list (verify the progress bar appears under the movie), tap it again, and confirm it resumes at the exact frame.

---

## Task 12: Advanced Video Gestures & Multi-Track Controls (MX/VLC Parity)
1. **What to Do:** Build `VideoGestureOverlay` using `react-native-gesture-handler` and `Reanimated`:
   - **Left-side vertical swipe:** Brightness control (`0%` to `100%`) with animated Sun HUD slider.
   - **Right-side vertical swipe:** Volume control (`0%` to `200%` software boost via LibVLC) with animated Speaker HUD slider.
   - **Horizontal swipe:** Fine timeline scrubbing with live timestamp delta (`+00:15`).
   - **Double-tap Left/Right:** Quick `-10s / +10s` skip with Material ripple overlay.
   - **Long-press anywhere:** Temporary **`2.0x` Speed Boost** while finger is held down, reverting on release.
   - **Two-finger pinch:** Aspect ratio zoom (`Fit`, `Fill`, `Crop`, `16:9`, `Stretch`).
   Build `VideoHudControls` & `TrackAndSubtitleSheet` for switching **Multi-Audio tracks** (e.g., Hindi/English/Japanese), loading internal or external `.srt`/`.ass`/`.vtt` subtitles, adjusting **Subtitle Sync Delay (`+/- ms`)**, **Screen Touch Lock**, **Picture-in-Picture (PiP)**, **Background Audio Play**, and **A-B Loop**.
2. **Where to Do:**
   - `src/features/videoPlayer/components/VideoGestureOverlay.tsx`
   - `src/features/videoPlayer/components/VideoHudControls.tsx`
   - `src/features/videoPlayer/components/TrackAndSubtitleSheet.tsx`
3. **Automated Testing (What to Consider in Automation):**
   - **Unit Tests (Jest):** Test gesture math utilities (converting vertical pixel translation `dy` into clamped `0–100` brightness and `0–200` volume values; converting horizontal `dx` into seek delta milliseconds).
   - **Component Tests (RNTL):** Test `Screen Lock` mode: when `isScreenLocked === true`, assert all HUD buttons and gesture responders are disabled except the floating "Unlock" button.
   - Test selecting an audio track ID and subtitle track ID in `TrackAndSubtitleSheet` and verify those IDs are persisted into the file's `ResumeRecord` in MMKV.
4. **Manual Testing (What to Test Manually on Real Device):**
   - Test all touch gestures in landscape mode on a real device (Left swipe brightness, Right swipe volume up to 200% boost, Double-tap skip, Long-press 2x speed, Pinch-to-zoom).
   - Play a dual-audio `.mkv` anime or movie, switch audio language and subtitle tracks, and test shifting subtitle delay by `+500ms`.
   - Press the Android Home button while a video is playing and verify the video smoothly shrinks into a floating **Picture-in-Picture (PiP)** window over the Android launcher.

---

## Task 13: Advanced Integrated Image Viewer (`ProImageViewerScreen`)
1. **What to Do:** Install `@d11/react-native-fast-image` and zoom gesture helpers. Build `ProImageViewerScreen` supporting horizontal paging across all photos in the current folder, double-tap zoom (`1x` -> `2.5x` -> `1x`), two-finger pinch zoom (`1x` to `8x`) with pan boundaries, vertical swipe-down-to-dismiss with background opacity fade, animated `.gif`/`.webp` playback, **Slideshow Mode** (3s/5s/10s auto-advance), 90° Rotation, Share, Set as Wallpaper, and an `ExifMetadataBottomSheet` displaying Resolution, File Size, Date Taken, Camera Model, ISO, and Path. Save last viewed image index in the folder to `mmkv-resume-store`.
2. **Where to Do:**
   - `src/features/imageViewer/ProImageViewerScreen.tsx`
   - `src/features/imageViewer/components/ZoomableImageCanvas.tsx`
   - `src/features/imageViewer/components/ExifMetadataBottomSheet.tsx`
3. **Automated Testing (What to Consider in Automation):**
   - **Component Tests (RNTL):** Render `ProImageViewerScreen` with an array of 10 image items starting at index `4` and verify the correct image URI and header counter (`5 / 10`) render.
   - Test starting and stopping the Slideshow timer using Jest fake timers and assert the active index increments every 3 seconds.
   - Test rendering `ExifMetadataBottomSheet` with mock EXIF tags and verify all metadata rows display properly.
4. **Manual Testing (What to Test Manually on Real Device):**
   - Open a high-resolution 48MP camera photo, `.png`, `.webp`, `.heic`, and an animated `.gif`.
   - Test double-tap zoom, 8x pinch-to-zoom, panning around corners, and swiping horizontally to the next photo (verify horizontal pager doesn't fight with pan gesture when zoomed in).
   - Swipe down vertically on a photo and verify the Shared Element / backdrop fade-out transition back to `FileListScreen`.

---

## Task 14: Advanced Integrated PDF Reader (`AdvancePdfReaderScreen`)
1. **What to Do:** Install `react-native-pdf` and `react-native-blob-util`. Build `AdvancePdfReaderScreen` with instant page resume from `mmkv-resume-store` (`pdfCurrentPage` & `pdfZoomScale`). Implement **Night Mode / Dark Invert** toggle, **Vertical Continuous vs Horizontal Page-Flip** mode toggle, **Page Snap**, a **Fast Draggable Vertical Scrubber** with floating page bubble (`Page 45 / 320`), a **Jump to Page Dialog**, **Password-Protected PDF input prompt**, and **PDF Page Bookmarks** stored in SQLite (`media_bookmarks`).
2. **Where to Do:**
   - `src/features/pdfReader/AdvancePdfReaderScreen.tsx`
   - `src/features/pdfReader/components/PdfToolbarAndScrubber.tsx`
   - `src/features/pdfReader/components/JumpToPageDialog.tsx`
   - `src/features/pdfReader/components/PdfBookmarksSheet.tsx`
3. **Automated Testing (What to Consider in Automation):**
   - **Unit & Integration Tests (Jest + RNTL):** Test mounting `AdvancePdfReaderScreen` with a PDF that has saved resume state (`pdfCurrentPage: 42, pdfTotalPages: 200, pdfNightMode: true`) and assert the PDF component receives `page={42}` and night-mode styling.
   - Test `JumpToPageDialog` validation (entering `0`, `-5`, or `999` on a 200-page PDF shows an out-of-bounds error; entering `85` jumps to page `85` and updates MMKV).
   - Test adding and deleting a PDF page bookmark in `media_bookmarks` SQLite table.
4. **Manual Testing (What to Test Manually on Real Device):**
   - Open a heavy 300+ page textbook PDF (100MB+) and a password-protected bank statement PDF ( Aadhaar / Bank PDF).
   - Scroll to page 145, close the app, reopen from the Dashboard's "Continue Reading" carousel or PDF folder, and verify it opens directly on page 145 in `<300ms`.
   - Toggle Night Mode and test pinch-to-zoom text sharpness.

---

## Task 15: Other Documents Hub & Native Android Intent Chooser (`DocIntentLauncher`)
1. **What to Do:** Install `react-native-file-viewer` and `react-native-share`. Configure Android `FileProvider` in `AndroidManifest.xml` and `res/xml/file_paths.xml` so Android 10–15 allows sharing secure `content://` URIs with external apps. Build the **Other Docs** category workflow:
   - Display `.docx`, `.doc`, `.xlsx`, `.xls`, `.pptx`, `.ppt`, `.csv`, `.txt`, `.json`, `.xml`, `.md`, `.zip`, `.rar`, `.apk` with color-coded extension badges (Word Blue, Excel Green, PowerPoint Orange, Archive Gold).
   - Build a lightweight **Built-in Raw Text & Code Viewer Modal** for instant in-app viewing of `.txt`, `.json`, `.csv`, `.log`, `.md`, and `.xml` files.
   - For Office docs and archives, trigger Android's native **App Chooser Sheet (`Intent.ACTION_VIEW`)** so users can select MS Office, Google Docs/Sheets, WPS, or RAR viewer.
2. **Where to Do:**
   - `android/app/src/main/res/xml/file_paths.xml`
   - `src/features/otherDocs/services/DocIntentLauncher.ts`
   - `src/features/otherDocs/TextAndCodeViewerModal.tsx`
3. **Automated Testing (What to Consider in Automation):**
   - **Unit Tests (Jest):** Test MIME-type mapping for `.docx`, `.xlsx`, `.pptx`, `.zip`, `.apk`, and `.txt`.
   - Test routing logic: verify `.txt`, `.json`, and `.md` open `TextAndCodeViewerModal` internally, while `.docx`, `.xlsx`, and `.pptx` invoke `FileViewer.open()` with the native chooser flag.
   - **Component Tests (RNTL):** Render `TextAndCodeViewerModal` with a sample JSON/text string and verify line numbers and text search highlighting work.
4. **Manual Testing (What to Test Manually on Real Device):**
   - Tap a `.docx`, `.xlsx`, and `.pptx` file on a real Android phone and verify the native Android bottom sheet ("Open with...") pops up without throwing a `FileUriExposedException` crash.
   - Tap a `.txt` or `.json` file and verify it opens immediately inside the built-in viewer.

---

## Task 16: Private Biometric Vault & Batch File Operations
1. **What to Do:** Install `react-native-biometrics`. Build multi-select batch mode in `FileListScreen` (Delete, Share, Rename, File Properties, Favorite, Add to Playlist, and **Move to Private Vault**). Build `PrivateVaultScreen` protected by Android Fingerprint / Face Unlock (with PIN fallback). When a user moves any Audio, Video, Photo, or PDF to the Vault, move the file from public storage into the app's private internal sandbox directory (`RNFS.DocumentDirectoryPath/vault/`) and record its original path in the `private_vault_files` SQLite table so it disappears from public galleries/apps and can be restored anytime.
2. **Where to Do:**
   - `src/features/vault/PrivateVaultService.ts`
   - `src/features/vault/PrivateVaultScreen.tsx`
   - `src/features/browser/services/FileBatchOperations.ts`
3. **Automated Testing (What to Consider in Automation):**
   - **Unit & Integration Tests (Jest):** Mock `react-native-biometrics` and `RNFS.moveFile`. Test moving a file into the vault: verify the record is added to `private_vault_files`, removed from public `files_index`, and the reverse happens on `restoreFromVault()`.
   - Verify `PrivateVaultScreen` blocks rendering of vault files until `simplePrompt()` resolves with `{ success: true }`.
4. **Manual Testing (What to Test Manually on Real Device):**
   - Long-press a video and a PDF in `FileListScreen`, select "Move to Private Vault", authenticate with your fingerprint on the phone, and verify the file disappears from Google Files / Gallery and plays smoothly from inside the Private Vault.
   - Tap "Restore to Original Folder" inside the Vault and verify the file returns to its exact original directory.

---

## Task 17: Complete Settings Screen & Preference Bindings
1. **What to Do:** Build the comprehensive `SettingsScreen` organized into 5 Material 3 sections:
   1. **Appearance & Themes** (Light/Dark/System, AMOLED Pure Black toggle, 6 Accent Color Swatches, Default List/Grid view, Show/Hide Continue Carousel).
   2. **Resume & History Behavior** (Video Auto/Ask/Never, Audio minimum duration slider, PDF auto-resume, "Clear All Watch/Read History" with confirmation dialog).
   3. **Video Player Preferences** (Default Decoder `HW+/SW`, Double-tap seek seconds `5s/10s/15s/30s`, Max Volume Boost `100%/150%/200%`, Gesture toggles, Auto-PiP, Background Audio, Subtitle style).
   4. **Audio Player Preferences** (Gapless playback, Auto-play on headset connect, Audio focus behavior).
   5. **Scanner & Privacy Filters** (Ignore audio `<30s`, Hide WhatsApp/Telegram clutter default, Show hidden dotfiles, Excluded Folders manager).
2. **Where to Do:**
   - `src/features/settings/SettingsScreen.tsx`
   - `src/features/settings/components/ThemePalettePicker.tsx`
   - `src/features/settings/components/ExcludedFoldersModal.tsx`
3. **Automated Testing (What to Consider in Automation):**
   - **Component & Integration Tests (RNTL):** Render `SettingsScreen`, toggle each switch and option, and assert that `useThemeAndSettingsStore` and `mmkv-user-settings` update synchronously.
   - Test tapping "Clear All Watch/Read Progress", confirm the dialog, and assert `mmkv-resume-store` is wiped and `useResumeHistoryStore.recentItems` becomes `[]`.
   - **E2E Test (Maestro):** Navigate to Settings -> Switch theme to Dark + AMOLED + Sunset Orange -> Navigate back to Dashboard -> Verify UI updates without restart.
4. **Manual Testing (What to Test Manually on Real Device):**
   - Verify every single setting changed in `SettingsScreen` actually changes behavior inside the Video Player, Audio Player, PDF Reader, and File Scanner in real time.

---

## Task 18: Playlists, Favorites & Media Bookmarks Management
1. **What to Do:** Build the unified Favorites & Playlists UI. Allow users to create custom Audio/Video playlists or Document collections (`playlists_and_collections` table), star/favorite any file across all 5 categories, and view/jump to saved timestamp or page bookmarks (`media_bookmarks` table) directly from a dedicated quick-access tab or inside the players.
2. **Where to Do:**
   - `src/features/playlists/PlaylistsAndFavoritesScreen.tsx`
   - `src/features/playlists/components/AddToPlaylistSheet.tsx`
   - `src/core/storage/repositories/PlaylistRepository.ts`
   - `src/core/storage/repositories/BookmarkRepository.ts`
3. **Automated Testing (What to Consider in Automation):**
   - **Integration Tests (Jest):** Test creating a playlist, adding 5 audio tracks, reordering track positions in `playlist_items`, and deleting a track.
   - Test creating a timestamp bookmark (`00:45:12` with note `"Best scene"`) on a video and a page bookmark (`Page 88`) on a PDF, and verify querying bookmarks by `file_id` returns them sorted by position.
4. **Manual Testing (What to Test Manually on Real Device):**
   - Create a custom Audio playlist, add songs from 3 different folders, and play the entire playlist through `PersistentMiniPlayer`.
   - Add a bookmark inside a video and a PDF, close the file, reopen it, tap the Bookmark list icon, and verify tapping the bookmark jumps immediately to that exact timestamp/page.

---

## Task 19: Performance Profiling, Memory Leak Audits & Edge-Case Hardening
1. **What to Do:** Optimize the entire app for low-end (3GB RAM) and flagship (120Hz) Android devices:
   - Configure `FlashList` `estimatedItemSize` and thumbnail memory caching limits (`FastImage.clearMemoryCache` on low memory warnings).
   - Handle edge cases: Corrupted 0-byte media files, deleted files on SD card while present in `mmkv-resume-store` (auto-clean stale records), SD card ejection, split-screen multi-window resizing, and Android back-button handling across modals/fullscreen players.
2. **Where to Do:**
   - `src/core/scanner/StaleRecordCleaner.ts`
   - `src/shared/hooks/useAndroidBackHandler.ts`
   - Performance tuning across all `FlashList` and `Reanimated` components.
3. **Automated Testing (What to Consider in Automation):**
   - **Unit Tests (Jest):** Test `StaleRecordCleaner`: when a user taps a card in `ContinueWatchingCarousel` whose underlying file was deleted from storage, verify the app catches the missing file gracefully, shows a friendly toast, and removes the dead record from `mmkv-resume-store` and `files_index`.
   - Test corrupted/0-byte file error boundaries in Audio, Video, Image, and PDF screens so the app displays a "File is corrupted or unreadable" fallback view with a "Try Opening in External App" button instead of crashing.
4. **Manual Testing (What to Test Manually on Real Device):**
   - Open React Native Perf Monitor on a real device and verify **UI FPS stays at 60/120 FPS** and **JS FPS stays >55 FPS** while scrolling through 5,000 photos while an audio track is playing in the `PersistentMiniPlayer`.
   - Delete a recently watched video using an external file manager, return to our app, and verify the app cleans up the missing file without crashing.

---

## Task 20: Full End-to-End Regression Suite, ProGuard/R8 & Release APK/AAB Build
1. **What to Do:** Configure Android release signing, ProGuard/R8 rules (`proguard-rules.pro` for LibVLC, TrackPlayer, OP-SQLite, MMKV, Reanimated, and PDFium so native C++/JNI classes are not stripped in release builds), ABI splits (`arm64-v8a`, `armeabi-v7a`) to keep APK size small, adaptive app icons, and native splash screen (`react-native-bootsplash`). Run the complete automated test suite (Unit + Integration + E2E) and generate the production-ready signed Release APK and Play Store AAB bundle.
2. **Where to Do:**
   - `android/app/proguard-rules.pro`
   - `android/app/build.gradle` (signingConfigs, ABI splits, shrinkResources, minifyEnabled)
   - `.maestro/full_app_regression_suite.yaml`
3. **Automated Testing (What to Consider in Automation):**
   - **Full CI Test Gate:** Run `yarn test --coverage` (verify >80% unit/integration coverage across stores, repositories, and utilities).
   - **Full E2E Regression Suite (Maestro/Detox):** Automated script executing the complete user journey:
     1. Launch app & grant permissions -> Verify Dashboard & Storage Bar.
     2. Open **Audio** -> Open Folder -> Search & Sort -> Play Audio -> Verify MiniPlayer & Equalizer -> Close & verify Resume progress bar.
     3. Open **Video** -> Open Folder -> Play Video -> Seek to 50% -> Close -> Reopen from Dashboard "Continue" Carousel -> Verify instant resume at 50%.
     4. Open **Photos** -> Open Folder -> Open Photo -> Zoom & view EXIF -> Return.
     5. Open **PDF** -> Open Folder -> Open PDF -> Jump to Page 10 -> Enable Night Mode -> Close & Reopen -> Verify resumes at Page 10.
     6. Open **Other Docs** -> Open `.txt` in built-in viewer & trigger chooser for `.docx`.
     7. Open **Settings** -> Switch Light/Dark/AMOLED themes & verify persistence.
4. **Manual Testing (What to Test Manually on Real Device):**
   - Install the **Signed Release APK** (`npx react-native run-android --mode=release`) on at least 2 physical Android devices (e.g., Android 11/12 phone and Android 14/15 phone).
   - Verify ProGuard/R8 did not strip any native C++ methods (test VLC video playback, background audio, SQLite FTS5 search, PDF rendering, and Biometric Vault in Release mode).
   - Verify cold start time is under `1.2 seconds` and the app is 100% complete and ready for distribution.