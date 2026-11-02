---
'@use-voltra/android': minor
'@use-voltra/android-client': minor
'@use-voltra/android-server': minor
---

Android ongoing notification actions can now run your JavaScript instead of opening the app. Give `AndroidOngoingNotification.Action` an `actionId` instead of a `deepLinkUrl`, and a press sends an `interaction` event with the action's `actionId`, its `payload`, the `notificationId` and the notification's `revision`. Register the listener with `addVoltraListener('interaction')` at module scope: when the app is in the background or not running, Voltra runs your JavaScript in the background, without opening the app, and waits for the promise your listener returns.

An event action can take a `remoteInput` for a direct reply in the notification shade. The reply arrives in the event as `reply`, and the notification is refreshed right away so the reply spinner clears. Both action forms accept `authenticationRequired` (Android 12+) and `semanticAction` (Android 9+). `getAndroidOngoingNotificationCapabilities()` reports whether the device applies them.

`addVoltraListener('notificationDismissed')` reports when the user swipes a notification away or its timeout removes it, and `addVoltraListener('notificationTapped')` reports when a tap on the notification opens your app.

With `enableNotifications`, the Expo plugin now also adds the action receiver, a short background service for that run, and the `FOREGROUND_SERVICE` and `WAKE_LOCK` permissions. Events that find no listener are kept for 15 minutes.

Existing deep link actions are unchanged. App builds from before this release cannot parse an action with `actionId`, so keep sending deep-link-only actions to them from your server.
