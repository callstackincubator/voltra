# Android Ongoing Notifications

Use this reference for Android ongoing notifications and their remote update flow.

## Domain Rules

- This API is experimental.
- Use it for app-driven persistent notifications such as deliveries, rides, workouts, and timers.
- Add `enableNotifications: true` to the Android plugin config before using the API.
- Create the target notification channel before starting a notification.
- Request notification permission on Android 13+.
- Remote updates depend on your push provider plus a background task in the app.
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
- `openAndroidNotificationSettings`

## Server Rendering

Use `@use-voltra/android-server` in backend code.

- `renderAndroidOngoingNotificationPayloadToJson`
- `renderAndroidOngoingNotificationPayload`

## Remote Updates

1. Render the payload on the server.
2. Send it through your push provider.
3. Parse the push in a background task.
4. Call `upsertAndroidOngoingNotification()` or `stopAndroidOngoingNotification()`.

## Sources

- `https://use-voltra.dev/android/development/managing-ongoing-notifications`
