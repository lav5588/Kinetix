# Task 2: Material 3 Theme Engine, Color Tokens & Theme Persistence — AI Subtask Prompts

## Subtask-1
1. **What to Do (Goal):** Install `react-native-mmkv` and `zustand` for ultra-fast synchronous state persistence, and create the core MMKV storage singleton (`appSettingsStorage`) with Jest mocks so theme and app settings can be read and written synchronously without async flicker on app startup.
2. **Where to Do (Exact File Paths):**
   - `package.json`
   - `src/core/storage/mmkv.ts`
   - `src/core/storage/index.ts`
   - `jest.setup.ts` (Add in-memory mock for `react-native-mmkv`)
3. **AI Prompt Instructions (Copy-Paste to AI):**
   > "Act as a Senior React Native Architect. We are starting Task 2 (Theme Engine & MMKV Persistence) for 'Kinetix'. First, add `react-native-mmkv` and `zustand` to `package.json`. Second, create `src/core/storage/mmkv.ts` and initialize three separate MMKV instances: `appSettingsStorage` (id: `'omniplay-settings-store'`), `resumeStorage` (id: `'omniplay-resume-store'`), and `folderPrefsStorage` (id: `'omniplay-folder-prefs-store'`), along with typed helper functions (`getString`, `setString`, `getBoolean`, `setBoolean`, `getNumber`, `setNumber`) and Zustand `StateStorage` adapter `mmkvZustandStorage`. Export everything from `src/core/storage/index.ts`. Finally, update `jest.setup.ts` with an in-memory `Map`-backed mock for `react-native-mmkv` so unit tests run in Node without native JSI bindings."
4. **Verification / Acceptance Criteria:**
   - Automated: Run `npm run typecheck && npm test` to confirm `mmkv.ts` compiles and the Jest mock initializes cleanly.
   - Manual: Run `cd android && ./gradlew assembleDebug` to confirm `react-native-mmkv` native C++ JSI bindings compile alongside our `pickFirst` Gradle config.

---

## Subtask-2
1. **What to Do (Goal):** Define all strict TypeScript interfaces and color token dictionaries for the 3-Dimensional Material 3 Theme Engine (`ThemeMode`: `'system' | 'light' | 'dark'`, `isAmoledBlack: boolean`, `ThemePalette`: `'dynamic' | 'indigo' | 'orange' | 'emerald' | 'crimson'`, and the 5 fixed Category Semantic Accent colors for Audio, Video, Photo, PDF, and Docs).
2. **Where to Do (Exact File Paths):**
   - `src/core/theme/types.ts`
   - `src/core/theme/palettes.ts`
   - `src/core/theme/index.ts`
3. **AI Prompt Instructions (Copy-Paste to AI):**
   > "Create the Material 3 color token definitions for our app in `src/core/theme/types.ts` and `src/core/theme/palettes.ts`. In `types.ts`, define `ThemeMode` (`'system' | 'light' | 'dark'`), `ThemePalette` (`'dynamic' | 'indigo' | 'orange' | 'emerald' | 'crimson'`), `CategoryColors` (`audio`, `video`, `photo`, `pdf`, `doc`), and `AppThemeColors` (`background`, `surface`, `surfaceVariant`, `primary`, `onPrimary`, `secondaryContainer`, `onSecondaryContainer`, `textPrimary`, `textSecondary`, `border`, `error`, `scrim`). In `palettes.ts`, define the complete Light, Dark (`#0F172A` background), and Pure AMOLED Black (`#000000` background, `#0A0A0A` surface, `#141414` surfaceVariant) color tokens for all 4 static palettes (`indigo` `#4F46E5`/`#818CF8`, `orange` `#EA580C`/`#FB923C`, `emerald` `#059669`/`#34D399`, `crimson` `#E11D48`/`#FB7185`) plus the fixed semantic `CATEGORY_ACCENT_COLORS` (`audio: '#8B5CF6'`, `video: '#F97316'`, `photo: '#10B981'`, `pdf: '#EF4444'`, `doc: '#3B82F6'`). Export all types and palettes via `src/core/theme/index.ts`."
4. **Verification / Acceptance Criteria:**
   - Automated: Run `npm run typecheck && npm run lint` with 0 errors.
   - Manual: Inspect `palettes.ts` to verify every palette defines all required color keys for Light, Dark, and AMOLED variants.

---

## Subtask-3
1. **What to Do (Goal):** Create the Material 3 Theme Resolver function (`resolveAppTheme`) that takes the user's selected `ThemeMode`, OS color scheme (`useColorScheme()`), `isAmoledBlack` toggle, and `ThemePalette` (including Android 12+ Material You dynamic wallpaper color support via `@pchmn/expo-material3-theme` or fallback to Royal Indigo), and outputs a unified `MD3Theme` compatible with `react-native-paper`.
2. **Where to Do (Exact File Paths):**
   - `src/core/theme/resolveTheme.ts`
   - `src/core/theme/index.ts`
3. **AI Prompt Instructions (Copy-Paste to AI):**
   > "Create `src/core/theme/resolveTheme.ts` and export it in `src/core/theme/index.ts`. Write a pure, deterministic function `resolveAppTheme(params: { themeMode: ThemeMode; systemScheme: 'light' | 'dark' | null | undefined; isAmoledBlack: boolean; palette: ThemePalette; dynamicColors?: { light?: Partial<AppThemeColors>; dark?: Partial<AppThemeColors> } })`. It must: (1) resolve whether effective dark mode is active based on `themeMode` and `systemScheme`, (2) apply the selected `palette` tokens, (3) override `background` to `#000000` and `surface` to `#0A0A0A` ONLY when effective mode is `'dark'` AND `isAmoledBlack` is `true`, and (4) merge the tokens into a `react-native-paper` `MD3LightTheme` or `MD3DarkTheme` object coupled with our custom `appColors` and `categoryColors` properties."
4. **Verification / Acceptance Criteria:**
   - Automated: Run `npm run typecheck && npm run lint` to confirm `MD3Theme` augmentation and return types compile cleanly.
   - Manual: Verify that passing `themeMode: 'light'` and `isAmoledBlack: true` still returns light mode colors (AMOLED override only triggers in dark mode).

---

## Subtask-4
1. **What to Do (Goal):** Build the `useThemeStore` Zustand store persisted synchronously to `appSettingsStorage` (MMKV) so changes to Theme Mode, AMOLED Black toggle, and Color Palette update the UI in real time and survive app restarts.
2. **Where to Do (Exact File Paths):**
   - `src/core/theme/useThemeStore.ts`
   - `src/core/theme/index.ts`
3. **AI Prompt Instructions (Copy-Paste to AI):**
   > "Create the persisted Zustand theme store in `src/core/theme/useThemeStore.ts` using `create` from `zustand` and `persist` middleware with `createJSONStorage(() => mmkvZustandStorage)` from `@core/storage`. The store state must include: `themeMode: ThemeMode` (default `'system'`), `isAmoledBlack: boolean` (default `false`), `palette: ThemePalette` (default `'indigo'`), and actions `setThemeMode(mode: ThemeMode)`, `setAmoledBlack(enabled: boolean)`, `setPalette(palette: ThemePalette)`, and `resetThemeDefaults()`. Export `useThemeStore` from `src/core/theme/index.ts`."
4. **Verification / Acceptance Criteria:**
   - Automated: Run `npm run typecheck && npm run lint`.
   - Manual: Inspect the store key `'omniplay-theme-storage'` to confirm it serializes only state fields and persists synchronously through `mmkvZustandStorage`.

---

## Subtask-5
1. **What to Do (Goal):** Create the `AppThemeProvider` component and custom hook `useAppTheme()` that connects `useThemeStore`, React Native's `useColorScheme()`, Android `StatusBar` / Navigation Bar styling, and `react-native-paper`'s `PaperProvider`, then wrap `src/app/App.tsx` with it.
2. **Where to Do (Exact File Paths):**
   - `src/core/theme/AppThemeProvider.tsx`
   - `src/core/theme/index.ts`
   - `src/app/App.tsx`
3. **AI Prompt Instructions (Copy-Paste to AI):**
   > "Create `src/core/theme/AppThemeProvider.tsx` and custom hook `useAppTheme()`. Inside `AppThemeProvider`, subscribe to `useThemeStore` and React Native's `useColorScheme()`, compute the active theme via `resolveAppTheme`, configure Android `<StatusBar>` (`barStyle` `'light-content'` in dark mode, `'dark-content'` in light mode, `backgroundColor` matching `theme.appColors.background`), and wrap `children` inside `react-native-paper`'s `<PaperProvider theme={theme}>`. Update `src/app/App.tsx` to wrap the app shell in `<AppThemeProvider>` and add a temporary interactive Theme Preview Card on the home screen displaying the 5 Category Accent Badges and quick toggle buttons for Light/Dark/AMOLED and the 4 Palettes (`testID='theme-preview-card'`)."
4. **Verification / Acceptance Criteria:**
   - Automated: Run `npm run typecheck && npm run lint`.
   - Manual: Run the app on Android, tap the Light / Dark / AMOLED / Palette buttons on the preview card, verify instant 0-flicker color transitions, and force-close/reopen the app to confirm the chosen theme persists.

---

## Subtask-6
1. **What to Do (Goal):** Write comprehensive automated unit and component tests covering `resolveAppTheme`, `useThemeStore` MMKV persistence, and `AppThemeProvider` rendering across Light, Dark, and Pure AMOLED modes.
2. **Where to Do (Exact File Paths):**
   - `__tests__/core/theme/themeEngine.test.tsx`
   - `__tests__/App.test.tsx` (Update if needed to verify themed root shell)
3. **AI Prompt Instructions (Copy-Paste to AI):**
   > "Write a comprehensive automated test suite in `__tests__/core/theme/themeEngine.test.tsx` using Jest and `@testing-library/react-native`. Test 4 specific scenarios: (1) `resolveAppTheme` returns `#F8FAFC` background in light mode and `#0F172A` in dark mode for `'indigo'`; (2) `resolveAppTheme` returns `#000000` background and `#0A0A0A` surface when `isAmoledBlack: true` in dark mode, but ignores `isAmoledBlack` in light mode; (3) `useThemeStore` actions (`setThemeMode`, `setAmoledBlack`, `setPalette`) update state and persist to the mocked MMKV storage; and (4) rendering `<App />` and pressing the theme toggle buttons updates the container background style without errors."
4. **Verification / Acceptance Criteria:**
   - Automated: Run `npm run typecheck && npm run lint && npm test` — all test suites must pass 100%.
   - Manual: Toggle Android's system-wide Dark Theme from the notification shade while `themeMode` is set to `'system'` and verify the app switches themes live without restarting.