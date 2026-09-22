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

## Starting a notification

Voltra provides two built-in layouts:

- `AndroidOngoingNotification.Progress`
- `AndroidOngoingNotification.BigText`

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

## Presentation options

Everything that says how the system should treat the notification goes in the options, next to
`channelId`. Everything that says what the notification means right now goes in the content, as props
on `AndroidOngoingNotification.Progress` or `AndroidOngoingNotification.BigText`.

```tsx
await startAndroidOngoingNotification(
  <AndroidOngoingNotification.Progress
    title="Driver is on the way"
    text="Anna, silver Toyota"
    value={32}
    max={100}
    when={Date.now() + 8 * 60 * 1000}
    chronometer
    publicVersion={{
      title: 'Ride in progress',
      text: 'Unlock to see driver details',
    }}
  />,
  {
    notificationId: 'ride-44',
    channelId: 'ride_updates',
    visibility: 'private',
    color: '#1E88E5',
    category: 'navigation',
    timeoutMs: 30 * 60 * 1000,
    group: 'rides',
    sortKey: '2026-09-22T12:00',
  }
)
```

| Option                                    | Values                                                                                                     | Default                                                    | Applies on    | After an update that omits it |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- | ------------- | ----------------------------- |
| `visibility`                              | `'public'`, `'private'`, `'secret'`                                                                         | system default, `'private'`                                | all versions  | kept                          |
| `color`                                   | any static color string: `'#1E88E5'`, `'rgb(30, 136, 229)'`, `'crimson'`                                     | none                                                       | all versions  | kept                          |
| `category`                                | `'progress'`, `'navigation'`, `'transport'`, `'service'`, `'status'`, `'workout'`, `'stopwatch'`, `'location_sharing'` | from the content: a progress notification reports `'progress'`, a big text notification reports none | all versions  | kept                          |
| `timeoutMs`                               | milliseconds as a whole number                                                                              | none, the notification stays until you stop it             | Android 8.0+  | kept and the timer restarts   |
| `localOnly`                               | `true` to keep it off Wear and Android Auto                                                                 | `false`                                                    | all versions  | kept                          |
| `group`, `sortKey`                        | group key, and the order inside it                                                                          | none                                                       | all versions  | kept                          |
| `allowSystemGeneratedContextualActions`   | `false` to stop the system adding its own actions, such as a directions chip                                | platform default, `true`                                   | Android 10+   | kept                          |

Notes on individual options:

- `visibility` decides what the lock screen shows. `'secret'` hides the notification entirely there.
  Use `'private'` together with `publicVersion` to show a short copy of your own.
- `color` is an accent: the system tints the notification with it, and shows it as background only for
  styles that support that. A color the device cannot resolve, such as a theme token, rejects the
  call rather than posting without a color.
- `category` overrides what Voltra derives from your content, and does not change the channel.
- `timeoutMs` is applied on every post, so each update restarts the countdown and a notification that
  stops being updated eventually disappears on its own. Once the system removes it,
  `getAndroidOngoingNotificationStatus()` reports it as no longer active, and starting that
  `notificationId` again needs `stopAndroidOngoingNotification()` first, the same as after a swipe. On
  Android 7.x and older the value is kept but not applied.
- `group` puts the notification in the bundle the system builds from notifications sharing the key.
  Voltra does not post a group summary of its own.

### Lock-screen copy

`publicVersion` is a prop on the content, not an option: it is text, so an update replaces it, and an
update that leaves it out posts without one.

```tsx
<AndroidOngoingNotification.Progress
  title="Driver is on the way"
  text="Anna, silver Toyota · 46.021, 14.968"
  value={32}
  max={100}
  when={Date.now()}
  publicVersion={{ title: 'Ride in progress', text: 'Unlock to see driver details' }}
/>
```

The copy is what the lock screen shows when `visibility` hides the real content. It carries the title
and text you give it and nothing else: no progress, no action buttons.

### Timestamps

`when` and `chronometer` already exist. Two more props decide what the system does with them:

- `showWhen` (default `true`, and `false` when the payload carries no timestamp) hides the time the
  notification shows while keeping the timestamp for sorting and timeouts. Set it to `false` for an
  absolute deadline or a count-down, so the notification stops claiming it is "5 minutes ago".
- `chronometerCountDown` (default `false`) counts a chronometer down to `when` instead of up from it.
  Needs `chronometer`.

```tsx
<AndroidOngoingNotification.BigText
  title="Your table is ready"
  text="Reserved until 20:30"
  bigText="We hold it for 15 minutes. Reply in the app to keep it."
  when={tableReadyUntil.getTime()}
  chronometer
  chronometerCountDown
  showWhen={false}
/>
```

### Changing a presentation option

An update keeps every presentation option you do not mention. To change one, send it; to go back to
the platform default, send `null`:

```tsx
await updateAndroidOngoingNotification('ride-44', content, {
  channelId: 'ride_updates',
  color: '#000000', // replace
  timeoutMs: null, // stop timing this one out
  // group and sortKey left out: they keep their stored values
})
```

The pre-existing options (`smallIcon`, `deepLinkUrl`, `requestPromotedOngoing`, `fallbackBehavior`)
behave as before: leaving one out reuses the stored value, and there is no way to clear them.

### Letting one update make a sound

An ongoing notification alerts when it is first posted and is silent afterwards. `alert` is an update
option that lets one update alert again:

```tsx
await updateAndroidOngoingNotification('ride-44', content, {
  channelId: 'ride_updates',
  alert: true,
})
```

It applies to that post only and is never stored, so the next update is quiet again. Whether it
audibly alerts is still decided by the channel you created: a channel on low importance stays silent
however you set `alert`.

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

- Remote updates require your own push delivery and background task integration. See [Remote Ongoing Notifications](./remote-ongoing-notifications).
- Your app must create the Android notification channel before starting a notification.
- Notification permission still needs to be requested by your app on Android 13+.
- Action buttons open deep links. They are not a JavaScript event system.
- Some Android notification fields stay out of the API on purpose:
  - Badge count and badge icon. The launcher dot belongs to the channel your app creates, and a count makes no sense for a single ongoing item.
  - Group summary. Voltra posts no summary, and requesting one disqualifies the notification from promoted presentation.
  - A color background on every notification (`colorized`). It does nothing for these styles outside a foreground service, which Voltra does not run, and it also disqualifies promoted presentation.
  - Tapping to auto-dismiss. The ongoing lifecycle belongs to `stopAndroidOngoingNotification()`, and a tap-dismiss would leave the notification recorded as active while it is already gone.
  - Sound, vibration, lights and their defaults, and importance. All of them are channel settings since Android 8.0.
  - Priority below Android 8.0. Deprecated, and a second API level to document for the same result.
  - A settings line under the notification, which needs a notification-preferences intent filter in your manifest, and the deprecated extra content-info line.
  - A ticker, which older accessibility services read while TalkBack reads the title and text anyway.
  - Whether a grouped notification alerts with its group. That only means something together with a summary Voltra does not post.
