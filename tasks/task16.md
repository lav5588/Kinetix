# Task 16 — Private Biometric Vault & Batch File Operations

## Goal

Implement multi-select file operations in the existing `FileListScreen` and a private vault protected by Android biometric authentication with a PIN fallback. Moving Audio, Video, Photo, or PDF files into the vault must move them from public storage into the app's private internal sandbox (`RNFS.DocumentDirectoryPath/vault/`), record the original path in SQLite's `private_vault_files` table, remove them from the public `files_index`, and support restoring them to their original location.

**Project assumptions:** React Native CLI + TypeScript, Android-first, existing `react-native-fs`/RNFS utilities where present, `react-native-biometrics`, OP-SQLite, and the existing `files_index` / `private_vault_files` schema. Inspect the actual repository and APIs before implementation. Do not create duplicate storage/database instances.

## Required paths from `Tasks.md`

- `src/features/vault/PrivateVaultService.ts`
- `src/features/vault/PrivateVaultScreen.tsx`
- `src/features/browser/services/FileBatchOperations.ts`

Additional components, tests, and migration changes may be added only where required by existing conventions.

---

## Subtask 1 — Inspect current file, storage, and biometric architecture

### Copy-paste AI coding prompt

> Inspect the existing Kinetix repository before editing. Review `package.json`, React Native/Android configuration, file browser and `FileListScreen`, file record types, `FileRepository`, SQLite client/migrations, `private_vault_files` and `files_index` schemas, file permission utilities, filesystem/RNFS wrapper, navigation, theme, and existing dialogs/sheets. Verify the installed-version API and New Architecture compatibility of `react-native-biometrics`. Check whether `react-native-fs` or an equivalent filesystem dependency is already installed and reuse it. Summarize the planned implementation, identify any schema gaps, and then make only necessary changes. Do not create parallel database clients, file repositories, or permission managers.

### Acceptance criteria

- Existing file/database/navigation conventions are identified and reused.
- Biometric and filesystem dependencies are compatible with the installed React Native version.
- Schema changes, if needed, are minimal and migration-safe.
- No unrelated packages or app architecture are replaced.

### Tests / verification

- Install only missing compatible dependencies.
- Run `tsc --noEmit`, lint, and Android debug build.
- Confirm the biometric native module links/compiles; mocked tests alone do not verify native setup.

---

## Subtask 2 — Implement biometric authentication and PIN fallback contract

### Copy-paste AI coding prompt

> Create a small typed authentication service for the private vault using `react-native-biometrics`. Inspect the library's installed API rather than guessing method names. Check whether biometric hardware and enrollment are available, then present the supported Android fingerprint/biometric prompt. The vault must remain locked if authentication fails, is cancelled, or is unavailable. Add a PIN fallback flow consistent with the app's security model; do not hard-code a PIN or store it in plaintext. If no secure PIN mechanism exists, implement a minimal safe fallback only after clearly separating PIN verification/storage from UI, and use an appropriate platform-backed secure mechanism if one is already available. Never log biometric results or PIN input. Return a typed authentication result for success, cancel, unavailable, and failure.

### Acceptance criteria

- Authentication outcomes are explicit and typed.
- Failed/cancelled/unavailable biometric authentication does not unlock the vault.
- PIN fallback does not use a hard-coded PIN or plaintext storage.
- Sensitive values are not logged.

### Tests / verification

- Jest tests for successful authentication, failed prompt, cancellation, unavailable biometrics, and PIN success/failure.
- Manually test biometric enrollment/availability on a real Android device.

---

## Subtask 3 — Build the vault filesystem and database service

### Copy-paste AI coding prompt

> Create `src/features/vault/PrivateVaultService.ts`. Reuse the existing RNFS/filesystem utility and SQLite client/repositories. Ensure the vault directory exists under `RNFS.DocumentDirectoryPath/vault/`. Define typed vault records that preserve the original file ID, original path, private vault path, file name, media category/type, and any metadata required to restore the file. Inspect the existing `private_vault_files` schema first and add a migration only if necessary. Implement repository-backed list/get/insert/delete operations with parameterized SQL. Treat vault paths as app-private; do not expose them through public file indexing or logs. Design move/restore operations so filesystem and database changes can be reconciled after partial failure.

### Acceptance criteria

- Vault directory is created safely and idempotently.
- Records use the existing `private_vault_files` table.
- Original path and stable identity are retained for restoration.
- SQL uses parameterized statements and existing database infrastructure.
- Partial operations can be detected and recovered without losing the only file copy.

### Tests / verification

- Unit tests for directory initialization and record mapping.
- SQLite integration tests for insert, query, and delete.
- Test handling of missing vault directory, duplicate records, and database errors.

---

## Subtask 4 — Implement safe move-to-vault transaction

### Copy-paste AI coding prompt

> Implement a `moveToVault` operation in `PrivateVaultService`. Validate that the source exists and is an eligible Audio, Video, Photo, or PDF file. Generate a collision-safe destination name inside the private vault while preserving the original extension. Move the file using the installed filesystem API and persist its original path and vault path in `private_vault_files`. Remove the public `files_index` entry only after the file move and vault record are safely committed. Since filesystem moves and SQLite transactions cannot be one atomic transaction, implement explicit rollback/recovery: if database persistence fails after the move, attempt to restore the file to its original path; if rollback fails, preserve enough state to recover and show a clear error rather than deleting data. Handle duplicate requests, destination collisions, and missing source files.

### Acceptance criteria

- File content is moved into the private internal directory.
- Vault record stores the exact original path and private path.
- Public index entry is removed only after successful vault persistence.
- Failures do not silently destroy the file or leave an untraceable move.
- Unsupported file categories are rejected with a clear result.

### Tests / verification

- Mock RNFS move operations and SQLite repository methods.
- Test successful move, missing source, duplicate request, destination collision, database failure with successful rollback, and rollback failure.
- Verify the public `files_index` row is removed only on successful completion.

---

## Subtask 5 — Implement restore-to-original-folder operation

### Copy-paste AI coding prompt

> Add `restoreFromVault` to `PrivateVaultService`. Read the vault record, verify the private file exists, and restore it to the exact original directory and filename. If the original directory no longer exists, offer a safe, explicit fallback destination instead of silently changing the restore location. If a file with the original name already exists, ask the caller to choose a non-destructive conflict policy (for example, cancel or restore with a new name); never overwrite without explicit user consent. Reinsert/update the public `files_index` record using existing repository conventions and remove the vault database record only after the restored file and public index are safely handled. Add rollback/recovery behavior for partial failures.

### Acceptance criteria

- Restored file returns to its original path when possible.
- Filename conflicts never silently overwrite an existing file.
- Vault record is retained if restore fails.
- Public index is updated consistently with the restored file.
- Failure outcomes allow retry without losing the vault copy.

### Tests / verification

- Test successful restore and exact original path.
- Test missing vault file, missing original directory, destination collision, DB failure, and rollback behavior.
- Verify public index row is re-created and vault record removed only after successful restore.

---

## Subtask 6 — Build `FileBatchOperations` service

### Copy-paste AI coding prompt

> Create or extend `src/features/browser/services/FileBatchOperations.ts` for multi-file operations. Support Delete, Share, Rename, File Properties, Favorite, Add to Playlist, and Move to Private Vault, using existing service/repository APIs where available. Use typed operation results and handle partial success in a batch: report succeeded, failed, and skipped items separately. For destructive actions, require confirmation at the UI layer and do not delete or move files until the user confirms. Route vault operations through `PrivateVaultService`; do not duplicate its file-moving logic. Preserve the original item IDs and ensure list/index updates stay synchronized. Reuse existing share, favorite, playlist, and file-property flows rather than reimplementing them.

### Acceptance criteria

- All requested batch actions are represented and wired to existing services.
- Batch results report partial success without claiming all items succeeded.
- Destructive actions require confirmation.
- Vault behavior uses `PrivateVaultService`.
- File list/index state updates after successful operations.

### Tests / verification

- Jest tests for each operation dispatch.
- Test mixed batches with successful, failed, and skipped items.
- Verify confirmation cancellation causes no mutation.
- Verify moving multiple eligible files to the vault calls the vault service for each selected file.

---

## Subtask 7 — Add multi-select mode to `FileListScreen`

### Copy-paste AI coding prompt

> Extend the existing `FileListScreen` with multi-select mode. Support long-press to select an item, visible selection state, selecting additional items, select-all where appropriate, clearing selection, and an action toolbar/sheet for Delete, Share, Rename, File Properties, Favorite, Add to Playlist, and Move to Private Vault. Reuse existing list/grid components, theme, icons, and bottom-sheet/dialog patterns. Make selection work with both list and grid layouts and avoid triggering the normal open-file action while in selection mode. For operations that only support one file (such as Rename or File Properties if the existing implementation requires it), disable them for multi-selection or present a clear constraint rather than applying an ambiguous action.

### Acceptance criteria

- Long-press enters selection mode.
- Additional taps toggle selected items without opening them.
- Selection count and selected styling are clear in list and grid views.
- All requested batch actions are available with sensible single/multi-item constraints.
- Clearing selection returns to normal browsing mode.

### Tests / verification

- RNTL tests for entering selection mode, selecting/deselecting items, selection count, and exit behavior.
- Test action toolbar availability for one versus multiple selected items.
- Test invoking Move to Private Vault calls the batch service and updates the visible list after success.

---

## Subtask 8 — Build authenticated `PrivateVaultScreen`

### Copy-paste AI coding prompt

> Create `src/features/vault/PrivateVaultScreen.tsx`. On every fresh screen entry, begin in a locked state and call the biometric authentication service. Do not render vault file names, thumbnails, metadata, or playable content until `simplePrompt()` (or the established wrapper around it) resolves with `{ success: true }`. If authentication fails or is cancelled, show a locked/ retry state and keep the file list hidden. Add a PIN fallback action when appropriate. After authentication succeeds, load records through `PrivateVaultService`, show vault items using existing file UI where safe, and support playback/opening for vaulted Audio, Video, Photo, and PDF files from their private paths. Add Restore to Original Folder and a safe remove/restore confirmation flow. Re-lock when leaving the screen and when app lifecycle/security conventions require it; do not retain decrypted/sensitive content in global state unnecessarily.

### Acceptance criteria

- Vault contents remain hidden until authentication success.
- `simplePrompt()` resolving `{ success: true }` unlocks the screen.
- Failure/cancel leaves vault contents hidden.
- Vaulted media opens from its private path.
- Restore action returns the file using `restoreFromVault`.

### Tests / verification

- RNTL test asserts vault items are not rendered before authentication resolves.
- Test success result `{ success: true }` reveals the vault list.
- Test failure/cancel keeps contents hidden.
- Test restore action calls `restoreFromVault` and refreshes the list.

---

## Subtask 9 — Integrate navigation, lifecycle, and privacy edge cases

### Copy-paste AI coding prompt

> Integrate `PrivateVaultScreen` into the existing navigation without creating duplicate navigation infrastructure. Add the vault entry point in the appropriate existing UI and ensure Android Back returns safely while the vault re-locks. Handle app backgrounding, screen unmount, authentication cancellation, missing/deleted files, duplicate names, low storage, permission errors, and interrupted move/restore operations. Confirm moved files disappear from the app's public `files_index` and are no longer exposed by the app's public media list; do not claim that moving a file necessarily erases every previously generated thumbnail or third-party cache unless those caches are explicitly handled. Clean up stale thumbnails/cache entries when supported by the existing app. Ensure error messages do not disclose sensitive vault contents on the lock screen.

### Acceptance criteria

- Vault navigation follows existing app structure.
- Screen re-locks on exit and relevant lifecycle transitions.
- Public file lists no longer show successfully vaulted files.
- Interrupted operations are recoverable and do not silently lose data.
- Lock-state UI does not reveal private file details.

### Tests / verification

- Tests for back/navigation and re-lock behavior.
- Tests for stale/missing files and interrupted operation recovery.
- Verify public `files_index` and vault repository stay consistent after move/restore.
- Manual test app backgrounding while the vault is open.

---

## Subtask 10 — End-to-end tests and real-device verification

### Copy-paste AI coding prompt

> Complete Task 16 by running the project's TypeScript, lint, Jest, and Android build checks. Add integration tests that mock `react-native-biometrics` and `RNFS.moveFile`: moving a file to the vault must create a `private_vault_files` record, remove it from public `files_index`, and `restoreFromVault()` must reverse those changes. Test that `PrivateVaultScreen` blocks rendering vault files until `simplePrompt()` resolves with `{ success: true }`. On a real Android phone, long-press a video and a PDF in `FileListScreen`, select Move to Private Vault, authenticate with fingerprint/biometric, verify they disappear from the app's public list and expected public gallery/file-browser views, then play/open them from inside the vault. Restore one file and verify it returns to the exact original folder. Record Android version and actual results; do not claim third-party apps or media databases refresh instantly if the platform delays indexing.

### Acceptance criteria

- Automated move/restore and authentication-gating tests pass.
- TypeScript/lint/build checks pass or pre-existing failures are documented.
- Vaulted files are private to the app's internal directory.
- Public index and vault records stay consistent.
- Restored files return to their original folder without overwriting existing files.

### Tests / verification checklist

- [ ] Mock biometric success, failure, cancellation, and unavailable hardware.
- [ ] Move-to-vault integration test: private file + DB record + public index removal.
- [ ] Restore integration test: original path + public index restoration + vault record removal.
- [ ] Screen test: vault list hidden until `{ success: true }`.
- [ ] Batch selection and operation result tests.
- [ ] Real device: long-press video and PDF, authenticate, move to vault.
- [ ] Verify vaulted media opens inside the vault.
- [ ] Restore to original folder and verify the restored file.
- [ ] Test filename collision and cancelled authentication.
