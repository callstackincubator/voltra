---
'@use-voltra/android': minor
'@use-voltra/android-client': minor
---

Android ongoing notifications can now be presented the way the platform allows: choose lock-screen
visibility with a public version for the private content, an accent color, a notification category, a
timeout that removes a stale notification, local-only delivery, and a group with a sort key. Updates
can re-alert once with `alert`, and `showWhen` keeps a timestamp for ordering without showing it.
