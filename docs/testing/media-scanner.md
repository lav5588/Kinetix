# Media Scanner Device Validation

Run this checklist on real Android devices or emulators covering API 29–35 (Android 10–15). Use a library containing at least 2,000 photos, 500 songs, 50 videos, and 100 PDFs where possible. Do not estimate scan performance: record timings measured on the device.

## Test record

| Field | Value |
|---|---|
| Device / model | |
| Android version / API level | |
| Kinetix build / commit | |
| Test date | |
| Library totals: photos / audio / video / PDFs / other docs | |
| Permission state: media / All Files Access | |
| Scan type: first / repeated / after library changes | |
| Elapsed time (measured) | |
| Discovered / indexed / skipped | |
| Indexed counts: photos / audio / video / PDFs / other docs | |
| Device capacity: used / free / total (GB) | |
| Android Settings capacity shown (GB) | |
| Errors / partial sources | |

## Scenarios

- [ ] Grant each requested media permission and run an initial scan. Record elapsed time and the category totals above; confirm the UI remains responsive.
- [ ] Compare category totals and folder item/byte totals with a known sample from the library.
- [ ] Include a mixed-media directory, hidden directory (including `.nomedia`), WhatsApp/Telegram media folders, duplicate MediaStore entries, short audio, PDFs, and other supported documents. Verify each is classified, filtered, and counted as expected.
- [ ] Run the same scan again. Confirm no duplicate file or FTS records are created and favorites/vault flags remain unchanged.
- [ ] Change or remove a file, then run a fully accessible scan. Confirm stale rows are reconciled only after the complete scan succeeds.
- [ ] Deny media permission and separately deny All Files Access. Confirm inaccessible sources are reported, the last complete index remains intact, and a partial run is not promoted.
- [ ] Cancel a scan after it has begun staging. Confirm the live index and FTS remain unchanged and the status is cancelled.
- [ ] Cause or simulate a recoverable collection error and a database failure. Confirm partial/error status and that the prior complete index remains usable.
- [ ] Compare device capacity with Android Storage Settings. The native measurement describes the internal data volume; Settings can round values and account for system-reserved space differently. Record the observed difference; do not expect exact equality.
- [ ] Open Android Settings to change permissions, return to Kinetix, and confirm permission status refreshes without automatically starting a scan.
- [ ] Repeat on each supported API/device configuration and retain the completed test record with any known limitations.

## Automated checks

Run `npm run typecheck`, `npm run lint`, and `npm test -- --runInBand`. Build Android with `cd android && .\\gradlew.bat assembleDebug` on Windows (or `./gradlew assembleDebug` on macOS/Linux).
