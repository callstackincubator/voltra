---
'@use-voltra/android-client': patch
---

Android apps no longer crash on launch in release builds with R8 minification
enabled. Voltra now ships the keep rules WorkManager needs to initialize.
