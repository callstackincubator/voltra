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

Voltra also supports remote updates if your app receives push notifications in the background and forwards the payload to the ongoing notification APIs. See [Remote Ongoing Notifications](./remote-ongoing-notifications) for the server-side rendering API and full push integration guide.

## Before you start

### 1. Enable notification manifest support

Add `android.enableNotifications` to the Voltra Expo plugin config:

```json
{
  "expo": {
    "plugins": [
      [
        "@use-voltra/android-client",
        {
          "enableNotifications": true
        }
      ]
    ]
  }
}
```

This adds the Android manifest entries required by Voltra's notification features.

See [Plugin Configuration](../api/plugin-configuration#enablenotifications-optional) for details.

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
} from '@use-voltra/android-client'

const granted =
  (await hasAndroidNotificationPermission()) || (await requestAndroidNotificationPermission())

if (!granted) {
  // Show your own UI explaining why notifications are needed.
}
```

### 4. Compile against Android 17 (SDK 37)

Voltra builds ongoing-notification support against API 37, and your app has to compile against it too. Raise it through [expo-build-properties](https://docs.expo.dev/versions/latest/sdk/build-properties/):

```json
{
  "expo": {
    "plugins": [
      [
        "expo-build-properties",
        {
          "android": {
            "compileSdkVersion": 37
          }
        }
      ]
    ]
  }
}
```

If the app compiles against an older SDK, the Gradle build stops with a Voltra error naming the value to raise — instead of a confusing Kotlin compile error later.

## Starting a notification

Voltra provides three built-in layouts:

- `AndroidOngoingNotification.Progress`
- `AndroidOngoingNotification.BigText`
- `AndroidOngoingNotification.Metric`

### Progress notification

```tsx
import { AndroidOngoingNotification } from '@use-voltra/android'
import {
  startAndroidOngoingNotification,
} from '@use-voltra/android-client'

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
import { AndroidOngoingNotification } from '@use-voltra/android'
import {
  startAndroidOngoingNotification,
} from '@use-voltra/android-client'

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

### Metric notification

Show up to three readings — distance, pace, time remaining — instead of a progress bar or a text body:

```tsx
import { AndroidOngoingNotification } from '@use-voltra/android'
import {
  startAndroidOngoingNotification,
} from '@use-voltra/android-client'

await startAndroidOngoingNotification(
  <AndroidOngoingNotification.Metric
    title="Morning run"
    metrics={[
      { label: 'Dist', value: 5.2, unit: 'km' },
      { label: 'Pace', value: '5:30' },
      { label: 'ETA', value: { type: 'timer', endsAt: Date.now() + 10 * 60 * 1000 } },
    ]}
    criticalMetric={2}
    semanticStyle="safe"
  />,
  {
    notificationId: 'run-7',
    channelId: 'activity_updates',
  }
)
```

- Pass 1 to 3 metrics, and keep each `label` between 1 and 10 characters.
- A plain number is a reading and a plain string is text. `unit` next to a number is shorthand for the unit of that reading, so `{ label: 'Dist', value: 5.2, unit: 'km' }` is the same as passing the value as `{ type: 'float', value: 5.2, unit: 'km' }`.
- `criticalMetric` is the index of the reading to highlight. `semanticStyle` tints the metrics: `'info'`, `'safe'`, `'caution'`, `'danger'`, or the default `'unspecified'`.
- Values that change on their own: `{ type: 'timer', endsAt }` counts down to a moment and `{ type: 'stopwatch', startedAt }` counts up from it — each accepts a `Date` or an epoch timestamp, and an optional `format: 'chronometer'`. Frozen durations are `{ type: 'pausedTimer', remainingMillis }` and `{ type: 'pausedStopwatch', elapsedMillis }`. `{ type: 'time', value: '18:40' }` shows a clock time, and `{ type: 'float', value: 5.2, fractionDigits: 1 }` (with optional `min`/`max`) controls how a reading is formatted.

The full metric layout needs Android 17 and later. On older versions the notification posts normally and the readings appear as a text line (`Dist 5.2km, Pace 5:30, ETA 9:52`), and the result carries `styleFallback: 'standard'` so you can tell. Your server can send the same metric payload to every device without knowing their versions. Time-driven values are rendered when the notification is posted, so an `updateAndroidOngoingNotification` call every minute keeps the text line fresh on those devices.

Unlike the other layouts, a metric notification can be promoted to a Live Update without a `title`.

## Updating a notification

Use the same `notificationId` to update an existing notification.

```tsx
import { AndroidOngoingNotification } from '@use-voltra/android'
import {
  updateAndroidOngoingNotification,
} from '@use-voltra/android-client'

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
import { AndroidOngoingNotification } from '@use-voltra/android'
import {
  upsertAndroidOngoingNotification,
} from '@use-voltra/android-client'

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
import { stopAndroidOngoingNotification } from '@use-voltra/android-client'

await stopAndroidOngoingNotification('order-123')
```

To dismiss every active Voltra ongoing notification at once:

```tsx
import { endAllAndroidOngoingNotifications } from '@use-voltra/android-client'

await endAllAndroidOngoingNotifications()
```

## Hook API

For React screens and flows, use `useAndroidOngoingNotification()`.

```tsx
import { AndroidOngoingNotification } from '@use-voltra/android'
import { useAndroidOngoingNotification } from '@use-voltra/android-client'

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
import { AndroidOngoingNotification } from '@use-voltra/android'

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
- can be used with `Progress`, `BigText`, and `Metric`
- support an optional `icon`

```tsx
<AndroidOngoingNotification.Action
  title="Open order"
  deepLinkUrl="myapp://orders/123"
  icon={{ assetName: 'order_icon' }}
/>
```

Android may not show action icons in the standard notification UI, so treat them as optional enhancement rather than a guaranteed visual element.

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

## Showing a chip in the status bar

On Android 16 and above, a promoted ongoing notification shows a chip in the status bar. You fill it with either a short text or a clock:

```tsx
<AndroidOngoingNotification.Progress
  title="Driver is on the way"
  value={32}
  max={100}
  shortCriticalText="8 min"
/>
```

- `shortCriticalText` shows a short text in the chip. Keep it to about 7 characters; the chip is at most 96dp wide and longer text is cut.
- `chronometer: true` shows elapsed time since `when`, counting up. `'countUp'` means the same as `true`.
- `chronometer: 'countDown'` shows the time remaining until `when`, counting down — the right choice for an ETA, a timer, or a parking meter. It requires `when`; rendering throws without it.

When you set several of these, the chip picks one in this order:

1. `shortCriticalText` (an empty string means no chip text at all)
2. for a metric notification on Android 17 and later, the value of the `criticalMetric`
3. time derived from `when` — the chronometer when `chronometer` is set, otherwise the remaining time

## Status and capability helpers

Use these helpers to adapt your UI to the device state:

```tsx
import {
  canPostPromotedAndroidNotifications,
  getAndroidOngoingNotificationCapabilities,
  getAndroidOngoingNotificationStatus,
  openAndroidNotificationSettings,
  openAndroidPromotedNotificationSettings,
} from '@use-voltra/android-client'

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
- `status.isPromoted` and `status.hasPromotableCharacteristics` — set on Android 16 and above, `undefined` below it
- `capabilities.notificationsEnabled`
- `capabilities.supportsPromotedNotifications`
- `capabilities.canPostPromotedNotifications`
- `capabilities.canRequestPromotedOngoing`

`openAndroidNotificationSettings()` opens your app's channel list. When the user has turned Live Updates off for your app (`canPostPromotedNotifications === false`), use `openAndroidPromotedNotificationSettings()` to open the page where they turn them back on. It resolves `true` when the Live Updates page opened and `false` when the regular notification settings opened instead, because the device has no such page.

## When posting fails

Start, update, and upsert reject with a code instead of posting something broken:

| Code                                     | What happened                                                                                             | What to do                                                        |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `VOLTRA_NOTIFICATION_CHANNEL_REQUIRED`   | No `channelId` was given                                                                                   | Pass `channelId` in the start options                             |
| `VOLTRA_NOTIFICATION_CHANNEL_NOT_FOUND`  | The channel was never created — Android drops such notifications silently                                 | Create the channel before posting                                 |
| `VOLTRA_NOTIFICATION_INVALID_PAYLOAD`    | The payload is malformed or breaks a rule (e.g. a remote payload with `chronometerCountDown` but no `when`) | Fix the payload                                                   |
| `VOLTRA_NOTIFICATION_NOT_PROMOTABLE`     | Promotion was requested with `fallbackBehavior: 'error'` and the notification is not eligible              | Read the reasons in the message (see below)                       |
| `VOLTRA_NOTIFICATION_INTERNAL_ERROR`     | An unexpected device failure                                                                               | Retry; if it persists, file an issue with the message             |

A dismissed notification is different: updates return `ok: false, reason: 'dismissed'` and nothing is re-posted. If your flow legitimately restarts after a dismissal, start a new notification instead of updating.

## Promoted ongoing notifications

On Android 16 and above, eligible ongoing notifications can be promoted to Live Updates: they expand into the status bar and show up on the lock screen and home screen. Pass `requestPromotedOngoing: true` to ask for it:

```tsx
const result = await startAndroidOngoingNotification(content, {
  notificationId: 'ride-44',
  channelId: 'ride_updates',
  requestPromotedOngoing: true,
})
```

You don't need the user to have turned Live Updates on first. Voltra records the request on every post, so when the user enables Live Updates in Settings, the next update is promoted without any change in your app.

### Reading why a notification is not promoted

When you request promotion, a successful result carries a `promotion` object:

```tsx
if (result.ok && result.promotion) {
  console.log(result.promotion.eligible, result.promotion.reasons)
}
```

- `promotion.requested` — always `true` when the object is present
- `promotion.eligible` — `true` when the notification can be promoted
- `promotion.reasons` — what stands in the way, as a list
- `promotion.hasPromotableCharacteristics` — the platform's own verdict on the built notification; only set on Android 16 and above

| Reason                       | Meaning                                                                                       |
| ---------------------------- | --------------------------------------------------------------------------------------------- |
| `unsupported_api_level`      | The device runs below Android 16                                                               |
| `permission_not_declared`    | `enableNotifications` is not on, so `POST_PROMOTED_NOTIFICATIONS` is missing from the manifest |
| `notifications_disabled`     | Notifications are turned off for your app                                                      |
| `promotion_disabled_by_user` | The user turned Live Updates off for your app                                                  |
| `channel_importance_min`     | The channel's importance is `MIN`; use at least `LOW`                                          |
| `missing_title`              | The notification has no `title`; promotion requires one                                        |
| `not_promotable`             | The platform rejected the built notification for another reason                                |

With the default `fallbackBehavior: 'standard'`, a notification that cannot be promoted is still posted as a normal ongoing notification and you read the reasons from the result. With `fallbackBehavior: 'error'`, the call rejects with `VOLTRA_NOTIFICATION_NOT_PROMOTABLE`, the message lists the reasons, and nothing is posted.

### Checking before you post

`checkAndroidOngoingNotificationPromotion()` answers the same questions for a payload without posting it or recording anything:

```tsx
import { checkAndroidOngoingNotificationPromotion } from '@use-voltra/android-client'

const check = await checkAndroidOngoingNotificationPromotion(content, {
  channelId: 'ride_updates',
})

if (!check.eligible) {
  console.warn('Would not promote:', check.reasons)
}
```

## Current limitations

- Remote updates require your own push delivery and background task integration. See [Remote Ongoing Notifications](./remote-ongoing-notifications).
- Your app must create the Android notification channel before starting a notification.
- Notification permission still needs to be requested by your app on Android 13+.
- Action buttons open deep links. They are not a JavaScript event system.
