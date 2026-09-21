# Introduction

Voltra is a library that brings new "platforms" to React Native. Creating features like iOS Live Activities, Dynamic Island layouts, or Android Home Screen Widgets normally requires writing native code in Swift or Kotlin.

Voltra changes this by providing a JavaScript-based API and JSX components that get automatically converted to native primitives (SwiftUI on iOS, Jetpack Compose Glance on Android).

Here's how simple it is to create a live activity:

```tsx
import { Voltra } from '@use-voltra/ios'
import { startLiveActivity } from '@use-voltra/ios-client'

const activityUI = (
  <Voltra.VStack style={{ padding: 16, borderRadius: 18, backgroundColor: '#101828' }}>
    <Voltra.Symbol name="car.fill" type="hierarchical" scale="large" tintColor="#38BDF8" />
    <Voltra.Text style={{ color: '#F8FAFC', fontSize: 18, fontWeight: '600' }}>Driver en route</Voltra.Text>
    <Voltra.Text style={{ color: '#94A3B8', fontSize: 12, marginTop: 8 }}>Building A · Lobby pickup</Voltra.Text>
    <Voltra.Button id="contact-driver" style={{ marginTop: 12 }}>
      <Voltra.Text>Contact driver</Voltra.Text>
    </Voltra.Button>
  </Voltra.VStack>
)

// Start the live activity
await startLiveActivity({
  lockScreen: activityUI,
})
```

If you prefer using the hook API, check out [`useLiveActivity`](/ios/development/developing-live-activities#useliveactivity) for integrating live activities with the component lifecycle and automatic updates during development.

## Server-side updates via push notifications

Voltra also supports server-side updates through push notifications. You can use Voltra's server-side rendering to convert JSX into JSON payloads that you send to devices via Apple's Push Notification Service (APNS) or Firebase Cloud Messaging (FCM). This enables real-time updates without keeping your app running.

The same components you use in your app work on the server:

```tsx
import { Voltra, renderLiveActivityToString } from '@use-voltra/ios-server'

// Render JSX to JSON payload on your server
const payload = renderLiveActivityToString({
  lockScreen: (
    <Voltra.VStack style={{ padding: 16, borderRadius: 18, backgroundColor: '#101828' }}>
      <Voltra.Symbol name="car.fill" type="hierarchical" scale="large" tintColor="#38BDF8" />
      <Voltra.Text style={{ color: '#F8FAFC', fontSize: 18, fontWeight: '600' }}>Driver arrived</Voltra.Text>
      <Voltra.Text style={{ color: '#94A3B8', fontSize: 12, marginTop: 8 }}>Ready for pickup</Voltra.Text>
    </Voltra.VStack>
  ),
})
```

Ready to get started? Head over to the [Installation](./installation) guide, or explore platform-specific guides for [iOS](/ios/introduction) and [Android](/android/introduction).
