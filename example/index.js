import { registerRootComponent } from 'expo'
import { ExpoRoot } from 'expo-router'

import { registerVoltraBackgroundNotifications } from './notifications/registerBackgroundNotifications'
import { registerPushLogging } from './notifications/registerPushLogging'

registerVoltraBackgroundNotifications().catch(() => {})
registerPushLogging().catch((error) => {
  console.log('[expo-notifications] Startup registration failed:', error)
})

export function App() {
  const ctx = require.context('./app')
  return <ExpoRoot context={ctx} />
}

registerRootComponent(App)
