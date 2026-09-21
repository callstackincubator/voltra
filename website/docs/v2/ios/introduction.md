# Introduction

This page shows what building a Live Activity with Voltra looks like: you write JSX using Voltra components, and it gets converted to SwiftUI automatically.

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

If you prefer using the hook API (`useLiveActivity`), you'll get live reloads for live activities, with changes appearing in milliseconds without manual restarts.

Voltra also supports updating Live Activities from your server via push notifications — see [Server-side updates](./development/server-side-updates).

You're ready to dive into the [setup guide](./setup) and get started with live activities in your app.
