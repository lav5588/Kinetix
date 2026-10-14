# Task 20 — Full End-to-End Regression Suite, ProGuard/R8 & Release APK/AAB Build

## Goal

Prepare Kinetix for a production Android release by running the complete automated test suite, creating a full-app E2E regression flow, configuring release signing and verified ProGuard/R8 rules for native dependencies, enabling ABI splits, configuring adaptive app icons and the native splash screen, and producing a signed Release APK and Play Store AAB.

## Important safety and release notes

- Complete **one subtask at a time**, in order.
- Give the coding AI only the prompt for the current subtask.
- Inspect the current Android Gradle, React Native, and dependency versions before editing build configuration.
- Never put keystore passwords, signing credentials, API secrets, or private keys in source control or generated prompts. Use local ignored properties or the CI secret store.
- Do not copy generic ProGuard rules blindly. Add only rules supported by the installed library versions and validate them with a minified release build.
- Keep the debug build working while preparing release configuration.
- Do not claim that an APK/AAB is production-ready until it has been built, signed, installed, and smoke-tested. Do not claim physical-device tests that were not performed.

---

## Subtask 1 — Audit release configuration and establish a clean baseline

### Scope
Inspect Android Gradle files, React Native version, application ID, SDK levels, signing configuration, build variants, ABI configuration, current ProGuard/R8 rules, native dependencies, icons, splash-screen setup, test scripts, and any existing Maestro/Detox setup. Do not change configuration yet.

### Exact paths
- `android/app/build.gradle`
- `android/app/proguard-rules.pro`
- `android/build.gradle`
- `android/gradle.properties`
- `android/settings.gradle`
- `package.json`
- `.maestro/` (existing flows/configuration)
- Existing app icon and splash assets under `android/app/src/main/res/`
- Existing CI configuration, if present

### Copy-paste AI prompt
> Audit the repository for Task 20 without modifying files. Record the React Native and Android Gradle plugin versions, application ID, compile/target/min SDK values, existing debug/release build types, signing setup, minify/shrink settings, ABI settings, ProGuard/R8 rules, native dependencies (LibVLC, TrackPlayer, OP-SQLite, MMKV, Reanimated, PDFium, biometrics, and bootsplash if installed), app icons, splash-screen setup, test scripts, and Maestro/Detox configuration. Run baseline tests/build checks if feasible and report exact results. Identify missing configuration and compatibility risks before proposing edits. Do not invent library versions, signing secrets, or paths.

### Acceptance criteria
- Current build/test configuration is documented.
- Native dependencies and their installed versions are verified.
- Existing failures are separated from new work.
- No runtime or build configuration is changed in this subtask.

### Tests / checks
- Run the current Jest test command and `yarn tsc --noEmit`.
- Run lint and a debug Android build if the environment supports it.
- Record the exact commands and exit results.

---

## Subtask 2 — Establish the release test gate and coverage report

### Scope
Make the existing test scripts suitable for release verification. Run `yarn test --coverage`, verify the requested greater-than-80% unit/integration coverage across stores, repositories, and utilities, and identify meaningful coverage gaps. Do not add meaningless tests solely to inflate percentages.

### Exact paths
- `package.json`
- `jest.config.js` (or the actual Jest config)
- `__tests__/setup.ts` (if present)
- Existing store, repository, and utility test files
- CI workflow files, if present

### Copy-paste AI prompt
> Configure and verify the project’s existing Jest coverage gate for Task 20. Use the current Jest configuration and test conventions; do not replace the test runner. Run `yarn test --coverage`, inspect coverage for stores, repositories, and utilities, and target more than 80% coverage for those areas as required by the project plan. Add focused tests for meaningful uncovered behavior rather than superficial assertions. Make sure native modules are mocked consistently in tests and that path aliases work. If a coverage threshold cannot currently be met, report the exact gap and add the smallest useful tests; do not claim the threshold passed unless the report proves it. Keep the test command usable in CI.

### Acceptance criteria
- `yarn test --coverage` runs reproducibly.
- Coverage is reported for stores, repositories, and utilities.
- More than 80% coverage is achieved for the intended scope, or remaining gaps are explicitly documented.
- Existing tests remain valid.

### Tests / checks
- Run `yarn test --coverage`.
- Inspect coverage summary and the specific uncovered files/branches.
- Run `yarn tsc --noEmit` and lint.

---

## Subtask 3 — Build the complete Maestro end-to-end regression journey

### Scope
Create `.maestro/full_app_regression_suite.yaml` using the project’s actual app IDs, labels, navigation, and E2E framework conventions. Cover the source plan’s full journey: permissions/dashboard, audio playback and resume, video playback and resume, photos/EXIF, PDF page resume/night mode, Other Docs internal/external opening, and settings theme persistence.

### Exact paths
- `.maestro/full_app_regression_suite.yaml`
- Existing `.maestro/` configuration and flows
- Existing app navigation/screens under `src/`
- Existing E2E test setup and test data/fixtures

### Copy-paste AI prompt
> Create or complete `.maestro/full_app_regression_suite.yaml` using the existing Maestro setup and actual UI selectors/test IDs in this app. Cover this full user journey: (1) launch and grant permissions, then verify Dashboard and Storage Bar; (2) open Audio, enter a folder, search and sort, play audio, verify PersistentMiniPlayer and Equalizer, stop/close as supported, and verify resume progress; (3) open Video, play and seek to 50%, close it, reopen through Continue Watching, and verify resume near 50%; (4) open Photos, open a photo, zoom and view EXIF, then return; (5) open PDF, jump to page 10, enable Night Mode, close/reopen, and verify page 10 resume; (6) open Other Docs, open a `.txt` in the built-in viewer and invoke the chooser for `.docx`; (7) open Settings, switch Light/Dark/AMOLED, navigate away/back, and verify persistence. Inspect actual labels and routes; do not invent selectors. Use stable test IDs where needed and keep changes scoped to testability. If required fixture files or permissions cannot be automated reliably, document the limitation and provide a repeatable setup.

### Acceptance criteria
- The flow exists at the requested path and matches the actual app.
- All seven major journey sections are represented.
- Selectors are grounded in the current UI and use stable test IDs where appropriate.
- Prerequisites and test fixture requirements are documented.
- The flow does not pretend to pass if it has not been executed.

### Tests / checks
- Validate the flow syntax using the installed Maestro tooling where available.
- Run the flow on an emulator/device if available.
- Record which steps pass, fail, or remain blocked by environment/permissions.

---

## Subtask 4 — Configure release signing securely

### Scope
Configure a release signing path for local builds and CI without committing credentials. Preserve debug signing. Verify the configured release variant uses the intended signing configuration and that missing secrets produce a clear build error rather than silently using debug signing.

### Exact paths
- `android/app/build.gradle`
- `android/gradle.properties` only for non-secret project flags
- A local ignored signing-properties file or environment-variable mechanism matching the current Gradle setup
- `.gitignore`
- CI workflow files, if present

### Copy-paste AI prompt
> Configure secure Android release signing based on the existing Gradle version and project conventions. Keep debug signing unchanged. Read keystore path, store password, key alias, and key password from a local ignored properties file or environment variables/CI secrets; never hardcode them in `build.gradle`, source files, logs, or this prompt. Update `.gitignore` for local secret files and document the expected property names in a safe example file containing placeholders only. Ensure release builds fail clearly if signing values are missing rather than silently using debug signing. Do not generate or expose actual passwords. Verify the release variant resolves the intended signing config and report the exact safe setup steps.

### Acceptance criteria
- Release signing is configured without committing secrets.
- Debug builds remain unaffected.
- Secret-bearing files are ignored by Git.
- A placeholder example documents required keys without real credentials.
- Missing release credentials are detected clearly.

### Tests / checks
- Check `git status` to ensure no keystore/password files are staged or tracked.
- Verify Gradle configuration parses.
- Build the release variant only when valid local signing credentials are available.
- Never paste passwords or private signing material into the test report.

---

## Subtask 5 — Add verified ProGuard/R8 rules for native dependencies

### Scope
Configure minification rules for installed versions of LibVLC, TrackPlayer, OP-SQLite, MMKV, Reanimated, PDFium, and biometrics as applicable. Preserve required JNI/reflection entry points without disabling shrinking globally. Investigate release-only failures using mapping and native crash logs.

### Exact paths
- `android/app/proguard-rules.pro`
- `android/app/build.gradle`
- Library-specific consumer rules or installed dependency documentation/source when necessary

### Copy-paste AI prompt
> Review and update `android/app/proguard-rules.pro` for the native dependencies actually installed in this repository: LibVLC, TrackPlayer, OP-SQLite, MMKV, Reanimated, PDFium, and biometric modules if present. Verify each rule against the installed version’s documented requirements or source/consumer rules. Preserve required JNI classes, native method names, reflection entry points, and serialization metadata where necessary, but do not add blanket keep-all rules or disable minification globally without evidence. Configure release minification consistently in `android/app/build.gradle`. Build a minified release variant and test the affected native features. If a failure appears only in release, use mapping files and logs to narrow the rule instead of adding broad rules blindly.

### Acceptance criteria
- Rules are grounded in installed dependencies.
- Release minification remains enabled as intended.
- Required native/JNI entry points survive shrinking.
- Debug and release builds remain configured separately.
- No broad keep-all rule is added without justification.

### Tests / checks
- Build a minified release APK/AAB.
- Smoke-test VLC video playback, background audio, SQLite FTS5 search, PDF rendering, MMKV persistence, Reanimated interactions, and biometric vault where configured.
- Inspect release logs for missing-class, JNI, or reflection failures.

---

## Subtask 6 — Configure ABI splits and resource shrinking

### Scope
Configure APK ABI splits for `arm64-v8a` and `armeabi-v7a` as requested, and configure resource shrinking consistently with minification. Ensure the Play Store AAB remains suitable for Play delivery and native libraries required by each ABI are packaged correctly.

### Exact paths
- `android/app/build.gradle`
- `android/gradle.properties` only if required by the existing build
- Existing native dependency packaging configuration

### Copy-paste AI prompt
> Configure Android ABI packaging based on the project’s actual Gradle and React Native versions. For APK distribution, configure the requested `arm64-v8a` and `armeabi-v7a` ABI splits so each APK contains the correct native libraries and APK size is reduced. Configure `shrinkResources` consistently with release minification. Ensure the AAB configuration remains valid for Play Store delivery and does not accidentally exclude required ABIs or native libraries. Do not copy deprecated Gradle DSL from unrelated versions. Build the configured APK outputs and AAB, inspect output names/sizes, and document the ABI coverage. Preserve the ability to build/debug the app normally.

### Acceptance criteria
- ABI split configuration matches the installed Android Gradle plugin.
- APK outputs include the intended ABIs and required native libraries.
- Resource shrinking works with minification.
- AAB generation remains valid for Play distribution.
- Debug builds remain usable.

### Tests / checks
- Build release APK output(s) and AAB.
- Inspect generated artifact paths, sizes, and included ABI/native libraries.
- Install the appropriate APK on a matching device/emulator if available.
- Record any ABI-specific build or runtime issue.

---

## Subtask 7 — Configure adaptive app icons

### Scope
Ensure Android adaptive icons are configured with the project’s intended app branding and that foreground/background assets are present at the correct resource paths. Avoid generating unrelated branding or replacing supplied artwork without permission.

### Exact paths
- `android/app/src/main/res/mipmap-anydpi-v26/` (if used by this project)
- `android/app/src/main/res/mipmap-*/`
- `android/app/src/main/AndroidManifest.xml`
- Existing icon source assets

### Copy-paste AI prompt
> Audit the app icon resources and Android manifest. Configure valid adaptive launcher icons using the existing approved Kinetix artwork and resource naming conventions. Ensure foreground/background layers and required density resources exist, and that the manifest references the correct launcher icon. Do not invent new brand artwork or replace existing supplied assets; if required artwork is missing, report the exact asset needed and use only a neutral project-approved fallback if one already exists. Verify the icon appears in debug and release launcher builds.

### Acceptance criteria
- Adaptive icon resources are complete for the project’s supported Android versions.
- Manifest references the correct resources.
- Existing approved branding is preserved.
- No missing-resource build failures occur.

### Tests / checks
- Build debug and release variants.
- Inspect launcher icon on an emulator/device.
- Verify Android resource compilation succeeds.

---

## Subtask 8 — Configure native splash screen with `react-native-bootsplash`

### Scope
Verify whether `react-native-bootsplash` is already installed and correctly integrated. If not, integrate a compatible version only after checking React Native/Android build compatibility. Configure native assets and startup hiding so the splash screen transitions to the app without a blank/white flash.

### Exact paths
- `package.json`
- `android/app/src/main/` and `android/app/src/main/res/`
- `android/app/src/main/java/` or `android/app/src/main/kotlin/` (actual MainActivity path)
- `App.tsx` or the actual app root
- Existing bootsplash configuration/assets if present

### Copy-paste AI prompt
> Verify the current `react-native-bootsplash` installation and Android integration. If already installed, audit and fix the existing setup; if absent, first verify a version compatible with this repository’s React Native and Android Gradle versions before adding it. Configure the native splash assets using existing approved app branding, wire the Android activity and app-root hide call according to the installed version’s documented setup, and ensure the splash hides after the app is ready without an indefinite splash or a blank/white flash. Preserve Light/Dark/AMOLED theme startup behavior. Do not guess native APIs or duplicate splash implementations.

### Acceptance criteria
- Native splash setup matches the installed library version.
- Startup reaches the app reliably.
- Splash hides at the correct lifecycle point.
- No duplicate/competing splash implementation remains.
- Theme startup does not introduce an avoidable flash.

### Tests / checks
- Build debug and release variants.
- Cold-start the app and verify the splash-to-dashboard transition.
- Test cold start with Light, Dark, and AMOLED settings if available.
- Check logs for native startup exceptions.

---

## Subtask 9 — Run release regression and fix release-only failures

### Scope
Run the full unit/integration coverage suite and complete E2E flow, then validate the minified release build’s critical native functionality. Fix regressions discovered during this stage and document any environment-dependent tests that could not run.

### Exact paths
- `.maestro/full_app_regression_suite.yaml`
- `android/app/proguard-rules.pro`
- `android/app/build.gradle`
- Existing test files across `src/`
- Existing CI workflow files, if present

### Copy-paste AI prompt
> Run the Task 20 release regression gate using the actual project scripts. Execute `yarn test --coverage` and verify the intended greater-than-80% coverage for stores, repositories, and utilities; run `yarn tsc --noEmit` and lint; execute `.maestro/full_app_regression_suite.yaml` on an available emulator/device; and build the minified signed release variant. Verify these flows in release mode: dashboard and storage bar, audio playback/background service/mini-player/equalizer/resume, VLC video playback/50% resume, photo zoom/EXIF, PDF page-10 resume/night mode, built-in text viewing and `.docx` chooser, settings theme persistence, SQLite FTS5 search, and biometric vault if implemented. Fix verified regressions with narrow changes. Record exact commands and outcomes; distinguish failures caused by missing emulator, permissions, fixtures, or signing secrets from product defects.

### Acceptance criteria
- Coverage, TypeScript, lint, E2E, and release build results are recorded.
- Critical native features are smoke-tested in the minified release build where possible.
- Release-only failures are investigated and fixed or documented.
- No test is marked as passing unless it was actually run.

### Tests / checks
- `yarn test --coverage`
- `yarn tsc --noEmit`
- Existing lint command
- Maestro full regression flow
- Minified release build and native-feature smoke tests

---

## Subtask 10 — Build, sign, install, and verify final APK/AAB artifacts

### Scope
Produce the signed Release APK and Play Store AAB, confirm their paths and sizes, install the APK on at least two physical Android devices if available, and verify cold-start and native-library behavior. Keep keystore and credentials secure.

### Exact paths
- `android/app/build.gradle`
- `android/app/proguard-rules.pro`
- Gradle output directories under `android/app/build/outputs/`
- `.maestro/full_app_regression_suite.yaml`
- Release notes/checklist document in the repository’s existing documentation location

### Copy-paste AI prompt
> Perform the final Task 20 release packaging. Using valid local/CI signing credentials without exposing them, generate the signed Release APK and Play Store AAB with the repository’s configured Gradle commands. Report exact output paths, artifact sizes, signing verification result, build variant, version name/code, and ABI coverage. Install the signed Release APK on at least two physical Android devices if available (the plan requests Android 11/12 and Android 14/15 coverage) and run the E2E/smoke checklist. Verify VLC video playback, background audio, SQLite FTS5 search, PDF rendering, and biometric vault in release mode where implemented. Measure cold-start time and compare it with the project target of under 1.2 seconds; report the measurement method and result without assuming it will pass. If devices are unavailable, mark device validation as not run and provide the exact commands/checklist needed. Never print or commit signing secrets.

### Acceptance criteria
- A signed Release APK is generated.
- A Play Store AAB is generated.
- Artifact paths, sizes, version, and signing verification are recorded.
- At least two physical-device tests are completed if devices are available; otherwise limitations are documented.
- Release-only native features are smoke-tested.
- Cold-start timing is measured and reported honestly against the `<1.2 seconds` target.
- Signing secrets are not exposed or committed.

### Tests / checks
- Build the signed release artifact(s) with the project’s Gradle configuration.
- Verify APK signing using Android build tools available in the environment.
- Install and launch the release APK.
- Run the full regression journey and native-feature smoke tests.
- Record cold-start measurements and device/Android versions.

---

## Full E2E journey checklist

- [ ] Launch app and grant permissions.
- [ ] Verify Dashboard and Storage Bar.
- [ ] Audio: open folder, search, sort, play, verify PersistentMiniPlayer and Equalizer, then verify resume progress.
- [ ] Video: play, seek to 50%, close, reopen from Continue Watching, verify resume near 50%.
- [ ] Photos: open photo, zoom, inspect EXIF, return.
- [ ] PDF: jump to page 10, enable Night Mode, close/reopen, verify page 10 resume.
- [ ] Other Docs: open `.txt` internally and trigger chooser for `.docx`.
- [ ] Settings: switch Light/Dark/AMOLED, navigate away/back, verify persistence.
- [ ] Release mode: verify VLC playback.
- [ ] Release mode: verify background audio.
- [ ] Release mode: verify SQLite FTS5 search.
- [ ] Release mode: verify PDF rendering.
- [ ] Release mode: verify Biometric Vault if implemented.

## Definition of done

Task 20 is complete when the coverage gate and E2E regression suite have been run and their results recorded; release signing is configured securely; verified ProGuard/R8 rules, ABI splits, adaptive icons, and native splash setup are in place; and signed APK/AAB artifacts are generated and validated. Physical-device and cold-start results must be reported accurately, with any unrun checks clearly marked.
