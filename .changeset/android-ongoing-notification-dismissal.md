---
'@use-voltra/android-client': patch
---

`useAndroidOngoingNotification()` now reports `isActive: false` when the user swipes the notification away, when it times out, or when other code in the app stops it. Before, it kept reporting the notification as active. Starting a notification again after a dismissal now works without stopping it first, including with the same `notificationId`. Updates and upserts still refuse to bring a dismissed notification back. With `autoStart`, the hook posts once on mount and no longer re-posts after a dismissal or after `end()`.
