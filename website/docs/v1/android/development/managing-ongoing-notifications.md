# Managing Android Ongoing Notifications

:::warning Experimental API
Android ongoing notifications are **experimental**. The API may change in future releases.
:::

Voltra supports Android ongoing notifications for local, app-driven status updates such as deliveries, rides, workouts, or timers.

Use this API when you want to:

- start a persistent notification from your app
- update its content over time
- stop it when the task ends
- add action buttons that open deep links in your app

Voltra also supports remote updates if your app receives push notifications in the background and forwards the payload to the ongoing notification APIs.

## Server-side rendering support

Voltra already provides a server-side API for converting JSX into the semantic payload used by Android ongoing notifications.

Use these APIs only in server-side or backend code. Do not import them from your React Native app runtime.

Use `voltra/android/server`.

The main renderer APIs are:

- `renderAndroidOngoingNotificationPayloadToJson()` returns an object
- `renderAndroidOngoingNotificationPayload()` returns a JSON string

This API only renders the payload. Your server still needs to send that payload through your push provider, and your app still needs a background task that calls `upsertAndroidOngoingNotification()` or `stopAndroidOngoingNotification()` when the push arrives.

## Before you start

### 1. Enable notification manifest support

Add `android.enableNotifications` to the Voltra Expo plugin config:

```json
{
  "expo": {
    "plugins": [
      [
        "voltra",
        {
          "android": {
            "enableNotifications": true
          }
        }
      ]
    ]
  }
}
```

This adds the Android manifest entries required by Voltra's notification features.

See [Plugin Configuration](../api/plugin-configuration#androidenablenotifications-optional) for details.

### 2. Create a notification channel

`channelId` is required when starting an ongoing notification, and the channel must already exist.

If you use `expo-notifications`, you can create a channel like this:

```tsx
import * as Notifications from 'expo-notifications'

await Notifications.setNotificationChannelAsync('delivery_updates', {
  name: 'Delivery updates',
  importance: Notifications.AndroidImportance.DEFAULT,
})
```

### 3. Request notification permission on Android 13+

On Android 13 and above, posting notifications requires runtime permission.

```tsx
import {
  hasAndroidNotificationPermission,
  requestAndroidNotificationPermission,
} from 'voltra/android/client'

const granted =
  (await hasAndroidNotificationPermission()) || (await requestAndroidNotificationPermission())

if (!granted) {
  // Show your own UI explaining why notifications are needed.
}
```

### 4. If you want remote updates, register a background notification task

The playground app uses `expo-notifications` together with `expo-task-manager` to process real push notifications and update ongoing notifications in the background.

Register a background task early in app startup:

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

The example app does this during startup so that incoming pushes can update or stop an ongoing notification even when the app is backgrounded.

## Starting a notification

Voltra provides two built-in layouts:

- `AndroidOngoingNotification.Progress`
- `AndroidOngoingNotification.BigText`

### Progress notification

```tsx
import {
  AndroidOngoingNotification,
  startAndroidOngoingNotification,
} from 'voltra/android/client'

const result = await startAndroidOngoingNotification(
  <AndroidOngoingNotification.Progress
    title="Driver is on the way"
    text="Arriving in 8 minutes"
    value={32}
    max={100}
  />,
  {
    notificationId: 'order-123',
    channelId: 'delivery_updates',
    deepLinkUrl: 'myapp://orders/123',
  }
)

if (result.ok) {
  console.log('Started:', result.notificationId)
}
```

### Big text notification

```tsx
import {
  AndroidOngoingNotification,
  startAndroidOngoingNotification,
} from 'voltra/android/client'

await startAndroidOngoingNotification(
  <AndroidOngoingNotification.BigText
    title="Match delayed"
    text="Rain delay in effect"
    bigText="Play will resume once weather conditions improve."
  />,
  {
    notificationId: 'match-42',
    channelId: 'sports_updates',
  }
)
```

## Updating a notification

Use the same `notificationId` to update an existing notification.

```tsx
import {
  AndroidOngoingNotification,
  updateAndroidOngoingNotification,
} from 'voltra/android/client'

await updateAndroidOngoingNotification(
  'order-123',
  <AndroidOngoingNotification.Progress
    title="Driver is almost there"
    text="Arriving in 2 minutes"
    value={85}
    max={100}
  />
)
```

`updateAndroidOngoingNotification()` returns a result object. If the notification no longer exists, it returns `reason: 'not_found'` or `reason: 'dismissed'`.

## Starting or updating with one call

If your app may re-enter the same flow multiple times, `upsertAndroidOngoingNotification()` can be easier than separate start/update logic.

```tsx
import {
  AndroidOngoingNotification,
  upsertAndroidOngoingNotification,
} from 'voltra/android/client'

const result = await upsertAndroidOngoingNotification(
  <AndroidOngoingNotification.Progress
    title="Workout in progress"
    text="18 minutes elapsed"
    value={18}
    max={45}
  />,
  {
    notificationId: 'workout-1',
    channelId: 'fitness_updates',
  }
)

if (result.ok) {
  console.log(result.action) // 'started' or 'updated'
}
```

This API is especially useful for remote updates, where the same incoming push may need to create the notification the first time and update it later.

## Stopping a notification

```tsx
import { stopAndroidOngoingNotification } from 'voltra/android/client'

await stopAndroidOngoingNotification('order-123')
```

To dismiss every active Voltra ongoing notification at once:

```tsx
import { endAllAndroidOngoingNotifications } from 'voltra/android/client'

await endAllAndroidOngoingNotifications()
```

## Hook API

For React screens and flows, use `useAndroidOngoingNotification()`.

```tsx
import { AndroidOngoingNotification } from 'voltra/android'
import { useAndroidOngoingNotification } from 'voltra/android/client'

function DeliveryNotification({ orderId, etaMinutes }) {
  const { start, update, end, isActive } = useAndroidOngoingNotification(
    <AndroidOngoingNotification.Progress
      title="Delivery update"
      text={`Arriving in ${etaMinutes} minutes`}
      value={100 - etaMinutes}
      max={100}
    />,
    {
      notificationId: `order-${orderId}`,
      channelId: 'delivery_updates',
      deepLinkUrl: `myapp://orders/${orderId}`,
      autoStart: true,
      autoUpdate: true,
    }
  )

  return null
}
```

The hook returns:

- `start()`
- `update()`
- `end()`
- `isActive`

Use `autoStart` to create the notification when the component mounts, and `autoUpdate` to refresh it when the JSX content changes.

## Action buttons

You can add action buttons as children of `Progress` or `BigText`.

```tsx
import { AndroidOngoingNotification } from 'voltra/android/client'

<AndroidOngoingNotification.Progress title="Driver is approaching" value={32} max={100}>
  <AndroidOngoingNotification.Action
    title="Open order"
    deepLinkUrl="myapp://orders/123"
  />
  <AndroidOngoingNotification.Action
    title="Track driver"
    deepLinkUrl="myapp://orders/123/track"
  />
</AndroidOngoingNotification.Progress>
```

Action buttons currently:

- open the provided deep link
- can be used with `Progress` and `BigText`
- support an optional `icon`

```tsx
<AndroidOngoingNotification.Action
  title="Open order"
  deepLinkUrl="myapp://orders/123"
  icon={{ assetName: 'order_icon' }}
/>
```

Android may not show action icons in the standard notification UI, so treat them as optional enhancement rather than a guaranteed visual element.

## Remote updates

Voltra can apply remote ongoing-notification updates if your app receives a push notification and handles it in a background task.

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
} from 'voltra/android/server'

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

The playground app expects `data.voltraOngoingNotification` to contain:

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

The playground app accepts either an object or a JSON string for `data.voltraOngoingNotification`. Stringifying it is often the safest option when sending through push providers.

To stop the notification remotely, send the same `notificationId` with `operation: "stop"` and omit `payload`.

### 3. Apply the payload in your background task

```tsx
import * as Notifications from 'expo-notifications'
import * as TaskManager from 'expo-task-manager'
import {
  stopAndroidOngoingNotification,
  upsertAndroidOngoingNotification,
} from 'voltra/android/client'

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

Your background task should ensure that the target notification channel exists before calling `upsertAndroidOngoingNotification()`. The playground app creates the channel on startup and also ensures it exists again inside the background handler.

### Important notes

- Voltra does include a server-side JSX-to-payload renderer for Android ongoing notifications.
- Remote updates depend on your push provider and app-level background notification setup.
- Voltra provides the ongoing-notification rendering and lifecycle APIs, but your app is responsible for receiving the push and invoking those APIs.
- `upsertAndroidOngoingNotification()` is the easiest entry point for remote updates because it can create or update the notification with the same payload path.
- If your push provider serializes nested objects as strings, parse `data.voltraOngoingNotification` before passing it to Voltra.

## Main tap behavior

Use `deepLinkUrl` in the start or update options to control what happens when the user taps the main notification body:

```tsx
await startAndroidOngoingNotification(content, {
  notificationId: 'order-123',
  channelId: 'delivery_updates',
  deepLinkUrl: 'myapp://orders/123',
})
```

This is separate from action button deep links.

## Status and capability helpers

Use these helpers to adapt your UI to the device state:

```tsx
import {
  canPostPromotedAndroidNotifications,
  getAndroidOngoingNotificationCapabilities,
  getAndroidOngoingNotificationStatus,
  openAndroidNotificationSettings,
} from 'voltra/android/client'

const status = getAndroidOngoingNotificationStatus('order-123')
const capabilities = getAndroidOngoingNotificationCapabilities()
const canPostPromoted = canPostPromotedAndroidNotifications()

if (!capabilities.notificationsEnabled) {
  await openAndroidNotificationSettings()
}
```

Useful values include:

- `status.isActive`
- `status.isDismissed`
- `capabilities.notificationsEnabled`
- `capabilities.supportsPromotedNotifications`
- `capabilities.canPostPromotedNotifications`
- `capabilities.canRequestPromotedOngoing`

## Promoted ongoing notifications

If your app wants to request promoted ongoing presentation when the device supports it, pass `requestPromotedOngoing: true`:

```tsx
await startAndroidOngoingNotification(content, {
  notificationId: 'ride-44',
  channelId: 'ride_updates',
  requestPromotedOngoing: true,
})
```

You can also set `fallbackBehavior` if promoted presentation is unavailable:

```tsx
await startAndroidOngoingNotification(content, {
  notificationId: 'ride-44',
  channelId: 'ride_updates',
  requestPromotedOngoing: true,
  fallbackBehavior: 'standard',
})
```

Check device support first with `getAndroidOngoingNotificationCapabilities()` if you want to tailor the UX.

## Current limitations

- Remote updates require your own push delivery and background task integration.
- Your app must create the Android notification channel before starting a notification.
- Notification permission still needs to be requested by your app on Android 13+.
- Action buttons open deep links. They are not a JavaScript event system.
