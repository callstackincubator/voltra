---
'@use-voltra/android-client': patch
---

Fixed a crash on Android 11 and older where requesting an immediate widget
server update (a refresh tap, `reloadAndroidWidgets`, or any settings change)
could crash the app within a second of scheduling it.
