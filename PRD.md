# Universal Media & Document Hub — Master Architecture Blueprint

## Kinetix

## 1. Project Vision & Core Objective

To build an all-in-one, high-performance Android application in React Native that serves as a unified hub for **Audio, Video, Photos, PDFs, and Other Documents**.

* **Zero Format Failure:** Must play any video or audio format seamlessly (just like VLC Media Player), including heavy MKV files, 10-bit HEVC, multi-audio tracks, EAC3/DTS codecs, and lossless audio.
* **Instant Resume Everywhere:** Every media file or document reopened by the user must resume from the exact timestamp, page, or state where it was closed.
* **Fluid Material Design 3 UI:** Smooth 60/120 FPS animations, intuitive gestures for users migrating from VLC/MX Player/Google Photos, and rich theme customization.

---

## 2. Core Technical Stack Decisions

### 2.1 Base Framework
* **Workflow:** React Native CLI (Bare Workflow) with New Architecture (Fabric & TurboModules enabled).
* **Why Bare Workflow?** Managed Expo is avoided because we require deep Android native access (`MANAGE_EXTERNAL_STORAGE`, custom C++ LibVLC/FFmpeg bridges, background media services, and fast `MediaStore` content resolver queries).
* **State Management:** **Zustand** — Used for managing active audio queues, global player state, active theme tokens, and user preferences with zero unnecessary re-renders.

### 2.2 Smart Local Storage Strategy (Dual-Storage Engine)
To ensure zero lag when saving progress or searching through 10,000+ local files, storage is split into two specialized engines:

1. **MMKV Storage (`react-native-mmkv`) — For High-Frequency Key-Value States:**
   * **Why:** Written in C++ via JSI, ~30x faster than standard `AsyncStorage`, and works synchronously.
   * **What it stores:** Live playback positions, PDF page numbers, user settings, active theme, and per-folder sort states.

2. **SQLite Database (`@op-engineering/op-sqlite`) — For File Indexing, Playlists & Smart Search:**
   * **Why:** Scanning the phone's file system from scratch every time the app opens will freeze the UI.
   * **What it stores:** Relational tables for all scanned folders, files, bookmarks, playlists, vault records, and an FTS5 virtual table for instant (<5ms) search.

---

## 3. Complete Database Schema & Storage Blueprint

To maintain strict consistency during development, our local database is divided into **6 SQLite Tables** (for structured/searchable data) and **3 MMKV Namespaces** (for ultra-fast synchronous key-value data).

### 3.1 SQLite Database Schemas (`@op-engineering/op-sqlite`)

#### Schema 1: `folders_index` (Stores Aggregated Directory Data)
* **`folder_id`** *(Primary Key, Text)* — Unique hash of the folder path.
* **`folder_path`** *(Text, Unique, Indexed)* — Full absolute path (e.g., `/storage/emulated/0/Movies`).
* **`folder_name`** *(Text)* — Display name of the directory (e.g., `Movies`).
* **`category`** *(Text, Indexed)* — Enum: `AUDIO`, `VIDEO`, `PHOTO`, `PDF`, `OTHER_DOC`. (Note: If a folder has both Videos and PDFs, it gets composite entries per category so each hub shows accurate counts).
* **`file_count`** *(Integer)* — Total number of matching files inside this folder for that category.
* **`total_size_bytes`** *(Integer)* — Sum of all file sizes inside the folder.
* **`thumbnail_uri`** *(Text, Nullable)* — Path to the latest photo/video/album art inside the folder for preview.
* **`is_messenger_folder`** *(Boolean)* — Auto-flagged `true` if path contains `WhatsApp` or `Telegram` (powers our 1-tap clutter filter).
* **`is_hidden`** *(Boolean)* — Flagged `true` if the folder starts with `.` or is manually excluded by the user.
* **`last_modified_ms`** *(Integer)* — Timestamp of the most recently added file in this folder.

#### Schema 2: `files_index` (Master Table for All Local Files)
* **`file_id`** *(Primary Key, Text)* — Unique hash generated from `file_path` + `file_size_bytes`.
* **`file_path`** *(Text, Unique, Indexed)* — Full absolute path on device storage.
* **`parent_folder_path`** *(Text, Foreign Key -> `folders_index.folder_path`, Indexed)* — Links file to its parent folder.
* **`file_name`** *(Text, Indexed)* — Full file name with extension.
* **`title`** *(Text)* — Clean display title without extension (or extracted ID3 tag title for Audio).
* **`extension`** *(Text)* — Lowercase extension (e.g., `mkv`, `mp3`, `flac`, `pdf`, `docx`).
* **`mime_type`** *(Text)* — Standard MIME string (e.g., `video/x-matroska`, `application/pdf`).
* **`category`** *(Text, Indexed)* — Enum: `AUDIO`, `VIDEO`, `PHOTO`, `PDF`, `OTHER_DOC`.
* **`size_bytes`** *(Integer, Indexed)* — Exact file size in bytes (used for size sorting).
* **`date_added_ms`** *(Integer)* — File creation timestamp.
* **`date_modified_ms`** *(Integer, Indexed)* — Last modified timestamp (used for date sorting).
* **`duration_ms`** *(Integer, Nullable, Indexed)* — Total length in milliseconds (for Audio & Video sorting/filtering).
* **`width`** *(Integer, Nullable)* — Pixel width (for Photos & Videos, e.g., `1920`, `3840`).
* **`height`** *(Integer, Nullable)* — Pixel height (e.g., `1080`, `2160` to show `4K` or `1080p` badges).
* **`audio_artist`** *(Text, Nullable)* — Extracted artist metadata for Audio files.
* **`audio_album`** *(Text, Nullable)* — Extracted album metadata for Audio files.
* **`album_art_uri`** *(Text, Nullable)* — Cached local URI for audio cover art or video thumbnail.
* **`is_favorite`** *(Boolean, Indexed)* — Whether the user starred/favorited this file.

#### Schema 3: `files_search_fts` (FTS5 Virtual Table for Instant Smart Search)
* **`file_id`** *(Unindexed)* — Reference to `files_index.file_id`.
* **`file_name`** *(Text)* — Tokenized for instant prefix and substring search.
* **`title`** *(Text)* — Tokenized clean title.
* **`audio_artist`** *(Text)* — Tokenized artist name.
* **`audio_album`** *(Text)* — Tokenized album name.
* **`parent_folder_name`** *(Text)* — Allows searching files by folder name keywords.

#### Schema 4: `media_bookmarks` (Stores User Pins/Notes inside Video, Audio & PDFs)
* **`bookmark_id`** *(Primary Key, Text)* — UUID.
* **`file_id`** *(Text, Foreign Key -> `files_index.file_id`, Indexed)* — File to which this bookmark belongs.
* **`category`** *(Text)* — `AUDIO`, `VIDEO`, or `PDF`.
* **`position_value`** *(Integer)* — Millisecond timestamp (for Audio/Video) OR Page Number (for PDF).
* **`label_note`** *(Text)* — User-written note (e.g., `"Important Physics Formula"` or `"Best Guitar Solo"`).
* **`created_at_ms`** *(Integer)* — Creation timestamp.

#### Schema 5: `playlists_and_collections` (Custom Audio Playlists & File Collections)
* **`playlist_id`** *(Primary Key, Text)* — UUID.
* **`playlist_name`** *(Text)* — Name of the playlist (e.g., `"Gym Workout"`, `"Exam PDFs"`).
* **`category`** *(Text)* — `AUDIO`, `VIDEO`, or `MIXED`.
* **`item_count`** *(Integer)* — Total files inside.
* **`created_at_ms`** *(Integer)* — Timestamp.
* *(Paired with a junction table **`playlist_items`** containing `playlist_id`, `file_id`, and `sort_order`).*

#### Schema 6: `private_vault_files` (Biometric Locked Files Registry)
* **`vault_id`** *(Primary Key, Text)* — UUID.
* **`original_file_path`** *(Text)* — Original location before moving to the hidden vault (so it can be restored to the exact folder later).
* **`vault_internal_path`** *(Text)* — Obfuscated path inside the app's private sandbox directory.
* **`file_name`** *(Text)* — Original file name.
* **`category`** *(Text)* — `AUDIO`, `VIDEO`, `PHOTO`, `PDF`, `OTHER_DOC`.
* **`size_bytes`** *(Integer)* — File size.
* **`locked_at_ms`** *(Integer)* — Timestamp when moved to vault.

---

### 3.2 MMKV Key-Value Schemas (`react-native-mmkv`)

MMKV is split into **3 isolated instances** so clearing history never wipes out user settings.

#### Instance 1: `mmkv-resume-store` (Stores Live Progress & History)
* **Key Pattern:** `resume:{file_id}` -> Stores a JSON object with these exact keys:
  * `fileId` *(String)* — Matches SQLite `file_id`.
  * `filePath` *(String)* — Direct path for instant opening.
  * `fileName` *(String)* — Display name for the "Continue" carousel.
  * `category` *(String)* — `AUDIO`, `VIDEO`, `PDF`, `PHOTO`.
  * `lastOpenedAtMs` *(Number)* — Timestamp used to sort the Home Screen "Continue Watching/Reading" carousel.
  * `positionMs` *(Number, Optional)* — Exact millisecond where Video or Audio was paused/closed.
  * `durationMs` *(Number, Optional)* — Total media duration to calculate progress percentage (`0%` to `100%`).
  * `isCompleted` *(Boolean)* — Marked `true` if progress passes `97%`.
  * `selectedAudioTrackId` *(Number, Optional)* — Remembers chosen language track in dual-audio movies.
  * `selectedSubtitleTrackId` *(Number, Optional)* — Remembers chosen subtitle track.
  * `externalSubtitlePath` *(String, Optional)* — Path if user loaded an external `.srt` file.
  * `subtitleDelayMs` *(Number, Optional)* — Saved sync offset.
  * `playbackSpeed` *(Number, Optional)* — Saved speed (e.g., `1.25`, `1.5`).
  * `pdfCurrentPage` *(Number, Optional)* — Last read page number for PDFs.
  * `pdfTotalPages` *(Number, Optional)* — Total pages in the PDF.
  * `pdfZoomScale` *(Number, Optional)* — Last zoom level on that PDF page.
  * `pdfNightMode` *(Boolean, Optional)* — Remembers if the user reads this specific PDF in Night Mode.
* **Key:** `recent_file_ids_list` -> Array of top 20 recently opened `file_id` strings for O(1) lookup on the Home Screen without scanning all keys.

#### Instance 2: `mmkv-user-settings` (Stores All App Preferences)
* `theme_mode` -> `'SYSTEM' | 'LIGHT' | 'DARK'`
* `is_amoled_black` -> `Boolean`
* `accent_palette` -> `'DYNAMIC' | 'INDIGO' | 'ORANGE' | 'EMERALD' | 'CRIMSON' | 'CYAN'`
* `default_browser_layout` -> `'LIST' | 'GRID'`
* `show_continue_carousel` -> `Boolean`
* `video_resume_mode` -> `'AUTO' | 'ASK' | 'NEVER'`
* `audio_resume_min_duration_sec` -> `Number` (Default: `600` seconds / 10 mins, or `0` for all songs)
* `pdf_auto_resume` -> `Boolean`
* `video_default_decoder` -> `'HW_PLUS' | 'SW' | 'AUTO'`
* `video_double_tap_seek_sec` -> `5 | 10 | 15 | 30`
* `video_max_volume_boost` -> `100 | 150 | 200`
* `video_gestures_config` -> `{ brightness: Boolean, volume: Boolean, seek: Boolean, zoom: Boolean }`
* `video_auto_pip` -> `Boolean`
* `video_background_audio` -> `Boolean`
* `subtitle_style_config` -> `{ fontSize: String, textColor: String, bgOpacity: Number }`
* `audio_gapless_playback` -> `Boolean`
* `audio_auto_play_headset` -> `Boolean`
* `scanner_min_audio_duration_sec` -> `Number` (Default: `30` seconds to hide WhatsApp voice notes/ringtones)
* `scanner_hide_messenger_media` -> `Boolean`
* `scanner_show_hidden_dotfiles` -> `Boolean`
* `scanner_excluded_paths` -> `Array<String>`

#### Instance 3: `mmkv-sort-filter-state` (Remembers Sort/View Per Category)
* `sort_config:AUDIO` -> `{ sortBy: 'NAME' | 'DATE' | 'SIZE' | 'DURATION', order: 'ASC' | 'DESC', viewMode: 'LIST' | 'GRID' }`
* `sort_config:VIDEO` -> `{ sortBy: 'DATE', order: 'DESC', viewMode: 'GRID' }`
* `sort_config:PHOTO` -> `{ sortBy: 'DATE', order: 'DESC', viewMode: 'GRID' }`
* `sort_config:PDF` -> `{ sortBy: 'DATE', order: 'DESC', viewMode: 'LIST' }`
* `sort_config:OTHER_DOC` -> `{ sortBy: 'NAME', order: 'ASC', viewMode: 'LIST' }`

---

## 4. Zustand Global State Architecture (In-Memory Stores)

While SQLite and MMKV persist data on disk, **Zustand** holds the live reactive state in RAM so components update smoothly at 60/120 FPS without unnecessary re-renders. We divide Zustand into **6 Isolated Stores**:

### Store 1: `useThemeAndSettingsStore`
* **Purpose:** Hydrates synchronously from `mmkv-user-settings` in <1ms before the first screen renders (zero white flash on startup).
* **State Keys:**
  * `themeMode`, `isAmoledBlack`, `accentPalette`, `resolvedColorTokens` (computed Material 3 hex colors).
  * All player & scanner preference flags.
  * **Actions:** `updateSetting(key, value)`, `resetToDefaults()`.

### Store 2: `useMediaScannerStore`
* **Purpose:** Tracks background storage scanning and indexing progress.
* **State Keys:**
  * `isScanning` *(Boolean)* — Shows a subtle non-blocking progress bar at the top of the dashboard during refresh.
  * `scanProgressPercent` *(Number)* — `0` to `100`.
  * `lastScanTimestampMs` *(Number)*.
  * `categoryCounts` — `{ AUDIO: Number, VIDEO: Number, PHOTO: Number, PDF: Number, OTHER_DOC: Number }`.
  * `storageStats` — `{ usedBytes: Number, freeBytes: Number, totalBytes: Number }`.

### Store 3: `useBrowserFilterStore`
* **Purpose:** Manages active search queries, filter chips, and multi-select actions inside any Folder or File screen.
* **State Keys:**
  * `activeCategory` — Currently opened hub (`AUDIO`, `VIDEO`, etc.).
  * `searchQuery` *(String)* — Live search input text.
  * `activeQuickFilter` — `'ALL' | 'IN_PROGRESS' | 'UNWATCHED' | 'FAVORITES' | 'LARGE_FILES' | 'HIDE_MESSENGER'`.
  * `sortConfigByCategory` — Hydrated from `mmkv-sort-filter-state`.
  * `isSelectionMode` *(Boolean)* — True when user long-presses files to batch delete, share, or move to Private Vault.
  * `selectedFileIds` *(Array of Strings)* — Currently checked files.

### Store 4: `useAudioPlayerStore` (Powers MiniPlayer & Full Audio Sheet)
* **Purpose:** Keeps the `PersistentMiniPlayer` and `FullAudioPlayerSheet` in sync across the entire app.
* **State Keys:**
  * `activeTrack` *(Object | Null)* — Full metadata of the currently playing song/audio.
  * `queue` *(Array of File Objects)* — Current upcoming playlist.
  * `playbackState` — `'IDLE' | 'BUFFERING' | 'PLAYING' | 'PAUSED'`.
  * `currentPositionMs` & `durationMs` *(Numbers)*.
  * `playbackSpeed` *(Number)* — `0.5x` to `2.5x`.
  * `repeatMode` — `'OFF' | 'TRACK' | 'QUEUE'`.
  * `isShuffleOn` *(Boolean)*.
  * `abLoopState` — `{ isActive: Boolean, pointAMs: Number | Null, pointBMs: Number | Null }`.
  * `sleepTimerRemainingSec` *(Number | Null)*.
  * `equalizerConfig` — `{ isEnabled: Boolean, activePreset: String, bandGains: Array<Number>, bassBoost: Number, virtualizer: Number }`.
  * `isFullPlayerOpen` *(Boolean)* — Controls Shared Element expansion of the MiniPlayer.

### Store 5: `useVideoPlayerStore` (Powers VLC Video Session)
* **Purpose:** Manages complex on-screen HUD overlays, gestures, and multi-track selections during video playback without causing frame drops on the video surface.
* **State Keys:**
  * `activeVideoFile` *(Object | Null)*.
  * `isPlaying` *(Boolean)*, `isBuffering` *(Boolean)*.
  * `isHudVisible` *(Boolean)* — Toggles top/bottom toolbars.
  * `isScreenLocked` *(Boolean)* — Locks all touch controls except the "Unlock" icon.
  * `activeDecoder` — `'HW+' | 'SW'`.
  * `playbackSpeed` *(Number)* & `isLongPress2xActive` *(Boolean)*.
  * `aspectRatioMode` — `'FIT' | 'FILL' | '16_9' | '4_3' | 'STRETCH'`.
  * `volumeLevel` *(0 to 200)* & `brightnessLevel` *(0 to 100)*.
  * `availableAudioTracks` *(Array)* & `selectedAudioTrackId` *(Number)*.
  * `availableSubtitleTracks` *(Array)*, `selectedSubtitleTrackId` *(Number)*, & `subtitleDelayMs` *(Number)*.
  * `isPipModeActive` *(Boolean)*.

### Store 6: `useResumeHistoryStore`
* **Purpose:** Reactive bridge over `mmkv-resume-store` so whenever a user closes a Video, Audio, or PDF, the progress bar under the file item in `FileListScreen` and the `ContinueWatchingCarousel` on the Home Screen update immediately.
* **State Keys:**
  * `recentItems` *(Array of top 20 ResumeRecords)*.
  * `resumeMapByFileId` *(Record/Map of `fileId -> ResumeRecord`)*.
  * **Actions:** `saveProgress(record)`, `clearSingleProgress(fileId)`, `clearAllHistory()`.

---

## 5. Complete Library Ecosystem (Packages to Install)

### 5.1 UI, Icons & Animations
* **UI Component Kit:** `react-native-paper` (v5+ for strict Material Design 3 guidelines).
* **Icon Library:** `react-native-vector-icons` — Standardized on **`MaterialCommunityIcons`** across the entire app for visual consistency.
* **Animation Engine:** `react-native-reanimated` (v3+) — Runs all animations on the native UI thread at 60/120 FPS.
* **Gesture Engine:** `react-native-gesture-handler` — Powers swipe-to-seek, vertical volume/brightness bars, pinch-to-zoom, and swipe-to-dismiss.
* **High-Speed Lists:** `@shopify/flash-list` — Renders thousands of audio files or high-res photo grids without frame drops.
* **Modals & Sheets:** `@gorhom/bottom-sheet` — Used for Sort Menus, Equalizer Panels, File Properties, and Track Selectors.

### 5.2 File System, Permissions & Native Intents
* **Permissions:** `react-native-permissions` — Manages Android 13/14/15 granular media permissions (`READ_MEDIA_AUDIO`, `READ_MEDIA_VIDEO`, `READ_MEDIA_IMAGES`) and Android 11+ `MANAGE_EXTERNAL_STORAGE`.
* **File System Access:** `react-native-blob-util` or `react-native-fs` paired with Android's native `MediaStore` API for rapid folder aggregation.
* **External Document Launcher:** `react-native-file-viewer` — Triggers Android's native `Intent.ACTION_VIEW` chooser with secure `FileProvider` URIs for `.docx`, `.xlsx`, `.pptx`, `.apk`, or `.zip` files.

### 5.3 Specialized Media & Document Engines
* **Video Player Engine:** `react-native-vlc-media-player` (powered by **LibVLC**) OR `react-native-video` compiled with the **Jellyfin FFmpeg ExoPlayer extension**. *LibVLC is prioritized because it natively decodes MKV, AVI, FLV, WMV, 10-bit HEVC, AC3, EAC3, and DTS without breaking.*
* **Audio Player Engine:** `react-native-track-player` paired with a LibVLC fallback for rare audio formats (`.ape`, `.wma`, `.mpc`, `.alac`) and Android's native `AudioEffect` API for the Equalizer.
* **Image Viewer Engine:** `@d11/react-native-fast-image` + `@likashefqet/react-native-image-zoom`.
* **PDF Reader Engine:** `react-native-pdf` (Pdfium C++ engine for fast rendering of heavy PDFs, night mode, and page snapping).

---

## 6. Component Architecture & Integration Flow

The app is divided into **7 Modular Feature Domains** and **22 Core Components**:

### Domain 1: Onboarding & Main Dashboard (`DashboardModule`)
1. **`PermissionGatekeeper`:** Detects Android version on first launch, explains why storage access is needed, and requests permissions.
2. **`CategoryHubScreen` (First Screen):** Displays the 5 primary category cards (**Audio, Video, Photo, PDF, Other Docs**).
3. **`ContinueWatchingCarousel`:** Sits right below the category cards on the home screen. Reads from `useResumeHistoryStore` to display the last 10 opened items for 1-tap instant resumption.
4. **`StorageOverviewCard`:** Visual progress bar showing Internal Storage / SD Card usage breakdown by media type.

### Domain 2: Universal Folder & File Browser (`BrowserModule`)
5. **`FolderListScreen`:** Reusable screen across all 5 categories. Groups files by their parent directory from `folders_index`. Shows Folder Thumbnail/Icon, Folder Name, File Count badge, Total Folder Size, and an indicator dot if any file inside has an active resume state.
6. **`FileListScreen`:** Displays all files inside a selected folder using `FlashList`. Supports toggling between **Detailed List View** and **Thumbnail Grid View**. Displays a mini progress bar directly under any file that has been partially watched/read.
7. **`SmartSearchHeader`:** Sticky top header with real-time search bar (queries `files_search_fts`), quick-filter chips (`All`, `In Progress`, `Unwatched/Unread`, `Large Files`, `Hide Messenger`), and layout toggle icon.
8. **`SortBottomSheet`:** Slide-up sheet allowing sorting by Name, Date Modified, File Size, and Duration.
9. **`FileInfoBottomSheet`:** Displays full file path, exact byte size, format/codec details, resolution, and quick actions (Rename, Share, Delete, Move to Vault, Favorite).

### Domain 3: Advanced Audio Player (`AudioModule`)
10. **`PersistentMiniPlayer`:** Docked at the bottom of the app across all screens when audio is active.
11. **`FullAudioPlayerSheet`:** Expands smoothly when swiping up the MiniPlayer. Includes Seekbar, Playback Speed (`0.5x` to `2.5x`), **A-B Repeat Loop**, **Sleep Timer**, Shuffle/Repeat, Bookmarks, and Queue manager.
12. **`AudioEqualizerSheet`:** 5-Band graphic equalizer, Bass Boost slider, Virtualizer (3D effect) slider, and genre presets.

### Domain 4: VLC-Grade Video Player (`VideoModule`)
13. **`UniversalVideoPlayerScreen`:** Full-screen hardware-accelerated video surface.
14. **`VideoGestureController`:** Multi-zone touch layer supporting Left vertical swipe (Brightness), Right vertical swipe (Volume up to 200%), Horizontal swipe (Timeline scrub), Double tap Left/Right (`-10s`/`+10s`), Long press (`2.0x` temporary speed boost), and Two-finger pinch (Zoom/Aspect Ratio).
15. **`VideoTrackAndSubtitleSheet`:** Switches between embedded multi-audio tracks, embedded/external `.srt`/`.ass` subtitles, and adjusts **Audio/Subtitle Sync Delay (`+/- ms`)**.
16. **`VideoHudOverlay`:** Top and bottom control bars featuring **Screen Touch Lock**, **Orientation Toggle**, **Picture-in-Picture (PiP)** button, **Play as Background Audio** toggle, and **HW/SW Decoder Switcher**.

### Domain 5: Advanced Image Viewer (`ImageModule`)
17. **`ProImageLightboxScreen`:** Full-screen swipeable gallery with `1x` to `8x` pinch/double-tap zoom, vertical swipe-down to close, 90-degree rotation, Slideshow timer, "Set as Wallpaper" action, and an **EXIF Details Sheet**.

### Domain 6: Advanced PDF Reader (`PdfModule`)
18. **`IntegratedPdfReaderScreen`:** High-speed PDF canvas with **Auto-Resume Banner**, **Vertical vs. Horizontal Book Mode**, **Eye-Care Night Mode**, **Fast Page Scrubber & Jump Modal**, and **Page Bookmarks**.

### Domain 7: Other Documents Handler (`DocsModule`)
19. **`ExternalDocManager`:** Lists all non-PDF documents (`.doc`, `.docx`, `.xls`, `.xlsx`, `.ppt`, `.pptx`, `.txt`, `.csv`, `.zip`, `.rar`, `.apk`). Includes a built-in lightweight **Quick Text Previewer** for plain text files and triggers the native Android **"Open With"** selector sheet for Office and archive files.

---

## 7. Theme System & Color Architecture

### 7.1 Theme Modes (4 Modes)
1. **Follow System Default**
2. **Light Mode**
3. **Dark Mode** (Slate-tinted Material dark surface)
4. **Pure AMOLED Black Mode** (`#000000` background and `#0A0A0A` cards)

### 7.2 Theme Accent Options (6 Options for the User)
1. **Material You Dynamic Color (Android 12+ Default):** Extracts palette from the user's wallpaper.
2. **Royal Indigo (Brand Default):** Primary `#4F46E5` (Light) / `#818CF8` (Dark)
3. **Sunset VLC Orange:** Primary `#EA580C` (Light) / `#FB923C` (Dark)
4. **Emerald Forest:** Primary `#059669` (Light) / `#34D399` (Dark)
5. **Cinema Crimson:** Primary `#E11D48` (Light) / `#FB7185` (Dark)
6. **Ocean Cyan:** Primary `#0284C7` (Light) / `#38BDF8` (Dark)

### 7.3 Dedicated Category Semantic Colors (Fixed Visual Anchors)
* **Audio Hub:** Electric Purple (`#8B5CF6`)
* **Video Hub:** Vibrant Orange (`#F97316`)
* **Photo Hub:** Emerald Green (`#10B981`)
* **PDF Hub:** Crimson Red (`#EF4444`)
* **Other Docs Hub:** Royal Blue (`#3B82F6`)

---

## 8. UI & Animation Guidelines (Material Motion Standards)

* **Screen Transitions:** Shared Axis horizontal slide transitions when drilling down from `CategoryHub` -> `FolderList` -> `FileList`.
* **Shared Element Morphing:**
  * Tapping a photo thumbnail smoothly expands into `ProImageLightboxScreen`.
  * Swiping up the bottom `PersistentMiniPlayer` morphs the album thumbnail into the large artwork on `FullAudioPlayerSheet`.
* **Micro-Interactions:**
  * Every folder and file card gently scales down to `97%` on touch press (`100ms`) and springs back on release.
  * Changing sort order or switching between Grid and List view animates item positions smoothly.
  * Video player double-tap seek shows an expanding circular ripple on the left or right edge.

---

## 9. Complete User Settings Specification

### Section A: Appearance & Interface
* **App Theme Mode:** `System Default` | `Light` | `Dark`
* **AMOLED Pure Black Mode:** `Toggle ON/OFF`
* **Accent Color Theme:** Choose from `Dynamic Material You` or the 5 curated palettes.
* **Default Browser View:** `List View` | `Grid View`
* **Show "Continue Watching/Reading" on Home Screen:** `Toggle ON/OFF`

### Section B: Smart Resume & History Settings
* **Video Resume Behavior:** `Resume Automatically` (with a 4-second "Start Over" snackbar button) | `Always Ask Dialog` | `Never Resume`
* **Audio Resume Filter:** `All Audio Files` | `Only Long Audio (> 10 Minutes)` | `Off`
* **PDF Resume Behavior:** `Always Resume from Last Page` (`ON/OFF`)
* **Auto-Reset Threshold:** Automatically reset progress to `0%` when a video or audio reaches `97%` completion.
* **Clear Resume History:** One-tap button to clear all saved playback positions and recent history.

### Section C: Video Player Preferences
* **Default Decoding Engine:** `Hardware Accelerated (HW+)` | `Software Decoder (SW)` | `Auto Fallback`
* **Double-Tap Seek Interval:** `5 sec` | `10 sec` | `15 sec` | `30 sec`
* **Volume Boost Limit:** `100% (Normal)` | `150%` | `200% (Max Boost)`
* **Swipe Gestures Control:** Individual toggles for `Brightness Swipe`, `Volume Swipe`, `Horizontal Seek Swipe`, and `Pinch to Zoom`.
* **Auto Picture-in-Picture (PiP):** Automatically shrink video into floating PiP window when pressing the Home button (`ON/OFF`).
* **Background Video Playback:** Continue playing video audio when the screen is turned off (`ON/OFF`).
* **Subtitle Customization:** Font Size, Text Color, and Background Box opacity.

### Section D: Audio Player Preferences
* **Gapless Playback:** Eliminate silence between consecutive tracks (`ON/OFF`).
* **Auto-Resume on Headset Connect:** Automatically start playing when Bluetooth or wired earphones connect (`ON/OFF`).
* **Ignore Short Audio Clips:** Hide audio files shorter than `30 Seconds` or `60 Seconds`.

### Section E: Storage Scanner & Privacy
* **Show Hidden Files & Folders:** Display folders starting with a dot `.nomedia` or `.hidden` (`ON/OFF`).
* **Excluded Folders Manager:** Let users select specific folders to hide from the app scanner.
* **Rescan Media Library:** Manual button to force a fresh full-storage index into SQLite.

