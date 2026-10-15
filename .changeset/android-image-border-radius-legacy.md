---
'@use-voltra/android-client': patch
---

`borderRadius` on an Android `Image` with a fixed `width` and `height` now rounds its corners on Android 11 and older too, instead of being ignored below Android 12. The corners match what Android 12+ draws for the same `contentScale`.
