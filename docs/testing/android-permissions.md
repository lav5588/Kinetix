# Android Permissions Manual Test Checklist

## Scope

This checklist covers the Android storage/media permission flow for Kinetix across API 29, 30, 32, 33, 34, and 35.

## Core checks

- Android 10 (API 29): confirm the app requests `READ_EXTERNAL_STORAGE` and does not show the All Files Access settings flow.
- Android 11–12 (API 30–32): confirm `READ_EXTERNAL_STORAGE` remains the runtime permission and the All Files Access setting is offered separately.
- Android 13–15 (API 33–35): confirm granular media permissions (`READ_MEDIA_AUDIO`, `READ_MEDIA_VIDEO`, `READ_MEDIA_IMAGES`) are requested and the All Files Access toggle remains separate.
- Deny permission once, return to the app, and confirm the app remains in a recoverable state without getting stuck in a loading spinner.
- Block or permanently deny permission via Android Settings, then reopen the app and confirm the "Open App Settings" CTA appears.
- Grant permission through Android Settings and return to the app; confirm the state refreshes and the gate transitions to the ready state when applicable.
- Toggle All Files Access on/off in Android Settings and confirm the app updates the status after returning to the foreground.

## Known limitations

- `MANAGE_EXTERNAL_STORAGE` is a special Android settings capability, not a normal runtime permission.
- Google Play policy and app eligibility for broad All Files Access must be reviewed separately before publishing; a manifest declaration alone does not imply Play Store approval.
- Some OEM custom Android builds may surface different permission wording or settings flows.
