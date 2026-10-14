# Task 1: Project Initialization & Base Architecture — AI Subtask Prompts

## Subtask-1
1. **What to Do (Goal):** Initialize a bare React Native (v0.76+ with New Architecture / Fabric enabled) TypeScript project and configure strict TypeScript compiler rules and path aliases so the entire codebase uses clean imports (`@app/*`, `@core/*`, `@shared/*`, `@features/*`) without relative path clutter (`../../../`).
2. **Where to Do (Exact File Paths):**
   - `tsconfig.json` (Root directory)
   - `babel.config.js` (Root directory)
   - `package.json` (Root directory — add `babel-plugin-module-resolver` to `devDependencies`)
3. **AI Prompt Instructions (Copy-Paste to AI):**
   > "Act as a Senior React Native Architect. We are building 'Kinetix', an Android universal media and document app using React Native CLI (Bare Workflow) and TypeScript. For this step, ONLY configure `tsconfig.json`, `babel.config.js`, and the required devDependency in `package.json`. Enable strict TypeScript checking (`strict: true`, `noImplicitAny: true`, `strictNullChecks: true`) and configure `babel-plugin-module-resolver` along with TypeScript `paths` for `@app/*` -> `src/app/*`, `@core/*` -> `src/core/*`, `@shared/*` -> `src/shared/*`, and `@features/*` -> `src/features/*`. Do not generate any application UI code yet; output the exact complete contents of `tsconfig.json` and `babel.config.js`."
4. **Verification / Acceptance Criteria:**
   - Automated: Run `npx tsc --noEmit` to verify `tsconfig.json` parses without syntax or schema errors.
   - Manual: Confirm `@core/`, `@shared/`, `@features/`, and `@app/` resolve properly in the IDE without red squiggly import warnings.

---

## Subtask-2
1. **What to Do (Goal):** Create the complete Feature-Sliced Design (FSD) directory tree and barrel export (`index.ts`) placeholders so future AI prompts place every file in its exact designated folder without inventing random directory structures.
2. **Where to Do (Exact File Paths):**
   - `src/app/index.ts`
   - `src/core/storage/index.ts`
   - `src/core/permissions/index.ts`
   - `src/core/scanner/index.ts`
   - `src/core/theme/index.ts`
   - `src/shared/components/index.ts`
   - `src/shared/utils/index.ts`
   - `src/shared/types/index.ts`
   - `src/features/dashboard/index.ts`
   - `src/features/browser/index.ts`
   - `src/features/audioPlayer/index.ts`
   - `src/features/videoPlayer/index.ts`
   - `src/features/imageViewer/index.ts`
   - `src/features/pdfReader/index.ts`
   - `src/features/otherDocs/index.ts`
   - `src/features/settings/index.ts`
3. **AI Prompt Instructions (Copy-Paste to AI):**
   > "Create the foundational folder structure and global shared TypeScript domain interfaces for our React Native app inside `src/`. First, provide a shell script (or file creation list) to generate all folder paths (`src/app`, `src/core/{storage,permissions,scanner,theme}`, `src/shared/{components,utils,types}`, `src/features/{dashboard,browser,audioPlayer,videoPlayer,imageViewer,pdfReader,otherDocs,settings}`). Second, inside `src/shared/types/index.ts`, define and export the core TypeScript types: `MediaCategory` ('audio' | 'video' | 'photo' | 'pdf' | 'doc'), `SortField` ('name' | 'date' | 'size' | 'duration'), `SortOrder` ('asc' | 'desc'), and `ViewMode` ('list' | 'grid'). Keep all other `index.ts` files as clean placeholder barrel files (`export {};`)."
4. **Verification / Acceptance Criteria:**
   - Automated: Run `npx tsc --noEmit` to verify `src/shared/types/index.ts` compiles cleanly.
   - Manual: Check the project tree to ensure all 16 directories exist in `src/`.

---

## Subtask-3
1. **What to Do (Goal):** Configure ESLint, Prettier, and basic code quality rules tailored for React Native, TypeScript, and React Hooks so every subsequent AI-generated file follows identical formatting and linting rules.
2. **Where to Do (Exact File Paths):**
   - `.eslintrc.js` (Root directory)
   - `.prettierrc.js` (Root directory)
   - `package.json` (Add `lint`, `format`, and `typecheck` scripts)
3. **AI Prompt Instructions (Copy-Paste to AI):**
   > "Configure `.eslintrc.js`, `.prettierrc.js`, and the `scripts` section of `package.json` for our React Native TypeScript project. Enforce React Hooks rules (`react-hooks/exhaustive-deps`), disallow unused variables (`@typescript-eslint/no-unused-vars`), enforce single quotes, trailing commas, and 100-character print width. Add npm scripts: `'lint': 'eslint \"src/**/*.{ts,tsx}\"'`, `'typecheck': 'tsc --noEmit'`, and `'test': 'jest'`. Output only the exact configuration files."
4. **Verification / Acceptance Criteria:**
   - Automated: Run `npm run lint` and `npm run typecheck` in the terminal and confirm 0 errors and 0 warnings.
   - Manual: Save `src/shared/types/index.ts` in the editor and confirm Prettier formats it consistently.

---

## Subtask-4
1. **What to Do (Goal):** Install and configure core UI and Animation native dependencies (`react-native-reanimated`, `react-native-gesture-handler`, `react-native-safe-area-context`, `react-native-screens`, `react-native-paper`, `react-native-vector-icons`) in `package.json`, `babel.config.js`, and Android's `build.gradle` so icons and 60fps animations work without native crashes.
2. **Where to Do (Exact File Paths):**
   - `package.json`
   - `babel.config.js` (Add `react-native-reanimated/plugin` as the very last plugin)
   - `android/app/build.gradle` (Add `apply from: "../../node_modules/react-native-vector-icons/fonts.gradle"` for `MaterialCommunityIcons.ttf`)
   - `index.js` (Import `react-native-gesture-handler` at line 1)
3. **AI Prompt Instructions (Copy-Paste to AI):**
   > "Configure the core UI, gesture, icon, and animation dependencies for our Android React Native app. Update `package.json` dependencies with `react-native-reanimated`, `react-native-gesture-handler`, `react-native-safe-area-context`, `react-native-screens`, `react-native-paper`, and `react-native-vector-icons` (plus `@types/react-native-vector-icons`). Update `babel.config.js` so `react-native-reanimated/plugin` is strictly the last plugin after `module-resolver`. Show the exact line to add in `android/app/build.gradle` to bundle only `MaterialCommunityIcons.ttf`, and update root `index.js` so `import 'react-native-gesture-handler';` is the very first line."
4. **Verification / Acceptance Criteria:**
   - Automated: Run `npm run typecheck` to ensure all package types resolve.
   - Manual: Run `cd android && ./gradlew assembleDebug` to confirm the Android Gradle build succeeds and bundles `MaterialCommunityIcons.ttf` without duplicate asset errors.

---

## Subtask-5
1. **What to Do (Goal):** Configure Android-specific build properties (`minSdkVersion 24`, `targetSdkVersion 34`, `compileSdkVersion 34`, Kotlin version, NDK version, and `packagingOptions` `pickFirst` rules for shared `.so` C++ libraries) so adding `react-native-mmkv`, `op-sqlite`, and `libvlc` later will not cause native C++ duplicate symbol crashes.
2. **Where to Do (Exact File Paths):**
   - `android/build.gradle`
   - `android/app/build.gradle`
   - `android/gradle.properties`
3. **AI Prompt Instructions (Copy-Paste to AI):**
   > "Update the Android Gradle configuration files (`android/build.gradle`, `android/app/build.gradle`, and `android/gradle.properties`) for our React Native media player app. Set `minSdkVersion = 24`, `compileSdkVersion = 34`, `targetSdkVersion = 34`, enable `newArchEnabled=true` and `hermesEnabled=true` in `gradle.properties`, increase JVM heap memory (`org.gradle.jvmargs=-Xmx4096m -XX:MaxMetaspaceSize=1024m`), and add `packagingOptions` inside `android/app/build.gradle` with `pickFirst 'lib/**/libc++_shared.so'` and `pickFirst 'lib/**/libfbjni.so'` to prevent future C++ JSI/VLC native library collisions. Output only the modified sections of those 3 files with exact context."
4. **Verification / Acceptance Criteria:**
   - Automated: Run `cd android && ./gradlew help` to validate Gradle syntax.
   - Manual: Build and launch the debug APK on an Android emulator or physical device to confirm Hermes and the New Architecture initialize cleanly.

---

## Subtask-6
1. **What to Do (Goal):** Set up the Jest testing environment with `@testing-library/react-native` and create a centralized native mock setup file (`jest.setup.ts`) so every unit and component test across the project runs fast without crashing on native modules (`Reanimated`, `GestureHandler`, `VectorIcons`).
2. **Where to Do (Exact File Paths):**
   - `jest.config.js` (Root directory)
   - `jest.setup.ts` (Root directory)
   - `package.json` (Ensure `@testing-library/react-native` and `@types/jest` are in `devDependencies`)
3. **AI Prompt Instructions (Copy-Paste to AI):**
   > "Set up the automated testing configuration for our React Native TypeScript project. Create `jest.config.js` with `moduleNameMapper` matching our TypeScript path aliases (`@app/*`, `@core/*`, `@shared/*`, `@features/*`) and `transformIgnorePatterns` allowing `react-native`, `@react-native`, `react-native-paper`, `react-native-reanimated`, `react-native-gesture-handler`, and `react-native-vector-icons`. Create `jest.setup.ts` that mocks `react-native-reanimated`, `react-native-gesture-handler`, and `react-native-vector-icons/MaterialCommunityIcons`. Output the complete `jest.config.js` and `jest.setup.ts` files."
4. **Verification / Acceptance Criteria:**
   - Automated: Run `npm test` and verify Jest initializes `jest.setup.ts` without module resolution errors.
   - Manual: Check that path aliases like `@shared/types` resolve inside any `.test.ts` file.

---

## Subtask-7
1. **What to Do (Goal):** Create the minimal Root App Entry Shell (`src/app/App.tsx`) wrapped in `GestureHandlerRootView` and `SafeAreaProvider`, wire it to root `App.tsx` / `index.js`, and write the first automated smoke test (`__tests__/App.test.tsx`) to verify the entire Task 1 foundation works end-to-end.
2. **Where to Do (Exact File Paths):**
   - `src/app/App.tsx`
   - `src/app/index.ts`
   - `index.js` (Point `AppRegistry` to `src/app`)
   - `__tests__/App.test.tsx`
3. **AI Prompt Instructions (Copy-Paste to AI):**
   > "Create the root application shell in `src/app/App.tsx` and export it via `src/app/index.ts`. Wrap the root component in `GestureHandlerRootView` (`flex: 1`) and `SafeAreaProvider`. Render a clean placeholder screen with `testID='app-root-shell'`, a MaterialCommunityIcons icon (`play-box-multiple`), and the title 'Kinetix Initialized'. Update `index.js` to register `App` from `@app`. Finally, write a unit test in `__tests__/App.test.tsx` using `@testing-library/react-native` that renders `<App />` and asserts that `testID='app-root-shell'` and the text 'Kinetix Initialized' are present."
4. **Verification / Acceptance Criteria:**
   - Automated: Run `npm run typecheck && npm run lint && npm test` — all 3 commands must pass with 100% green status.
   - Manual: Run `npx react-native run-android` on a connected Android phone or emulator and verify the "Kinetix Initialized" screen renders with the Material icon and zero Metro/Logcat redbox errors.