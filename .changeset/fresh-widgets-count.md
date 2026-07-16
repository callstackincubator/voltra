---
'@use-voltra/android-client': minor
'@use-voltra/ios-client': minor
---

Add `updateAndroidDynamicWidget` and `updateDynamicWidget` for updating entry-based Android and iOS Dynamic Widgets with typed, JSON-serializable runtime props. Each platform persists the latest props by Dynamic Widget ID and uses them for subsequent renders.

Rebuild the native Android and iOS apps after upgrading so the new TurboModule methods and native props persistence are included.
