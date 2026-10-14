# Task 12 — Advanced Video Gestures & Multi-Track Controls (MX/VLC Parity)

## Goal

Extend the Task 11 VLC video player with gesture-based brightness, volume, scrubbing, quick seeking, temporary speed boost, aspect-ratio controls, multi-audio and subtitle selection, subtitle synchronization, screen-touch lock, Picture-in-Picture (PiP), background audio, and A–B looping.

Complete these **10 subtasks sequentially**. Inspect the repository before editing and reuse the existing player, store, settings, navigation, and resume-record contracts. Do not duplicate state that already exists.

## Important implementation rules

- Verify the installed versions and actual APIs of `react-native-gesture-handler`, Reanimated, and `react-native-vlc-media-player` before implementing controls.
- Use real native/player capabilities. If a requested capability is not exposed by the installed package, report the limitation and implement only a verified supported alternative—never fake success.
- Keep gesture math in pure, unit-testable helpers; keep gesture callbacks lightweight.
- Clamp all values to safe bounds and clean up timers/listeners when gestures end or the screen unmounts.
- Reuse existing settings and `ResumeRecord` definitions. If audio-track/subtitle-track fields do not exist, inspect the schema and add only the minimal backward-compatible fields required.
- Do not claim PiP, software volume boost above 100%, subtitle formats, or background audio works until tested on an Android device.

---

## Subtask 12.1 — Inspect Task 11 Player and Native Capabilities

**Purpose:** Map the current player and verify the APIs before implementing gestures.

**AI coding prompt (copy and paste):**

> Inspect the current `UniversalVideoPlayerScreen`, `useVideoPlayerStore`, Android VLC setup, settings store, resume-record type/repository, navigation, and existing gesture-handler/Reanimated versions. Check the installed `react-native-vlc-media-player` API for seeking, playback rate, volume, aspect ratio, audio-track discovery/selection, subtitle loading and delay, A–B loop support, and native PiP/background playback integration. Check how Android brightness and orientation are handled in this project. Do not implement anything yet. Return a concise capability matrix with exact existing APIs, missing capabilities, file paths, and a minimal plan for Task 12.

**Acceptance criteria**
- Existing store, player callback, settings, and resume contracts are identified.
- Each requested native capability is marked verified, unsupported, or requiring a native implementation.
- No code is changed in this subtask.

**Verification**
- Cross-check findings against the installed package source/types and Android project configuration.

---

## Subtask 12.2 — Implement Testable Gesture Math Utilities

**Suggested new file:** `src/features/videoPlayer/utils/videoGestureMath.ts`  
**Primary integration file:** `src/features/videoPlayer/components/VideoGestureOverlay.tsx`

**AI coding prompt:**

> Create pure, strongly typed helpers for Task 12 gesture calculations. Include clamping for brightness (`0–100`), volume (`0–200` as the requested UI/software-boost range), horizontal gesture-to-seek delta, safe target-time clamping to `[0, durationMs]`, and formatting a signed seek delta such as `+00:15` or `-00:10`. Define and document the gesture sensitivity inputs so calculations are deterministic. Do not access React Native APIs or player state inside the pure helpers. Use the project's existing naming and test conventions.

**Acceptance criteria**
- Helpers are deterministic and have no native side effects.
- Brightness and volume outputs are clamped to their requested bounds.
- Seeking cannot go below zero or beyond known duration.
- Unknown duration is handled safely.

**Verification**
- Jest tests cover minimum/maximum values, negative and oversized deltas, zero duration, positive/negative timestamp formatting, and normal values.

---

## Subtask 12.3 — Build Brightness and Volume Vertical Gestures

**Primary file:** `src/features/videoPlayer/components/VideoGestureOverlay.tsx`

**AI coding prompt:**

> Implement the vertical-swipe controls using the project's installed `react-native-gesture-handler` and Reanimated APIs. A swipe on the left side of the video adjusts brightness from `0%` to `100%` and shows an animated Sun HUD slider. A swipe on the right adjusts volume from `0%` to the configured maximum, up to `200%` software boost through LibVLC where the installed player genuinely supports it, and shows an animated Speaker HUD slider. Avoid conflicts with horizontal scrubbing and pinch gestures. Reuse existing brightness/volume settings or helpers where available. If volume above 100% requires a native VLC capability not available through the installed package, keep the UI honest and document the limitation instead of displaying a false value.

**Acceptance criteria**
- Left/right screen zones trigger the correct control.
- HUD value stays clamped and disappears after gesture completion.
- Gesture conflicts do not accidentally seek during a vertical swipe.
- Actual native values remain synchronized with the displayed values.

**Verification**
- Unit-test gesture-to-value calculations.
- Component/integration-test HUD visibility and callback invocation.
- On a real device, test brightness at 0%, 50%, 100% and volume at 0%, 100%, and 200% only if supported.

---

## Subtask 12.4 — Add Horizontal Fine Scrubbing and Double-Tap Skip

**Primary file:** `src/features/videoPlayer/components/VideoGestureOverlay.tsx`

**AI coding prompt:**

> Add horizontal gesture scrubbing with a live signed time delta overlay, such as `+00:15`, and double-tap seeking: left zone skips backward 10 seconds, right zone skips forward 10 seconds. Use the existing video store and the actual VLC seek API. Clamp targets between zero and the known duration. Ensure double-tap recognition takes precedence over a single tap, and that horizontal scrubbing does not conflict with vertical controls or two-finger pinch. Use a Material-style ripple/feedback overlay for skip actions, consistent with the app's UI conventions.

**Acceptance criteria**
- Horizontal drag previews the target/delta and commits a seek using the real player API.
- Double-tapping left/right seeks by `-10s` / `+10s`.
- Seek targets are clamped to valid bounds.
- Gesture recognition does not fire multiple unintended seeks.

**Verification**
- Jest-test seek target math at the start, middle, and end of a video.
- Component-test left/right double taps and scrub feedback.
- Test on a real device in landscape and portrait.

---

## Subtask 12.5 — Add Temporary 2x Speed and Aspect-Ratio Pinch/Controls

**Primary files**
- `src/features/videoPlayer/components/VideoGestureOverlay.tsx`
- `src/features/videoPlayer/components/VideoHudControls.tsx`

**AI coding prompt:**

> Add a long-press anywhere on the video that temporarily sets playback speed to `2.0x` while pressed and restores the previous speed on release, cancellation, navigation, or unmount. Use the actual VLC playback-rate API verified in Subtask 12.1; if unavailable, document the limitation and do not simulate speed changes. Add two-finger pinch/aspect-ratio control and explicit options `Fit`, `Fill`, `Crop`, `16:9`, and `Stretch` using the real player API or a verified view-transform implementation. Make sure pinch recognition does not break horizontal paging/scrubbing or other gestures. Restore the previous playback rate on all exit paths.

**Acceptance criteria**
- Long-press applies 2x only while active and always restores the previous rate.
- All five aspect options are selectable and their behavior matches their labels.
- Gesture cancellation and unmount cannot leave playback stuck at 2x.
- Unsupported native behavior is clearly documented.

**Verification**
- Test rate set/restore logic, including cancellation and unmount.
- Unit-test aspect-mode mapping.
- Manually test long-press and pinch/aspect options on a real Android device.

---

## Subtask 12.6 — Build Video HUD and Screen Touch Lock

**Primary file:** `src/features/videoPlayer/components/VideoHudControls.tsx`

**AI coding prompt:**

> Build or extend `VideoHudControls` to expose the video player's supported controls and entry points for track/subtitle options, aspect ratio, PiP, background audio, A–B loop, and screen-touch lock. Implement `isScreenLocked` using the existing video store if available. When locked, disable all HUD buttons and gesture responders except a floating `Unlock` control; the Unlock control must remain accessible. Keep lock state behavior explicit when the screen loses focus or the player changes files. Use the project's existing theme, icons, accessibility labels, and component conventions.

**Acceptance criteria**
- Locking disables HUD actions and all video gesture responders.
- A floating Unlock control remains available and accessible.
- Unlock restores all controls.
- Lock/unlock does not pause playback unless that is already the documented app behavior.

**Verification**
- RNTL-test locked state: all HUD controls and gesture responders disabled except Unlock.
- Test toggling lock and verifying the player remains mounted and state remains consistent.

---

## Subtask 12.7 — Implement Multi-Audio and Subtitle Selection

**Primary file:** `src/features/videoPlayer/components/TrackAndSubtitleSheet.tsx`

**AI coding prompt:**

> Build `TrackAndSubtitleSheet` for listing and selecting the audio tracks actually reported by the VLC player (for example Hindi, English, Japanese) and available subtitle tracks. Support loading external `.srt`, `.ass`, and `.vtt` subtitle files using the project's existing file-picker/storage access flow and only the installed VLC APIs that are verified to support those formats. Handle empty track lists, failed subtitle loads, and unsupported formats with clear UI feedback. Preserve the selected audio-track ID and subtitle-track ID in the current file's existing `ResumeRecord` in MMKV, adding minimal backward-compatible fields only if necessary. Do not assume track IDs remain valid for a different file.

**Acceptance criteria**
- Available audio/subtitle tracks come from actual player metadata.
- Selecting a track invokes the real VLC API and updates the selected state.
- External subtitle loading handles permission/cancel/error cases.
- Selected track IDs are persisted per file and restored only when valid for that file.

**Verification**
- RNTL-test track list, selection, no tracks, and load failure.
- Test selected IDs are written to the resume record and read back for the same file.
- On a real device, test a dual-audio MKV and external `.srt`, `.ass`, and `.vtt` files where supported.

---

## Subtask 12.8 — Add Subtitle Sync Delay

**Primary file:** `src/features/videoPlayer/components/TrackAndSubtitleSheet.tsx`

**AI coding prompt:**

> Add subtitle synchronization controls to `TrackAndSubtitleSheet`, allowing delay adjustments in both directions in milliseconds. Include a clear current offset display and reset-to-zero action. Use the installed VLC player's real subtitle-delay API and follow its verified sign convention; do not assume positive means later until confirmed. Persist the selected delay with the current file's resume settings only if the existing ResumeRecord/settings design supports per-file playback preferences; otherwise use the most appropriate existing settings location and explain the choice. Reset or load the correct delay when changing files.

**Acceptance criteria**
- Delay can be adjusted positively and negatively and reset to zero.
- The displayed value and native player offset remain synchronized.
- Delay state cannot leak from one file to another.
- Unsupported delay APIs are reported rather than faked.

**Verification**
- Unit-test delay increment/decrement and reset logic.
- Component-test displayed offset.
- Manually adjust by `+500ms` and a negative offset while watching a dual-audio/subtitled video.

---

## Subtask 12.9 — Add A–B Loop, Picture-in-Picture, and Background Audio

**Primary files**
- `src/features/videoPlayer/components/VideoHudControls.tsx`
- `src/features/videoPlayer/components/TrackAndSubtitleSheet.tsx` (only if needed for existing control organization)
- Existing video store and Android native configuration, if required

**AI coding prompt:**

> Implement three independent controls using real player/platform APIs:
>
> 1. **A–B Loop:** Let the user set point A and point B from the current playback position. Validate that B is after A. While enabled, when playback reaches B, seek back to A. Provide a clear disable/reset action and stop any polling/listeners when disabled or when the active file changes.
> 2. **Picture-in-Picture:** Add a PiP action and integrate Android PiP support using the project's existing native setup or a compatible native module. Handle supported Android versions, activity lifecycle, aspect ratio, and return-to-app behavior.
> 3. **Background Audio Play:** Allow video audio to continue when the app is backgrounded only if the player and Android configuration support a stable, legitimate audio-only/background mode. Avoid claiming video continues visibly in the background. Restore expected playback/UI state when returning to the app.
>
> Check package APIs and Android requirements first. If any feature requires native implementation beyond the current package, make the smallest necessary changes and document device/API limitations. Do not represent a UI toggle alone as a working feature.

**Acceptance criteria**
- A–B loop seeks to A when current position reaches B and can be disabled.
- Invalid A/B ranges are rejected.
- PiP actually enters Android PiP on supported devices and can return to the app.
- Background audio behavior is clearly distinguished from background video and works only where implemented.
- All listeners/timers are cleaned up.

**Verification**
- Jest-test A/B validation, trigger at point B, and disabled behavior.
- Test PiP/background-mode state transitions with mocked native boundaries.
- On a physical Android device, press Home during playback and verify PiP; test background audio separately.

---

## Subtask 12.10 — Regression Tests and Real-Device Validation

**Primary files**
- `src/features/videoPlayer/components/VideoGestureOverlay.tsx`
- `src/features/videoPlayer/components/VideoHudControls.tsx`
- `src/features/videoPlayer/components/TrackAndSubtitleSheet.tsx`
- Test files following existing repository conventions

**AI coding prompt:**

> Finish Task 12 validation. Add or update Jest tests for gesture math, seek clamping, screen-touch lock, A–B loop behavior, and per-file audio/subtitle track persistence. Run the relevant Jest/RNTL tests, TypeScript check, lint, and Android debug build. Update Maestro only if the current E2E setup supports the required navigation and selectors. Report exact commands and results, separating mocked test results from capabilities verified on a real device. Do not claim 60/120 FPS, codec coverage, PiP, subtitle formats, or 200% volume boost without real-device evidence.

**Automated acceptance criteria**
- Gesture math tests verify brightness `0–100`, volume `0–200`, and horizontal seek-delta conversion.
- Screen Lock tests confirm every HUD action and gesture responder is disabled except Unlock.
- Track/subtitle selection persists IDs in the current file's `ResumeRecord`.
- A–B loop seeks to A when current position reaches B.
- TypeScript, lint, relevant tests, and Android build pass—or failures are documented precisely.

**Manual real-device checklist**
- In landscape, test left-side brightness, right-side volume, horizontal scrubbing, double-tap `-10s/+10s`, long-press `2.0x`, and pinch/aspect controls.
- Test a dual-audio `.mkv` and switch between available audio tracks.
- Load internal subtitles and external `.srt`, `.ass`, `.vtt` files where supported.
- Adjust subtitle delay by `+500ms` and verify synchronization audibly/visually.
- Lock the screen controls and verify only the floating Unlock action remains usable.
- Press Android Home and verify PiP; test background audio behavior independently.
- Confirm no stuck speed, stale track IDs, active loop timers, or gesture listeners remain after leaving the player.

## Task 12 completion definition

Task 12 is complete when the supported gestures and controls are integrated with the Task 11 player, per-file track preferences persist correctly, A–B loop works, screen lock behaves correctly, and PiP/background audio are implemented only to the extent verified by the Android package and native setup. Record unsupported native limitations explicitly rather than shipping misleading controls.
