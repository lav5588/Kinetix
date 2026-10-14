# Task 17 — Complete Settings Screen & Preference Bindings

## Goal

Build a comprehensive Material 3 `SettingsScreen` for Kinetix with five sections:

1. Appearance & Themes
2. Resume & History Behavior
3. Video Player Preferences
4. Audio Player Preferences
5. Scanner & Privacy Filters

Every setting must be connected to the existing Zustand/MMKV settings architecture and actually affect the relevant screen, player, or scanner. Do not build a settings UI that only changes local component state.

## Required paths from `Tasks.md`

- `src/features/settings/SettingsScreen.tsx`
- `src/features/settings/components/ThemePalettePicker.tsx`
- `src/features/settings/components/ExcludedFoldersModal.tsx`

Reuse existing theme/store/repository infrastructure, including `useThemeAndSettingsStore`, `mmkv-user-settings`, `mmkv-resume-store`, and `useResumeHistoryStore` where they already exist.

---

## Subtask 1 — Audit settings, stores, and consumers

### Copy-paste AI coding prompt

> Inspect the existing Kinetix repository before implementing settings. Review `SettingsScreen` if it exists, `useThemeAndSettingsStore`, MMKV instances, `useResumeHistoryStore`, the video/audio/PDF player configuration, file scanner filters, navigation, theme tokens, and existing settings types. Map each requested preference to its current consumer and storage key. Identify which preferences already exist, which are missing, and which consumers need wiring. Reuse existing stores and MMKV instances; do not create a parallel settings store or duplicate keys. Preserve existing naming conventions and write a short implementation plan before making changes.

### Acceptance criteria

- All requested settings have a documented state/storage/consumer mapping.
- Existing preferences and stores are reused.
- Missing keys are added in a consistent, typed way.
- No duplicate MMKV instances or settings stores are introduced.

### Tests / verification

- Run `tsc --noEmit` before and after changes to identify new type issues.
- Confirm each requested setting maps to a real consumer rather than UI-only state.

---

## Subtask 2 — Define typed preferences and synchronous persistence

### Copy-paste AI coding prompt

> Extend the existing `useThemeAndSettingsStore` and `mmkv-user-settings` integration to represent every Task 17 preference with strict TypeScript types and sensible defaults. Cover theme mode, AMOLED toggle, accent palette, default list/grid view, Continue carousel visibility, video resume behavior (`Auto`/`Ask`/`Never`), minimum audio resume duration, PDF auto-resume, decoder preference (`HW+`/`SW`), double-tap seek interval (`5s`/`10s`/`15s`/`30s`), maximum volume boost (`100%`/`150%`/`200%`), video gesture toggles, Auto-PiP, background audio, subtitle style, gapless audio, headset auto-play, audio focus behavior, short-audio filtering, messenger-folder hiding, hidden dotfiles, and excluded folders. Hydrate synchronously from the existing MMKV instance, validate persisted values, and ensure each setter updates Zustand and MMKV consistently. Do not persist transient UI state such as an open dialog.

### Acceptance criteria

- All preferences have typed values and defaults.
- Hydration is synchronous if the existing MMKV architecture supports it.
- Every setting setter updates state and `mmkv-user-settings`.
- Invalid persisted values fall back safely.

### Tests / verification

- Unit-test defaults, hydration, invalid values, and each setter's MMKV write.
- Test the specified enum options reject unsupported values.

---

## Subtask 3 — Build Settings screen layout and Appearance section

### Copy-paste AI coding prompt

> Create or extend `src/features/settings/SettingsScreen.tsx` using the app's React Native Paper/Material 3 theme and existing navigation conventions. Organize the screen into five clear sections with accessible controls. Implement Appearance & Themes: System/Light/Dark mode, AMOLED Pure Black toggle, accent palette picker, default List/Grid view, and show/hide Continue Watching carousel. Create `src/features/settings/components/ThemePalettePicker.tsx` to render all six existing palettes (Dynamic Android 12+ Wallpaper, Royal Indigo, VLC Sunset Orange, Emerald Forest, Crimson Cinema, Cyber Cyan) using existing theme tokens. Keep selection state in the existing store and show selected state accessibly. Do not hard-code a separate palette definition if the project already has canonical tokens.

### Acceptance criteria

- Screen uses the existing theme and Material 3 conventions.
- All six palettes are selectable.
- Theme mode, AMOLED, view mode, and carousel visibility persist.
- Dashboard/list view responds to the selected preferences without an app restart where architecture allows.

### Tests / verification

- RNTL tests for palette selection and appearance setting updates.
- Test selecting Dark + AMOLED + Sunset Orange updates the store and MMKV.
- Test default view and Continue carousel preference bindings.

---

## Subtask 4 — Implement Resume & History Behavior section

### Copy-paste AI coding prompt

> Add Resume & History Behavior settings to `SettingsScreen`: Video resume behavior (`Auto`, `Ask`, `Never`), minimum audio resume duration slider, PDF auto-resume toggle, and a **Clear All Watch/Read History** action. Wire these preferences to the actual video player, audio resume logic, and PDF reader through existing services/stores. The clear-history action must display a confirmation dialog and do nothing if cancelled. After confirmation, clear only the intended watch/read progress from `mmkv-resume-store` using existing repository APIs, and update `useResumeHistoryStore.recentItems` to `[]` so the UI refreshes immediately. Do not accidentally clear unrelated user settings, playlists, bookmarks, or private-vault records.

### Acceptance criteria

- Video Auto/Ask/Never is persisted and used by the video resume flow.
- Audio minimum duration and PDF auto-resume affect their respective consumers.
- Clear history requires confirmation.
- Confirmed clear removes resume history and updates the visible recent-items store.
- Cancelled clear performs no destructive action.

### Tests / verification

- RNTL tests for each setting and confirmation/cancel behavior.
- Test confirmed clearing wipes intended resume state and sets `useResumeHistoryStore.recentItems` to `[]`.
- Verify unrelated settings, playlists, bookmarks, and vault data remain untouched.

---

## Subtask 5 — Implement Video Player Preferences section

### Copy-paste AI coding prompt

> Add Video Player Preferences to `SettingsScreen`. Include default decoder (`HW+`/`SW`), double-tap seek duration (`5s`, `10s`, `15s`, `30s`), maximum volume boost (`100%`, `150%`, `200%`), video gesture toggles, Auto-PiP, Background Audio, and subtitle style. Use typed controls and existing store setters. Wire each preference to the existing video player configuration and gesture/HUD components; settings must affect actual playback behavior, not just the displayed selection. If a feature is unsupported on a particular Android/API/library version, disable or explain that option clearly instead of pretending it works. Do not force volume or decoder behavior beyond the underlying player API's supported capabilities.

### Acceptance criteria

- All specified options are displayed and persisted.
- Decoder, seek duration, and volume boost map to player-supported configuration.
- Gesture, Auto-PiP, background audio, and subtitle style preferences are consumed by their relevant components.
- Unsupported options are handled honestly and safely.

### Tests / verification

- Store tests for enum and numeric options.
- Component/integration tests verify changing a setting updates the relevant player configuration.
- Manual test double-tap seek durations and available decoder/volume options on a real device.

---

## Subtask 6 — Implement Audio Player Preferences section

### Copy-paste AI coding prompt

> Add Audio Player Preferences for Gapless Playback, Auto-play on Headset Connect, and Audio Focus Behavior. Bind controls to the existing settings store and actual `TrackPlayer`/audio service event handlers. Verify the installed playback library's supported APIs and Android behavior before wiring. For headset auto-play, account for connection events and user preference; do not start playback if the preference is disabled. For audio focus, use the existing service's pause/duck/resume logic and avoid duplicate listeners. If a requested behavior cannot be supported by the installed library, document the limitation and expose a safe fallback rather than a no-op setting.

### Acceptance criteria

- All three settings persist and affect playback behavior.
- Headset connection handling respects the toggle.
- Audio focus behavior is consistent with the selected preference.
- No duplicate event listeners or repeated playback initialization are introduced.

### Tests / verification

- Unit tests for store setters and audio service preference mapping.
- Mock audio/headset events to verify disabled auto-play does not start playback.
- Manually test gapless playback, headset connection, and audio interruptions where supported.

---

## Subtask 7 — Implement Scanner & Privacy Filters

### Copy-paste AI coding prompt

> Add Scanner & Privacy Filters settings: Ignore audio shorter than 30 seconds, Hide WhatsApp/Telegram clutter by default, Show hidden dotfiles, and Excluded Folders manager. Connect each setting to the actual scanner/indexer and category list filtering. Build `src/features/settings/components/ExcludedFoldersModal.tsx` to list and manage excluded directories using existing file picker/permission utilities and persisted settings. Validate folder paths, prevent duplicate entries, and provide add/remove/cancel behavior. Changing a scanner preference should affect the next scan or trigger a controlled rescan if appropriate; do not claim already-indexed results changed until the index/filter is updated. Respect Android storage permissions and do not attempt to bypass scoped-storage restrictions.

### Acceptance criteria

- All scanner/privacy toggles persist and are consumed by scanner/filter logic.
- Short-audio threshold uses the requested 30-second setting.
- Messenger clutter visibility and hidden-dotfile visibility behave as labeled.
- Excluded folders can be added and removed without duplicates.
- Permission failures are handled gracefully.

### Tests / verification

- Unit tests for the `<30s` filter, messenger-folder filtering, hidden-dotfile behavior, and excluded path matching.
- RNTL tests for adding/removing excluded folders and cancelling changes.
- Manual test a rescan after changing filters and verify visible/indexed results match the selected settings.

---

## Subtask 8 — Wire all settings to live app behavior

### Copy-paste AI coding prompt

> Perform an end-to-end settings binding pass. Search the codebase for each preference and connect it to the real consumer: theme provider/dashboard, list/grid browser, Continue Watching carousel, resume logic, video player/HUD, audio service, PDF reader, and scanner. Prefer reading settings from the existing store at the point of use or passing typed configuration through existing component/service boundaries. Avoid duplicating settings in component-local state or caching stale values indefinitely. Where a setting affects an ongoing playback session, apply it immediately if supported; otherwise clearly define whether it applies to the next session. Add a mapping comment or lightweight documentation so future settings can be traced from UI to storage to consumer.

### Acceptance criteria

- Every visible setting has an observable effect on its intended feature.
- UI and persisted state remain synchronized.
- Live changes apply immediately where supported; otherwise the next-session behavior is clear.
- No setting is merely decorative or silently ignored.

### Tests / verification

- Integration tests for representative settings across theme, resume, video, audio, PDF, and scanner.
- Search for each setting key and verify it is read by the intended consumer.
- Manually change preferences and verify behavior without restarting the app when expected.

---

## Subtask 9 — Add accessibility, defaults, and destructive-action safeguards

### Copy-paste AI coding prompt

> Review `SettingsScreen`, `ThemePalettePicker`, and `ExcludedFoldersModal` for accessibility, lifecycle, and edge cases. Add accessible labels/values for switches, sliders, radio/select controls, palette swatches, and dialogs. Ensure each preference has a clear label and concise description for settings with side effects. Prevent accidental history deletion with confirmation. Handle invalid persisted values, missing permissions, unavailable features, empty excluded-folder lists, repeated taps, and Android Back behavior. Keep controls consistent with the app's theme and support Light, Dark, and AMOLED backgrounds.

### Acceptance criteria

- Controls have useful accessible labels and current values.
- Destructive history clearing cannot happen without confirmation.
- Invalid stored values and permission failures do not crash the screen.
- Empty/modal states are usable and theme-correct.

### Tests / verification

- RNTL tests for key accessibility labels, defaults, modal dismissal, and confirmation safeguards.
- Test malformed persisted settings.
- Manually inspect settings in Light, Dark, and AMOLED themes.

---

## Subtask 10 — Automated regression and real-device verification

### Copy-paste AI coding prompt

> Complete Task 17 by running TypeScript, lint, Jest, and Android build checks. Add component/integration tests that render `SettingsScreen`, toggle each setting, and assert `useThemeAndSettingsStore` and `mmkv-user-settings` update synchronously. Test Clear All Watch/Read Progress: after confirmation, `mmkv-resume-store` is cleared for the intended progress records and `useResumeHistoryStore.recentItems` becomes `[]`; cancellation must preserve all records. Add a Maestro E2E path: Settings -> switch to Dark + AMOLED + Sunset Orange -> return to Dashboard -> verify the theme updates without restart. On a real Android device, verify each setting changes behavior in the Video Player, Audio Player, PDF Reader, and File Scanner. Report any unsupported native behavior or pre-existing build/test failures clearly.

### Acceptance criteria

- Store, component, and integration tests pass.
- Clear-history action works safely and updates the UI.
- Maestro theme E2E test passes.
- All settings are manually verified against their real consumers.
- TypeScript/lint/build checks pass or pre-existing failures are documented.

### Tests / verification checklist

- [ ] Every setting toggle/option updates Zustand and MMKV.
- [ ] Dark + AMOLED + Sunset Orange persists and applies to Dashboard without restart.
- [ ] Clear-history cancellation preserves progress.
- [ ] Clear-history confirmation clears intended progress and recent items.
- [ ] Video decoder/seek/volume/gesture/PiP/background/subtitle preferences verified.
- [ ] Audio gapless/headset/audio-focus preferences verified.
- [ ] PDF auto-resume preference verified.
- [ ] Scanner short-audio, messenger-folder, hidden-dotfile, and excluded-folder filters verified.
- [ ] Settings screen checked in Light, Dark, and AMOLED modes.
