---
'@use-voltra/android': minor
'@use-voltra/android-client': minor
---

Removed the leftovers of the abandoned Android Live Updates renderer. **Breaking:**
`renderAndroidLiveUpdateToJson()` and `renderAndroidLiveUpdateToString()` and the
`AndroidLiveUpdate*` / `*AndroidLiveUpdate*` types are no longer exported from
`@use-voltra/android` (nor re-exported from `@use-voltra/android-client`); they never had a
native counterpart. On Android the widget and preview payload model drops the unused
`collapsed` / `expanded` nodes —
payloads that still carry those keys continue to parse (unknown keys are ignored) and
render their `variants` as before.
