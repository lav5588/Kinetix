# Task 9: Integrated Audio Player Engine & Background Service — AI Subtask Prompts

This file breaks **Task 9 from `Tasks.md`** into small, sequential implementation steps. Complete one subtask at a time, verify it, and fix failures before moving on.

## Project Rules for Every Subtask

- Project: **Kinetix**, Android-first, offline-only React Native CLI bare workflow, TypeScript, New Architecture.
- Inspect the current repository and Tasks 1–8 implementation before modifying files. Reuse existing aliases, theme, storage repositories, navigation, and Zustand patterns.
- Task 9 is the audio playback engine and its background service. Do **not** implement Task 10's mini-player/full-player UI or equalizer, or unrelated video playback features.
- Use `react-native-track-player` as the primary audio engine. Add LibVLC fallback only for the formats and cases specified in Task 9 (`.ape`, `.wma`, `.mpc`) when the primary engine rejects a codec.
- Keep the playback service separate from React UI. Do not call React hooks from the registered background service.
- Reuse the actual `ResumeRepository`, `mmkv-resume-store`, and existing file/domain types. Do not invent a second resume-history persistence system.
- Check installed package versions and their actual APIs before writing setup code. Native playback packages may require Android configuration and a full native rebuild.
- Use local file URIs/paths and local metadata. Do not add network streaming or cloud dependencies.
- Implement only the current subtask in each AI response. Include changed files, relevant commands, test results or exact commands to run, and any platform limitations. Do not claim a test passed unless it was run.

---

## Subtask 1 — Inspect Existing Audio, Storage, and Native Build Contracts

### 1. What to Do (Goal)
Inspect the existing app, dependency versions, file schema, resume repository, and current playback-related files. Determine how indexed audio files are represented, how local paths/URIs are stored, how resume state is shaped, and how `index.js` registers native/background services. Do not implement playback yet.

### 2. Where to Inspect
- `package.json`
- `index.js`
- `android/app/build.gradle`
- `android/build.gradle` and relevant Android manifest files
- `src/core/storage/mmkvInstances.ts`
- `src/core/storage/repositories/ResumeRepository.ts`
- `src/core/storage/repositories/FileRepository.ts`
- `src/core/store/useResumeHistoryStore.ts` (or actual existing path)
- Existing `src/features/audioPlayer/` files and tests
- Existing `src/features/browser/FileListScreen.tsx` and navigation types

### 3. AI Prompt Instructions (Copy-Paste to AI)
> Act as a senior React Native audio engineer. Inspect the Kinetix repository before changing anything. Report the installed React Native version, architecture setting, package manager, current Track Player/VLC dependencies if any, the actual audio file type, file URI/path and resume-record contracts, and how the app entry point is registered. Identify Android setup requirements from the installed package versions. Do not modify files yet, do not assume API names from a different library version, and do not implement Task 10 UI. End with a minimal ordered implementation plan for Task 9.

### 4. Verification / Acceptance Criteria
- Automated: Run the existing typecheck, lint, and tests to establish a baseline.
- Manual: Confirm the plan references real files, real data fields, and the actual installed package versions.
- Stop and resolve any ambiguity in file identifiers, local URIs, or resume-record format before implementation.

---

## Subtask 2 — Install and Configure `react-native-track-player`

### 1. What to Do (Goal)
Install a compatible `react-native-track-player` version and configure it for the project's React Native/Android setup. Configure required Android service, manifest, Gradle, and entry-point details according to the installed version's documentation and repository conventions.

### 2. Where to Do (Exact File Paths)
- `package.json` and the active lockfile
- `index.js`
- `android/app/src/main/AndroidManifest.xml`
- `android/app/build.gradle` or other Android files only if required by the installed version
- Existing native configuration files identified in Subtask 1

### 3. AI Prompt Instructions (Copy-Paste to AI)
> Configure `react-native-track-player` for Kinetix using a version compatible with the project's actual React Native version and New Architecture setup. Follow the API and Android setup for that exact version. Add only required dependencies, service declarations, permissions, and native configuration. Do not register the playback service twice, do not replace the app's existing entry registration, and do not add UI. Show every changed file and explain any clean rebuild required.

### 4. Verification / Acceptance Criteria
- Automated: Dependency installation completes without lockfile conflicts.
- Automated: Run TypeScript checks and build the Android debug app to detect native linking/configuration failures.
- Manual: Install and launch the app on an emulator or device with no native module initialization crash.
- Do not proceed until the native module can initialize successfully.

---

## Subtask 3 — Define Audio Player Types and Queue Utilities

### 1. What to Do (Goal)
Create typed queue/playback contracts and pure queue helpers for loading tracks, skipping, shuffling, and repeat modes `OFF`, `TRACK`, and `QUEUE`. Reuse existing indexed file types and avoid duplicating metadata already available from the repository.

### 2. Where to Do (Exact File Paths)
- `src/core/store/useAudioPlayerStore.ts` (types only if appropriate)
- `src/features/audioPlayer/types.ts` (create only if no suitable existing type module exists)
- `src/features/audioPlayer/utils/audioQueue.ts`
- Corresponding utility unit tests

### 3. AI Prompt Instructions (Copy-Paste to AI)
> Implement only the typed audio queue model and pure queue utilities. Use the existing file record contract and map it into the exact Track Player track shape required by the installed package version. Support queue construction, next/previous behavior, repeat modes `OFF`, `TRACK`, and `QUEUE`, and a shuffle algorithm that avoids mutating the original array and avoids immediately repeating the current track when another track is available. Handle empty and one-item queues safely. Do not call Track Player APIs or build UI in this step.

### 4. Verification / Acceptance Criteria
- Automated: Test empty, one-track, and multi-track queues.
- Automated: Test shuffle randomization and confirm the input queue is not mutated.
- Automated: Test `OFF`, `TRACK`, and `QUEUE` repeat behavior, including queue boundaries.
- Manual: Review that queue helpers use stable file IDs and don't rely on filenames as unique identifiers.

---

## Subtask 4 — Build `useAudioPlayerStore`

### 1. What to Do (Goal)
Create the Zustand store that represents active track, queue, playback state, position, duration, repeat mode, shuffle state, and playback errors. Keep it as UI-facing state; the Track Player remains the source of playback execution truth. Avoid storing large media data or creating a duplicate resume persistence layer.

### 2. Where to Do (Exact File Paths)
- `src/core/store/useAudioPlayerStore.ts`
- `src/features/audioPlayer/types.ts` or existing shared audio types
- Corresponding store tests

### 3. AI Prompt Instructions (Copy-Paste to AI)
> Implement `useAudioPlayerStore.ts` following existing Zustand conventions. Model active track, queue, playback status, position/duration in milliseconds, shuffle, repeat mode (`OFF`, `TRACK`, `QUEUE`), loading/error state, and actions for updating state from Track Player events. Keep actions typed and predictable. Do not persist playback progress here; progress persistence belongs to `ResumeRepository` through the audio playback service. Do not create UI or native Track Player listeners in this step.

### 4. Verification / Acceptance Criteria
- Automated: Test initial state, queue/active-track updates, playback-state updates, repeat/shuffle updates, and error clearing.
- Automated: Verify resetting playback clears transient state without erasing resume history.
- Manual: Confirm the store contains no duplicate MMKV or SQLite persistence implementation.

---

## Subtask 5 — Implement `AudioPlaybackService` and Playback Controls

### 1. What to Do (Goal)
Implement the primary playback service around `react-native-track-player`. Support loading a queue, play/pause, next/previous, seeking as needed by the service contract, shuffle, repeat modes, and translating native playback events into `useAudioPlayerStore`.

### 2. Where to Do (Exact File Paths)
- `src/features/audioPlayer/services/AudioPlaybackService.ts`
- `src/features/audioPlayer/utils/audioQueue.ts`
- `src/core/store/useAudioPlayerStore.ts`
- Corresponding service unit tests

### 3. AI Prompt Instructions (Copy-Paste to AI)
> Implement `AudioPlaybackService.ts` using the actual installed Track Player API. Expose a small typed service API for loading a queue, playing, pausing, skipping next/previous, seeking, toggling shuffle, and setting repeat mode. Subscribe to relevant playback/queue/active-track events once, translate them into `useAudioPlayerStore`, and clean up any subscriptions where the library version supports cleanup. Prevent duplicate listener registration and handle empty queues and native errors. Do not register the background service here if entry-point registration is handled separately. Do not implement the mini-player UI.

### 4. Verification / Acceptance Criteria
- Automated: Mock Track Player and test queue loading, play/pause/skip, shuffle, and repeat mode changes.
- Automated: Verify native events update the store and listener setup does not duplicate events.
- Manual: Play, pause, skip, and seek local audio from a development-only test trigger or existing app entry point.
- Confirm no network URL is required for local audio playback.

---

## Subtask 6 — Register the Background Playback Service

### 1. What to Do (Goal)
Register the background playback service at the correct app entry point using the API required by the installed Track Player version. Handle remote play/pause/next/previous events from Android media controls and keep service code independent of React components.

### 2. Where to Do (Exact File Paths)
- `index.js`
- `src/features/audioPlayer/services/AudioPlaybackService.ts`
- A dedicated service registration module only if the installed package version and existing architecture require one

### 3. AI Prompt Instructions (Copy-Paste to AI)
> Wire the Track Player background service into the existing `index.js` registration flow using the exact installed version's documented API. Preserve the current `AppRegistry` registration. Register remote play, pause, next, and previous handlers as supported by the package version and delegate to the service layer. Make registration idempotent where possible and avoid importing React UI into the background service. Do not implement Task 10's persistent mini-player.

### 4. Verification / Acceptance Criteria
- Automated: Test remote-event handlers by mocking Track Player event subscriptions and asserting the corresponding service action is invoked.
- Automated: Verify app and playback service are each registered exactly once.
- Manual: Start audio, background the app, and use notification shade media controls to pause/resume/skip.
- Confirm playback remains active when the app UI is backgrounded.

---

## Subtask 7 — Implement `VlcAudioFallbackService`

### 1. What to Do (Goal)
Add a secondary LibVLC-based audio fallback for `.ape`, `.wma`, and `.mpc` files when the primary Track Player/ExoPlayer path rejects the codec. Inspect compatibility and native setup before choosing or installing a VLC package; do not assume a headless API exists without verifying it.

### 2. Where to Do (Exact File Paths)
- `src/features/audioPlayer/services/VlcAudioFallbackService.ts`
- `src/features/audioPlayer/services/AudioPlaybackService.ts`
- `package.json` and Android native configuration only if required
- Corresponding fallback service tests

### 3. AI Prompt Instructions (Copy-Paste to AI)
> Implement a VLC fallback for Kinetix only after verifying the selected LibVLC React Native package is compatible with the project's React Native version and Android architecture. The fallback should activate only when the primary engine rejects a supported candidate file such as `.ape`, `.wma`, or `.mpc`, or reports a recognized unsupported-codec error. Route play/pause/seek/state events through the existing audio service/store contract where the fallback library supports them. Avoid starting both engines simultaneously, stop and release the primary engine before switching, and avoid retry loops. If the proposed package cannot provide a headless audio service or is incompatible with this project, do not fake the implementation: report the limitation and offer the smallest technically valid alternative before proceeding.

### 4. Verification / Acceptance Criteria
- Automated: Mock the primary engine's unsupported-codec error and verify fallback is invoked for eligible files.
- Automated: Verify ordinary supported files do not trigger VLC and that only one engine is active at a time.
- Automated: Verify fallback failure is surfaced as a recoverable error rather than an unhandled rejection.
- Manual: Test `.ape`, `.wma`, and `.mpc` only where valid local samples and the chosen VLC integration are available.

---

## Subtask 8 — Persist Resume Progress Every Two Seconds

### 1. What to Do (Goal)
Wire playback position events to the existing `ResumeRepository` and `mmkv-resume-store`. Throttle progress persistence to approximately every 2 seconds during playback, and respect the `audio_resume_min_duration_sec` setting. Reuse existing completion/reset semantics and do not write on every high-frequency progress tick.

### 2. Where to Do (Exact File Paths)
- `src/features/audioPlayer/services/AudioPlaybackService.ts`
- `src/core/storage/repositories/ResumeRepository.ts`
- Existing resume-history store and settings store, at their actual paths
- Corresponding service/repository tests

### 3. AI Prompt Instructions (Copy-Paste to AI)
> Connect playback progress events to the existing `ResumeRepository.saveState` contract. Persist updated `positionMs` at most once per 2-second interval while playback is progressing, with a final safe save on pause/track change/stop where appropriate. Respect the actual `audio_resume_min_duration_sec` setting and the repository's existing completion threshold and record format. Avoid writing when the position has not meaningfully changed. Ensure timers/listeners are cleaned up and asynchronous saves cannot create unhandled promise rejections. Do not create another MMKV instance or bypass ResumeRepository.

### 4. Verification / Acceptance Criteria
- Automated: Use fake timers or controlled events to verify persistence is throttled to two-second intervals.
- Automated: Verify `ResumeRepository.saveState` receives the correct file ID and updated `positionMs`.
- Automated: Verify minimum-duration preference is respected, and completed tracks follow existing repository semantics.
- Automated: Verify pause/track-change final saves and listener cleanup.
- Manual: Play a track, pause it, force-close and reopen the app, then verify resume position is restored through the existing resume-history flow.

---

## Subtask 9 — Audio Focus, Interruptions, and Headphone Events

### 1. What to Do (Goal)
Configure audio focus and interruption behavior through the installed playback engine: pause/duck when another app or a phone call takes audio focus, resume only when appropriate, and pause when wired/Bluetooth headphones are disconnected if supported by the platform/library events.

### 2. Where to Do (Exact File Paths)
- `src/features/audioPlayer/services/AudioPlaybackService.ts`
- `src/core/store/useAudioPlayerStore.ts`
- Android configuration only if the installed library explicitly requires it
- Corresponding service tests

### 3. AI Prompt Instructions (Copy-Paste to AI)
> Implement interruption handling using events and capabilities actually exposed by the installed Track Player version and Android platform. Configure audio focus/ducking behavior using supported APIs rather than inventing event names. Handle phone-call/other-audio interruptions and headset disconnects, pausing safely when required. Resume after an interruption only when the platform event and previous playback state make that appropriate; never auto-resume if the user had already paused playback. Keep the service resilient to repeated or out-of-order events.

### 4. Verification / Acceptance Criteria
- Automated: Mock interruption and headset events; verify pause/duck/resume decisions and ensure manually paused playback does not resume unexpectedly.
- Automated: Verify repeated events do not cause duplicate actions or crashes.
- Manual: During playback, start another app's audio or simulate an incoming call and verify appropriate focus behavior.
- Manual: Unplug wired headphones and disconnect Bluetooth audio while playing; verify the expected pause behavior on the tested device.

---

## Subtask 10 — End-to-End Audio Engine Validation

### 1. What to Do (Goal)
Complete Task 9 validation with automated tests and real-device checks for supported formats, background playback, notification controls, audio focus, headset disconnection, VLC fallback, and resume persistence. Fix Task 9 defects only.

### 2. Where to Do (Exact File Paths)
- Audio service and store tests under existing test conventions
- `.maestro/` (add an audio smoke flow if the current app can reliably expose a testable playback path)
- Task 9 source files only

### 3. AI Prompt Instructions (Copy-Paste to AI)
> Validate Task 9 in Kinetix. Add focused Jest tests for queue loading, play/pause/skip, shuffle, repeat modes, unsupported-codec fallback, and two-second ResumeRepository persistence respecting `audio_resume_min_duration_sec`. If a stable test fixture and navigation path exist, add a Maestro flow that opens an Audio folder and starts a track; do not invent a player screen that belongs to Task 10. Provide exact commands for typecheck, lint, targeted tests, full tests, and Android debug build. Clearly distinguish tests that were actually run from manual checks that still need a physical device.

### 4. Verification / Acceptance Criteria
- Automated: Test queue loading, play/pause/skip, shuffle, repeat modes, and fallback trigger.
- Automated: Verify resume saving is throttled and respects `audio_resume_min_duration_sec`.
- Automated: Run typecheck, lint, targeted Jest tests, full Jest suite, and Android debug build.
- Manual: Play `.mp3`, `.flac`, `.wav`, `.aac`, `.ogg`, `.opus`, and `.wma` local files from an audio folder.
- Manual: Lock the phone and verify audio continues, lock-screen controls work, and notification seekbar scrubbing works where supported.
- Manual: Start a phone call or play audio in another app and verify audio focus behavior.
- Manual: Unplug wired/Bluetooth headphones and verify playback pauses as expected.
- Final gate: Record unsupported formats or unavailable device checks honestly. Do not claim performance or codec compatibility without testing.

---

## Task 9 Completion Checklist

- [ ] `react-native-track-player` is installed and configured for the actual project version.
- [ ] `AudioPlaybackService` owns primary engine actions and event integration.
- [ ] `useAudioPlayerStore` reflects current queue and playback state.
- [ ] Background service is registered exactly once in `index.js`.
- [ ] Android notification/lock-screen controls work where supported.
- [ ] VLC fallback is compatibility-checked and only used for eligible unsupported formats.
- [ ] Resume state is saved through `ResumeRepository` at a maximum cadence of about every two seconds.
- [ ] `audio_resume_min_duration_sec` and existing completion semantics are respected.
- [ ] Audio focus and headphone-disconnect behavior are tested.
- [ ] Automated checks and real-device validation are recorded honestly.
