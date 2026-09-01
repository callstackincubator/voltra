---
'@use-voltra/android-client': patch
---

Fixed a crash on Android 7.0–8.0 (API 24–25) devices when starting or updating
an ongoing notification: the module now falls back to the pre-notification-channel
`Notification.Builder` constructor on those OS versions instead of calling an
API 26-only constructor. The module's declared minimum SDK version is now
honestly 24 (matching what it actually supports) instead of a `31` fallback
that Expo hosts never applied, and apps below that floor now fail the Gradle
build with a clear error instead of a cryptic manifest-merger failure.
