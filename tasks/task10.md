# Task 10 — Persistent Mini-Player, Full Audio Player Sheet & Equalizer

**Project:** Kinetix (offline-first Android, React Native CLI + TypeScript)

**How to use:** Complete these 10 subtasks in order. Copy each AI prompt into your coding assistant. Preserve existing Task 9 playback service, Zustand store, navigation, and theme contracts; inspect actual APIs before modifying them.

## Subtask-1 — Audit contracts and define player UI state

1. **Goal:** Identify the existing playback commands, event subscriptions, navigation shell, and audio-session identifiers. Define a single state contract for the new UI without duplicating playback engine state.
2. **Files:** `src/core/store/useAudioPlayerStore.ts`; `src/features/audioPlayer/types/playerUi.ts` (new if needed); existing playback service files.
3. **AI prompt:**
   > Inspect the existing Task 9 audio player implementation and app navigation. Extend `useAudioPlayerStore` only where missing with `isFullPlayerOpen`, `playbackSpeed`, `abLoopState`, `sleepTimerRemainingSec`, and `equalizerConfig`. Preserve existing `activeTrack`, `queue`, `playbackState`, `currentPositionMs`, `durationMs`, repeat/shuffle and public actions. Define typed actions for opening/closing the sheet and changing UI state. Keep milliseconds consistent, use selectors to avoid unnecessary renders, and do not create a second source of truth for playback position. Explain any changes to existing contracts.
4. **Acceptance:** Typecheck passes; state has stable defaults; Task 9 tests still pass; null `activeTrack` is handled safely.

## Subtask-2 — Dock the persistent mini-player in the app shell

1. **Goal:** Display a mini-player on every relevant app screen, above bottom navigation/safe-area insets, only when a track is active.
2. **Files:** `src/features/audioPlayer/components/PersistentMiniPlayer.tsx`; existing root navigator/app shell.
3. **AI prompt:**
   > Implement `PersistentMiniPlayer` using the project's React Native Paper theme and existing `useAudioPlayerStore` selectors. Show album art with a graceful placeholder, marquee/scrolling long title with accessibility fallback, Play/Pause, Next, and a thin live progress indicator. Hide completely when `activeTrack === null`. Connect controls to the existing Task 9 playback service, never directly mutate playback state. Mount once in the app shell so it persists across Audio folders and other screens; respect Android gesture navigation, safe-area insets, and bottom tabs. Add stable testIDs and accessible labels.
4. **Acceptance:** Hidden without a track; visible with correct metadata and progress; playback controls work; navigation does not remount the player.

## Subtask-3 — Implement mini-player expansion and full-player layout

1. **Goal:** Swipe up/tap mini-player to expand, swipe down to collapse, without interrupting audio.
2. **Files:** `src/features/audioPlayer/components/FullAudioPlayerSheet.tsx`; `PersistentMiniPlayer.tsx`; root sheet host as needed.
3. **AI prompt:**
   > Build `FullAudioPlayerSheet` with the installed versions of `@gorhom/bottom-sheet`, `react-native-gesture-handler`, and `react-native-reanimated`. Provide a smooth expand/collapse gesture from `PersistentMiniPlayer`; use a shared-element-like album-art transition only if supported reliably by the installed stack, otherwise use a coordinated Reanimated transition. Show artwork, title, artist, play/pause, previous/next, shuffle/repeat, current time, duration, and seekbar. Keep the sheet mounted appropriately and synchronize `isFullPlayerOpen` with its actual presentation state. Respect safe areas, accessibility, Android back, and reduced-motion settings.
4. **Acceptance:** Open by tap/swipe; close by swipe/back; state remains synchronized; audio continues uninterrupted; no gesture conflicts with seeking.

## Subtask-4 — Seekbar, speed selection, and progress UI

1. **Goal:** Make timeline scrubbing and playback speed work against the real playback engine.
2. **Files:** `FullAudioPlayerSheet.tsx`; optional `src/features/audioPlayer/components/AudioSeekbar.tsx`; existing audio playback service.
3. **AI prompt:**
   > Add a responsive scrubbing seekbar with buffered/current progress where supported, duration formatting, and a waveform-style visual only if actual waveform data exists (otherwise use a clear standard timeline, not fabricated audio data). While dragging, show the preview position and avoid competing updates from the playback progress listener; seek once on release. Add playback speed choices covering 0.5x through 2.5x and call the installed TrackPlayer speed API through the existing playback abstraction. Clamp invalid values, account for unknown/zero duration, and expose testIDs.
4. **Acceptance:** Seek accurately; UI doesn't jitter while dragging; speed changes audibly and state matches; unknown duration doesn't crash.

## Subtask-5 — A–B loop controls and enforcement

1. **Goal:** Let users mark A and B and automatically loop playback between them.
2. **Files:** `src/features/audioPlayer/services/AbLoopController.ts` (new); `FullAudioPlayerSheet.tsx`; `useAudioPlayerStore.ts`; existing playback event/progress integration.
3. **AI prompt:**
   > Implement typed A–B loop actions: set A at current position, set B after A, enable/disable, and clear. Validate `0 <= pointAMs < pointBMs <= durationMs` when duration is known. Integrate loop enforcement with the existing playback progress stream: when `currentPositionMs >= pointBMs` and the loop is active, seek to `pointAMs`. Guard against repeated concurrent seeks and avoid conflicting with manual scrubbing, track changes, and repeat modes. Use one centralized controller, not timers in React render code. Add concise UI buttons and status indicators.
4. **Acceptance:** Jest test proves crossing B seeks to A; invalid points are rejected; changing tracks clears/handles the loop predictably; no seek storm.

## Subtask-6 — Sleep timer (15/30/60 minutes and end of track)

1. **Goal:** Pause playback when a selected timer expires or the current track ends.
2. **Files:** `src/features/audioPlayer/services/AudioSleepTimer.ts` (new); `FullAudioPlayerSheet.tsx`; `useAudioPlayerStore.ts`; existing background playback service integration.
3. **AI prompt:**
   > Add sleep timer choices 15m, 30m, 60m, End of Track, and Off. Implement timer scheduling in a playback-service-compatible module rather than relying on a mounted sheet. Store a deadline timestamp for elapsed-time correctness, expose remaining seconds to the UI, cancel/replace timers safely, and call the existing pause command at expiry. For End of Track, react to the playback engine's track-ended/transition event and pause before unintended next-track playback where feasible. Document Android background process limitations and choose a robust implementation supported by the installed stack; do not claim JS timers are guaranteed after process death.
4. **Acceptance:** Jest fake timers advanced 15 minutes result in pause; cancel prevents pause; End of Track behavior is tested; background manual test performed.

## Subtask-7 — Bookmarks and reorderable queue

1. **Goal:** Pin positions in tracks and reorder the upcoming queue from the full player.
2. **Files:** `FullAudioPlayerSheet.tsx`; `src/features/audioPlayer/components/AudioQueueList.tsx` (new); `src/features/audioPlayer/services/AudioBookmarkRepository.ts` (new if no existing repository); existing queue service.
3. **AI prompt:**
   > Add a bookmark/pin action that saves the active file ID and current `positionMs` using the project's established SQLite/MMKV persistence conventions; provide a way to list and jump to saved bookmarks. Build an accessible reorderable queue using a drag-and-drop implementation compatible with the installed React Native/Reanimated versions; if unavailable, offer Move Up/Down controls as a working fallback. Apply reorder changes to the actual playback engine queue and reconcile `useAudioPlayerStore` afterward, preserving the currently playing track and stable IDs. Handle empty queue and deleted files gracefully.
4. **Acceptance:** Bookmarks survive app restart; tapping a bookmark seeks correctly; reorder changes the real next-track order; active track remains correct.

## Subtask-8 — Android native equalizer bridge

1. **Goal:** Expose Android `Equalizer`, `BassBoost`, and `Virtualizer` for the current audio session.
2. **Files:** `android/app/src/main/java/<existing-package-path>/AudioEqModule.kt`; matching native package/registration and New Architecture spec files as required by this repo; `src/features/audioPlayer/services/AudioEqualizerService.ts` (new).
3. **AI prompt:**
   > Inspect the app's actual Android package, React Native version, New Architecture/codegen setup, and Task 9 audio engine. Implement a native `AudioEqModule` bridge using Android `android.media.audiofx.Equalizer`, `BassBoost`, and `Virtualizer` tied to the real playback audio session ID. Implement setup/rebind, enable/disable, band count/frequency/range query, set band gain, bass boost, virtualizer strength, and resource release. Follow this repo's TurboModule codegen/registration pattern rather than assuming one. Handle session ID unavailable, unsupported effects, Android API differences, and VLC fallback audio sessions honestly: report unsupported state instead of silently applying effects to the wrong session. Release effects on session change/shutdown; surface native errors to JS safely.
4. **Acceptance:** Android debug build succeeds; module reports capability accurately; no crashes or leaked effects on track/session change; real-device audio changes verified.

## Subtask-9 — Equalizer sheet, presets, and settings persistence

1. **Goal:** Give users a working 5-band EQ UI, bass boost, virtualizer, and genre presets.
2. **Files:** `src/features/audioPlayer/components/AudioEqualizerSheet.tsx`; `AudioEqualizerService.ts`; `useAudioPlayerStore.ts`; existing MMKV settings adapter.
3. **AI prompt:**
   > Build `AudioEqualizerSheet` using React Native Paper and the app theme. Show enable switch, 5 labeled frequency sliders, bass boost, virtualizer, and genre presets. Query actual band counts/frequencies/ranges from Android; if the device exposes more/fewer than five bands, create an explicit mapping or explain and display supported bands—never assume Android always provides exactly five. Apply adjustments live through `AudioEqualizerService` with bounded values and debounce as needed; reflect native failures and unsupported sessions in disabled controls with clear text. Persist the user's EQ config/preset in the existing MMKV settings infrastructure and restore safely on playback session changes.
4. **Acceptance:** Preset selection updates sliders and native effect; settings survive restart; disabled/unsupported states are honest; audible effect is verified with headphones.

## Subtask-10 — Integration tests, Maestro flow, and device performance

1. **Goal:** Verify the entire Task 10 experience and catch regressions in Task 9.
2. **Files:** `src/features/audioPlayer/__tests__/PersistentMiniPlayer.test.tsx`; `src/features/audioPlayer/__tests__/AbLoopController.test.ts`; `src/features/audioPlayer/__tests__/AudioSleepTimer.test.ts`; `e2e/audio-player.yaml` (or existing Maestro convention); relevant integration tests.
3. **AI prompt:**
   > Add React Native Testing Library tests proving the mini-player is absent when `activeTrack` is null and appears after a track starts, and that its controls invoke the playback service. Add unit tests for A–B looping (position reaches B => seek to A, and no repeated seeks) and sleep timer (Jest fake timers + 15 minutes => pause; cancellation and End of Track). Add Maestro flow: Dashboard Audio -> folder -> song -> mini-player visible -> swipe up -> full player -> speed selector -> equalizer sheet. Mock native modules in unit tests but do not claim native EQ is validated by mocks. Run available typecheck/lint/tests/build scripts and report exact commands and results; do not invent passing outcomes.
4. **Acceptance:** Automated tests pass; Maestro scenario runs on Android; manual checklist below is completed on a physical device.

## Final manual checklist

- [ ] Audio continues while navigating between app screens; mini-player appears only with an active track.
- [ ] Album art/title/progress and Play/Pause/Next are correct.
- [ ] Swipe up/down is smooth on a real 60/120 Hz device, without dropped gestures or playback interruption.
- [ ] Seekbar scrubs correctly; 0.5x and 2.5x playback speeds work.
- [ ] A–B loop repeatedly seeks from B back to A; disable/track change behaves correctly.
- [ ] Sleep timer works for 15/30/60 minutes and End of Track, including when sheet is closed.
- [ ] Bookmarks persist and queue reorder affects actual playback order.
- [ ] With headphones, EQ sliders, bass boost, and virtualizer produce audible changes without crackling when supported.
- [ ] EQ unavailable/session-incompatible cases show a truthful disabled state rather than fake success.
- [ ] Android back, safe areas, dark/AMOLED themes, screen reader labels, and background playback remain functional.

**Scope note:** Task 10 builds on Task 9's engine. Avoid replacing it, and validate native Android audio effects against the actual audio-session support exposed by the selected playback engine.
