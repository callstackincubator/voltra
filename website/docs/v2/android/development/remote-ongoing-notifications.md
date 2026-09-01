# Remote Ongoing Notifications (Android)

:::warning Experimental API
Android ongoing notifications are **experimental**. The API may change in future releases.
:::

Voltra can apply remote updates to an ongoing notification when your app receives a push notification and handles it in a background task. This builds on the local lifecycle API — see [Managing Ongoing Notifications](./managing-ongoing-notifications) first for creating the notification channel, requesting permission, and the start/update/stop APIs.

## Server-side rendering support

Voltra provides a server-side API for converting JSX into the semantic payload used by Android ongoing notifications.

Use these APIs only in server-side or backend code. Do not import them from your React Native app runtime.

Use `@use-voltra/android-server`.

The main renderer APIs are:

- `renderAndroidOngoingNotificationPayloadToJson()` returns an object
- `renderAndroidOngoingNotificationPayload()` returns a JSON string

This API only renders the payload. Your server still needs to send that payload through your push provider, and your app still needs a background task that calls `upsertAndroidOngoingNotification()` or `stopAndroidOngoingNotification()` when the push arrives.

## Register a background notification task

You should use `expo-notifications` together with `expo-task-manager` to process real push notifications and update ongoing notifications in the background.

Register a background task early in app startup, so incoming pushes can update or stop an ongoing notification even when the app is backgrounded:

```tsx
import * as Notifications from 'expo-notifications'
import * as TaskManager from 'expo-task-manager'

const TASK_NAME = 'voltra-ongoing-notification-task'

TaskManager.defineTask(TASK_NAME, async ({ data, error }) => {
  if (error) {
    return
  }

  // Read your push payload and call Voltra APIs here.
})

await Notifications.registerTaskAsync(TASK_NAME)
```

## The remote update flow

The end-to-end flow is:

1. Your server renders Voltra JSX into an Android ongoing-notification payload.
2. Your server sends a high-priority push notification.
3. The push `data` contains a `voltraOngoingNotification` object.
4. Your background task parses that object.
5. The task calls `upsertAndroidOngoingNotification()` or `stopAndroidOngoingNotification()`.

### 1. Render the payload on your server

Use `renderAndroidOngoingNotificationPayloadToJson()` when preparing a payload on your server or in app tooling:

```tsx
import {
  AndroidOngoingNotification,
  renderAndroidOngoingNotificationPayloadToJson,
} from '@use-voltra/android-server'

const payload = renderAndroidOngoingNotificationPayloadToJson(
  <AndroidOngoingNotification.Progress
    title="Driver is approaching"
    text="2 stops away"
    value={80}
    max={100}
  >
    <AndroidOngoingNotification.Action
      title="Open order"
      deepLinkUrl="myapp://orders/123"
    />
  </AndroidOngoingNotification.Progress>
)
```

Then send that payload inside a push message.

If your push provider expects strings for nested payload data, use `renderAndroidOngoingNotificationPayload()` instead and send the JSON string directly.

### 2. Send the payload through your push provider

Your payload's `data.voltraOngoingNotification` should contain:

- `notificationId`: the stable notification identifier
- `operation`: `'upsert'` or `'stop'`
- `options`: start options such as `channelId`, `smallIcon`, `deepLinkUrl`, `requestPromotedOngoing`, or `fallbackBehavior`
- `payload`: the Voltra semantic payload for `'upsert'`

Example Expo push request:

```json
{
  "to": "ExponentPushToken[project-token]",
  "priority": "high",
  "data": {
    "voltraOngoingNotification": "{\"notificationId\":\"order-123\",\"operation\":\"upsert\",\"options\":{\"channelId\":\"delivery_updates\",\"deepLinkUrl\":\"myapp://orders/123\",\"requestPromotedOngoing\":true},\"payload\":{\"v\":1,\"kind\":\"progress\",\"title\":\"Driver is approaching\",\"text\":\"2 stops away\",\"value\":80,\"max\":100}}"
  }
}
```

Voltra accepts either an object or a JSON string for `data.voltraOngoingNotification`. Stringifying it is often the safest option when sending through push providers.

To stop the notification remotely, send the same `notificationId` with `operation: "stop"` and omit `payload`.

### 3. Apply the payload in your background task

```tsx
import * as Notifications from 'expo-notifications'
import * as TaskManager from 'expo-task-manager'
import {
  stopAndroidOngoingNotification,
  upsertAndroidOngoingNotification,
} from '@use-voltra/android-client'

const TASK_NAME = 'voltra-ongoing-notification-task'

const parseMessage = (value: unknown) => {
  if (typeof value === 'string') {
    try {
      return JSON.parse(value)
    } catch {
      return null
    }
  }

  return value
}

TaskManager.defineTask(TASK_NAME, async ({ data, error }) => {
  if (error) {
    return
  }

  const message = parseMessage(data?.voltraOngoingNotification)
  if (!message || typeof message !== 'object') {
    return
  }

  const notificationId = typeof message.notificationId === 'string' ? message.notificationId : null
  if (!notificationId) {
    return
  }

  if (message.operation === 'stop') {
    await stopAndroidOngoingNotification(notificationId)
    return
  }

  if (!message.payload || !message.options?.channelId) {
    return
  }

  await upsertAndroidOngoingNotification(message.payload, {
    ...message.options,
    notificationId,
  })
})

await Notifications.registerTaskAsync(TASK_NAME)
```

### Channel setup for remote updates

Your background task should ensure that the target notification channel exists before calling `upsertAndroidOngoingNotification()`. Create the channel on startup, and also ensure it exists again inside the background handler.
