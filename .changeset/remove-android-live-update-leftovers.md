---
'@use-voltra/android': minor
'@use-voltra/android-client': minor
---

Removed the unused `renderAndroidLiveUpdateToJson()` and `renderAndroidLiveUpdateToString()` functions and the `AndroidLiveUpdate*` types from `@use-voltra/android`, and their re-exports from `@use-voltra/android-client`. **Breaking:** these exports are gone. They were left over from an abandoned renderer, and nothing on the device could ever display their output. Android 16 Live Updates through `requestPromotedOngoing` are unaffected. Payloads that still carry the removed keys keep rendering.
