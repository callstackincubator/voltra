---
'@use-voltra/android-client': patch
---

On Android 16.0 devices, `canPostPromotedAndroidNotifications()` and promotion results no longer
report the promoted-notification permission as missing. `POST_PROMOTED_NOTIFICATIONS` only exists
from Android 16 QPR2, so Live Updates on Android 16.0 were reported as unavailable and
`promotion.reasons` listed `permission_not_declared` even when the app declared it.
