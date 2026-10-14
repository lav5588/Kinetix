# Task 11 — VLC-Grade Video Player Core Engine & Resume Integration

## Goal

Implement the video playback engine for Kinetix using `react-native-vlc-media-player`, integrate it into `UniversalVideoPlayerScreen`, support hardware (`HW+`) and software (`SW`) decoding choices, handle orientation, and persist/resume video position using `mmkv-resume-store`.

Work through these subtasks **in order**. Complete and test one subtask before moving to the next. Inspect the existing repository first and reuse its current types, settings, navigation, storage repositories, and conventions. Do not create duplicate stores or invent APIs.

## Important implementation rules

- Verify the installed React Native, Android, and `react-native-vlc-media-player` versions and their actual APIs before writing integration code.
- Native VLC packages may require Android configuration or compatibility fixes. Document blockers accurately; do not simulate native playback and claim it works.
- Reuse the existing resume repository/store and settings model. If a referenced setting or repository method does not exist, inspect the project and add the smallest compatible implementation with tests.
- Keep playback state and timers cleaned up on unmount and when the active file changes.
- Avoid saving progress after the screen has switched to a different file. Identify records by the project's existing stable file ID.
- Keep TypeScript strict; do not use `any` to bypass type errors.

---

## Subtask 11.1 — Inspect the Existing Video and Resume Architecture

**Purpose:** Understand the current project before changing files.

**AI coding prompt (copy and paste):**

> Inspect the repository for Task 11. Find the current navigation route and file-opening flow for video files, existing `UniversalVideoPlayerScreen` (if any), `useVideoPlayerStore`, `useResumeHistoryStore`, `ResumeRepository`, MMKV instances, user settings and resume-mode types, and the file model used by `FileListScreen`. Inspect package versions and Android configuration for React Native and VLC dependencies. Do not implement features yet. Report the exact existing contracts and a minimal implementation plan for Task 11. Identify missing files or methods without duplicating existing functionality.

**Acceptance criteria**
- The report identifies actual file IDs, media URI/path representation, duration/position units, and existing resume APIs.
- The report identifies where `video_resume_mode` and decoder preference are defined—or explicitly states they are missing.
- No source files are changed in this subtask.

**Verification**
- Review the report against the repository.
- Confirm all proposed imports and method names exist or are explicitly planned for creation.

---

## Subtask 11.2 — Install and Verify the VLC Native Dependency

**Primary scope:** `package.json`, lockfile, Android configuration required by the installed package.

**AI coding prompt:**

> Add and configure `react-native-vlc-media-player` for this bare React Native Android project, using a version compatible with the project's installed React Native and New Architecture setup. Read the package's actual README and native setup instructions from the installed package/version. Make only the required Android and JavaScript changes. Run dependency installation and an Android debug build. If the dependency is incompatible with the current React Native/Android toolchain, stop and report the concrete error and viable version/configuration options rather than making speculative native changes.

**Acceptance criteria**
- Dependency and lockfile are consistent.
- Native linking/configuration follows the package version actually installed.
- Build results and any unresolved compatibility issue are recorded.

**Verification**
- Run the project's package-manager install/check command.
- Run the Android debug build using the project's documented command.
- Do not proceed as if native playback works unless the build and runtime initialization are verified.

---

## Subtask 11.3 — Define Video Player State and Decoder Preference

**Primary files**
- `src/core/store/useVideoPlayerStore.ts`
- Existing settings store/type files discovered in Subtask 11.1

**AI coding prompt:**

> Implement or extend `useVideoPlayerStore` using the project's existing state-management conventions. Represent the active file, playback status, current position in milliseconds, duration in milliseconds, selected decoder mode (`HW+` or `SW`), and any minimal state needed by `UniversalVideoPlayerScreen`. Reuse the existing settings store for the user's decoder preference; do not create a second settings store. Add typed actions for updating playback state and clearing state when the active file changes. Keep transient playback state separate from persisted resume history. If a requested field already exists, reuse it.

**Acceptance criteria**
- Store fields and actions are strongly typed.
- Decoder preference uses the project's established setting when available.
- Switching files cannot accidentally reuse the previous file's position or duration.
- No duplicate resume-history source of truth is introduced.

**Verification**
- Add Jest tests for initial state, state updates, decoder selection, active-file changes, and reset behavior.
- Run the relevant unit tests and TypeScript check.

---

## Subtask 11.4 — Build the VLC Player Screen

**Primary file**
- `src/features/videoPlayer/UniversalVideoPlayerScreen.tsx`

**AI coding prompt:**

> Implement `UniversalVideoPlayerScreen` using the installed `react-native-vlc-media-player` API verified in this repository. Accept the app's existing file/navigation parameters and render the VLC video surface with appropriate loading, playback-error, and retry states. Wire actual VLC callbacks to `useVideoPlayerStore`, converting all playback positions and durations to milliseconds at the app boundary. Apply the selected decoder mode using the real API supported by the installed package. Handle missing/unreadable media paths gracefully. Keep controls minimal here; advanced gestures and multi-track controls belong to Task 12. Clean up subscriptions and transient state on unmount or file change.

**Acceptance criteria**
- Opening a video from the existing file browser reaches this screen with the correct file.
- VLC playback events update the store with correctly converted time values.
- Loading and playback errors are visible and do not crash the app.
- No placeholder or mocked surface is presented as working native playback.

**Verification**
- Component-test loading, success, error, and file-change behavior with the VLC surface mocked.
- Build and run on an Android device/emulator to verify the native surface initializes.

---

## Subtask 11.5 — Implement Decoder Mode Selection (`HW+` / `SW`)

**Primary files**
- `src/features/videoPlayer/UniversalVideoPlayerScreen.tsx`
- `src/core/store/useVideoPlayerStore.ts`
- Existing settings files identified earlier

**AI coding prompt:**

> Wire the user's decoder preference into the VLC integration. Support the Task 11 modes `HW+` (hardware-accelerated decoding) and `SW` (software decoding) only to the extent the installed VLC package exposes real configuration for them. Provide a clear, recoverable error path if a selected mode cannot initialize; do not silently label ordinary playback as a different decoder. Keep the preference in the existing settings model if one exists. If the package does not expose a reliable per-player decoder switch, document that limitation and implement only the supported configuration.

**Acceptance criteria**
- UI/store selection maps to verified native configuration.
- Unsupported options are documented rather than faked.
- A decoder initialization failure does not leave the screen permanently stuck.

**Verification**
- Unit-test mode-to-configuration mapping and error handling.
- On a real Android device, test both modes if the installed native package genuinely supports switching.

---

## Subtask 11.6 — Handle Orientation Safely

**Primary file**
- `src/features/videoPlayer/UniversalVideoPlayerScreen.tsx`
- Existing Android orientation helper/configuration, if present

**AI coding prompt:**

> Add video orientation behavior to `UniversalVideoPlayerScreen`. Support an automatic landscape mode when reliable video aspect-ratio metadata is available, plus a manual orientation toggle. Reuse any existing orientation utility or dependency. Save the original orientation and restore it on screen exit/unmount, including navigation away and error cases. Avoid repeatedly locking/unlocking orientation during frequent layout callbacks. If aspect ratio is not available at startup, keep the current orientation until valid metadata arrives.

**Acceptance criteria**
- Automatic landscape behavior uses actual aspect-ratio data.
- Manual orientation control works without causing repeated state loops.
- The previous orientation is restored when leaving the player.

**Verification**
- Test the orientation decision helper with portrait, landscape, square, and unknown dimensions.
- Manually open portrait and landscape videos, rotate the device, navigate away, and verify orientation is restored.

---

## Subtask 11.7 — Add Resume Prompt UI

**Primary file**
- `src/features/videoPlayer/components/ResumePromptBanner.tsx`

**AI coding prompt:**

> Build a typed `ResumePromptBanner` that can display the saved video timestamp as `Resumed from HH:MM:SS` with a `Start Over` action, and provide a confirmation UI for the `ASK` resume mode. Follow the app's existing UI library, theme, modal/snackbar, and accessibility conventions. Keep resume decisions in the screen/controller rather than hiding persistence or seek side effects inside the presentational component. Handle zero or invalid saved positions by not showing a misleading resume prompt.

**Acceptance criteria**
- AUTO-mode confirmation can show a dismissible `Resumed from HH:MM:SS` message and `Start Over` action.
- ASK mode can request a decision before seeking.
- Time formatting handles hours correctly, for example `01:02:03`.
- Buttons have accessible labels and do not duplicate playback actions.

**Verification**
- Add RNTL tests for visible timestamp, Start Over press, ASK confirmation, and no prompt for absent/invalid progress.
- Check the banner in both light and dark themes if the app supports both.

---

## Subtask 11.8 — Integrate AUTO, ASK, and Start-Over Resume Behavior

**Primary files**
- `src/features/videoPlayer/UniversalVideoPlayerScreen.tsx`
- `src/features/videoPlayer/components/ResumePromptBanner.tsx`
- Existing resume/settings stores and repository

**AI coding prompt:**

> Integrate resume behavior when `UniversalVideoPlayerScreen` mounts for a specific file. Read saved progress through the existing resume repository/store and honor the existing `video_resume_mode` setting:
>
> - `AUTO`: when a valid saved position exists, seek the VLC player to that position once the player is ready, and show `Resumed from HH:MM:SS` with `Start Over`.
> - `ASK`: show a confirmation dialog before seeking; seek only after the user chooses to resume.
> - If the project already supports `NEVER`, preserve its behavior and do not seek automatically.
> - `Start Over` must seek to zero and clear or update saved progress using existing repository conventions.
>
> Guard against duplicate seeks caused by repeated VLC ready/progress callbacks, file changes, or rerenders. Use the real seek API and the correct time unit verified in Subtask 11.4.

**Acceptance criteria**
- AUTO seeks to `positionMs: 120000` exactly once and shows the Start Over prompt.
- ASK does not seek until the user confirms.
- Start Over seeks to zero and leaves persisted state consistent.
- Missing or out-of-range saved positions do not trigger invalid seeks.
- Resume behavior does not leak from one file to another.

**Verification**
- Mock the VLC surface and test AUTO seek to `120000`, Start Over, ASK-confirm and ASK-cancel, NEVER if present, invalid progress, and duplicate callback prevention.

---

## Subtask 11.9 — Persist Progress Every Two Seconds and on Exit

**Primary files**
- `src/features/videoPlayer/UniversalVideoPlayerScreen.tsx`
- `src/core/store/useVideoPlayerStore.ts`
- Existing `ResumeRepository` and `useResumeHistoryStore`

**AI coding prompt:**

> Persist video playback position to the existing `mmkv-resume-store` through the existing `ResumeRepository` every 2 seconds during playback and immediately when the screen exits/unmounts. Reuse the project's stable file ID and `ResumeRecord` contract. Update `useResumeHistoryStore` so the file's progress indicator reflects the latest saved position. Prevent overlapping or unnecessary writes, ignore invalid/negative positions, and clean up the interval/subscription on pause, file change, and unmount. Ensure the final position is saved for the file that was playing, even if navigation happens quickly. Follow existing resume settings and repository semantics rather than creating a parallel persistence path.

**Acceptance criteria**
- Progress saves at the intended two-second cadence while playback is active.
- Final position is saved on exit/unmount.
- Resume history updates and the file card can display progress.
- Timers/subscriptions are cleaned up and stale file IDs are not written.
- Existing audio/PDF resume records remain unaffected.

**Verification**
- Use Jest fake timers to verify periodic saves.
- Test unmount saves the latest position and updates `useResumeHistoryStore`.
- Test file switch, pause, invalid positions, and cleanup.
- Verify persisted values survive a screen remount using the project's test storage setup.

---

## Subtask 11.10 — End-to-End and Real-Device Validation

**Primary files**
- Add or update tests under the project's existing test conventions.
- `src/features/videoPlayer/UniversalVideoPlayerScreen.tsx`
- `src/features/videoPlayer/components/ResumePromptBanner.tsx`

**AI coding prompt:**

> Complete Task 11 validation. Add or update the Maestro flow only if the project's E2E setup already supports the required selectors and navigation. Cover opening a video, resuming from saved progress, choosing Start Over, and returning to the file list with progress reflected. Run relevant Jest/RNTL tests, TypeScript checks, lint, and Android debug build. Report exact commands and outcomes. Do not claim codec compatibility or smooth playback based solely on mocks.

**Automated acceptance criteria**
- Mock VLC surface test mounts with a saved record at `positionMs: 120000`.
- `video_resume_mode === 'AUTO'` seeks to `120000` and shows the Start Over prompt.
- `video_resume_mode === 'ASK'` waits for confirmation before seeking.
- Exiting saves the final position and updates `useResumeHistoryStore`.
- TypeScript, lint, tests, and Android build pass—or any failures are listed with their exact cause.

**Manual real-device checklist**
- Test `.mkv` with 10-bit HEVC/x265, `.avi`, `.mp4` at 4K 60fps where device hardware permits, `.flv`, `.webm`, and `.mov`.
- Test videos with EAC3, DTS, and AC3 audio tracks where suitable sample files are available.
- Close a video mid-scene, return to its folder, verify the progress indicator, reopen it, and confirm playback resumes at the expected timestamp.
- Test AUTO and ASK resume modes and Start Over.
- Test HW+ and SW only if the installed package exposes both modes.
- Confirm orientation is restored after leaving the player.

## Task 11 completion definition

Task 11 is complete when the VLC-based screen is integrated into the app's real file-opening flow, decoder/orientation behavior is implemented only to the extent supported by the installed native package, AUTO/ASK resume behavior works, progress is saved every two seconds and on exit, and tests/build results are recorded. Advanced gestures, multi-audio/subtitle controls, and PiP belong to Task 12 and should not be pulled into this task.
