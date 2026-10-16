---
'@use-voltra/android-client': patch
---

`useAndroidOngoingNotification()` now reports `isActive: false` when the user swipes the notification away, when it times out, or when other code in the app stops it. Before, it kept reporting the notification as active.

`startAndroidOngoingNotification()` and the hook's `start()` now post again after a dismissal or timeout, including with the same `notificationId`. Before, they returned `already_exists` until the notification was stopped. Updates and upserts still refuse to bring a dismissed notification back.

With `autoStart`, the hook posts when it mounts or when `autoStart` turns on. It no longer posts again right after a dismissal or after `end()` while the component stays mounted. On the next mount, it posts again.
