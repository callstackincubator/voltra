# Server-side updates

Voltra supports server-side updates for Live Activities through Apple Push Notification Service (APNS). This allows you to update Live Activities even when your app is in the background or terminated.

## Configuration

### Expo Config plugin setup

To enable server-side updates via push notifications, you need to configure the Voltra plugin in your `app.json` or `app.config.js`:

**Minimal configuration (push notifications only):**

```json
{
  "expo": {
    "plugins": [
      [
        "voltra",
        {
          "enablePushNotifications": true
        }
      ]
    ]
  }
}
```

**Full configuration (with App Groups for event forwarding and shared images):**

```json
{
  "expo": {
    "plugins": [
      [
        "voltra",
        {
          "enablePushNotifications": true,
          "groupIdentifier": "group.your.app.voltraui",
          "deploymentTarget": "18.0"
        }
      ]
    ]
  }
}
```

**Note:** The `groupIdentifier` is optional. It's only needed if you want to forward component events (like button taps) from the Live Activity extension to your JavaScript code, or if you need to share images between your app and the extension. Push notifications work perfectly fine without it.

### Xcode configuration

The Voltra config plugin automatically handles most of the Xcode configuration for you:

- Adds the `aps-environment` entitlement (set to `development` for debug builds)
- Configures Info.plist flags to enable push notification integration
- Sets up App Group entitlements (if `groupIdentifier` is provided)

However, you'll still need to complete a few manual steps:

1. **Provisioning Profiles:** Ensure your app has proper provisioning profiles configured in Xcode with push notification capabilities enabled.

2. **APNs Certificates:** Set up APNs authentication certificates or keys in your Apple Developer account. You'll need these to send push notifications from your server.

3. **Capabilities:** Verify that Push Notifications capability is enabled in your app's target settings in Xcode.

For detailed information about setting up push notifications in iOS, refer to [Apple's official push notification documentation](https://developer.apple.com/documentation/usernotifications/setting_up_a_remote_notification_server).

## Server-side rendering

Voltra provides a server-side API that allows you to render React components into JSON payloads that can be sent via APNS. The same Voltra components you use in your app work on the server.

### Using the server-side API

Import the server-side rendering functions from `voltra/server`:

```tsx
import { renderLiveActivityToString, Voltra } from 'voltra/server'

// Render your UI components to a JSON string
const jsonPayload = renderLiveActivityToString({
  lockScreen: (
    <Voltra.VStack style={{ padding: 16, borderRadius: 18, backgroundColor: '#101828' }}>
      <Voltra.Symbol name="car.fill" type="hierarchical" scale="large" tintColor="#38BDF8" />
      <Voltra.Text style={{ color: '#F8FAFC', fontSize: 18, fontWeight: '600' }}>Driver arrived</Voltra.Text>
      <Voltra.Text style={{ color: '#94A3B8', fontSize: 12, marginTop: 8 }}>Ready for pickup</Voltra.Text>
    </Voltra.VStack>
  ),
})
```

The `renderLiveActivityToString` function accepts a `LiveActivityVariants` object and returns a compressed, base64-encoded JSON string for your APNS payload.

## APNS payload format

When sending push notifications to update Live Activities, you need to structure your APNS payload correctly. For detailed information about APNS payload structure, see Apple's [official ActivityKit push notification documentation](https://developer.apple.com/documentation/activitykit/starting-and-updating-live-activities-with-activitykit-push-notifications).

You can also use Apple’s [CloudKit - Push Notifications tool](https://icloud.developer.apple.com/dashboard/notifications/) to send test push notifications during development.

### Required APNS headers

```
apns-push-type: liveactivity
apns-topic: <your.app.bundle.id>.push-type.liveactivity
```

Replace `<your.app.bundle.id>` with your app's bundle identifier (e.g., `com.example.myapp`).

### Payload structure

**For updating an existing Live Activity:**

```json
{
  "aps": {
    "event": "update",
    "content-state": {
      "uiJsonData": "{\"lockScreen\":{\"type\":\"VStack\",\"children\":{\"type\":\"Text\",\"children\":\"Hello\",\"props\":{}},\"props\":{}}}"
    },
    "timestamp": 1764145755
  }
}
```

**For starting a Live Activity remotely (iOS 17.2+):**

```json
{
  "aps": {
    "event": "start",
    "content-state": {
      "uiJsonData": "{\"lockScreen\":{\"type\":\"VStack\",\"children\":{\"type\":\"Text\",\"children\":\"Hello\",\"props\":{}},\"props\":{}}}"
    },
    "attributes-type": "VoltraAttributes",
    "attributes": {
      "name": "some-name",
      "deepLinkUrl": "app://some-deep-link-url"
    },
    "timestamp": 1764145755,
    "alert": {
      "title": "Driver arrived",
      "body": "Ready for pickup"
    }
  }
}
```

**Key fields:**

- `aps.event`: Set to `"update"` for updating an existing Live Activity, or `"start"` for push-to-start (iOS 17.2+)
- `aps.content-state.uiJsonData`: The JSON string returned by `renderLiveActivityToString`, embedded as a string value eg. `ixOAeyJ2IjoxLCJscyI6eyJ0IjowLCJjIjoiSGVsbG8sIHdvcmxkISJ9fQM=`
- `aps.timestamp`: Unix timestamp in seconds (required for Live Activities)
- `aps.attributes-type`: For push-to-start, must be `"VoltraAttributes"`
- `aps.attributes.name`: For push-to-start, a user-defined name for the activity (can be any string you choose)
- `aps.alert`: Required field for push-to-start

:::danger
ActivityKit enforces a strict payload size limit of approximately 4 KB. Keep your UI JSON minimal to stay within this limit. Avoid deeply nested component trees and excessive styling to ensure your payloads fit within the constraint.
:::

## Getting push tokens

Voltra provides specialized push tokens that are different from regular device tokens. These tokens are specifically designed for Live Activity push notifications and should be used instead of standard device tokens.

### Tokens for updating Live Activities

To update existing Live Activities, use activity push tokens:

```tsx
import { addVoltraListener } from 'voltra/client'

useEffect(() => {
  const subscription = addVoltraListener('activityTokenReceived', ({
    activityName,
    pushToken,
    timestamp,
    type
  }) => {
    // Send the token to your server for updating this specific Live Activity
    sendTokenToServer({
      activityID,
      token: pushToken,
      type: 'update',
    })
  })

  return () => {
    subscription.remove()
  }
}, [])
```

### Tokens for starting Live Activities remotely

To start Live Activities remotely (push-to-start), use push-to-start tokens:

```tsx
useEffect(() => {
  const subscription = addVoltraListener('activityPushToStartTokenReceived', ({ pushToStartToken, type }) => {
    // Send the token to your server for starting new Live Activities
    sendTokenToServer({
      token: pushToStartToken,
      type: 'start',
    })
  })

  return () => {
    subscription.remove()
  }
}, [])
```

Use only Voltra-provided tokens, which are specialized for Live Activity push notifications and different from regular device tokens. Update tokens are tied to specific Live Activities, while push-to-start tokens are for starting new activities. Update tokens are provided when Live Activities are started and may change during the activity's lifecycle. When sending notifications via APNS, use these push tokens as the target device token to route notifications to the correct Live Activity or device.

## Broadcast push notifications (iOS 18+)

Starting with iOS 18 and iPadOS 18, you can use **broadcast push notifications** to update many Live Activities with a single push notification. Instead of sending individual notifications to each device token, you send one broadcast to a shared channel—all Live Activities subscribed to that channel receive the update. This is ideal for scenarios like live sports scores or flight status where many users follow the same event.

### Prerequisites

1. **Enable Broadcast Capability:** In your [Apple Developer account](https://developer.apple.com/account), go to Certificates, Identifiers & Profiles > Identifiers, select your App ID, and enable **Broadcast Capability** under Push Notifications.

2. **Create a channel:** Your server creates a channel via APNs and receives a channel ID. You can maintain up to 10,000 channels per app. Use [Apple Push Notification Console](https://icloud.developer.apple.com/dashboard/notifications/) or the [channel management API](https://developer.apple.com/documentation/usernotifications/sending-channel-management-requests-to-apns) to create channels.

3. **Plugin configuration:** Keep `enablePushNotifications: true` in your Voltra plugin config—the `aps-environment` entitlement is still required for broadcast push.

### Starting a Live Activity with a channel

Pass the `channelId` option when starting a Live Activity to subscribe it to a broadcast channel:

```typescript
import { startLiveActivity } from 'voltra/client'
import { Voltra } from 'voltra'

const activityId = await startLiveActivity(variants, {
  activityName: 'match-123',
  channelId: 'CTrNsYq/Ee8AALLzHQaVlA==', // Channel ID from your server
})
```

When `channelId` is provided, the Live Activity subscribes to broadcast updates. On iOS versions before 18, `channelId` is ignored and the activity starts without push support.

### Sending broadcast updates

To update all Live Activities on a channel, send a POST request to APNs with:

- **Path:** `/4/broadcasts/apps/<your.bundle.id>` (bundle ID without the `.push-type.liveactivity` suffix)
- **Header:** `apns-channel-id: <Channel ID>`
- **Payload:** Same structure as individual updates—`event: "update"`, `content-state`, `timestamp`, etc.

For the full broadcast payload format and headers, see [Apple's broadcast push documentation](https://developer.apple.com/documentation/usernotifications/sending-broadcast-push-notification-requests-to-apns).

### Broadcast vs. individual tokens

| Aspect | Individual tokens | Broadcast |
|--------|-------------------|-----------|
| Server sends | One notification per device | One notification per channel |
| `activityTokenReceived` event | Fires for each activity | Does not fire |
| Best for | Per-user content (orders, rides) | Shared content (scores, flights) |
| iOS version | 16.2+ | 18+ |

## Handling background execution

When Live Activity tokens change or need to be refreshed, iOS may wake your app in the background to deliver new tokens. The app has a limited window of time (typically around 30 seconds) to handle the event and communicate with your server before iOS may suspend or terminate the background process.

### Detecting background execution

Use the `isHeadless()` function to determine if your app is running in the background:

```typescript
import { isHeadless } from 'voltra/client'

// In your app's entry point or root component
if (isHeadless()) {
  // App is running in background/headless mode
  console.log('App launched in headless mode for token refresh')
} else {
  // App is running in foreground
  console.log('App launched in foreground')
}
```

### Optimizing for background execution

When the app is launched in headless mode for token handling, **do not mount your main app component** to avoid excessive resource usage that could cause iOS to terminate the app before token updates are processed.

```typescript
// In your app's entry point (e.g., App.tsx, index.js)
import { isHeadless, addVoltraListener } from 'voltra/client'

function App() {
  // Handle token events even in headless mode
  useEffect(() => {
    const subscription = addVoltraListener('activityTokenReceived', (event) => {
      // Process token updates and send to server
      sendTokenToServer(event)
    })

    return () => subscription.remove()
  }, [])

  // Only render the UI if not in headless mode
  if (isHeadless()) {
    return null // Don't mount the app component tree
  }

  // Render your normal app UI
  return <YourMainAppComponent />
}
```
