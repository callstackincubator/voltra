import { registerRootComponent } from 'expo'
import { ExpoRoot } from 'expo-router'

import { registerVoltraBackgroundNotifications } from './notifications/registerBackgroundNotifications'
import { registerPushLogging } from './notifications/registerPushLogging'

// Appduct's deep-link bootstrap, so `appduct link` can claim a session against this app. Required
// here rather than imported so it only installs in development builds; release builds ship no
// native Appduct module at all, which leaves the tool registrations in `appduct/` inert.
if (__DEV__) {
  require('@appduct/react-native/auto')
}

registerVoltraBackgroundNotifications().catch(() => {})
registerPushLogging().catch((error) => {
  console.log('[expo-notifications] Startup registration failed:', error)
})

export function App() {
  const ctx = require.context('./app')
  return <ExpoRoot context={ctx} />
}

registerRootComponent(App)
