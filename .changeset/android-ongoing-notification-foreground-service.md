---
'@use-voltra/android': minor
'@use-voltra/android-client': minor
'@use-voltra/android-server': minor
'voltra': minor
---

Android ongoing notifications can now keep the app alive with a foreground service. Declare the types you need with the new `ongoingNotificationForegroundService` config key (Expo plugin and `voltra apply`), then pass `foregroundService: { type }` when you start or upsert a notification. The result tells you whether the service attached and, if not, why. `getAndroidOngoingNotificationCapabilities()` now reports `isUserDismissible` (Android 14+ lets users swipe any ongoing notification away), `supportsForegroundService` and `foregroundServiceTypes`, and `getAndroidOngoingNotificationHandle()` lets an app's own foreground service carry the notification.

Remote updates get a versioned push message. Build it with `createAndroidOngoingNotificationPushEnvelope()` on the server and apply it with `handleAndroidOngoingNotificationPush()` in the background task, which replaces the hand-written task body. Send a growing `revision` and the device drops messages that arrive out of order (`reason: 'stale_revision'`), including a late stop. `stopAndroidOngoingNotification()` takes an optional `{ revision }`.
