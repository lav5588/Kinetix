# Task 4: Android Storage Permissions Gatekeeper (Android 10–15) — AI Subtask Prompts

## Goal

Implement a reliable Android storage-permission flow for **Kinetix**, a React Native CLI (Bare Workflow) application. Split this task into small, sequential subtasks so an AI coding assistant can complete **one subtask per response**.

## Important Project Rules

- Follow the existing project structure and configuration. Inspect existing files before changing them.
- Do not reinitialize the React Native project or replace unrelated configuration.
- Keep TypeScript strict and follow the project's ESLint/Prettier rules.
- Keep permission logic in `src/core/permissions/`; keep onboarding UI in `src/features/onboarding/`.
- Request only permissions needed for the feature and Android version. Do not assume one permission grants access to every file type.
- Handle denied, blocked/permanently denied, granted, and limited/restricted states explicitly where the platform/library exposes them.
- `MANAGE_EXTERNAL_STORAGE` is a special all-files-access setting on Android 11+; it is not a normal runtime permission dialog. The user must enable it in Android Settings.
- Do not claim that `MANAGE_EXTERNAL_STORAGE` is guaranteed to be accepted by Google Play. Distribution policy and eligibility must be reviewed separately before release.
- Do not implement the media scanner in this task. That belongs to Task 5.
- Do not implement the Dashboard in this task. The permission flow should report readiness or invoke a clearly defined callback/navigation handoff only.
- After each subtask, run the relevant checks and report changed files, commands executed, results, and any unresolved issue. Do not start the next subtask unless asked.

---

## Subtask 1: Add Permission Dependency and Android Manifest Declarations

### 1. What to Do (Goal)

Add and configure `react-native-permissions` for Android storage/media permissions. Update the manifest declarations required by the project requirements while respecting Android API differences:

- Android 10–12: legacy `READ_EXTERNAL_STORAGE` where applicable.
- Android 13+: granular `READ_MEDIA_AUDIO`, `READ_MEDIA_VIDEO`, and `READ_MEDIA_IMAGES`.
- Android 11+: declare `MANAGE_EXTERNAL_STORAGE` for the optional All Files Access flow needed to discover PDFs and other documents across folders.
- Do not request obsolete or unrelated write permissions unless a verified feature requirement needs them.
- Keep declarations and runtime behavior aligned with the app's actual `minSdkVersion` and target SDK.

### 2. Where to Do (Exact File Paths)

- `package.json`
- `android/app/src/main/AndroidManifest.xml`
- `src/core/permissions/index.ts` (create if missing)

### 3. AI Prompt Instructions (Copy-Paste to AI)

> Act as a Senior React Native Android engineer. We are implementing Task 4 for Kinetix, a React Native CLI app. Complete only Subtask 1: add `react-native-permissions` using the package manager already used by this repository, and update `android/app/src/main/AndroidManifest.xml` with the Android storage/media permission declarations needed for Android 10–15: `READ_EXTERNAL_STORAGE` for applicable older API levels, `READ_MEDIA_AUDIO`, `READ_MEDIA_VIDEO`, `READ_MEDIA_IMAGES` for Android 13+, and `MANAGE_EXTERNAL_STORAGE` for the Android 11+ all-files-access flow. Use appropriate `maxSdkVersion` or API guards where applicable and preserve all existing manifest content. Do not implement runtime permission logic or UI yet. Inspect the existing Gradle/target SDK configuration before editing. Output the files changed and explain any compatibility assumptions. Do not claim Google Play approval for all-files access.

### 4. Verification / Acceptance Criteria

- Automated: Confirm the dependency is present and run `npm run typecheck` and `npm run lint` if configured.
- Build: Run `cd android && ./gradlew assembleDebug` if the local Android toolchain is available.
- Manual: Inspect the merged manifest or Android Studio's Merged Manifest view to confirm declarations are present without duplicates or malformed XML.

---

## Subtask 2: Define Permission Types and Android-Version Policy

### 1. What to Do (Goal)

Create a typed, testable permission policy that determines which media permissions are relevant for the current Android API level. Keep this logic independent of UI and native settings navigation.

Include:
- A typed permission status/result model for granted, denied, blocked, unavailable, and any limited/restricted state supported by the installed library.
- A function that maps the Android API level to the applicable media permissions.
- A separate indication that All Files Access is needed for the app's broad PDF/Other Docs scanning use case on Android 11+.
- Clear handling for API levels below the app's supported minimum and unknown platform/version values.

Do not conflate granular media access with broad filesystem access.

### 2. Where to Do (Exact File Paths)

- `src/core/permissions/types.ts`
- `src/core/permissions/permissionPolicy.ts`
- `src/core/permissions/index.ts`

### 3. AI Prompt Instructions (Copy-Paste to AI)

> Implement only Subtask 2 for Kinetix. Inspect the installed `react-native-permissions` version and current project TypeScript settings. Create `types.ts` and `permissionPolicy.ts` with strict types and a pure function that accepts an Android API level and returns the runtime media permissions applicable to that level. Use `READ_EXTERNAL_STORAGE` for supported legacy API levels and the granular audio/video/image permissions on API 33+. Model All Files Access (`MANAGE_EXTERNAL_STORAGE`) separately as a special-settings requirement on API 30+, not as an ordinary permission to pass to a runtime request function. Add explicit types for permission status and a permission snapshot/readiness result. Export the public types and helpers through `src/core/permissions/index.ts`. Do not add UI, invoke native APIs, or modify the manifest in this subtask.

### 4. Verification / Acceptance Criteria

- Automated: Run `npm run typecheck` and `npm run lint`.
- Manual: Review the policy output for representative API levels 29, 30, 31, 32, 33, 34, and 35. Confirm API 33+ does not incorrectly rely on `READ_EXTERNAL_STORAGE` for granular media access.
- Safety: Confirm All Files Access is represented separately from runtime media permissions.

---

## Subtask 3: Implement `PermissionManager`

### 1. What to Do (Goal)

Implement a small service that checks and requests the permission set chosen by `permissionPolicy.ts`. It should provide a stable API to the UI without leaking library-specific details.

Required behavior:
- Check current permission statuses.
- Request applicable runtime media permissions.
- Return a structured snapshot showing granted, denied, blocked, or unavailable permissions.
- Expose whether the media-permission portion of onboarding is ready.
- Check All Files Access separately through an Android-native capability/helper when available.
- Never treat a failed native call as granted.
- Avoid requesting permissions that do not apply to the current API level.

### 2. Where to Do (Exact File Paths)

- `src/core/permissions/PermissionManager.ts`
- `src/core/permissions/permissionPolicy.ts`
- `src/core/permissions/types.ts`
- `src/core/permissions/index.ts`

### 3. AI Prompt Instructions (Copy-Paste to AI)

> Implement only Subtask 3. Create `PermissionManager.ts` for Kinetix using the installed `react-native-permissions` API and the policy/types from the previous subtask. Provide typed methods such as `checkPermissions()`, `requestMediaPermissions()`, and `getPermissionSnapshot()` (adjust names if the repository already has conventions). Select permissions by `Platform.Version`; handle each permission status explicitly, including denied and blocked/permanently denied. Do not call `request()` for `MANAGE_EXTERNAL_STORAGE` as if it were a normal runtime permission. Represent All Files Access as a separate status supplied by a native helper if one exists; if that helper has not yet been implemented, define a narrow typed interface and clearly mark the integration as pending rather than fabricating a result. Keep the service independent of React components. Add exports from the permissions barrel. Do not create onboarding UI or alter unrelated files.

### 4. Verification / Acceptance Criteria

- Automated: Run `npm run typecheck` and `npm run lint`.
- Automated: Use mocked `Platform.Version` and mocked permission API responses to confirm the manager checks and requests only applicable permissions.
- Manual: Inspect logs/results for granted, denied, and blocked scenarios. Errors must be surfaced as failures or unavailable states, never silently converted to granted.

---

## Subtask 4: Add Native All Files Access Settings Helper

### 1. What to Do (Goal)

Implement the Android-native bridge used to open the app's All Files Access settings page on Android 11+ and check whether the app currently has all-files access.

Requirements:
- On API 30+, check `Environment.isExternalStorageManager()`.
- Open `Settings.ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION` for the app package.
- Use a safe fallback to `Settings.ACTION_MANAGE_ALL_FILES_ACCESS_PERMISSION` only if the app-specific intent cannot be resolved.
- Pass the app package URI where required.
- Return a clear result if unsupported or if launching the intent fails.
- On API below 30, report that the special access flow is not applicable.
- Do not auto-grant access or bypass the Android Settings screen.

### 2. Where to Do (Exact File Paths)

- `android/app/src/main/java/<existing-package-path>/AllFilesAccessModule.kt` (or Java, matching the project's existing Android language and package)
- `android/app/src/main/java/<existing-package-path>/AllFilesAccessPackage.kt` if a custom React Native module package registration is required
- `android/app/src/main/java/<existing-package-path>/MainApplication.kt` (only if manual package registration is required)
- `src/core/permissions/allFilesAccess.ts`
- `src/core/permissions/index.ts`

> Replace `<existing-package-path>` with the actual package directory discovered in the repository. Do not invent a package name.

### 3. AI Prompt Instructions (Copy-Paste to AI)

> Implement only Subtask 4 for Kinetix. First inspect the Android source language, package name, React Native version, and whether the New Architecture/TurboModule setup requires a different native-module registration approach. Add a minimal native module that exposes `isAllFilesAccessGranted()` and `openAllFilesAccessSettings()`. On Android API 30+, use `Environment.isExternalStorageManager()` and launch the app-specific `Settings.ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION` intent with `package:<applicationId>` URI; if that intent cannot be resolved, try `Settings.ACTION_MANAGE_ALL_FILES_ACCESS_PERMISSION`. On older Android versions, return an explicit not-applicable result. Add the smallest TypeScript wrapper in `src/core/permissions/allFilesAccess.ts`, with typed failure handling. Register the module using the project's existing architecture and conventions. Do not request access automatically, do not bypass user consent, and do not modify unrelated native code. Output every changed file and exact build/test results.

### 4. Verification / Acceptance Criteria

- Automated: TypeScript wrapper typechecks and lint passes.
- Build: `cd android && ./gradlew assembleDebug` succeeds.
- Manual: On Android 11+, invoke the helper and verify it opens the app-specific All Files Access settings page. Return to the app and verify `isAllFilesAccessGranted()` reflects the user's actual setting. On Android 10, verify the helper reports not applicable without crashing.

---

## Subtask 5: Build the `PermissionGatekeeperScreen` UI

### 1. What to Do (Goal)

Create a clear Material 3 onboarding screen that explains why the app needs access and lets the user initiate the appropriate action.

Required UI states:
- Initial/checking state.
- Media permissions needed, with a **Grant Permission** CTA.
- Permission denied, with a short explanation and retry CTA.
- Permission blocked/permanently denied, with an **Open App Settings** CTA.
- All Files Access required for broad PDF/Other Docs discovery, with an **Open All Files Access Settings** CTA on API 30+.
- Ready state when the required permissions are available.
- Graceful fallback when a permission or native capability is unavailable.

Use accessible labels, loading/disabled states, and Material 3 styling consistent with the existing theme provider. Explain the purpose of broad file access plainly; do not mislead users into thinking it is required for every media type if the app can operate with granular permissions only.

### 2. Where to Do (Exact File Paths)

- `src/features/onboarding/PermissionGatekeeperScreen.tsx`
- `src/features/onboarding/index.ts`
- `src/core/permissions/PermissionManager.ts`
- `src/core/permissions/allFilesAccess.ts`

### 3. AI Prompt Instructions (Copy-Paste to AI)

> Implement only Subtask 5. Create `PermissionGatekeeperScreen.tsx` for Kinetix using the repository's existing React Native Paper theme and component conventions. Use `PermissionManager` and the All Files Access wrapper; do not duplicate platform permission logic inside the component. Display a clear explanation, current permission state, and the correct CTA for granted, denied, blocked, or missing special access. The Grant CTA should request only applicable runtime media permissions. The Open App Settings CTA should use the supported `react-native-permissions` settings API or an existing project helper. The All Files Access CTA should open the dedicated native settings helper and refresh the access status when the app becomes active again. Provide a typed `onReady` callback or follow the project's existing navigation pattern, but do not invent a Dashboard route if it does not exist yet. Use accessible labels and stable `testID` values. Export the screen through the feature barrel. Do not implement the scanner or dashboard.

### 4. Verification / Acceptance Criteria

- Automated: Run `npm run typecheck` and `npm run lint`.
- Component tests (can be written in Subtask 6): verify the correct CTA appears for denied and blocked states.
- Manual: Deny access, retry, open Settings, return to the app, and confirm the screen refreshes instead of remaining stuck in a stale state.

---

## Subtask 6: Automated Permission Policy, Manager, Native-Bridge and UI Tests

### 1. What to Do (Goal)

Write tests that cover API-level mapping, permission outcomes, settings-flow states, and onboarding UI behavior using mocks. Native device behavior is validated manually in the next subtask.

### 2. Where to Do (Exact File Paths)

- `__tests__/core/permissions/permissionPolicy.test.ts`
- `__tests__/core/permissions/PermissionManager.test.ts`
- `__tests__/features/onboarding/PermissionGatekeeperScreen.test.tsx`
- `jest.setup.ts` (only if shared native mocks need to be added)

### 3. AI Prompt Instructions (Copy-Paste to AI)

> Implement only Subtask 6. Add Jest tests using the project's existing test setup and React Native Testing Library. Test the pure permission policy for API 29, 30, 31, 32, 33, 34, and 35; verify API 33+ maps to granular audio/video/image permissions and All Files Access remains a separate special-setting requirement. Test `PermissionManager` with mocked platform and permission-library results for granted, denied, blocked, and unavailable cases, including native-helper failures. Test `PermissionGatekeeperScreen` so denied status displays the Grant Permission CTA, blocked status displays Open App Settings, API 30+ missing all-files access displays Open All Files Access Settings when needed, and the ready state invokes `onReady` or the established navigation handoff. Avoid brittle snapshots; prefer assertions on visible text, test IDs, and called actions. Mock native modules instead of requiring a real Android runtime. Do not change production behavior merely to make tests pass.

### 4. Verification / Acceptance Criteria

- Automated: Run `npm run typecheck && npm run lint && npm test`.
- Ensure tests prove that blocked permissions do not keep triggering runtime requests and that native errors do not result in a false granted status.
- Manual: Review that tests cover both successful and failure paths.

---

## Subtask 7: Startup Integration, Lifecycle Refresh and End-to-End Verification

### 1. What to Do (Goal)

Integrate the permission gate into the existing app startup flow and verify the experience on physical Android devices or emulators spanning the supported API range.

Requirements:
- Check permissions on first launch and whenever the app returns to the foreground after Settings.
- Show the permission gate only when the permissions needed for the selected functionality are missing.
- Keep scanner/dashboard integration minimal and use existing navigation or a typed readiness callback.
- Ensure cancellation or returning from Settings never leaves the app stuck in a loading state.
- Document manual test results and known platform limitations.

### 2. Where to Do (Exact File Paths)

- `src/app/App.tsx`
- `src/app/AppNavigator.tsx` (only if it already exists and is the established navigation entry)
- `src/features/onboarding/PermissionGatekeeperScreen.tsx`
- `__tests__/features/onboarding/PermissionGatekeeperScreen.test.tsx`
- `docs/testing/android-permissions.md` (create if project documentation uses a `docs/` directory; otherwise use the repository's existing testing-doc location)

### 3. AI Prompt Instructions (Copy-Paste to AI)

> Implement only Subtask 7. Inspect the current app entry and navigation structure, then integrate the permission gate without replacing existing app architecture or creating a fake Dashboard route. Re-check permissions on startup and when the app becomes active after Android Settings, using React Native's AppState lifecycle appropriately and cleaning up listeners. Route to the existing next screen or invoke the established readiness callback only when the permission requirements for the current app flow are satisfied. Ensure the screen remains usable after denial, cancellation, or a native intent failure. Add a concise Android permission manual-test checklist covering API 29, 30, 32, 33, 34, and 35, including granted, denied, blocked, and All Files Access on/off cases. Run all available typecheck, lint, Jest, and Android build commands; report exact results and anything that could not be tested in the current environment.

### 4. Verification / Acceptance Criteria

- Automated:
  - `npm run typecheck`
  - `npm run lint`
  - `npm test`
  - `cd android && ./gradlew assembleDebug`
- Manual on real device/emulator:
  - Android 10: verify legacy media permission flow and no All Files Access settings flow.
  - Android 11–12: verify applicable media permissions and the separate All Files Access toggle.
  - Android 13–15: verify granular audio/video/image permission requests and separate All Files Access behavior.
  - Deny once, deny repeatedly/block, grant through app settings, toggle All Files Access off/on, and return to the app.
  - Confirm the app refreshes state on resume and never reports access as granted when it is not.
- Release note: Before publishing, independently verify current Google Play policy and eligibility for `MANAGE_EXTERNAL_STORAGE`. Do not assume a manifest declaration alone permits Play Store distribution.

---

## Task 4 Definition of Done

- [ ] Manifest declarations match supported Android API levels.
- [ ] Runtime media permissions are selected by API level and requested only when applicable.
- [ ] All Files Access is checked and opened through a dedicated Android Settings flow on API 30+.
- [ ] Permission states are represented with strict TypeScript types.
- [ ] Onboarding UI presents the correct action for denied, blocked, missing special access, and ready states.
- [ ] Permission state refreshes after returning from Android Settings.
- [ ] Unit/component tests cover API mapping and important state transitions.
- [ ] Typecheck, lint, tests, and Android build results are reported honestly.
- [ ] No scanner or Dashboard implementation was pulled into Task 4.
