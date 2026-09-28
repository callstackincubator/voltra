---
'@use-voltra/android': minor
'@use-voltra/android-client': minor
'@use-voltra/android-server': patch
---

New `AndroidOngoingNotification.Metric` layout for ongoing notifications: up to three
readings (numbers, text, clock times, live timers and stopwatches) with a highlighted
critical metric and a semantic style (`info`, `safe`, `caution`, `danger`). It renders as
the Android 17 metric notification, and as a plain notification whose text line joins the
readings on older versions — the result then says `styleFallback: 'standard'` so apps and
remote update handlers can tell. Metric notifications don't need a title to be eligible for
Live Update promotion. Because the metric style compiles against API 37, apps using
`@use-voltra/android-client` must now build with `compileSdkVersion` 37 (the Gradle error
names the requirement when it's lower).
