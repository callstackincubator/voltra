# Introduction

Voltra is a library that brings new "platforms" to React Native. Up until now, creating features like iOS Live Activities, Dynamic Island layouts, or Android Home Screen Widgets required writing native code in Swift or Kotlin.

Voltra changes this by providing a JavaScript-based API and JSX components that get automatically converted to native primitives (SwiftUI on iOS, Jetpack Compose Glance on Android).

## Why Voltra?

- **React Native Everywhere:** Extend your React Native app with native platform features using the same JSX syntax you already know.
- **No Native Code Required:** Build complex widget layouts and live activities without touching Xcode or Android Studio for UI code.
- **Unified Components:** Use a shared set of components that render idiomatically on both iOS and Android.
- **Real-time Updates:** Stream updates to your activities and widgets via push notifications (APNS/FCM) from any JavaScript runtime.

## How it works

Voltra works by serializing your JSX components into a lightweight JSON format that the native platform extensions can interpret. This enables features like hot reloading during development and server-side rendering for push updates.

Here's how simple it is to create a live activity:

```tsx
import { startLiveActivity } from 'voltra/client'
import { Voltra } from 'voltra'

const activityUI = (
  <Voltra.VStack style={{ padding: 16, borderRadius: 18, backgroundColor: '#101828' }}>
    <Voltra.Symbol name="car.fill" type="hierarchical" scale="large" tintColor="#38BDF8" />
    <Voltra.Text style={{ color: '#F8FAFC', fontSize: 18, fontWeight: '600' }}>Driver en route</Voltra.Text>
    <Voltra.Text style={{ color: '#94A3B8', fontSize: 12, marginTop: 8 }}>Building A · Lobby pickup</Voltra.Text>
    <Voltra.Button title="Contact driver" id="contact-driver" style={{ marginTop: 12 }} />
  </Voltra.VStack>
)

// Start the live activity
await startLiveActivity({
  lockScreen: activityUI,
})
```

If you prefer using the hook API (`useLiveActivity`), you'll get live reloads for live activities, with changes appearing in milliseconds without manual restarts.

## Server-side updates via push notifications

Voltra also supports server-side updates through push notifications. You can use Voltra's server-side rendering to convert JSX into JSON payloads that you send to devices via Apple's Push Notification Service (APNS) or Firebase Cloud Messaging (FCM). This enables real-time updates without keeping your app running.

The same components you use in your app work on the server:

```tsx
import { renderLiveActivityToString } from 'voltra/server'
import { Voltra } from 'voltra'

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
