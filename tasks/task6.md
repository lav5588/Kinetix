# Task 6: Navigation Architecture & Category Dashboard — AI Subtask Prompts

## Goal

Implement Task 6 for **Kinetix**, an offline-first Android media and document organizer built with React Native CLI (Bare Workflow), TypeScript, Zustand, React Native Paper, and Reanimated.

Break the task into small, sequential steps so an AI coding assistant completes **only one subtask per response**. Finish and verify each subtask before moving to the next.

## Important Project Rules

- Inspect the existing repository and completed Tasks 1–5 before editing. Reuse the project's existing theme provider, scanner store, resume-history store, SQLite schema/repositories, aliases, testing setup, and package manager.
- Do not reinitialize the React Native project or replace unrelated configuration.
- Preserve strict TypeScript, existing path aliases, and current lint/format conventions.
- Use React Navigation native stack and the already-configured Reanimated setup; check installed versions and their compatibility before adding dependencies or changing Babel/native configuration.
- Keep this task limited to navigation and the Dashboard. Do not implement `FolderExplorerScreen` or `FileListScreen`; those belong to later tasks. Navigation may register a typed placeholder/route contract for `FolderExplorerScreen` until Task 7 implements it.
- Use real scanner and resume-store APIs after inspecting their current definitions. Do not invent store fields, fake live counts, or add duplicate state that can drift from SQLite.
- Keep the experience fully offline. Do not introduce remote images, APIs, analytics, or network dependencies.
- Respect the project's existing Material 3 theme tokens and all supported theme modes/palettes. Avoid hard-coded colors when a theme token exists.
- Animations must be smooth and interruptible, and must respect reduced-motion/accessibility considerations where supported. Avoid expensive work on the JS thread.
- Keep UI responsive with large file counts. Show formatted counts and storage values, and handle loading, empty, error, and permission-needed states gracefully.
- After each subtask, run the relevant checks and report changed files, commands executed, results, and unresolved issues. Do not begin the next subtask unless asked.

---

## Subtask 1: Inspect Existing App Architecture and Define Navigation Contracts

### 1. What to Do (Goal)

Inspect the existing app shell, Task 4 permission flow, Task 5 scanner/store, Task 2 database schema/repositories, Task 3 theme provider, and resume-history store. Document the real APIs and define a typed navigation contract for the Dashboard and category routes before building UI.

Do not implement the full Dashboard in this step.

### 2. Where to Do (Exact File Paths)

- Inspect `src/app/App.tsx`, `src/app/index.ts`, and root `App.tsx`
- Inspect existing `src/core/store/useMediaScannerStore.ts`
- Inspect the existing `useResumeHistoryStore` and resume repository/MMKV setup
- Inspect `src/core/theme/ThemeProvider.tsx` and theme tokens
- Inspect Task 4 permission and Task 5 scanner APIs
- Create or update `src/app/navigationTypes.ts` only if the project needs a dedicated navigation type file

### 3. AI Prompt Instructions (Copy-Paste to AI)

> Act as a Senior React Native Architect working on Kinetix. Complete only Subtask 1 of Task 6. Inspect the current app shell, navigation dependencies, theme provider, permission gatekeeper, scanner store/service, resume-history store, and storage repositories. Report the exact existing APIs and any integration constraints. Define a typed React Navigation native-stack parameter list for the Dashboard and five category routes (`AUDIO`, `VIDEO`, `PHOTO`, `PDF`, `OTHER_DOC`) using the project's existing category terminology. The future destination is `FolderExplorerScreen`, which belongs to Task 7, so do not implement that screen now. Do not install packages or build Dashboard UI in this subtask. Preserve existing code and output the files inspected/changed plus verification results.

### 4. Verification / Acceptance Criteria

- Navigation category names match the scanner/database category values exactly.
- Existing permission, scanner, theme, and resume APIs are identified from source code rather than guessed.
- No unrelated files or dependencies are changed.

---

## Subtask 2: Install and Configure React Navigation Native Stack

### 1. What to Do (Goal)

Install `@react-navigation/native` and `@react-navigation/native-stack` plus any platform dependencies that are actually missing. Reuse existing Safe Area Context and Gesture Handler dependencies if already configured. Configure the navigation container without removing existing app providers.

### 2. Where to Do (Exact File Paths)

- `package.json`
- Lockfile for the existing package manager
- `src/app/App.tsx`
- `src/app/AppNavigator.tsx`
- Existing root/provider files only if required

### 3. AI Prompt Instructions (Copy-Paste to AI)

> Complete only Subtask 2 for Kinetix. Check the current package manager and installed React Native versions first. Add `@react-navigation/native` and `@react-navigation/native-stack`, and add only missing required peer dependencies using compatible versions. Create `src/app/AppNavigator.tsx` with a typed native stack and a temporary minimal Dashboard placeholder route. Wrap the navigator in `NavigationContainer` at the correct app-shell level while preserving the existing `GestureHandlerRootView`, `SafeAreaProvider`, theme provider, and any permission/startup logic. Do not build the actual Dashboard or Folder Explorer yet. Do not duplicate providers. Show exact changed files and run typecheck/lint/tests.

### 4. Verification / Acceptance Criteria

- App launches with the native-stack placeholder screen.
- Existing app providers remain in the correct order and are not duplicated.
- TypeScript navigation types compile.
- No navigation or native dependency version conflicts are introduced.

---

## Subtask 3: Connect Startup and Permission Flow to the Navigator

### 1. What to Do (Goal)

Integrate the navigator with the existing startup and Task 4 permission gatekeeper. The first route should follow the established permission readiness flow: users who still need to grant required access should see the existing gatekeeper; users who are ready should land on the Dashboard. Re-check permission status when returning from Android Settings if that behavior is already exposed by Task 4.

Do not reimplement permission logic in the Dashboard or navigator.

### 2. Where to Do (Exact File Paths)

- `src/app/App.tsx`
- `src/app/AppNavigator.tsx`
- Existing Task 4 permission manager/gatekeeper files, only if a small integration contract is required
- Related tests under the project's existing test structure

### 3. AI Prompt Instructions (Copy-Paste to AI)

> Complete only Subtask 3. Integrate the new navigator with the existing Task 4 permission flow and startup behavior. Inspect the current PermissionManager and PermissionGatekeeperScreen APIs and reuse them; do not create a second permission system. Ensure the Dashboard is reachable only through the established readiness flow, and re-check permission state on app foreground/resume if Task 4 supports it. Avoid navigation loops and avoid resetting the user's route unnecessarily. Do not implement scanner logic or category UI. Add focused tests for the startup route decision and explain any behavior that must remain owned by Task 4.

### 4. Verification / Acceptance Criteria

- Permission-required users see the existing gatekeeper.
- Users with required access can reach the Dashboard.
- Returning from Settings updates the route/readiness state correctly.
- No duplicated permission prompts or navigation loops.

---

## Subtask 4: Build the Reusable PressableScale Component

### 1. What to Do (Goal)

Create a reusable, accessible pressable component that provides a subtle scale-down interaction and supports Reanimated. It must pass through accessibility props, disabled state, test IDs, and press callbacks. Avoid breaking nested controls or gesture handling.

### 2. Where to Do (Exact File Paths)

- `src/shared/components/PressableScale.tsx`
- `src/shared/components/index.ts` if the project uses this barrel
- `src/shared/components/__tests__/PressableScale.test.tsx` or the established equivalent

### 3. AI Prompt Instructions (Copy-Paste to AI)

> Complete only Subtask 4. Create `PressableScale.tsx` using the project's installed React Native/Reanimated versions. Implement a small tactile scale animation on press-in and restore on press-out, with sensible spring/timing settings and no unnecessary React state updates. Support children, `onPress`, `onLongPress` if appropriate, `disabled`, `accessibilityRole`, `accessibilityLabel`, `testID`, style forwarding, and other standard pressable props. Disabled controls must not animate or fire callbacks. Respect reduced-motion settings where practical. Follow the project's current mock/testing setup and add focused RNTL tests. Do not build category cards yet.

### 4. Verification / Acceptance Criteria

- Press-in/out animation is smooth on a device and does not block taps.
- Disabled state prevents interactions.
- Accessibility labels/roles and test IDs pass through.
- Jest tests pass with the existing Reanimated mocks.

---

## Subtask 5: Build the CategoryBentoCard Component

### 1. What to Do (Goal)

Create a reusable Material 3 category card for Audio, Video, Photos, PDF, and Other Docs. Each card should show a category icon, label, live item count, and category accent styling using existing theme tokens. Use `PressableScale` and Reanimated `FadeInDown` entry animation with staggered delays supplied by the parent.

### 2. Where to Do (Exact File Paths)

- `src/features/dashboard/components/CategoryBentoCard.tsx`
- `src/features/dashboard/components/__tests__/CategoryBentoCard.test.tsx`
- `src/features/dashboard/index.ts` if applicable

### 3. AI Prompt Instructions (Copy-Paste to AI)

> Complete only Subtask 5. Build `CategoryBentoCard.tsx` for Kinetix using React Native Paper, MaterialCommunityIcons, the existing theme tokens, `PressableScale`, and the installed Reanimated API. The component should accept typed props for category, title, item count, icon/accent token if supported by the existing design system, animation delay, and `onPress`. Support long counts, zero items, accessibility labels, and test IDs. Use the exact categories `AUDIO`, `VIDEO`, `PHOTO`, `PDF`, and `OTHER_DOC` and map each to the proper user-facing label (`Audio`, `Video`, `Photos`, `PDF`, `Other Docs`). Do not hard-code theme colors if existing tokens cover them. Do not create the Dashboard screen in this step. Add tests for title, count, category, and press behavior.

### 4. Verification / Acceptance Criteria

- All five category variants render the correct title and icon.
- Counts of zero and large values render cleanly.
- Card appearance responds to current theme/palette.
- Press callback and accessibility metadata work.

---

## Subtask 6: Build the StorageAnalyzerWidget

### 1. What to Do (Goal)

Create a compact storage widget with a used/free bar and readable GB values. Use Task 5 storage statistics if they already exist. Keep device storage capacity separate from the sum of indexed media sizes; do not mislabel one as the other. Handle unavailable values and avoid division by zero.

### 2. Where to Do (Exact File Paths)

- `src/features/dashboard/components/StorageAnalyzerWidget.tsx`
- `src/features/dashboard/components/__tests__/StorageAnalyzerWidget.test.tsx`

### 3. AI Prompt Instructions (Copy-Paste to AI)

> Complete only Subtask 6. Implement `StorageAnalyzerWidget.tsx` using React Native Paper and the existing theme tokens. First inspect the Task 5 scanner store/service to find the real storage-stat fields and units. Display used and free capacity in human-readable units and a proportional bar when valid total-capacity data is available. If only indexed-media totals exist, label them accurately and do not pretend they are the Android device's total used/free storage. Handle null, zero, invalid, and loading values safely. Do not add a new native storage API in this subtask. Include accessibility information for the bar and tests for formatting, proportions, and unavailable data.

### 4. Verification / Acceptance Criteria

- Values and units are grounded in the actual store/API.
- The bar never divides by zero or renders invalid widths.
- Missing data produces a clean fallback rather than fabricated figures.
- Widget follows theme modes and passes tests.

---

## Subtask 7: Build the ContinueWatchingCarousel

### 1. What to Do (Goal)

Build a horizontally scrollable carousel of recent/in-progress items from the existing `useResumeHistoryStore`. Show a useful title and available metadata, provide a press callback to open the relevant item when supported, and hide the entire carousel when history is empty or the setting disables it.

### 2. Where to Do (Exact File Paths)

- `src/features/dashboard/components/ContinueWatchingCarousel.tsx`
- `src/features/dashboard/components/__tests__/ContinueWatchingCarousel.test.tsx`
- Existing resume-history store/repository files only if a clearly missing selector is required

### 3. AI Prompt Instructions (Copy-Paste to AI)

> Complete only Subtask 7. Inspect the actual `useResumeHistoryStore` and ResumeRepository shape before coding. Build a horizontally scrollable `ContinueWatchingCarousel` that renders recent resumable items using only available metadata such as title, media type, duration/progress, or page position. If the store has no items, return no visible carousel content. Respect the existing user setting for showing/hiding the carousel if that setting is already implemented. Use local metadata only; do not fetch thumbnails or data from the network. Expose a typed item-press callback and handle items without optional metadata gracefully. Do not invent store fields or build player screens. Add tests for populated history, empty history, and hidden setting.

### 4. Verification / Acceptance Criteria

- Recent items come from the real resume-history store.
- Empty history and disabled setting hide the carousel cleanly.
- Optional/missing metadata does not crash rendering.
- No remote requests or duplicate resume state are added.

---

## Subtask 8: Build CategoryDashboardScreen and Live Store Bindings

### 1. What to Do (Goal)

Build the Dashboard using the five category cards, the storage widget, and the continue-watching carousel. Bind card counts and scan status to the real `useMediaScannerStore`. Provide a pull-to-refresh interaction that calls the existing scanner service safely, with a non-blocking progress indicator and clear handling for missing permission, scan errors, and initial/empty state.

### 2. Where to Do (Exact File Paths)

- `src/features/dashboard/CategoryDashboardScreen.tsx`
- `src/features/dashboard/__tests__/CategoryDashboardScreen.test.tsx`
- Existing scanner/store files only for minimal integration fixes

### 3. AI Prompt Instructions (Copy-Paste to AI)

> Complete only Subtask 8. Implement `CategoryDashboardScreen.tsx` using the existing theme provider, React Native Paper, Reanimated, `CategoryBentoCard`, `StorageAnalyzerWidget`, and `ContinueWatchingCarousel`. Read the real `useMediaScannerStore` API and map its category totals to the five cards without adding duplicate count state. Apply staggered `FadeInDown` entry animations to cards. Include a pull-to-refresh gesture that invokes the existing Task 5 scan API, shows a non-blocking progress indicator, prevents overlapping scans, and reports failures without crashing. If permission is missing, guide the user through the existing Task 4 gatekeeper flow rather than trying to bypass it. Keep the screen responsive and offline. Do not implement Folder Explorer or file-list UI. Add RNTL tests using mocked store/service data.

### 4. Verification / Acceptance Criteria

- All five cards show the correct live category counts.
- Storage widget and continue-watching carousel appear only with valid/available data.
- Pull-to-refresh triggers the existing scan operation and handles progress/error states.
- Repeated refresh gestures do not start concurrent scans.
- Dashboard is usable with zero indexed files and with a large number of indexed files.

---

## Subtask 9: Wire Category Presses to Typed Folder Explorer Routes

### 1. What to Do (Goal)

Connect each category card to a typed `FolderExplorerScreen` route carrying the exact category value. Since Task 7 owns the actual screen, use a minimal placeholder route only if needed to verify navigation, and make the replacement path clear.

### 2. Where to Do (Exact File Paths)

- `src/app/navigationTypes.ts` or the project's typed navigation definitions
- `src/app/AppNavigator.tsx`
- `src/features/dashboard/CategoryDashboardScreen.tsx`
- Temporary placeholder component only if needed; do not create the Task 7 implementation

### 3. AI Prompt Instructions (Copy-Paste to AI)

> Complete only Subtask 9. Wire each Dashboard card to the typed `FolderExplorer` route with the correct category param: `AUDIO`, `VIDEO`, `PHOTO`, `PDF`, or `OTHER_DOC`. Use React Navigation's current typed API and preserve type safety; do not pass category labels such as `Other Docs` where the domain enum is expected. Task 7 will implement the real `FolderExplorerScreen`, so if a placeholder is required, keep it minimal and clearly marked for replacement. Do not implement folder querying or folder UI. Add a navigation test that taps each category and asserts the expected route parameter.

### 4. Verification / Acceptance Criteria

- Each card navigates to the route with the exact matching category.
- Navigation params are fully typed; no `any` casts to silence errors.
- Task 7 can replace the placeholder without redesigning the navigation contract.

---

## Subtask 10: End-to-End Tests, Device Validation, and Final Integration

### 1. What to Do (Goal)

Add/complete tests for the Dashboard and navigation, run project checks, and validate the screen on a real Android device or emulator. Verify animations, refresh, theme changes, live counts, and the no-history state.

### 2. Where to Do (Exact File Paths)

- `src/features/dashboard/__tests__/CategoryDashboardScreen.test.tsx`
- `src/features/dashboard/components/__tests__/CategoryBentoCard.test.tsx`
- `src/features/dashboard/components/__tests__/StorageAnalyzerWidget.test.tsx`
- `src/features/dashboard/components/__tests__/ContinueWatchingCarousel.test.tsx`
- Existing `.maestro/` flow directory or established E2E test location
- Update only relevant test configuration if necessary

### 3. AI Prompt Instructions (Copy-Paste to AI)

> Complete only Subtask 10. Review the Task 6 implementation and add a Maestro E2E flow following the project's existing convention: launch the app, complete or bypass the permission gate only through the test setup, verify all five Dashboard cards, tap each card and assert its exact category route parameter, then return to the Dashboard. Run the existing typecheck, lint, Jest, and Android build/test commands available in package scripts. Do not claim tests passed unless you ran them and saw the result. On a real device/emulator, inspect the staggered card entry animation and press-scale feedback at 60/120 Hz where supported, verify pull-to-refresh shows a smooth non-blocking progress indicator, switch light/dark/AMOLED themes, and verify empty resume history hides the carousel. Report actual measurements and unresolved issues without inventing performance numbers.

### 4. Verification / Acceptance Criteria

- Component and navigation tests pass.
- TypeScript, lint, and Android build pass, or remaining failures are reported with their exact errors.
- Manual checks cover animation smoothness, theme changes, refresh behavior, live counts, and empty history.
- Performance claims are based on measurements, not assumptions.

---

## Task 6 Definition of Done

- [x] Native-stack navigation is installed and integrated with existing providers.
- [x] Permission readiness flow remains owned by Task 4.
- [x] `PressableScale` is reusable, accessible, and tested.
- [x] Five category cards render the correct labels, icons, counts, and theme styles.
- [x] Storage widget shows only correctly sourced and labeled data.
- [x] Continue-watching carousel uses the existing resume-history store and hides when empty/disabled.
- [x] Pull-to-refresh calls the existing scanner safely and reports progress/errors.
- [x] Each card navigates with the correct typed category parameter.
- [x] Component tests, navigation tests, typecheck, lint, and available E2E/build checks are run and reported.
- [x] No Task 7 folder-browser implementation, player implementation, online dependency, or unrelated refactor is included.
