---
title: "Remote Ongoing Notifications (Android)"
description: "Update Android ongoing notifications from push messages handled in a background task, with server-side rendering support."
---

Voltra can apply remote updates to an ongoing notification when your app receives a push notification and handles it in a background task. This builds on the local lifecycle API — see [Managing Ongoing Notifications](/android/development/managing-ongoing-notifications) first for creating the notification channel, requesting permission, and the start/update/stop APIs.

## Server-side rendering support

Voltra provides a server-side API for converting JSX into the semantic payload used by Android ongoing notifications.

Use these APIs only in server-side or backend code. Do not import them from your React Native app runtime.

Use `@use-voltra/android-server`.

The main renderer APIs are:

- `renderAndroidOngoingNotificationPayloadToJson()` returns an object
- `renderAndroidOngoingNotificationPayload()` returns a JSON string
- `createAndroidOngoingNotificationPushEnvelope()` builds the whole push message, payload included

These APIs only build the message. Your server still needs to send it through your push provider, and your app still needs a background task that calls `handleAndroidOngoingNotificationPush()` when the push arrives.

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

A picture works the same way:

```tsx
const payload = renderAndroidOngoingNotificationPayloadToJson(
  <AndroidOngoingNotification.BigPicture
    title="Parcel delivered"
    text="Left at the front door"
    picture={{ assetName: 'delivery_photo_123' }}
    summaryText="Order 123"
  />
)
```

```json
{
  "v": 1,
  "kind": "bigPicture",
  "title": "Parcel delivered",
  "text": "Left at the front door",
  "picture": {
    "assetName": "delivery_photo_123"
  },
  "summaryText": "Order 123"
}
```

An `inbox` payload carries its lines in the same shape:

```tsx
const payload = renderAndroidOngoingNotificationPayloadToJson(
  <AndroidOngoingNotification.Inbox
    title="3 stops remaining"
    lines={['12 Oak Street', '4 Elm Road', 'Depot']}
    summaryText="Route 7"
  />
)
```

```json
{
  "v": 1,
  "kind": "inbox",
  "title": "3 stops remaining",
  "text": "12 Oak Street",
  "lines": ["12 Oak Street", "4 Elm Road", "Depot"],
  "summaryText": "Route 7"
}
```

If your push provider expects strings for nested payload data, use `renderAndroidOngoingNotificationPayload()` instead and send the JSON string directly.

### 2. Send the payload through your push provider

Send the message as `data.voltraOngoingNotification`, as an object or a JSON string. Version 1 of the message has these fields:

| Field            | Required        | Meaning                                                                                                                         |
| ---------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `v`              | No              | Message version. Leave it out or send `1`; any other version is rejected so an older app never misreads a newer message       |
| `notificationId` | Yes             | The stable notification identifier                                                                                              |
| `operation`      | Yes             | Exactly `'upsert'` or `'stop'`. Anything else is rejected                                                                       |
| `revision`       | No              | A non-negative integer that grows with every message for this notification. See [Ordering](#ordering)                           |
| `options`        | No              | Upsert options: `channelId`, `smallIcon`, `deepLinkUrl`, `requestPromotedOngoing`, `fallbackBehavior`, `foregroundService`, the presentation options, and `alert` |
| `payload`        | For `'upsert'`  | The Voltra semantic payload                                                                                                     |

Presentation options are the app's decision, so send them only if your push builder is allowed to make it. An upsert whose `options` leaves them out changes nothing about how the running notification is presented, and a presentation option sent as `null` clears the stored value when the push updates an existing notification. `alert: true` makes an updating push alert the way a first post does; a push that starts a notification always alerts anyway.

The payload itself can carry `publicVersion`, `showWhen`, and `chronometerCountDown`, like any other content field.

Build the message on your server with `createAndroidOngoingNotificationPushEnvelope` from `@use-voltra/android-server`. It renders JSX content (or takes an already rendered payload), checks the fields, and returns both an object and a JSON string:

```tsx
import { AndroidOngoingNotification, createAndroidOngoingNotificationPushEnvelope } from '@use-voltra/android-server'

const { string } = createAndroidOngoingNotificationPushEnvelope({
  notificationId: 'order-123',
  operation: 'upsert',
  revision: order.version,
  options: { channelId: 'delivery_updates', deepLinkUrl: 'myapp://orders/123', requestPromotedOngoing: true },
  content: <AndroidOngoingNotification.Progress title="Driver is approaching" text="2 stops away" value={80} max={100} />,
})

await sendPush({ to: pushToken, priority: 'high', data: { voltraOngoingNotification: string } })
```

Example Expo push request:

```json
{
  "to": "ExponentPushToken[project-token]",
  "priority": "high",
  "data": {
    "voltraOngoingNotification": "{\"v\":1,\"notificationId\":\"order-123\",\"operation\":\"upsert\",\"revision\":42,\"options\":{\"channelId\":\"delivery_updates\",\"deepLinkUrl\":\"myapp://orders/123\",\"requestPromotedOngoing\":true,\"visibility\":\"private\",\"color\":\"#1E88E5\",\"category\":\"navigation\",\"timeoutMs\":1800000,\"group\":\"deliveries\"},\"payload\":{\"v\":1,\"kind\":\"progress\",\"title\":\"Driver is approaching\",\"text\":\"2 stops away\",\"value\":80,\"max\":100,\"when\":1758540000000,\"showWhen\":false,\"publicVersion\":{\"title\":\"Delivery in progress\",\"text\":\"Unlock to see the driver\"}}}"
  }
}
```

Stringifying the message is often the safest option when sending through push providers.

To stop the notification remotely, send the same `notificationId` with `operation: "stop"` and omit `payload`.

**Pictures in a remote payload.** A `bigPicture` or `largeIcon` entry in a push payload should reference an image the app can already find, through `assetName` for a bundled or preloaded image. Android push providers cap the data of a message well below the size of a photo — Firebase caps a data message at 4096 bytes — so a `base64` picture does not fit. Download the image on the device with `preloadImages()` from `@use-voltra/android-client`, see [Image Preloading](/android/development/image-preloading), and send its key.

### 3. Apply the payload in your background task

`handleAndroidOngoingNotificationPush` is the whole task body. It finds the message in the `data` the task receives (also when it is wrapped in `data`, `body` or `dataString`), checks it, creates the channel through your callback, and applies the upsert or stop:

```tsx
import * as Notifications from 'expo-notifications'
import * as TaskManager from 'expo-task-manager'
import { handleAndroidOngoingNotificationPush } from '@use-voltra/android-client'

const TASK_NAME = 'voltra-ongoing-notification-task'

TaskManager.defineTask(TASK_NAME, async ({ data, error }) => {
  if (error) {
    return
  }

  const result = await handleAndroidOngoingNotificationPush(data, {
    defaults: { channelId: 'delivery_updates' },
    ensureChannel: (channelId) =>
      Notifications.setNotificationChannelAsync(channelId, {
        name: 'Delivery updates',
        importance: Notifications.AndroidImportance.HIGH,
      }),
  })

  if (!result.handled && result.reason !== 'no_envelope') {
    console.warn('Ignored a Voltra push', result.reason, result.issues)
  }
})

await Notifications.registerTaskAsync(TASK_NAME)
```

It never throws. The result is one of:

- `{ handled: false, reason: 'no_envelope' }` — the push carries no Voltra message, so another handler can take it.
- `{ handled: false, reason: 'invalid_envelope' | 'unsupported_version', issues }` — one issue string per problem.
- `{ handled: true, operation, notificationId, result }` — `result` is the upsert or stop result, or `{ ok: false, reason: 'native_error', message }` when the call rejected (for example a missing channel or a malformed payload).

`defaults` sits under the message's `options`, so the message wins per key. `parseAndroidOngoingNotificationPush(data)` runs only the parsing step, if you want to apply the message yourself.

When the options request promotion, a successful upsert result carries `result.promotion.reasons` — the machine-readable list of what would block promotion on this device — so your handler can log it. A payload that breaks a rule (`kind` unknown, malformed JSON, a countdown without `when`) is refused with a `VOLTRA_NOTIFICATION_...` code instead of posting something broken, and so is a channel that was never created. The handler reports those as `native_error` with the message.

`AndroidOngoingNotification.Metric` renders server-side too, so one metric payload fits every device: below Android 17 it posts as a standard notification whose text line joins the readings, and the upsert result then carries `styleFallback: 'standard'`.

### Channel setup for remote updates

Your background task should ensure that the target notification channel exists before calling `upsertAndroidOngoingNotification()`. Create the channel on startup, and also ensure it exists again inside the background handler.

### Ordering

Push providers do not guarantee delivery order, so an older update can arrive after a newer one. Send a `revision` that grows with every message for a notification, such as your order's version number. Voltra stores the last revision it applied for each notification on the device and drops any message whose revision is not higher, with `reason: 'stale_revision'`. That covers a late `stop` too: it cannot end a notification a newer push restarted, and an older upsert cannot bring back a notification a newer `stop` ended. Messages without `revision` are applied in arrival order.

### Foreground service from a push

`options.foregroundService` works in a push, but Android only allows a foreground service to start from the background for a high-priority FCM message that was not downgraded, and never a `location` service on Android 14+. When the start is refused the notification is still posted, and the upsert result reports `foregroundService: { attached: false, reason: 'background_start_not_allowed' }` (or `missing_permission`). A later upsert with `foregroundService`, for example from a high-priority push, attaches the service to the running notification. See [Keeping the app alive with a foreground service](/android/development/managing-ongoing-notifications#keeping-the-app-alive-with-a-foreground-service).

## Compatibility

The client chooses its parser by the `kind` field, so your server and the installed app have to agree on the available kinds. A build that does not know `bigPicture` or `inbox` fails to parse that payload rather than falling back to a layout it does know, and the update is reported as a failure. Serve `progress` or `bigText` to older installs, which means a server that picks a layout per device needs the app version that device reports.

Messages without `v` are read as version 1, so pushes sent before the field existed keep working. An app build older than `revision` support ignores the field and applies messages in arrival order.
