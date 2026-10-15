---
title: "Events"
description: "Listen for Live Activity state changes, push tokens, and user interaction events in your app, with the event types and their payloads."
---

Voltra emits several types of events that allow your app to respond to changes in Live Activities and user interactions.

## Overview

Voltra provides these event types:

- **Activity state changes**: Notifications when a Live Activity's state changes (e.g., dismissed, ended)
- **Push tokens**: Tokens needed for server-side updates via push notifications
- **Push-to-start tokens**: Tokens for starting Live Activities remotely (iOS 17.2+)
- **Enablement changes**: Notifications when the user allows or disallows Live Activities for your app
- **User interactions**: Events triggered when users interact with buttons or toggles in your Live Activity
- **Dynamic Live Activity render failures**: Reported when a [Dynamic Live Activity](/ios/development/dynamic-live-activities) can't be rendered

Push tokens and enablement are values that can change, not one-off events. The events only report changes, and only to listeners attached at that moment. Read the current value with `getLiveActivityPushTokens()`, `getLiveActivityPushToStartToken()`, and `areLiveActivitiesEnabled()`.

## Activity state changes

Voltra emits events whenever a Live Activity's state changes. This allows you to track the lifecycle of your Live Activities and respond accordingly.

### Listening for state changes

Use `addVoltraListener` with the `'stateChange'` event type to subscribe to state change events:

```typescript
import { addVoltraListener } from '@use-voltra/ios-client'

const subscription = addVoltraListener('stateChange', (event) => {
  console.log('Activity name:', event.activityName)
  console.log('New state:', event.activityState)

  // Handle different states
  if (event.activityState === 'dismissed') {
    // User dismissed the Live Activity
  } else if (event.activityState === 'ended') {
    // Live Activity ended
  } else if (event.activityState === 'active') {
    // Live Activity is active
  }
})

// Don't forget to clean up
subscription.remove()
```

### Activity states

The `activityState` field can have the following values:

- `'active'`: The Live Activity is currently active and visible
- `'dismissed'`: The user manually dismissed the Live Activity
- `'pending'`: The Live Activity is pending activation
- `'stale'`: The Live Activity has become stale
- `'ended'`: The Live Activity has ended

### Event structure

Each state change event contains:

- `activityName`: The name of the Live Activity (as specified when starting it)
- `activityState`: The new state of the Live Activity

## Push tokens

To enable server-side updates for your Live Activities, you need to obtain push tokens. Voltra emits events when these tokens become available.

### Activity push tokens

Activity push tokens are used to update existing Live Activities via push notifications. Listen for these tokens using `addVoltraListener` with the `'activityTokenReceived'` event type:

```typescript
import { addVoltraListener } from '@use-voltra/ios-client'

const subscription = addVoltraListener('activityTokenReceived', (event) => {
  console.log('Activity name:', event.activityName)
  console.log('Push token:', event.pushToken)

  // Send the token to your server
  sendTokenToServer({
    activityName: event.activityName,
    pushToken: event.pushToken,
  })
})

subscription.remove()
```

For more information about using push tokens for server-side updates, see the [server-side updates guide](/ios/development/server-side-updates).

### Push-to-start tokens

Push-to-start tokens (available on iOS 17.2+) allow you to start Live Activities remotely via push notifications. Listen for these tokens using `addVoltraListener` with the `'activityPushToStartTokenReceived'` event type:

```typescript
import { addVoltraListener } from '@use-voltra/ios-client'

const subscription = addVoltraListener('activityPushToStartTokenReceived', (event) => {
  console.log('Push-to-start token:', event.pushToStartToken)

  // Send the token to your server
  sendTokenToServer({
    pushToStartToken: event.pushToStartToken,
  })
})

subscription.remove()
```

For more information about using push tokens for starting Live Activity remotely, see the [server-side updates guide](/ios/development/server-side-updates).

### Reading the current tokens

A token event fires when iOS issues or rotates a token. If your listener attaches later — for example, after the user signs in — it doesn't receive tokens issued earlier. Subscribe first, then read the current values:

```typescript
import {
  addVoltraListener,
  getLiveActivityPushTokens,
  getLiveActivityPushToStartToken,
} from '@use-voltra/ios-client'

async function registerLiveActivityTokens() {
  const subscription = addVoltraListener('activityTokenReceived', ({ activityName, pushToken }) => {
    sendTokenToServer({ activityName, pushToken })
  })

  for (const { activityName, pushToken } of await getLiveActivityPushTokens()) {
    sendTokenToServer({ activityName, pushToken })
  }

  const pushToStartToken = await getLiveActivityPushToStartToken()
  if (pushToStartToken) {
    sendTokenToServer({ pushToStartToken })
  }

  return subscription
}
```

The same token can arrive from both the getter and the event, so store tokens on your server with an upsert keyed by device and `activityName`. See [Reading the current tokens](/ios/development/server-side-updates#reading-the-current-tokens) for what each getter returns.

## Live Activity enablement

Users can turn Live Activities off for your app in Settings. `startLiveActivity()` rejects while they're off. Use `areLiveActivitiesEnabled()` to check first, for example to hide a "Track order" button, and listen for `'activityEnablementChanged'` to react when the user changes the setting:

```typescript
import { addVoltraListener, areLiveActivitiesEnabled } from '@use-voltra/ios-client'

setTrackingAvailable(areLiveActivitiesEnabled())

const subscription = addVoltraListener('activityEnablementChanged', (event) => {
  setTrackingAvailable(event.enabled)
})
```

`areLiveActivitiesEnabled()` is synchronous and returns `false` below iOS 16.4. Neither the getter nor the event needs `enablePushNotifications`. Users change this setting in the Settings app, so also read `areLiveActivitiesEnabled()` again when your app returns to the foreground.

## User interactions

When users interact with buttons or toggles in your Live Activity, Voltra emits an `'interaction'` event via `addVoltraListener` — this works even when your app isn't running. Voltra keeps each tap until an `'interaction'` listener is attached and your app is running, then delivers it once. Taps that wait longer than 15 minutes are dropped. Keeping taps across app launches requires a `groupIdentifier` in the plugin config. For the full example, component identifiers, deep linking, and app lifecycle considerations, see the [interactions guide](/ios/development/interactions).

## Best practices

### Set up listeners early

Initialize your event listeners as early as possible in your app lifecycle (e.g., in your root component or app entry point). This ensures they're ready when events occur, especially when your app is launched from a terminated state due to a Live Activity interaction.

### Clean up subscriptions

Always clean up your event subscriptions to prevent memory leaks. If you're using React hooks, return a cleanup function from `useEffect`:

```typescript
import { useEffect } from 'react'
import { addVoltraListener } from '@use-voltra/ios-client'

function MyComponent() {
  useEffect(() => {
    const subscription = addVoltraListener('stateChange', (event) => {
      // Handle event
    })

    return () => {
      subscription.remove()
    }
  }, [])

  return null
}
```

### Handle app launch scenarios

When a tap on a Live Activity launches your app, the `'interaction'` event waits until your `'interaction'` listener attaches, then arrives once. Only interactions are held this way, for up to 15 minutes, and only across launches when you configure a `groupIdentifier`. State changes and token events are not held: an event that fires before your listener attaches is not delivered later. Read push tokens and enablement with their getters instead.
