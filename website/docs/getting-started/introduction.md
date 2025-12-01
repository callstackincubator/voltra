# Introduction

Adding live activities to your iOS app has traditionally been a time-consuming and complex process. JavaScript developers need to learn Xcode, master SwiftUI, understand how to start live activities, and figure out how to manage them throughout their lifecycle. It's not fast, it's not convenient, and it creates unnecessary barriers between your app development and these dynamic features.

## Voltra + JSX = Live Activity

Voltra changes all of that by providing a JavaScript-based API you can use to display live activities in your app. Instead of writing SwiftUI code, you write JSX using familiar Voltra components that get automatically converted to SwiftUI and displayed just like native code.

Here's how simple it is to create a live activity:

```tsx
import { startVoltra, Voltra } from 'voltra'

const activityUI = (
  <Voltra.VStack style={{ padding: 16, borderRadius: 18, backgroundColor: '#101828' }}>
    <Voltra.SymbolView name="car.fill" type="hierarchical" scale="large" tintColor="#38BDF8" />
    <Voltra.Text style={{ color: '#F8FAFC', fontSize: 18, fontWeight: '600' }}>
      Driver en route
    </Voltra.Text>
    <Voltra.Text style={{ color: '#94A3B8', fontSize: 12, marginTop: 8 }}>
      Building A · Lobby pickup
    </Voltra.Text>
    <Voltra.Button title="Contact driver" eventHandlerName="onPressContactDriver" style={{ marginTop: 12 }} />
  </Voltra.VStack>
)

// Start the live activity
await startVoltra({
  lockScreen: activityUI
})
```

If you prefer using the hook API (`useVoltra`), you'll get live reloads for live activities, making development incredibly convenient as changes appear in milliseconds without manual restarts.

## Server-side updates via push notifications

Voltra also supports server-side updates through push notifications. You can use Voltra's server-side rendering to convert JSX into JSON payloads that you send to devices via Apple's Push Notification Service (APNS). This enables real-time updates without keeping your app running.

The same components you use in your app work seamlessly on the server:

```tsx
import { renderVoltraToString, Voltra } from 'voltra/server'

// Render JSX to JSON payload on your server
const payload = renderVoltraToString({
  lockScreen: (
    <Voltra.VStack style={{ padding: 16, borderRadius: 18, backgroundColor: '#101828' }}>
      <Voltra.SymbolView name="car.fill" type="hierarchical" scale="large" tintColor="#38BDF8" />
      <Voltra.Text style={{ color: '#F8FAFC', fontSize: 18, fontWeight: '600' }}>
        Driver arrived
      </Voltra.Text>
      <Voltra.Text style={{ color: '#94A3B8', fontSize: 12, marginTop: 8 }}>
        Ready for pickup
      </Voltra.Text>
    </Voltra.VStack>
  )
})
```

Now that you know why Voltra is awesome, you're ready to dive into the [setup guide](./quick-start) and get started with live activities in your app.

