# Events

Voltra emits several types of events that allow your app to respond to changes in Live Activities and user interactions.

## Overview

Voltra provides four main event types:

- **Activity state changes**: Notifications when a Live Activity's state changes (e.g., dismissed, ended)
- **Push tokens**: Tokens needed for server-side updates via push notifications
- **Push-to-start tokens**: Tokens for starting Live Activities remotely (iOS 17.2+)
- **User interactions**: Events triggered when users interact with buttons or toggles in your Live Activity

## Activity state changes

Voltra emits events whenever a Live Activity's state changes. This allows you to track the lifecycle of your Live Activities and respond accordingly.

### Listening for state changes

Use `addVoltraListener` with the `'stateChange'` event type to subscribe to state change events:

```typescript
import { addVoltraListener } from 'voltra/client'

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
import { addVoltraListener } from 'voltra/client'

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

For more information about using push tokens for server-side updates, see the [server-side updates guide](./server-side-updates.md).

### Push-to-start tokens

Push-to-start tokens (available on iOS 17.2+) allow you to start Live Activities remotely via push notifications. Listen for these tokens using `addVoltraListener` with the `'activityPushToStartTokenReceived'` event type:

```typescript
import { addVoltraListener } from 'voltra/client'

const subscription = addVoltraListener('activityPushToStartTokenReceived', (event) => {
  console.log('Push-to-start token:', event.pushToStartToken)

  // Send the token to your server
  sendTokenToServer({
    pushToStartToken: event.pushToStartToken,
  })
})

subscription.remove()
```

For more information about using push tokens for starting Live Activity remotely, see the [server-side updates guide](./server-side-updates.md).

## User interactions

When users interact with buttons or toggles in your Live Activity, Voltra emits events that allow your app to respond to these interactions. This works even when your app isn't running, thanks to Apple's AppIntents framework.

### Listening for interactions

Subscribe to interaction events using `addVoltraListener` with the `'interaction'` event type:

```typescript
import { addVoltraListener } from 'voltra/client'

const subscription = addVoltraListener('interaction', (event) => {
  console.log('Component interacted:', event.identifier)
  console.log('Payload:', event.payload)

  // Handle the interaction based on the identifier
  if (event.identifier === 'contact-driver') {
    // Open contact screen
  } else if (event.identifier === 'notifications-toggle') {
    // Handle toggle state change
  }
})

subscription.remove()
```

For detailed information about handling interactions, including component identifiers, deep linking, and app lifecycle considerations, see the [interactions guide](./interactions.md).

## Best practices

### Set up listeners early

Initialize your event listeners as early as possible in your app lifecycle (e.g., in your root component or app entry point). This ensures they're ready when events occur, especially when your app is launched from a terminated state due to a Live Activity interaction.

### Clean up subscriptions

Always clean up your event subscriptions to prevent memory leaks. If you're using React hooks, return a cleanup function from `useEffect`:

```typescript
import { useEffect } from 'react'
import { addVoltraListener } from 'voltra/client'

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

When your app is launched from a terminated state (e.g., due to a Live Activity interaction), make sure your event listeners are set up before processing any queued events. Voltra handles event queuing automatically when using App Groups.
