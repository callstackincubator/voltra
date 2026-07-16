---
'@use-voltra/android-client': minor
---

Add `updateAndroidDynamicWidget` for updating entry-based Android Dynamic Widgets with typed, JSON-serializable runtime props. The latest props are persisted by Dynamic Widget ID and used for subsequent renders.

Rebuild the native Android app after upgrading so the new TurboModule method and native props persistence are included.
