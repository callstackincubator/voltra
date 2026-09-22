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

Voltra provides four built-in layouts:

- `AndroidOngoingNotification.Progress` — a task with a measured amount of progress
- `AndroidOngoingNotification.BigText` — a paragraph of text
- `AndroidOngoingNotification.BigPicture` — one image, such as a delivery photo or a map snapshot
- `AndroidOngoingNotification.Inbox` — up to six short lines

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

### Picture notification

Use a picture when the image carries the status: the parcel left at the door, a snapshot of the route, the section of a climb you are on.

```tsx
import { AndroidOngoingNotification } from '@use-voltra/android'
import {
  startAndroidOngoingNotification,
} from '@use-voltra/android-client'

await startAndroidOngoingNotification(
  <AndroidOngoingNotification.BigPicture
    title="Parcel delivered"
    text="Left at the front door"
    picture={{ assetName: 'delivery_photo_123' }}
    largeIcon={{ assetName: 'courier_avatar' }}
    hideLargeIconWhenExpanded
    pictureContentDescription="Photo of the parcel at the front door"
    summaryText="Order 123"
  >
    <AndroidOngoingNotification.Action
      title="Confirm"
      deepLinkUrl="myapp://orders/123/confirm"
    />
  </AndroidOngoingNotification.BigPicture>,
  {
    notificationId: 'order-123',
    channelId: 'delivery_updates',
  }
)
```

`picture` is required and takes the same sources as every other notification image: an `assetName` you bundled or preloaded, or inline `base64`. `largeIcon` is the thumbnail you see while the notification is collapsed.

The remaining picture props are optional, and the two that need a newer Android version are ignored on older devices rather than failing the update:

| Prop | Effect | Needs |
| --- | --- | --- |
| `showPictureWhenCollapsed` | Fills the collapsed notification with the picture instead of showing it only when expanded | Android 12 or later |
| `pictureContentDescription` | Screen reader label for the picture | Android 12 or later |
| `bigLargeIcon` | Thumbnail shown while expanded, replacing `largeIcon` | - |
| `hideLargeIconWhenExpanded` | Shows the `largeIcon` thumbnail only while collapsed | - |
| `summaryText` | Short trailing line, such as an order number | - |

**How large should the image be?** Android draws an expanded picture at 416dp by 284dp at most. Voltra hands over at most 1024 px on the long edge for a picture and 256 px for an icon, so a full-resolution camera photo buys you no extra detail and costs your app memory and decode time. Bundled drawables are passed to Android as resources and resized by the system.

**A picture notification cannot become a Live Update.** Android 16 promotes ongoing notifications with the standard, big text, call, and progress styles; `requestPromotedOngoing` is accepted for this layout and has no effect on it. If you need promotion and artwork, use `largeIcon` on a `Progress` notification.

### Lines notification

Use lines when the status is a short list: the stops left on a route, the files still uploading, the steps of an order.

```tsx
import { AndroidOngoingNotification } from '@use-voltra/android'
import {
  startAndroidOngoingNotification,
} from '@use-voltra/android-client'

await startAndroidOngoingNotification(
  <AndroidOngoingNotification.Inbox
    title="3 stops remaining"
    lines={['12 Oak Street', '4 Elm Road', 'Depot']}
    summaryText="Route 7"
    chronometer
    when={Date.now()}
  />,
  {
    notificationId: 'route-7',
    channelId: 'delivery_updates',
  }
)
```

`lines` is required and holds one to six non-empty strings. Android shows six lines at most, so the renderer rejects a seventh instead of letting it disappear from the notification.

`text` is the collapsed line. If you leave it out, it takes the value of the first line.

A line holds text only. There is no per-line icon, check mark, or color, so a checklist reads as a list of sentences. If you need the lines to flow as one paragraph instead, use `BigText` with newlines.

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

You can add action buttons as children of any layout.

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
- can be used with `Progress`, `BigText`, `BigPicture`, and `Inbox`
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

Only `Progress` and `BigText` can be promoted. Android decides which layouts qualify, and a `BigPicture` or `Inbox` notification stays a standard ongoing notification even when you ask for promotion: the call succeeds, `requestPromotedOngoing` is remembered, and nothing is promoted. Check `status.hasPromotableCharacteristics` if you want to show the user why.

## What Voltra does not cover

Some Android notification templates look like ongoing status updates and are not one. Voltra does not build them:

- **Conversations (`MessagingStyle`)** — needs `Person` objects, a conversation title, a direct reply field, and a long-lived shortcut on Android 11 and later. Use `expo-notifications` or Notifee.
- **Playback controls (`MediaStyle`)** — needs a `MediaSession` token, which a media library owns and builds the notification from. Use Media3, `expo-notifications`, or Notifee.
- **Bubbles** — need a pushed long-lived shortcut and a conversation, and Voltra does not own your host activity or your shortcuts. Use `expo-notifications` or Notifee.
- **Full-screen intents** — an interruption, not a status. Android 14 grants `USE_FULL_SCREEN_INTENT` by default only to calling and alarm apps, and Google Play revokes it for others. Use `expo-notifications` or Notifee when you genuinely need one.

A common combination is a Voltra ongoing notification for the status plus one of those templates posted through another library.

## Current limitations

- Remote updates require your own push delivery and background task integration. See [Remote Ongoing Notifications](./remote-ongoing-notifications).
- A push carrying a `bigPicture` or `inbox` payload reaches only app builds that know those payload kinds. See [Compatibility](./remote-ongoing-notifications#compatibility).
- Your app must create the Android notification channel before starting a notification.
- Notification permission still needs to be requested by your app on Android 13+.
- Action buttons open deep links. They are not a JavaScript event system.
