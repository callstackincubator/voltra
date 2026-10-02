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
Live Update promotion. The metric layout is used when the app compiles
against SDK 37; apps that compile against SDK 36 keep building and get the text fallback.
