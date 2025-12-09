# Server-side updates

Voltra supports server-side updates for Live Activities through Apple Push Notification Service (APNS). This allows you to update Live Activities even when your app is in the background or terminated, enabling real-time updates from your server without requiring the app to be running.

## Configuration

### Expo Config Plugin Setup

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
          "groupIdentifier": "group.your.app.voltraui"
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

## Dismissal Policy

Voltra supports configuring how Live Activities behave after they end. You can control the dismissal timing using the `dismissalPolicy` option:

### Dismissal Policy Options

- **`'immediate'`** (default): The Live Activity is dismissed immediately when it ends
- **`{ after: number }`**: The Live Activity remains visible for the specified number of seconds after ending, then automatically dismisses

### Usage Examples

**Immediate dismissal (default behavior):**

```typescript
import { startVoltra } from 'voltra'

await startVoltra(variants, {
  dismissalPolicy: 'immediate', // or omit for default
})
```

**Delayed dismissal (keep visible for 30 seconds after ending):**

```typescript
await startVoltra(variants, {
  dismissalPolicy: { after: 30 },
})
```

**Update dismissal policy for active Live Activities:**

```typescript
import { updateVoltra } from 'voltra'

await updateVoltra(activityId, variants, {
  dismissalPolicy: { after: 60 },
})
```

**Set dismissal policy when ending a Live Activity:**

```typescript
import { stopVoltra } from 'voltra'

await stopVoltra(activityId, {
  dismissalPolicy: { after: 10 },
})
```

The dismissal policy applies to both programmatic ending (`stopVoltra`) and natural ending (when timers reach their end time). This gives you fine-grained control over the user experience when Live Activities conclude.

## Additional Configuration Options

Voltra provides additional configuration options to control Live Activity behavior and appearance.

### Stale Date

The `staleDate` option allows you to specify when a Live Activity should be considered stale and automatically dismissed by the system.

```typescript
import { startVoltra } from 'voltra'

// Dismiss the Live Activity after 1 hour
await startVoltra(variants, {
  staleDate: Date.now() + (60 * 60 * 1000), // 1 hour from now
})
```

**Note:** If you provide a `staleDate` in the past, it will be ignored and the Live Activity will use default behavior.

### Relevance Score

The `relevanceScore` option helps iOS prioritize which Live Activities to display when space is limited. Higher scores (closer to 1.0) indicate more important activities.

```typescript
import { startVoltra } from 'voltra'

// High priority Live Activity (e.g., active delivery)
await startVoltra(variants, {
  relevanceScore: 0.8,
})

// Low priority Live Activity (e.g., background task)
await startVoltra(variants, {
  relevanceScore: 0.2,
})
```

**Valid range:** 0.0 to 1.0 (default: 0.0)

These options can be used together with dismissal policy and other configuration options:

```typescript
await startVoltra(variants, {
  dismissalPolicy: { after: 30 },
  staleDate: Date.now() + (2 * 60 * 60 * 1000), // 2 hours
  relevanceScore: 0.7,
})
```

## Server-side rendering

Voltra provides a server-side API that allows you to render React components into JSON payloads that can be sent via APNS. The same Voltra components you use in your app work seamlessly on the server.

### Using the server-side API

Import the server-side rendering functions from `voltra/server`:

```tsx
import { renderVoltraToString, Voltra } from 'voltra/server'

// Render your UI components to a JSON string
const jsonPayload = renderVoltraToString({
  lockScreen: (
    <Voltra.VStack style={{ padding: 16, borderRadius: 18, backgroundColor: '#101828' }}>
      <Voltra.Symbol name="car.fill" type="hierarchical" scale="large" tintColor="#38BDF8" />
      <Voltra.Text style={{ color: '#F8FAFC', fontSize: 18, fontWeight: '600' }}>Driver arrived</Voltra.Text>
      <Voltra.Text style={{ color: '#94A3B8', fontSize: 12, marginTop: 8 }}>Ready for pickup</Voltra.Text>
    </Voltra.VStack>
  ),
})
```

The `renderVoltraToString` function accepts a `VoltraVariants` object (same structure as `startVoltra`) and returns a JSON string that can be embedded in your APNS payload.

## APNS payload format

When sending push notifications to update Live Activities, you need to structure your APNS payload correctly. Here's the format Voltra expects:

### Required APNS headers

```
apns-push-type: liveactivity
apns-topic: <your.app.bundle.id>.push-type.liveactivity
```

Replace `<your.app.bundle.id>` with your app's bundle identifier (e.g., `com.example.myapp`).

### Payload structure

The APNS payload should follow this structure:

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

**Key fields:**

- `aps.event`: Set to `"update"` for updating an existing Live Activity, or `"start"` for push-to-start (iOS 17.2+)
- `aps.content-state.uiJsonData`: The JSON string returned by `renderVoltraToString`, embedded as a string value
- `aps.timestamp`: Unix timestamp in seconds (required for Live Activities)

**Example payload for updating a Live Activity:**

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

:::danger
ActivityKit enforces a strict payload size limit of approximately 4 KB. Keep your UI JSON minimal to stay within this limit. Avoid deeply nested component trees and excessive styling to ensure your payloads fit within the constraint.
:::

## Getting push tokens

To send push notifications to a specific Live Activity, you need to obtain its push token. Listen for push tokens in your app:

```tsx
import { addVoltraListener } from 'voltra'

useEffect(() => {
  const subscription = addVoltraListener('activityTokenReceived', ({ activityID, activityName, activityPushToken }) => {
    // Send the token to your server
    // Associate it with the activityID and user/session
    sendTokenToServer({ activityID, activityPushToken })
  })

  return () => {
    subscription.remove()
  }
}, [])
```

Store these tokens on your server and use them when sending APNS notifications to update the corresponding Live Activities. When sending notifications via APNS, you must use the push token as the target device token—this is the device token that APNS uses to route the notification to the specific Live Activity.
