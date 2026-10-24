# Android Ongoing Notifications

Use this reference for Android ongoing notifications and their remote update flow.

## Domain Rules

- This API is experimental.
- Use it for app-driven persistent notifications such as deliveries, rides, workouts, and timers.
- Add `enableNotifications: true` to the Android plugin config before using the API.
- Create the target notification channel before starting a notification.
- Request notification permission on Android 13+.
- Remote updates depend on your push provider plus a background task in the app.
- On Android 14+ the user can swipe any ongoing notification away; no foreground service type prevents it.
- To keep the process alive, declare `ongoingNotificationForegroundService.types` in the plugin config and pass `foregroundService: { type }` to start or upsert. One notification per app can hold the service.
- Do not claim APNS support here.

## Runtime APIs

- `startAndroidOngoingNotification`
- `updateAndroidOngoingNotification`
- `upsertAndroidOngoingNotification`
- `stopAndroidOngoingNotification`
- `endAllAndroidOngoingNotifications`
- `useAndroidOngoingNotification`
- `AndroidOngoingNotification`
- `getAndroidOngoingNotificationStatus`
- `getAndroidOngoingNotificationCapabilities`
- `getAndroidOngoingNotificationHandle`
- `handleAndroidOngoingNotificationPush`
- `parseAndroidOngoingNotificationPush`
- `openAndroidNotificationSettings`

## Server Rendering

Use `@use-voltra/android-server` in backend code.

- `renderAndroidOngoingNotificationPayloadToJson`
- `renderAndroidOngoingNotificationPayload`
- `createAndroidOngoingNotificationPushEnvelope`

## Remote Updates

1. Build the message on the server with `createAndroidOngoingNotificationPushEnvelope()`, with a growing `revision`.
2. Send it as `data.voltraOngoingNotification` through your push provider.
3. Call `handleAndroidOngoingNotificationPush(data, { ensureChannel })` in the background task. It never throws, and drops out-of-order messages as `stale_revision`.

## Sources

- `https://use-voltra.dev/android/development/managing-ongoing-notifications`
